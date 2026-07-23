// Stripe ↔ entitlement sync. The webhook (and a future trial-expiry cron) call
// these to keep chapter_config.clients.{tools_enabled,billing_status} in step
// with Stripe subscription state. Service-role only.

import type Stripe from "stripe";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { clearClientEntitlementCache } from "@/app/lib/auth/chapter-user";
import { ACTIVE_SUB_STATUSES, BILLABLE_TOOLS, toolForPriceId, type BillableTool } from "./config";

function periodEndIso(sub: Stripe.Subscription): string | null {
  // current_period_end lives at the top level in most versions; fall back to the
  // first item for API versions that moved it onto subscription items.
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const unix = top ?? item?.current_period_end;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

// Upsert (or drop) the tenant_subscriptions row for a Stripe subscription, then
// recompute the tenant's entitlements.
export async function syncSubscriptionRecord(sub: Stripe.Subscription): Promise<void> {
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const clientKey = (sub.metadata?.client_key as string) || null;
  const tool = ((sub.metadata?.tool as BillableTool) || toolForPriceId(priceId)) as BillableTool | null;
  if (!clientKey || !tool) return; // can't map this subscription to a tenant/tool

  const supabase = createSupabaseServiceRoleClient();
  const cfg = supabase.schema("chapter_config");
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    await cfg.from("tenant_subscriptions").delete().eq("stripe_subscription_id", sub.id);
  } else {
    await cfg.from("tenant_subscriptions").upsert(
      {
        client_key: clientKey,
        tool,
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        price_id: priceId,
        status: sub.status,
        current_period_end: periodEndIso(sub),
        cancel_at_period_end: !!sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_key,tool" },
    );
  }

  if (customerId) {
    await cfg.from("clients").update({ stripe_customer_id: customerId }).eq("client_key", clientKey);
  }
  await recomputeEntitlement(clientKey);
}

// Derive tools_enabled + billing_status from the tenant's subscriptions + trial.
export async function recomputeEntitlement(clientKey: string): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const cfg = supabase.schema("chapter_config");
  const [subsRes, clientRes] = await Promise.all([
    cfg.from("tenant_subscriptions").select("tool, status").eq("client_key", clientKey),
    cfg.from("clients").select("trial_ends_at").eq("client_key", clientKey).maybeSingle(),
  ]);

  const activeTools = new Set<string>();
  let anyPastDue = false, anyActive = false, anyTrialing = false;
  for (const s of subsRes.data ?? []) {
    const status = s.status as string;
    if (ACTIVE_SUB_STATUSES.has(status)) activeTools.add(s.tool as string);
    if (status === "past_due") anyPastDue = true;
    else if (status === "active") anyActive = true;
    else if (status === "trialing") anyTrialing = true;
  }

  const trialEndsAt = clientRes.data?.trial_ends_at ? new Date(clientRes.data.trial_ends_at as string) : null;
  const trialValid = !!trialEndsAt && trialEndsAt.getTime() > Date.now();

  // During the app trial, both billable tools are granted; afterwards only tools
  // with an active-ish subscription. (Downgrade at trial expiry = deferred cron.)
  const toolsEnabled = trialValid ? [...BILLABLE_TOOLS] : [...activeTools];

  let billingStatus: string;
  if (anyPastDue) billingStatus = "past_due";
  else if (anyActive) billingStatus = "active";
  else if (anyTrialing || trialValid) billingStatus = "trialing";
  else billingStatus = "canceled";

  await cfg
    .from("clients")
    .update({ tools_enabled: toolsEnabled, billing_status: billingStatus, updated_at: new Date().toISOString() })
    .eq("client_key", clientKey);
  clearClientEntitlementCache(clientKey);
}
