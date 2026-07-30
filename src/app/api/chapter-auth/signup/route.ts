// POST /api/chapter-auth/signup
//
// Open self-serve signup (NO allowlist gate — anyone can create a tenant).
// Request: { full_name, phone, email, company, hp_field?, turnstile_token? }
// Response: { ok: true } | { ok: true, existing: true }
//
//   - If the email already has a chapter_config.users row, we send a normal
//     sign-in link (existing:true) and do NOT create a second tenant.
//   - Otherwise we stage the form data in chapter_config.pending_signups and
//     send a magic link pointing at the callback tagged ?signup=1. The callback
//     provisions the tenant only after the email is verified.
//
// Abuse hardening (added 2026-07-30 after a signup-form email-bombing incident:
// 40 distinct victim emails sprayed over 5 days, escalating, each triggering a
// branded magic-link email — a deliverability-reputation risk to ads4good.com's
// whole transactional stream). Because this endpoint sends a branded email to
// an arbitrary attacker-supplied address, it carries the same 3-layer defense
// the pixel submit endpoints use:
//   Layer 1 — Honeypot field (hp_field). Bots that fill every input are silently
//             dropped (we return ok:true but send nothing, so they don't learn).
//   Layer 2 — Cloudflare Turnstile CAPTCHA (turnstile_token). Primary control.
//             Fail-open until TURNSTILE_SECRET_KEY is set (see lib/auth/turnstile).
//   Layer 3 — Per-IP rate limit (5/hr). Defense-in-depth; in-memory per instance.
// Every rejection is logged to chapter_audit.api_auth_attempts so the existing
// attack-alert cron surfaces patterns. The sibling /magic-link route needs none
// of this — it's allowlist-gated and can only email pre-existing users.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { findChapterUserByEmail } from "@/app/lib/auth/chapter-user";
import { verifyTurnstile } from "@/app/lib/auth/turnstile";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";

const RATE_LIMIT_PER_HOUR = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; reset_at: number }>();

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ipHash);
  if (!entry || now > entry.reset_at) {
    rateLimitMap.set(ipHash, { count: 1, reset_at: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) return false;
  entry.count += 1;
  return true;
}

function maybeEvictOldest() {
  if (rateLimitMap.size < 5000) return;
  const now = Date.now();
  for (const [ipHash, entry] of rateLimitMap) {
    if (now > entry.reset_at) rateLimitMap.delete(ipHash);
  }
}

function logReject(req: NextRequest, reason: string) {
  void logAuthAttempt({
    endpoint: "/api/chapter-auth/signup",
    client_key: "self_serve_signup",
    success: false,
    failure_reason: reason,
    ip_hash: hashIp(getClientIp(req)),
    user_agent_snippet: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    request_id: req.headers.get("x-vercel-id") ?? null,
  });
}

export async function POST(req: NextRequest) {
  let body: {
    full_name?: string;
    phone?: string;
    email?: string;
    company?: string;
    hp_field?: string;
    turnstile_token?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const fullName = (body.full_name || "").trim();
  const phone = (body.phone || "").trim();
  const company = (body.company || "").trim();

  // Layer 1 — honeypot. Silently pretend success (return ok, send no email) so
  // automated fillers don't learn they were caught.
  if (body.hp_field && String(body.hp_field).trim() !== "") {
    logReject(req, "honeypot_filled");
    return NextResponse.json({ ok: true });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (!fullName) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!company) return NextResponse.json({ error: "Company is required." }, { status: 400 });

  // Layer 3 — per-IP rate limit. Runs before the Turnstile network call so a
  // flood is turned away by the cheap in-memory check instead of burning
  // Cloudflare siteverify quota.
  maybeEvictOldest();
  if (!checkRateLimit(hashIp(getClientIp(req)) ?? "unknown")) {
    logReject(req, "rate_limited");
    return NextResponse.json(
      { error: "Too many signups from this network. Try again later." },
      { status: 429 },
    );
  }

  // Layer 2 — Turnstile CAPTCHA (fail-open until TURNSTILE_SECRET_KEY is set).
  const captcha = await verifyTurnstile(body.turnstile_token, getClientIp(req));
  if (!captcha.ok) {
    logReject(req, `turnstile_${captcha.reason}`);
    return NextResponse.json(
      { error: "Please complete the verification and try again." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const origin = req.nextUrl.origin;

  // Already have an account? Send a plain sign-in link, don't provision again.
  const existingUser = await findChapterUserByEmail(email);
  if (existingUser) {
    const emailRedirectTo = `${origin}/chapter/auth/callback?next=${encodeURIComponent("/chapter")}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: true },
    });
    if (error) console.warn("[signup] existing-user signInWithOtp failed:", error.message);
    return NextResponse.json({ ok: true, existing: true });
  }

  // Stage the signup form data until the email is verified in the callback.
  const { error: pendingError } = await supabase
    .schema("chapter_config")
    .from("pending_signups")
    .upsert(
      { email, full_name: fullName || null, phone: phone || null, company },
      { onConflict: "email" },
    );
  if (pendingError) {
    console.error("[signup] pending upsert failed:", pendingError.message);
    return NextResponse.json({ error: "Could not start signup. Try again." }, { status: 500 });
  }

  // Send the open magic link, tagged so the callback knows to provision.
  const emailRedirectTo = `${origin}/chapter/auth/callback?signup=1`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo, shouldCreateUser: true },
  });
  if (error) {
    console.error("[signup] signInWithOtp failed:", error.message);
    return NextResponse.json({ error: "Could not send the activation email. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
