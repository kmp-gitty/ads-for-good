// POST /api/chapter/prompt-response
//
// Receives a Custom Form preset submission from the Chapter pixel. Writes
// non-identity field values to chapter_engagement.prompt_responses; identity
// fields (email/phone with for_identity=true) flow through /api/identify
// client-side BEFORE this endpoint is called (so identity is established
// independently of response storage success).
//
// Defenses (same 3-layer pattern as /api/chapter/identity-prompt-email):
//   Layer 1 — Honeypot field (hp_field). Real humans never fill it.
//   Layer 2 — HMAC session token from GET /api/chapter/identity-prompts.
//   Layer 3 — Per-IP rate limit (20 per IP per hour — looser than the email
//             endpoint because response submissions don't trigger outbound
//             sends and the abuse cost is just DB writes).
//
// Every rejection writes to chapter_audit.api_auth_attempts with a structured
// failure_reason so the existing attack-alert cron picks them up.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";
import { verifyPromptSession } from "@/app/lib/auth/prompt-session";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Per-IP rate limit. 20/hour is looser than the email endpoint (10/hr)
// because response submissions don't trigger outbound sends.
const RATE_LIMIT_PER_HOUR = 20;
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
    endpoint: "/api/chapter/prompt-response",
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

export async function POST(req: NextRequest) {
  let body: {
    client_key?: string;
    prompt_id?: string;
    prompt_slug?: string;
    session_token?: string;
    hp_field?: string;
    responses?: Record<string, unknown>;
    anonymous_id?: string;
    journey_id?: string;
    identity_key?: string;
    variant_id?: string;
    page_url?: string;
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
  const hpField = body.hp_field;

  // Defense 1 — honeypot
  if (hpField && hpField.trim() !== "") {
    return reject(req, "honeypot_filled", clientKey, 400, "invalid_request");
  }

  if (!clientKey || !promptId || !promptSlug) {
    return reject(req, "missing_required_fields", clientKey, 400, "missing_required_fields");
  }

  // Defense 2 — session token (HMAC)
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

  // Validate prompt exists + belongs to this client + is enabled.
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

  // Write to chapter_engagement.prompt_responses
  const responses = (body.responses && typeof body.responses === "object")
    ? body.responses
    : {};

  const { error: insertErr } = await supabase
    .schema("chapter_engagement")
    .from("prompt_responses")
    .insert({
      client_key: clientKey,
      prompt_id: promptId,
      prompt_slug: promptSlug,
      identity_key: body.identity_key || null,
      anonymous_id: body.anonymous_id || null,
      journey_id: body.journey_id || null,
      variant_id: body.variant_id || null,
      responses_jsonb: responses,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      ip_country: req.headers.get("x-vercel-ip-country") ?? null,
      page_url: body.page_url || null,
    });

  if (insertErr) {
    console.warn("[prompt-response] insert failed:", insertErr.message);
    return reject(req, "insert_failed", clientKey, 500, "store_failed");
  }

  void logAuthAttempt({
    endpoint: "/api/chapter/prompt-response",
    client_key: clientKey,
    success: true,
    ip_hash: hashIp(getClientIp(req)),
    user_agent_snippet: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    request_id: req.headers.get("x-vercel-id") ?? null,
  });

  return withCors(req, NextResponse.json({ stored: true }, { status: 200 }));
}
