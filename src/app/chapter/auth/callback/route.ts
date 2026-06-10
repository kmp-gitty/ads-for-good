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
} from "@/app/lib/auth/chapter-user";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "";

  if (!code) {
    return NextResponse.redirect(new URL("/chapter/login?error=callback_failed", req.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    console.warn("[auth-callback] exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(new URL("/chapter/login?error=callback_failed", req.url));
  }

  const authUser = data.session.user;
  const email = (authUser.email || "").toLowerCase();
  if (!email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/chapter/login?error=callback_failed", req.url));
  }

  // Defense in depth: even if Supabase auth succeeded, re-check allowlist.
  // (Someone could have been on the allowlist when they requested the link,
  // then been revoked before they clicked it.)
  const chapterUser = await findChapterUserByEmail(email);
  if (!chapterUser) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/chapter/login?error=not_allowlisted", req.url));
  }

  // First login: link the IDs so future middleware can lookup by user_id.
  if (!chapterUser.user_id) {
    await linkChapterUserToAuthId(chapterUser.id, authUser.id);
  } else {
    await touchLastLogin(chapterUser.id);
  }

  // Compute landing path. Honor ?next if it's a safe same-origin path AND the
  // user is allowed there; otherwise role-appropriate default.
  let destination = "/chapter";
  if (chapterUser.role === "client_employee" && chapterUser.client_key) {
    destination = `/chapter/${chapterUser.client_key}/observations`;
  } else if (chapterUser.role === "agency_operator") {
    destination = chapterUser.client_key
      ? `/chapter/${chapterUser.client_key}/observations`
      : "/chapter/observations";
  }
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    destination = next;
  }

  return NextResponse.redirect(new URL(destination, req.url));
}
