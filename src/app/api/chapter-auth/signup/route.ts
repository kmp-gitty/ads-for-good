// POST /api/chapter-auth/signup
//
// Open self-serve signup (NO allowlist gate — anyone can create a tenant).
// Request: { full_name, phone, email, company }
// Response: { ok: true } | { ok: true, existing: true }
//
//   - If the email already has a chapter_config.users row, we send a normal
//     sign-in link (existing:true) and do NOT create a second tenant.
//   - Otherwise we stage the form data in chapter_config.pending_signups and
//     send a magic link pointing at the callback tagged ?signup=1. The callback
//     provisions the tenant only after the email is verified.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { findChapterUserByEmail } from "@/app/lib/auth/chapter-user";

export async function POST(req: NextRequest) {
  let body: {
    full_name?: string;
    phone?: string;
    email?: string;
    company?: string;
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

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (!fullName) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!company) return NextResponse.json({ error: "Company is required." }, { status: 400 });

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
