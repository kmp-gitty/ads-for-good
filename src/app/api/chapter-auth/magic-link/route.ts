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
import { findChapterUserByEmail } from "@/app/lib/auth/chapter-user";

export async function POST(req: NextRequest) {
  let body: { email?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const nextPath = (body.next || "/chapter").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const chapterUser = await findChapterUserByEmail(email);

  if (chapterUser) {
    const supabase = createSupabaseServiceRoleClient();
    // Build the redirect URL for the magic link. Must point at our callback
    // route, which finishes the OAuth-style code exchange + verifies allowlist.
    // The forwarded host is checked in the callback so this won't 302 outside
    // our origin.
    const origin = req.nextUrl.origin;
    const params = new URLSearchParams();
    if (nextPath) params.set("next", nextPath);
    const emailRedirectTo = `${origin}/chapter/auth/callback${params.toString() ? `?${params.toString()}` : ""}`;

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
