// POST /api/chapter-auth/magic-link
//
// Request: { email: string, next?: string }
// Response: { ok: true } regardless of whether the email is on the allowlist.
//
// The allowlist is enforced here: we look up the email in chapter_config.users
// FIRST, and only call Supabase signInWithOtp if a non-revoked row exists.
// The user-facing response is the same either way so the allowlist isn't
// leaked via timing or error messages.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { findChapterUserByEmail, findAllowedDomainForEmail } from "@/app/lib/auth/chapter-user";

export async function POST(req: NextRequest) {
  let body: { email?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  // No default landing here — when `next` is absent the callback computes the
  // role/entitlement-appropriate destination (self-serve → /home, full client
  // → /overview, staff → /chapter). Defaulting to "/chapter" used to override
  // that and dump everyone on the operator Observations page.
  const nextPath = (body.next || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const chapterUser = await findChapterUserByEmail(email);

  // Sprint 7 — domain allowlist. If no exact-match users row exists, check
  // whether the email's domain is auto-provisionable. The actual provision
  // happens in the callback (after Supabase confirms the visitor controls
  // the inbox), but we let the magic link send here so first-time
  // auto-provision users can complete the round-trip.
  const domainRule = chapterUser ? null : await findAllowedDomainForEmail(email);
  const isAuthorized = chapterUser !== null || domainRule !== null;

  // Agency-staff bypass (June 15, 2026): @ads4good.com addresses on the
  // allowlist skip magic-link entirely and get the legacy CHAPTER_DASH_TOKEN
  // cookie set directly. Rationale: the agency owns the domain, only agency
  // staff can claim those addresses, and SMTP rate limits on Supabase's free
  // tier were blocking active dev work. Security model is "trust the agency
  // domain + allowlist membership" — same circle of trust as the original
  // shared-token cookie (Sprint 5 predecessor) that this bypass restores.
  if (chapterUser && email.endsWith("@ads4good.com")) {
    const expectedToken = process.env.CHAPTER_DASH_TOKEN;
    if (expectedToken) {
      const res = NextResponse.json({
        ok: true,
        bypass: true,
        redirect: nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : "/chapter",
      });
      res.cookies.set("chapter_auth", expectedToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 14, // 14 days
      });
      return res;
    }
    // CHAPTER_DASH_TOKEN unset → fall through to magic link path (won't 503
    // the user, just makes them go through email).
  }

  if (isAuthorized) {
    const supabase = createSupabaseServiceRoleClient();
    // Build the redirect URL for the magic link. Must point at our callback
    // route, which finishes the OAuth-style code exchange + verifies allowlist.
    // The forwarded host is checked in the callback so this won't 302 outside
    // our origin.
    const origin = req.nextUrl.origin;
    // `login=1` is a stable base query param: it guarantees emailRedirectTo
    // always carries a "?" so the email template can safely append
    // "&token_hash=...&type=magiclink" and produce a valid URL. The callback
    // ignores it (only `signup=1` is meaningful there). `next` is added only
    // when the caller (e.g. a bookmarked deep link) provided one.
    const params = new URLSearchParams({ login: "1" });
    if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      params.set("next", nextPath);
    }
    const emailRedirectTo = `${origin}/chapter/auth/callback?${params.toString()}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        // Don't auto-create Supabase users — every login MUST correspond to a
        // pre-existing chapter_config.users row. If a user is in
        // chapter_config but never signed up on Supabase before, this triggers
        // first-time signup; otherwise it's a returning login.
        shouldCreateUser: true,
      },
    });
    if (error) {
      console.warn("[magic-link] signInWithOtp failed:", error.message);
      // Still return ok so the allowlist isn't leaked. Operators can re-try
      // and the issue will show up in logs.
    }
  }

  // Always 200 — response shape is identical whether the email is on the
  // allowlist or not.
  return NextResponse.json({ ok: true });
}
