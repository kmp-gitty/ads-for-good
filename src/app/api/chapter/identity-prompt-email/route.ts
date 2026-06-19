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

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const SENDER_NAME = "ads for Good";
const REPLY_TO = "katoa@ads4good.com";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsPreflightHeaders(req) });
}

export async function POST(req: NextRequest) {
  let body: { client_key?: string; prompt_slug?: string; recipient?: string };
  try {
    body = await req.json();
  } catch {
    return withCors(req, NextResponse.json({ error: "invalid_json" }, { status: 400 }));
  }

  const clientKey = (body.client_key || "").trim();
  const slug = (body.prompt_slug || "").trim();
  const recipient = (body.recipient || "").trim();

  if (!clientKey || !slug || !recipient) {
    return withCors(req, NextResponse.json({ error: "missing_required_fields" }, { status: 400 }));
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
    return withCors(req, NextResponse.json({ error: "invalid_email" }, { status: 400 }));
  }

  const { data: prompt, error: lookupErr } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .select("post_submit_action, offer_code, offer_description, email_subject, email_body, enabled")
    .eq("client_key", clientKey)
    .eq("slug", slug)
    .maybeSingle();

  if (lookupErr || !prompt) {
    return withCors(req, NextResponse.json({ error: "prompt_not_found" }, { status: 404 }));
  }
  if (!prompt.enabled) {
    return withCors(req, NextResponse.json({ error: "prompt_disabled" }, { status: 400 }));
  }
  if (prompt.post_submit_action !== "email") {
    return withCors(req, NextResponse.json({ error: "wrong_action" }, { status: 400 }));
  }
  if (!prompt.offer_code) {
    return withCors(req, NextResponse.json({ error: "no_offer_code" }, { status: 400 }));
  }

  if (!RESEND_API_KEY || !FROM_EMAIL) {
    console.warn("[identity-prompt-email] RESEND_API_KEY or FROM_EMAIL not set; email not sent");
    return withCors(req, NextResponse.json({ sent: false, reason: "not_configured" }, { status: 200 }));
  }

  const resend = new Resend(RESEND_API_KEY);
  const offerCode = prompt.offer_code;
  const offerDescription = prompt.offer_description || "";
  const subjectTemplate = (prompt.email_subject || "Your code: {offer_code}").trim();
  const subject = subjectTemplate.replace(/\{offer_code\}/g, offerCode);
  const bodyText = (prompt.email_body || "Thanks for signing up — here's your code:").trim();

  try {
    const result = await resend.emails.send({
      from: `${SENDER_NAME} <${FROM_EMAIL}>`,
      to: recipient,
      replyTo: REPLY_TO,
      subject,
      html: buildHtmlBody(bodyText, offerCode, offerDescription),
      text: buildTextBody(bodyText, offerCode, offerDescription),
    });
    if (result.error) {
      console.warn("[identity-prompt-email] Resend error:", result.error.message);
      return withCors(req, NextResponse.json({ sent: false, reason: "send_failed" }, { status: 500 }));
    }
    return withCors(req, NextResponse.json({ sent: true }, { status: 200 }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.warn("[identity-prompt-email] threw:", msg);
    return withCors(req, NextResponse.json({ sent: false, reason: "send_failed" }, { status: 500 }));
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
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2D43; padding: 24px; max-width: 560px; margin: 0 auto;">
  ${paragraphs}
  <p style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.08em; padding: 16px 24px; background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; display: inline-block; color: #C2410C; margin: 8px 0;">${esc(code)}</p>
  ${description ? `<p style="font-size: 14px; color: #5C6B82;">${esc(description)}</p>` : ""}
  <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px;">— ${esc(SENDER_NAME)}</p>
</body></html>`;
}

function buildTextBody(bodyText: string, code: string, description: string): string {
  return [
    bodyText,
    ``,
    `  ${code}`,
    ``,
    description,
    ``,
    `— ${SENDER_NAME}`,
  ]
    .filter(Boolean)
    .join("\n");
}
