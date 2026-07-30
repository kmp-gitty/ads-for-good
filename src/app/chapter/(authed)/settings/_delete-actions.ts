"use server";

// Self-serve account deletion — request (30-day grace) + reactivate.
//
// Request: email the full data export, cancel Stripe at period end, then stamp
// deletion_requested_at. Access is gated on that timestamp (the (authed) layout
// swaps in a "scheduled for deletion / reactivate" screen) — NOT by zeroing
// tools_enabled, which the Stripe webhook could race and re-grant. The day-30
// cron (purge-deleted-accounts) does the irreversible full erasure.
//
// Reactivate: clear the stamp, un-cancel the subscription, recompute entitlement.

import { revalidatePath } from "next/cache";
import { getCurrentChapterUser, getClientEntitlement, clearClientEntitlementCache } from "@/app/lib/auth/chapter-user";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { getStripe, stripeConfigured } from "@/app/lib/stripe/client";
import { recomputeEntitlement } from "@/app/lib/stripe/entitlements";
import { emailAccountExport } from "@/app/lib/account/export-bundle";

type Result = { ok: true; purgeDate?: string } | { ok: false; error: string };

const GRACE_DAYS = 30;

async function selfServeTenant() {
  const user = await getCurrentChapterUser();
  if (!user || !user.client_key) return { ok: false as const, error: "Not authorized." };
  const ent = await getClientEntitlement(user.client_key);
  if (!ent || !(ent.self_serve || !ent.tools_enabled.includes("chapter"))) {
    return { ok: false as const, error: "This action isn’t available on this workspace." };
  }
  return { ok: true as const, user, ent, clientKey: user.client_key };
}

async function setSubscriptionsCancelAtPeriodEnd(clientKey: string, cancel: boolean): Promise<void> {
  if (!stripeConfigured()) return;
  const supabase = createSupabaseServiceRoleClient();
  const { data } = await supabase
    .schema("chapter_config")
    .from("tenant_subscriptions")
    .select("stripe_subscription_id")
    .eq("client_key", clientKey);
  const stripe = getStripe();
  for (const row of data ?? []) {
    const subId = row.stripe_subscription_id as string | null;
    if (!subId) continue;
    try {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: cancel });
    } catch {
      /* already canceled / ended / not found — nothing to do */
    }
  }
}

export async function requestAccountDeletion(confirmText: string): Promise<Result> {
  const t = await selfServeTenant();
  if (!t.ok) return { ok: false, error: t.error };
  const { user, ent, clientKey } = t;

  // Already scheduled — treat as idempotent success.
  if (ent.deletion_requested_at) {
    const purge = new Date(new Date(ent.deletion_requested_at).getTime() + GRACE_DAYS * 86_400_000);
    return { ok: true, purgeDate: purge.toISOString() };
  }

  // Confirmation must match the business name (or "DELETE" if none on file).
  const expected = (ent.business_name || "DELETE").trim().toLowerCase();
  if ((confirmText || "").trim().toLowerCase() !== expected) {
    return { ok: false, error: `Please type “${ent.business_name || "DELETE"}” exactly to confirm.` };
  }

  // 1) Email the data export first — the owner always leaves with their data.
  //    If we can't deliver it, don't proceed with the deletion.
  const exported = await emailAccountExport({
    clientKey: clientKey,
    toEmail: user.email,
    businessName: ent.business_name || clientKey,
  });
  if (!exported.ok) {
    return { ok: false, error: `We couldn’t email your data export (${exported.error}). Nothing was deleted — please try again.` };
  }

  // 2) Stop billing (cancel at period end — no surprise proration).
  await setSubscriptionsCancelAtPeriodEnd(clientKey, true);

  // 3) Stamp the deletion request. Access is gated on this timestamp.
  const now = new Date();
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .update({
      deletion_requested_at: now.toISOString(),
      deletion_requested_by: user.email,
      updated_at: now.toISOString(),
    })
    .eq("client_key", clientKey);
  if (error) return { ok: false, error: error.message };

  clearClientEntitlementCache(clientKey);
  revalidatePath("/chapter", "layout");
  const purge = new Date(now.getTime() + GRACE_DAYS * 86_400_000);
  return { ok: true, purgeDate: purge.toISOString() };
}

export async function reactivateAccount(): Promise<Result> {
  const t = await selfServeTenant();
  if (!t.ok) return { ok: false, error: t.error };
  const { ent, clientKey } = t;

  if (!ent.deletion_requested_at) {
    revalidatePath("/chapter", "layout");
    return { ok: true };
  }

  // Un-cancel any still-in-period subscription (best-effort).
  await setSubscriptionsCancelAtPeriodEnd(clientKey, false);

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .update({
      deletion_requested_at: null,
      deletion_requested_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("client_key", clientKey);
  if (error) return { ok: false, error: error.message };

  // Restore tools_enabled/billing_status from live subscription + trial state.
  await recomputeEntitlement(clientKey);
  clearClientEntitlementCache(clientKey);
  revalidatePath("/chapter", "layout");
  return { ok: true };
}
