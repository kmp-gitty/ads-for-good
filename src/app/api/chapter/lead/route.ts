// POST /api/chapter/lead
//
// Captures a raw contact (email/phone) a visitor submitted to a prompt, so the
// client can actually use it (Leads view, weekly CSV, later CRM/ESP/webhook).
// The pixel STILL hashes email/phone into the identity graph via /api/identify;
// this endpoint stores the raw contact + consent record + capture context in
// chapter_engagement.captured_leads (short-term store, weekly-purged).
//
// Same 3-layer defense as /api/chapter/prompt-response: honeypot + HMAC session
// token + per-IP rate limit; rejections audited for the attack-alert cron.

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

const RATE_LIMIT_PER_HOUR = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; reset_at: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset_at) {
    rateLimitMap.set(ip, { count: 1, reset_at: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) return false;
  entry.count += 1;
  return true;
}
function maybeEvictOldest() {
  if (rateLimitMap.size < 5000) return;
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) if (now > entry.reset_at) rateLimitMap.delete(ip);
}

async function reject(req: NextRequest, reason: string, clientKey: string, status: number, publicError: string) {
  void logAuthAttempt({
    endpoint: "/api/chapter/lead",
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

type CartItemInput = {
  variant_id?: string | number | null;
  product_title?: string | null;
  variant_title?: string | null;
  quantity?: number | null;
  line_price_cents?: number | null;
  currency?: string | null;
  url?: string | null;
};

export async function POST(req: NextRequest) {
  let body: {
    client_key?: string;
    prompt_id?: string;
    prompt_slug?: string;
    session_token?: string;
    hp_field?: string;
    email?: string;
    phone?: string;
    identity_key?: string;
    anonymous_id?: string;
    journey_id?: string;
    page_url?: string;
    responses?: Record<string, unknown>;
    consent_mode?: string;
    consent_text?: string;
    consent_value?: string;
    // Cart snapshot from Shopify /cart.js at submit time — enables Cart
    // Recovery view in the Leads dashboard + downstream CRM sync. Both
    // null for non-Shopify tenants or empty-cart visitors.
    cart_token?: string | null;
    cart_items?: CartItemInput[] | null;
  };
  try {
    body = await req.json();
  } catch {
    return reject(req, "invalid_json", "", 400, "invalid_json");
  }

  const clientKey = (body.client_key || "").trim();
  const promptId = (body.prompt_id || "").trim();
  const promptSlug = (body.prompt_slug || "").trim();
  const sessionToken = (body.session_token || "").trim();

  if (body.hp_field && body.hp_field.trim() !== "") {
    return reject(req, "honeypot_filled", clientKey, 400, "invalid_request");
  }
  if (!clientKey || !promptId || !promptSlug) {
    return reject(req, "missing_required_fields", clientKey, 400, "missing_required_fields");
  }

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

  const ip = getClientIp(req) ?? "unknown";
  maybeEvictOldest();
  if (!checkRateLimit(ip)) {
    return reject(req, "rate_limited", clientKey, 429, "rate_limited");
  }

  const { data: prompt, error: lookupErr } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .select("id, enabled")
    .eq("id", promptId)
    .eq("client_key", clientKey)
    .maybeSingle();
  if (lookupErr || !prompt) return reject(req, "prompt_not_found", clientKey, 404, "prompt_not_found");
  if (!prompt.enabled) return reject(req, "prompt_disabled", clientKey, 400, "prompt_disabled");

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  // A lead needs a contact. No email/phone → nothing to capture (not an error).
  if (!email && !phone) {
    return withCors(req, NextResponse.json({ stored: false, reason: "no_contact" }, { status: 200 }));
  }

  const mode = body.consent_mode === "checkbox" || body.consent_mode === "choice" ? body.consent_mode : null;
  const value = typeof body.consent_value === "string" ? body.consent_value : null;
  const declined = value === "unchecked" || value === "no";

  const { error: insertErr } = await supabase
    .schema("chapter_engagement")
    .from("captured_leads")
    .insert({
      client_key: clientKey,
      prompt_slug: promptSlug,
      email: email || null,
      phone: phone || null,
      identity_key: body.identity_key || null,
      anonymous_id: body.anonymous_id || null,
      journey_id: body.journey_id || null,
      responses_jsonb: body.responses && typeof body.responses === "object" ? body.responses : {},
      consent_mode: mode,
      consent_text: mode ? (body.consent_text || null) : null,
      consent_value: mode ? value : null,
      consent_declined: mode ? declined : false,
      page_url: body.page_url || null,
      ip_country: req.headers.get("x-vercel-ip-country") ?? null,
      cart_token: body.cart_token || null,
      cart_items_jsonb:
        Array.isArray(body.cart_items) && body.cart_items.length > 0 ? body.cart_items : null,
    });
  if (insertErr) {
    console.warn("[lead] insert failed:", insertErr.message);
    return reject(req, "insert_failed", clientKey, 500, "store_failed");
  }

  void logAuthAttempt({
    endpoint: "/api/chapter/lead",
    client_key: clientKey,
    success: true,
    ip_hash: hashIp(getClientIp(req)),
    user_agent_snippet: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    request_id: req.headers.get("x-vercel-id") ?? null,
  });

  // Fire-and-forget: forward the captured lead to whichever CRM this client
  // has configured (chapter_config.clients.crm_provider). Null-provider →
  // adapter is null → this is a no-op. This covers ALL identifying-submit
  // paths that call chapterPostLead in the pixel: Email Exchange (email +
  // phone modes) and Custom Form (identity fields). One central intercept
  // instead of wiring every endpoint. Failures log + swallow — never blocks
  // the visitor response.
  //
  // Only fires when we actually have raw email (crm.prospects has no unique
  // key that dedups on phone alone). Phone-only leads land in captured_leads
  // above but aren't mirrored to CRM until we add phone-dedup logic to the
  // internal adapter (or a client uses an external CRM that keys on phone).
  if (email) {
    const consentDeclined = mode ? declined : false;
    void (async () => {
      try {
        const adapter = await selectCrmAdapter(clientKey);
        if (!adapter) return;
        if (consentDeclined) {
          // Visitor picked "No" on a yes/no consent → still logged to
          // captured_leads for the audit trail, but we don't push into
          // marketing-oriented systems. Skip the CRM mirror.
          return;
        }
        await adapter.upsertLead({
          client_key: clientKey,
          prompt_slug: promptSlug,
          email,
          phone: phone || undefined,
          contact_name: undefined, // captured_leads doesn't currently split out contact_name; extend if operator asks
          responses:
            body.responses && typeof body.responses === "object"
              ? (body.responses as Record<string, unknown>)
              : null,
          page_url: body.page_url || null,
          ip_country: req.headers.get("x-vercel-ip-country") ?? null,
        });
      } catch (err) {
        console.warn(
          "[lead] CRM upsert failed:",
          err instanceof Error ? err.message : String(err),
        );
      }
    })();
  }

  return withCors(req, NextResponse.json({ stored: true }, { status: 200 }));
}
