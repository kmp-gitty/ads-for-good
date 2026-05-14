// POST /api/chapter-auth { password } -> sets chapter_auth cookie on success.
// Stopgap until Supabase auth is wired. Compares the submitted password to
// CHAPTER_DASH_TOKEN env var (same value the middleware checks against).

import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "chapter_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const submitted = String(body?.password ?? "");
  const expected = process.env.CHAPTER_DASH_TOKEN;

  if (!expected) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!submitted || submitted !== expected) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

// DELETE clears the cookie (used by a sign-out button in the dashboard).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
