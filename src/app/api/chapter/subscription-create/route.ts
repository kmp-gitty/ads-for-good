// POST /api/chapter/subscription-create
//
// Receives a Remind Me preset submission from the Chapter pixel. Creates a
// row in chapter_engagement.subscriptions that the hourly cron
// /api/internal/cron/evaluate-subscriptions (Phase 6c) will poll to detect
// state changes on the target product + fire notification emails on trigger.
//
// Defenses (3-layer, same pattern as /api/chapter/offer-submit):
//   Layer 1 — Honeypot field (hp_field)
//   Layer 2 — HMAC session token from GET /api/chapter/identity-prompts
//   Layer 3 — Per-IP rate limit (10/hr — same as offer-submit; every subscription
//             will eventually trigger an outbound email so abuse cost is real)
//
// Idempotency: if the visitor already has an active subscription for the same
// (identity_key, target, trigger), we return the existing subscription_id
// instead of creating a duplicate. A visitor can't accidentally get double-
// notified by re-clicking Remind Me.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";
import { verifyPromptSession } from "@/app/lib/auth/prompt-session";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { selectCrmAdapter } from "@/app/lib/crm-adapter/selector";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

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
    endpoint: "/api/chapter/subscription-create",
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

// Target resource — mirrors OfferTargetResource but adds 'variant' since
// inventory/price alerts often want variant-level precision (a hoodie's
// Small vs Medium may go OOS independently). 'appointment_slot' is reserved
// for a future availability_alert feature and not accepted here.
type SubscriptionTarget =
  | { type: "product"; product_id: string; product_name?: string; list_price?: number }
  | { type: "variant"; product_id: string; variant_id: string; variant_name?: string; list_price?: number };

type SubscriptionTrigger =
  | { type: "back_in_stock" }
  | { type: "price_below"; threshold: number };

type SubscriptionCreateBody = {
  client_key?: string;
  prompt_id?: string;
  session_token?: string;
  hp_field?: string;
  identity_key?: string;     // Required — email_sha256:*, expected via /api/identify
  recipient_email?: string;  // Raw email; used by cron for outbound sends, never persisted here
  target?: SubscriptionTarget;
  trigger?: SubscriptionTrigger;
  max_notifications?: number; // Optional override; default 3 per subscriptions schema
  page_url?: string;
};

export async function POST(req: NextRequest) {
  let body: SubscriptionCreateBody;
  try {
    body = (await req.json()) as SubscriptionCreateBody;
  } catch {
    return reject(req, "invalid_json", "", 400, "invalid_json");
  }

  const clientKey = (body.client_key || "").trim();
  const promptId = (body.prompt_id || "").trim();
  const sessionToken = (body.session_token || "").trim();
  const identityKey = (body.identity_key || "").trim();
  const recipientEmail = (body.recipient_email || "").trim();

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
  if (!body.trigger || typeof body.trigger !== "object") {
    return reject(req, "missing_trigger", clientKey, 400, "missing_trigger");
  }
  const triggerType = body.trigger.type;
  if (triggerType !== "back_in_stock" && triggerType !== "price_below") {
    return reject(req, "invalid_trigger_type", clientKey, 400, "invalid_trigger_type");
  }
  if (triggerType === "price_below") {
    const threshold = (body.trigger as { threshold?: number }).threshold;
    if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) {
      return reject(req, "invalid_price_threshold", clientKey, 400, "invalid_price_threshold");
    }
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
  // preset_type='remind_me'. Prevents a bad actor from firing subscription
  // creates against a prompt not designed for reminders.
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
  const typedPrompt = prompt as { id: string; slug: string; preset_type: string; enabled: boolean };
  if (!typedPrompt.enabled) {
    return reject(req, "prompt_disabled", clientKey, 400, "prompt_disabled");
  }
  if (typedPrompt.preset_type !== "remind_me") {
    return reject(req, "wrong_preset", clientKey, 400, "wrong_preset");
  }

  // Idempotency: if the visitor already has an active subscription for the
  // same (identity_key, target, trigger), return that instead of creating a
  // duplicate. Comparison uses the jsonb columns directly so target/trigger
  // shape variations (variant_id present vs absent, etc.) each get their own
  // row without collapsing.
  const targetJson = JSON.stringify(body.target);
  const triggerJson = JSON.stringify(body.trigger);
  const { data: existing } = await supabase
    .schema("chapter_engagement")
    .from("subscriptions")
    .select("id")
    .eq("client_key", clientKey)
    .eq("identity_key", identityKey)
    .eq("active", true)
    .filter("target_resource_jsonb", "eq", targetJson)
    .filter("trigger_condition_jsonb", "eq", triggerJson)
    .maybeSingle();

  if (existing) {
    void logAuthAttempt({
      endpoint: "/api/chapter/subscription-create",
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
          subscription_id: (existing as { id: number }).id,
          created: false,
          reason: "already_subscribed",
        },
        { status: 200 },
      ),
    );
  }

  // Insert new subscription. max_notifications defaults to 3 per the
  // schema — see chapter_engagement.subscriptions in Supabase.
  const maxNotifications =
    typeof body.max_notifications === "number" && body.max_notifications > 0
      ? Math.min(body.max_notifications, 10)  // hard cap so operators can't
                                              // configure a spam prompt
      : undefined;

  const insertPayload: Record<string, unknown> = {
    client_key: clientKey,
    identity_key: identityKey,
    prompt_id: typedPrompt.id,
    target_resource_jsonb: body.target,
    trigger_condition_jsonb: body.trigger,
    notify_channels: ["email"],  // Phase 6a: email only. SMS is v2.1 material.
    active: true,
  };
  if (maxNotifications !== undefined) insertPayload.max_notifications = maxNotifications;

  const { data: inserted, error: insertErr } = await supabase
    .schema("chapter_engagement")
    .from("subscriptions")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[subscription-create] insert failed:", insertErr?.message);
    return reject(req, "insert_failed", clientKey, 500, "store_failed");
  }

  void logAuthAttempt({
    endpoint: "/api/chapter/subscription-create",
    client_key: clientKey,
    success: true,
    ip_hash: hashIp(getClientIp(req)),
    user_agent_snippet: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    request_id: req.headers.get("x-vercel-id") ?? null,
  });

  // Fire-and-forget CRM mirror — same pattern as /api/chapter/lead. Captures
  // the subscriber's raw email into crm.prospects for tenants that opted in
  // (adsforgood_prod today). Preserves the "Chapter never persists raw email"
  // contract for tenants without crm_provider set.
  void (async () => {
    try {
      const adapter = await selectCrmAdapter(clientKey);
      if (!adapter) return;
      await adapter.upsertLead({
        client_key: clientKey,
        prompt_slug: typedPrompt.slug,
        email: recipientEmail,
        responses: {
          subscription_type: "remind_me",
          target: body.target,
          trigger: body.trigger,
        },
        page_url: body.page_url || null,
        ip_country: req.headers.get("x-vercel-ip-country") ?? null,
      });
    } catch (err) {
      console.warn(
        "[subscription-create] CRM upsert failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
  })();

  return withCors(
    req,
    NextResponse.json(
      {
        subscription_id: (inserted as { id: number }).id,
        created: true,
      },
      { status: 200 },
    ),
  );
}
