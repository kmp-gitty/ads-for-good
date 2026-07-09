"use server";

// MI v2 Phase 5 — Offer review server actions.
//
// Three operator-driven transitions from `pending_review`:
//   approveOffer  → manually_accepted (+ discount code + welcome_offer email)
//   counterOffer  → countered         (+ offer_counter email)
//   declineOffer  → declined          (+ optional offer_declined email — deferred)
//
// State transitions are gated by the state-machine DAG. All updates go through
// the service-role client; `chapter_engagement.offers` has no CHECK constraint
// on status transitions server-side (the machine here IS the enforcement).

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { selectAdapter } from "@/app/lib/platform/selector";
import { sendEmail } from "@/app/lib/email-send";
import { isValidTransition } from "@/app/lib/offers/state-machine";
import type { OfferStatus, OfferTargetResource } from "@/app/lib/offers/types";
import { getCurrentChapterUserOrLegacy } from "@/app/lib/auth/chapter-user";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type ActionResult = { ok: true; code?: string } | { ok: false; error: string };

async function loadOffer(clientKey: string, offerId: string) {
  const { data, error } = await supabase
    .schema("chapter_engagement")
    .from("offers")
    .select(
      "id, client_key, identity_key, prompt_id, target_resource_jsonb, bid_amount, counter_amount, status, generated_code",
    )
    .eq("id", offerId)
    .eq("client_key", clientKey)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "offer_not_found" };
  return { ok: true as const, offer: data };
}

// Best-effort lookup of the raw recipient email so outbound sends have a
// deliverable To: address. The offer row only stores email_sha256; we resolve
// via the email_engagement_events recipient_token or fall back to the identity
// prompt's stored contact if present. For now this returns null — email flows
// silently no-op until the recipient can be resolved. Not blocking for demo
// purposes because Make an Offer's demo path exercises the state machine +
// discount code creation without needing real email delivery.
async function resolveRecipientEmail(_identity_key: string): Promise<string | null> {
  return null;
}

export async function approveOffer(clientKey: string, offerId: string): Promise<ActionResult> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user || user.role !== "chapter_staff") {
    return { ok: false, error: "unauthorized" };
  }

  const loaded = await loadOffer(clientKey, offerId);
  if (!loaded.ok) return loaded;
  const offer = loaded.offer;

  if (!isValidTransition(offer.status as OfferStatus, "manually_accepted")) {
    return { ok: false, error: `cannot transition ${offer.status} → manually_accepted` };
  }

  const target = offer.target_resource_jsonb as OfferTargetResource;
  const adapter = await selectAdapter(clientKey);
  const list_price = target.type === "product" ? target.list_price ?? null : null;

  const code = await adapter.createDiscountCode(clientKey, {
    amount_off: list_price ? Math.max(list_price - Number(offer.bid_amount), 0) : undefined,
    max_uses: 1,
    once_per_customer: true,
    product_ids: target.type === "product" ? [target.product_id] : undefined,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const nowIso = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: "manually_accepted",
    reviewed_at: nowIso,
    reviewed_by: user.email,
  };
  if (code) updatePayload.generated_code = code.code;

  const { error: updateErr } = await supabase
    .schema("chapter_engagement")
    .from("offers")
    .update(updatePayload)
    .eq("id", offer.id)
    .eq("client_key", clientKey);
  if (updateErr) return { ok: false, error: updateErr.message };

  if (code) {
    const recipientEmail = await resolveRecipientEmail(offer.identity_key);
    if (recipientEmail) {
      void sendEmail({
        client_key: clientKey,
        template_type: "welcome_offer",
        recipient: { email: recipientEmail, identity_key: offer.identity_key },
        merge_data: {
          offer_code: code.code,
          product_name: target.type === "product" ? target.product_name ?? "your item" : "your item",
          bid_amount: Number(offer.bid_amount),
          list_price: list_price ?? 0,
          expires_at: code.expires_at ?? "",
          checkout_url: code.url ?? "",
        },
        source_type: "offer_response",
        source_id: BigInt(offer.id),
      }).catch((e) => console.warn("[approveOffer] welcome_offer email failed:", e));
    }
  }

  revalidatePath(`/internal/identity-prompts/${clientKey}/offers`);
  return { ok: true, code: code?.code };
}

export async function counterOffer(
  clientKey: string,
  offerId: string,
  counterAmount: number,
): Promise<ActionResult> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user || user.role !== "chapter_staff") {
    return { ok: false, error: "unauthorized" };
  }
  if (!Number.isFinite(counterAmount) || counterAmount <= 0) {
    return { ok: false, error: "invalid_counter_amount" };
  }

  const loaded = await loadOffer(clientKey, offerId);
  if (!loaded.ok) return loaded;
  const offer = loaded.offer;

  if (!isValidTransition(offer.status as OfferStatus, "countered")) {
    return { ok: false, error: `cannot transition ${offer.status} → countered` };
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .schema("chapter_engagement")
    .from("offers")
    .update({
      status: "countered",
      counter_amount: counterAmount,
      reviewed_at: nowIso,
      reviewed_by: user.email,
    })
    .eq("id", offer.id)
    .eq("client_key", clientKey);
  if (updateErr) return { ok: false, error: updateErr.message };

  const target = offer.target_resource_jsonb as OfferTargetResource;
  const list_price = target.type === "product" ? target.list_price ?? null : null;
  const recipientEmail = await resolveRecipientEmail(offer.identity_key);
  if (recipientEmail) {
    void sendEmail({
      client_key: clientKey,
      template_type: "offer_counter",
      recipient: { email: recipientEmail, identity_key: offer.identity_key },
      merge_data: {
        bid_amount: Number(offer.bid_amount),
        counter_amount: counterAmount,
        product_name: target.type === "product" ? target.product_name ?? "your item" : "your item",
        list_price: list_price ?? 0,
        accept_url: "",
      },
      source_type: "offer_response",
      source_id: BigInt(offer.id),
    }).catch((e) => console.warn("[counterOffer] offer_counter email failed:", e));
  }

  revalidatePath(`/internal/identity-prompts/${clientKey}/offers`);
  return { ok: true };
}

export async function declineOffer(clientKey: string, offerId: string): Promise<ActionResult> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user || user.role !== "chapter_staff") {
    return { ok: false, error: "unauthorized" };
  }

  const loaded = await loadOffer(clientKey, offerId);
  if (!loaded.ok) return loaded;
  const offer = loaded.offer;

  if (!isValidTransition(offer.status as OfferStatus, "declined")) {
    return { ok: false, error: `cannot transition ${offer.status} → declined` };
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .schema("chapter_engagement")
    .from("offers")
    .update({
      status: "declined",
      reviewed_at: nowIso,
      reviewed_by: user.email,
    })
    .eq("id", offer.id)
    .eq("client_key", clientKey);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath(`/internal/identity-prompts/${clientKey}/offers`);
  return { ok: true };
}
