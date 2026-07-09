// POST /api/chapter/offer-submit
//
// Receives a Make-an-Offer preset bid submission from the Chapter pixel.
// Runs the offer through the evaluator, then based on the decision:
//   - auto_accept → create discount code via platform adapter → insert offer
//                   row (status='auto_accepted') → send welcome_offer email
//   - counter    → insert row (status='countered') → send counter_offer email
//   - decline    → insert row (status='declined') → optionally send offer_declined
//   - review     → insert row (status='pending_review') → operator handles later
//
// Defenses (3-layer, same pattern as /api/chapter/prompt-response):
//   Layer 1 — Honeypot field (hp_field)
//   Layer 2 — HMAC session token from GET /api/chapter/identity-prompts
//   Layer 3 — Per-IP rate limit (10/hr — stricter than prompt-response because
//             every accepted offer triggers an outbound email + discount code
//             creation, so the abuse cost is higher)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";
import { verifyPromptSession } from "@/app/lib/auth/prompt-session";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { selectAdapter } from "@/app/lib/platform/selector";
import { evaluateOffer } from "@/app/lib/offers/evaluator";
import { sendEmail } from "@/app/lib/email-send";
import type { OfferTargetResource } from "@/app/lib/offers/types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Stricter than prompt-response because every accepted offer creates a real
// discount code + outbound email. 10/hr per IP is enough for legitimate
// bid+counter negotiation cycles but blocks automated abuse.
const RATE_LIMIT_PER_HOUR = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; reset_at: number }>();

function checkRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset_at) {
    rateLimitMap.set(ip, { count: 1, reset_at: now + RATE_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) return { allowed: false };
  entry.count += 1;
  return { allowed: true };
}

function maybeEvictOldest() {
  if (rateLimitMap.size < 5000) return;
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.reset_at) rateLimitMap.delete(ip);
  }
}

async function reject(
  req: NextRequest,
  reason: string,
  clientKey: string,
  status: number,
  publicError: string,
): Promise<NextResponse> {
  void logAuthAttempt({
    endpoint: "/api/chapter/offer-submit",
    client_key: clientKey || "unknown",
    success: false,
    failure_reason: reason,
    ip_hash: hashIp(getClientIp(req)),
    user_agent_snippet: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    request_id: req.headers.get("x-vercel-id") ?? null,
  });
  return withCors(req, NextResponse.json({ error: publicError }, { status }));
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsPreflightHeaders(req) });
}

type OfferSubmitBody = {
  client_key?: string;
  prompt_id?: string;
  session_token?: string;
  hp_field?: string;
  bid_amount?: number;
  target?: OfferTargetResource;
  identity_key?: string;   // Required — email_sha256:*, expected to already exist via /api/identify
  recipient_email?: string; // Raw email; used only for outbound send address, never persisted
  page_url?: string;
};

export async function POST(req: NextRequest) {
  let body: OfferSubmitBody;
  try {
    body = (await req.json()) as OfferSubmitBody;
  } catch {
    return reject(req, "invalid_json", "", 400, "invalid_json");
  }

  const clientKey = (body.client_key || "").trim();
  const promptId = (body.prompt_id || "").trim();
  const sessionToken = (body.session_token || "").trim();
  const identityKey = (body.identity_key || "").trim();
  const recipientEmail = (body.recipient_email || "").trim();
  const bidAmount = typeof body.bid_amount === "number" ? body.bid_amount : NaN;

  // Defense 1 — honeypot
  if (body.hp_field && String(body.hp_field).trim() !== "") {
    return reject(req, "honeypot_filled", clientKey, 400, "invalid_request");
  }

  if (!clientKey || !promptId || !identityKey || !recipientEmail) {
    return reject(req, "missing_required_fields", clientKey, 400, "missing_required_fields");
  }
  if (!body.target || typeof body.target !== "object") {
    return reject(req, "missing_target", clientKey, 400, "missing_target");
  }
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return reject(req, "invalid_bid_amount", clientKey, 400, "invalid_bid_amount");
  }

  // Defense 2 — session token
  const sessionResult = verifyPromptSession(sessionToken, clientKey);
  if (!sessionResult.ok) {
    return reject(
      req,
      `session_${sessionResult.reason}`,
      clientKey,
      sessionResult.reason === "missing_secret" ? 503 : 401,
      sessionResult.reason === "missing_secret" ? "service_misconfigured" : "invalid_session",
    );
  }

  // Defense 3 — per-IP rate limit
  const ip = getClientIp(req) ?? "unknown";
  maybeEvictOldest();
  if (!checkRateLimit(ip).allowed) {
    return reject(req, "rate_limited", clientKey, 429, "rate_limited");
  }

  // Validate prompt exists + belongs to this client + is enabled + is
  // preset_type='make_an_offer' (not a Custom Form or other preset). This
  // prevents an attacker from firing bids against a prompt not designed for
  // offers.
  const { data: prompt, error: lookupErr } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .select("id, slug, preset_type, enabled")
    .eq("id", promptId)
    .eq("client_key", clientKey)
    .maybeSingle();

  if (lookupErr || !prompt) {
    return reject(req, "prompt_not_found", clientKey, 404, "prompt_not_found");
  }
  if (!prompt.enabled) {
    return reject(req, "prompt_disabled", clientKey, 400, "prompt_disabled");
  }
  if (prompt.preset_type !== "make_an_offer") {
    return reject(req, "wrong_preset_type", clientKey, 400, "wrong_preset_type");
  }

  // Look up product info if the target is a product. The evaluator needs
  // list_price to compute the auto-accept threshold.
  const adapter = await selectAdapter(clientKey);
  let list_price: number | null = null;
  let product_name: string | null = null;
  if (body.target.type === "product") {
    const product = await adapter.getProduct(clientKey, body.target.product_id);
    if (product) {
      list_price = product.price;
      product_name = product.name;
    }
  }
  // If the adapter returned nothing but the caller supplied a list_price on
  // the product target itself (e.g. adapter is a stub), honor it.
  if (list_price == null && body.target.type === "product" && body.target.list_price != null) {
    list_price = body.target.list_price;
  }

  const decision = await evaluateOffer({
    client_key: clientKey,
    target: body.target,
    bid_amount: bidAmount,
    list_price,
  });

  // Insert the offer row before any code generation / email send. Terminal
  // failures on later steps still leave an audit trail.
  const nowIso = new Date().toISOString();
  const enrichedTarget: OfferTargetResource = body.target.type === "product"
    ? { ...body.target, product_name: product_name ?? body.target.product_name, list_price: list_price ?? body.target.list_price }
    : body.target;

  const initialStatus = decision.action === "auto_accept"
    ? "auto_accepted"
    : decision.action === "counter"
      ? "countered"
      : decision.action === "decline"
        ? "declined"
        : "pending_review";

  const counter_amount = decision.action === "counter" ? decision.counter_amount : null;

  const { data: insertedOffer, error: insertErr } = await supabase
    .schema("chapter_engagement")
    .from("offers")
    .insert({
      client_key: clientKey,
      identity_key: identityKey,
      prompt_id: promptId,
      target_resource_jsonb: enrichedTarget,
      bid_amount: bidAmount,
      status: initialStatus,
      counter_amount,
      // 7-day default expiry; can be tightened via a future prompt config knob.
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: decision.action === "decline"
        ? `auto: ${decision.reason}`
        : decision.action === "review"
          ? `auto-routed to review: ${decision.reason}`
          : null,
    })
    .select("id")
    .single();

  if (insertErr || !insertedOffer) {
    console.error("[offer-submit] offer insert failed:", insertErr?.message);
    return reject(req, "insert_failed", clientKey, 500, "store_failed");
  }

  const offerId = insertedOffer.id as bigint;

  // Auto-accept: mint discount code, save to offer, email the visitor.
  if (decision.action === "auto_accept") {
    const code = await adapter.createDiscountCode(clientKey, {
      amount_off: list_price ? Math.max(list_price - bidAmount, 0) : undefined,
      max_uses: 1,
      once_per_customer: true,
      product_ids: body.target.type === "product" ? [body.target.product_id] : undefined,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (code) {
      await supabase
        .schema("chapter_engagement")
        .from("offers")
        .update({ generated_code: code.code })
        .eq("id", offerId);

      // Fire-and-forget email; failure doesn't fail the offer submission.
      void sendEmail({
        client_key: clientKey,
        template_type: "welcome_offer",
        recipient: { email: recipientEmail, identity_key: identityKey },
        merge_data: {
          offer_code: code.code,
          product_name: product_name ?? "your item",
          bid_amount: bidAmount,
          list_price: list_price ?? 0,
          expires_at: code.expires_at ?? "",
          checkout_url: code.url ?? "",
        },
        source_type: "offer_response",
        source_id: offerId,
      }).catch((e) => console.warn("[offer-submit] welcome_offer email failed:", e));
    }
    // If code creation failed we still return accepted; operator sees the row
    // in the queue and can retry via the admin UI.
  }

  if (decision.action === "counter") {
    void sendEmail({
      client_key: clientKey,
      template_type: "offer_counter",
      recipient: { email: recipientEmail, identity_key: identityKey },
      merge_data: {
        bid_amount: bidAmount,
        counter_amount: decision.counter_amount,
        product_name: product_name ?? "your item",
        list_price: list_price ?? 0,
        accept_url: "",  // Filled by counter-accept flow (not part of this endpoint)
      },
      source_type: "offer_response",
      source_id: offerId,
    }).catch((e) => console.warn("[offer-submit] offer_counter email failed:", e));
  }

  void logAuthAttempt({
    endpoint: "/api/chapter/offer-submit",
    client_key: clientKey,
    success: true,
    ip_hash: hashIp(getClientIp(req)),
    user_agent_snippet: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    request_id: req.headers.get("x-vercel-id") ?? null,
  });

  return withCors(
    req,
    NextResponse.json(
      {
        offer_id: String(offerId),
        decision: decision.action,
        counter_amount: counter_amount ?? undefined,
      },
      { status: 200 },
    ),
  );
}
