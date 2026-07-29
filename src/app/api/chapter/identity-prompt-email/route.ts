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

type CartItem = {
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
    prompt_slug?: string;
    recipient?: string;
    session_token?: string;
    hp_field?: string;  // honeypot — should always be empty
    cart_token?: string | null;
    cart_items?: CartItem[] | null;
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

  // Fetch prompt + client's storefront_domain in parallel — the latter powers
  // the {cart_url} + {cart_items_list} merge tokens for cart-abandon prompts.
  const [{ data: prompt, error: lookupErr }, { data: client }] = await Promise.all([
    supabase
      .schema("chapter_config")
      .from("identity_prompts")
      .select("post_submit_action, offer_code, offer_description, email_subject, email_body, enabled")
      .eq("client_key", clientKey)
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("storefront_domain")
      .eq("client_key", clientKey)
      .maybeSingle(),
  ]);

  if (lookupErr || !prompt) {
    return reject(req, "prompt_not_found", clientKey, 404, "prompt_not_found");
  }
  if (!prompt.enabled) {
    return reject(req, "prompt_disabled", clientKey, 400, "prompt_disabled");
  }
  const storefrontDomain = (client as { storefront_domain: string | null } | null)?.storefront_domain ?? null;
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

  // Cart merge tokens ({cart_url} + {cart_items_list}) — populated when the
  // pixel sent cart_token or cart_items and we know the client's storefront
  // domain. Both fall back to empty string if missing so operators never see
  // literal `{cart_url}` in a delivered email.
  const cartUrl = buildCartUrl(storefrontDomain, body.cart_token, body.cart_items);
  const cartItemsListText = buildCartItemsListText(body.cart_items);
  const cartItemsListHtml = buildCartItemsListHtml(body.cart_items);

  const subjectDefault = action === "email" ? "Your code: {offer_code}" : "A message for you";
  const subjectTemplate = (prompt.email_subject || subjectDefault).trim();
  const subject = substituteTokens(subjectTemplate, {
    offer_code: offerCode,
    cart_url: cartUrl,
    cart_items_list: cartItemsListText,  // plain text in subject
  });
  const bodyDefault = action === "email"
    ? "Thanks for signing up — here's your code:"
    : "Thanks for signing up!";
  const bodyTextRaw = (prompt.email_body || bodyDefault).trim();
  const bodyText = substituteTokens(bodyTextRaw, {
    offer_code: offerCode,
    cart_url: cartUrl,
    cart_items_list: cartItemsListText,
  });
  const showOfferBox = action === "email";

  try {
    const result = await resend.emails.send({
      from: `${SENDER_NAME} <${FROM_EMAIL}>`,
      to: recipient,
      replyTo: REPLY_TO,
      subject,
      html: buildHtmlBody(
        bodyTextRaw,
        showOfferBox ? offerCode : "",
        showOfferBox ? offerDescription : "",
        { cart_url: cartUrl, cart_items_list_html: cartItemsListHtml, cart_items_list_text: cartItemsListText, offer_code: offerCode },
      ),
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
    // CRM mirroring for this submission happens via /api/chapter/lead — the
    // pixel fires both endpoints for Email Exchange submits. See the CRM
    // adapter dispatch in /api/chapter/lead/route.ts. Adding it here would
    // create a duplicate metadata.submissions[] entry per prospect.
    return withCors(req, NextResponse.json({ sent: true }, { status: 200 }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.warn("[identity-prompt-email] threw:", msg);
    return reject(req, "send_threw", clientKey, 500, "send_failed");
  }
}

function buildHtmlBody(
  bodyText: string,
  code: string,
  description: string,
  tokens: { cart_url: string; cart_items_list_html: string; cart_items_list_text: string; offer_code: string },
): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Operator's body is plain text. Split on blank lines into paragraphs;
  // single newlines become <br/> within a paragraph.
  // {cart_url} — wraps as an <a> tag automatically for HTML.
  // {cart_items_list} — rendered as an HTML <ul> so the email shows the cart.
  // Body may contain [link text]({cart_url}) — we render those as anchors.
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => {
      // 1. Handle markdown-style [label](token) → <a href="tokenValue">label</a> for {cart_url}
      let out = p.replace(/\[([^\]]+)\]\(\{cart_url\}\)/g, (_m, label) => {
        if (!tokens.cart_url) return esc(label);
        return `<a href="${esc(tokens.cart_url)}" style="color: #C2410C; font-weight: 600; text-decoration: underline;">${esc(label)}</a>`;
      });
      // 2. Escape remaining text
      out = esc(out);
      // 3. Substitute standalone {cart_url} → bare URL text
      out = out.replace(/\{cart_url\}/g, esc(tokens.cart_url));
      // 4. Substitute {cart_items_list} → HTML list (pre-escaped in the helper)
      out = out.replace(/\{cart_items_list\}/g, tokens.cart_items_list_html);
      // 5. Offer code substitution (in case operator inline-referenced it)
      out = out.replace(/\{offer_code\}/g, esc(tokens.offer_code));
      // 6. Newlines → <br/>
      out = out.replace(/\n/g, "<br/>");
      return `<p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">${out}</p>`;
    })
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

// Substitute {token} pairs. Never leaves literal tokens in output; missing
// values render as empty string so operators don't see `{cart_url}` in a
// delivered email when the cart isn't available.
function substituteTokens(input: string, tokens: Record<string, string>): string {
  return input.replace(/\{([a-z_]+)\}/g, (_match, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : "",
  );
}

// {cart_url}: prefers cart_token (Shopify's persistent recovery URL, ~14d),
// falls back to a permalink built from line items (variant_id:qty pairs).
// Returns empty string when neither is available OR storefront_domain isn't set.
function buildCartUrl(
  storefrontDomain: string | null,
  cartToken: string | null | undefined,
  items: CartItem[] | null | undefined,
): string {
  if (!storefrontDomain) return "";
  const domain = storefrontDomain.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!domain) return "";
  if (cartToken) {
    // Shopify's built-in cart-recovery URL — /cart/c/<token> restores the cart.
    return `https://${domain}/cart/c/${encodeURIComponent(cartToken)}`;
  }
  if (items && items.length > 0) {
    // Fallback permalink — /cart/<variant1>:<qty1>,<variant2>:<qty2>
    // Works even if the visitor's original cart_token has expired.
    const parts = items
      .filter((it) => it.variant_id && Number(it.quantity) > 0)
      .map((it) => `${it.variant_id}:${Math.max(1, Number(it.quantity) || 1)}`);
    if (parts.length === 0) return "";
    return `https://${domain}/cart/${parts.join(",")}`;
  }
  return "";
}

function formatMoney(cents: number | null | undefined, currency: string): string {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function buildCartItemsListText(items: CartItem[] | null | undefined): string {
  if (!items || items.length === 0) return "";
  return items
    .map((it) => {
      const title = it.product_title || "";
      const variant = it.variant_title ? ` (${it.variant_title})` : "";
      const qty = Number(it.quantity) || 1;
      const price = formatMoney(it.line_price_cents ?? null, it.currency || "USD");
      return `  • ${title}${variant} × ${qty} — ${price}`;
    })
    .join("\n");
}

function buildCartItemsListHtml(items: CartItem[] | null | undefined): string {
  if (!items || items.length === 0) return "";
  const esc = (s: string) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = items
    .map((it) => {
      const title = it.product_title || "";
      const variant = it.variant_title ? ` <span style="color:#5C6B82;">(${esc(it.variant_title)})</span>` : "";
      const qty = Number(it.quantity) || 1;
      const price = formatMoney(it.line_price_cents ?? null, it.currency || "USD");
      return `<li style="margin: 4px 0; font-size: 14px; color: #1F2D43;"><strong>${esc(title)}</strong>${variant} × ${qty} — <span style="color:#5C6B82;">${esc(price)}</span></li>`;
    })
    .join("");
  return `<ul style="padding-left: 20px; margin: 12px 0;">${rows}</ul>`;
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
