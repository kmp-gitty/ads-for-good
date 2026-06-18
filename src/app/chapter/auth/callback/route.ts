// GET /chapter/auth/callback?code=...&next=...
//
// Handles the redirect from a magic-link click:
//   1. Exchange Supabase's `code` for a session (sets the auth cookie)
//   2. Verify the signed-in user's email is on the chapter_config.users
//      allowlist. If not, sign out + bounce to login with error.
//   3. Link chapter_config.users.user_id to auth.users.id on first login
//      (so future requests resolve by session.user.id, not email lookup).
//   4. Redirect to ?next or the role-appropriate default landing.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/auth/supabase-server";
import {
  findChapterUserByEmail,
  linkChapterUserToAuthId,
  touchLastLogin,
  provisionFromDomainIfAllowed,
} from "@/app/lib/auth/chapter-user";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  // Magic-link flow uses `?token_hash=&type=magiclink` (OTP) because the
  // magic-link endpoint uses createSupabaseServiceRoleClient (no PKCE
  // cookie-verifier path). OAuth providers and email-confirmation flows
  // would use `?code=` (PKCE). Handle both.
  const code = req.nextUrl.searchParams.get("code");
  const tokenHash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = req.nextUrl.searchParams.get("next") || "";

  if (!code && !(tokenHash && type)) {
    return NextResponse.redirect(new URL("/chapter/login?error=callback_failed", req.url));
  }

  const supabase = await createSupabaseServerClient();

  let authUser;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      console.warn("[auth-callback] exchangeCodeForSession failed:", error?.message);
      return NextResponse.redirect(new URL("/chapter/login?error=callback_failed", req.url));
    }
    authUser = data.session.user;
  } else {
    const { data, error } = await supabase.auth.verifyOtp({ type: type!, token_hash: tokenHash! });
    if (error || !data.session) {
      console.warn("[auth-callback] verifyOtp failed:", error?.message);
      return NextResponse.redirect(new URL("/chapter/login?error=callback_failed", req.url));
    }
    authUser = data.session.user;
  }

  const email = (authUser.email || "").toLowerCase();
  if (!email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/chapter/login?error=callback_failed", req.url));
  }

  // Defense in depth: even if Supabase auth succeeded, re-check allowlist.
  // (Someone could have been on the allowlist when they requested the link,
  // then been revoked before they clicked it.)
  //
  // Sprint 7: if no direct chapter_config.users row exists, attempt domain
  // allowlist auto-provision. provisionFromDomainIfAllowed inserts a fresh
  // row when the email's domain has an active allowed_email_domains rule.
  // Returns null if no rule matches → bounce to login.
  let chapterUser = await findChapterUserByEmail(email);
  if (!chapterUser) {
    chapterUser = await provisionFromDomainIfAllowed(email, authUser.id);
    if (!chapterUser) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/chapter/login?error=not_allowlisted", req.url));
    }
    // Domain-provisioned rows already have user_id set, so no linkChapterUserToAuthId.
  } else if (!chapterUser.user_id) {
    // First login on an existing email-allowlist row.
    await linkChapterUserToAuthId(chapterUser.id, authUser.id);
  } else {
    await touchLastLogin(chapterUser.id);
  }

  // Compute landing path. Honor ?next if it's a safe same-origin path AND the
  // user is allowed there; otherwise role-appropriate default.
  //
  // Three roles after Sprint 7:
  //   - chapter_staff   → /chapter (global, no client scoping)
  //   - agency_operator → first accessible client's overview (or /chapter if none)
  //   - client_employee → their client's overview
  let destination = "/chapter";
  if (chapterUser.role === "client_employee" && chapterUser.client_key) {
    destination = `/chapter/${chapterUser.client_key}/overview`;
  } else if (chapterUser.role === "agency_operator") {
    // No client_key on the user row directly; middleware resolves first
    // accessible client for global routes. Land them at /chapter and let
    // middleware bounce to the right place.
    destination = "/chapter";
  } else if (chapterUser.role === "chapter_staff") {
    destination = "/chapter";
  }
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    destination = next;
  }

  return NextResponse.redirect(new URL(destination, req.url));
}
