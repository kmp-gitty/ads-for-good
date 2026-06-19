// POST /api/chapter/identity-prompt-email
//
// Fired by the Chapter pixel after an identity-prompt submit when the
// configured post_submit_action is 'email'. Sends a transactional email
// containing the operator-configured offer to the recipient via Resend.
//
// Privacy contract: the recipient's raw email arrives here, is passed to
// Resend, and is never persisted. (The identity stitch happens separately
// via /api/identify with email_sha256.) No logging of recipient strings.
//
// CORS-mediated like /api/chapter/collect + /api/chapter/identity-prompts.
//
// Spam-amplification surface: any visitor can fire this with any recipient
// and trigger an outbound email. For v1 we accept the risk (small surface,
// low value to attackers vs the cost of friction added by per-IP rate
// limiting). Revisit if abuse appears.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";
import { verifyPromptSession } from "@/app/lib/auth/prompt-session";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SENDER_NAME = "ads for Good";
const REPLY_TO = "katoa@ads4good.com";

// In-memory IP rate limit. Map<ip, {count, reset_at}>. Reset hourly per IP.
// Limit: 10 sends per IP per hour. At scale across multiple Vercel
// instances, this becomes per-instance — still useful, since a bulk
// attacker would have to spray traffic across instances. Upgrade to
// Upstash/Vercel KV when we see actual instance-spray abuse.
const RATE_LIMIT_PER_HOUR = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; reset_at: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset_at) {
    rateLimitMap.set(ip, { count: 1, reset_at: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_PER_HOUR - 1 };
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_PER_HOUR - entry.count };
}

// Bound the map size — drop oldest entries past 5000 IPs to prevent unbounded
// memory growth on long-running instances. Cheap O(n) sweep at insert time.
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
  // Audit log every rejection. Powers the future attack-attempt alert.
  void logAuthAttempt({
    endpoint: "/api/chapter/identity-prompt-email",
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
    prompt_slug?: string;
    recipient?: string;
    session_token?: string;
    hp_field?: string;  // honeypot — should always be empty
  };
  try {
    body = await req.json();
  } catch {
    return reject(req, "invalid_json", "", 400, "invalid_json");
  }

  const clientKey = (body.client_key || "").trim();
  const slug = (body.prompt_slug || "").trim();
  const recipient = (body.recipient || "").trim();
  const sessionToken = (body.session_token || "").trim();
  const hpField = body.hp_field;

  // Defense 1 — honeypot. Real humans never see this field; bots that
  // fill all inputs reveal themselves cheaply (no DB hit yet).
  if (hpField && hpField.trim() !== "") {
    return reject(req, "honeypot_filled", clientKey, 400, "invalid_request");
  }

  if (!clientKey || !slug || !recipient) {
    return reject(req, "missing_required_fields", clientKey, 400, "missing_required_fields");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
    return reject(req, "invalid_email", clientKey, 400, "invalid_email");
  }

  // Defense 2 — session token. Verifies the visitor's browser fetched
  // /api/chapter/identity-prompts in the last 30 min for THIS client_key.
  // Fail-closed: no CHAPTER_PROMPT_SECRET configured = reject all sends.
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

  // Defense 3 — per-IP rate limit. 10 sends per IP per hour. Catches anyone
  // who got past defenses 1 and 2. Fall back to a shared "unknown" bucket
  // when no IP is resolvable (local dev / proxy stripping) — still rate-
  // limits, just collides legit and attacker traffic in that bucket.
  const ip = getClientIp(req) ?? "unknown";
  maybeEvictOldest();
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return reject(req, "rate_limited", clientKey, 429, "rate_limited");
  }

  const { data: prompt, error: lookupErr } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .select("post_submit_action, offer_code, offer_description, email_subject, email_body, enabled")
    .eq("client_key", clientKey)
    .eq("slug", slug)
    .maybeSingle();

  if (lookupErr || !prompt) {
    return reject(req, "prompt_not_found", clientKey, 404, "prompt_not_found");
  }
  if (!prompt.enabled) {
    return reject(req, "prompt_disabled", clientKey, 400, "prompt_disabled");
  }
  const action = prompt.post_submit_action;
  if (action !== "email" && action !== "email_message") {
    return reject(req, "wrong_action", clientKey, 400, "wrong_action");
  }
  if (action === "email" && !prompt.offer_code) {
    return reject(req, "no_offer_code", clientKey, 400, "no_offer_code");
  }
  if (action === "email_message" && !prompt.email_body) {
    return reject(req, "no_body", clientKey, 400, "no_body");
  }

  if (!RESEND_API_KEY || !FROM_EMAIL) {
    console.warn("[identity-prompt-email] RESEND_API_KEY or FROM_EMAIL not set; email not sent");
    return withCors(req, NextResponse.json({ sent: false, reason: "not_configured" }, { status: 200 }));
  }

  const resend = new Resend(RESEND_API_KEY);
  const offerCode = prompt.offer_code || "";
  const offerDescription = prompt.offer_description || "";
  const subjectDefault = action === "email" ? "Your code: {offer_code}" : "A message for you";
  const subjectTemplate = (prompt.email_subject || subjectDefault).trim();
  const subject = subjectTemplate.replace(/\{offer_code\}/g, offerCode);
  const bodyDefault = action === "email"
    ? "Thanks for signing up — here's your code:"
    : "Thanks for signing up!";
  const bodyText = (prompt.email_body || bodyDefault).trim();
  const showOfferBox = action === "email";

  try {
    const result = await resend.emails.send({
      from: `${SENDER_NAME} <${FROM_EMAIL}>`,
      to: recipient,
      replyTo: REPLY_TO,
      subject,
      html: buildHtmlBody(bodyText, showOfferBox ? offerCode : "", showOfferBox ? offerDescription : ""),
      text: buildTextBody(bodyText, showOfferBox ? offerCode : "", showOfferBox ? offerDescription : ""),
    });
    if (result.error) {
      console.warn("[identity-prompt-email] Resend error:", result.error.message);
      return reject(req, "send_failed", clientKey, 500, "send_failed");
    }
    void logAuthAttempt({
      endpoint: "/api/chapter/identity-prompt-email",
      client_key: clientKey,
      success: true,
      ip_hash: hashIp(getClientIp(req)),
      user_agent_snippet: req.headers.get("user-agent")?.slice(0, 200) ?? null,
      request_id: req.headers.get("x-vercel-id") ?? null,
    });
    return withCors(req, NextResponse.json({ sent: true }, { status: 200 }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.warn("[identity-prompt-email] threw:", msg);
    return reject(req, "send_threw", clientKey, 500, "send_failed");
  }
}

function buildHtmlBody(bodyText: string, code: string, description: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Operator's body is plain text. Split on blank lines into paragraphs;
  // single newlines become <br/> within a paragraph.
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map(p => `<p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const offerBlock = code
    ? `<p style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.08em; padding: 16px 24px; background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; display: inline-block; color: #C2410C; margin: 8px 0;">${esc(code)}</p>${description ? `<p style="font-size: 14px; color: #5C6B82;">${esc(description)}</p>` : ""}`
    : "";
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2D43; padding: 24px; max-width: 560px; margin: 0 auto;">
  ${paragraphs}
  ${offerBlock}
  <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px;">— ${esc(SENDER_NAME)}</p>
</body></html>`;
}

function buildTextBody(bodyText: string, code: string, description: string): string {
  const lines: string[] = [bodyText];
  if (code) {
    lines.push("", `  ${code}`);
    if (description) lines.push("", description);
  }
  lines.push("", `— ${SENDER_NAME}`);
  return lines.join("\n");
}
