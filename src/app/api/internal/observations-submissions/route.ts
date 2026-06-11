// POST /api/internal/observations-submissions
//
// Receives a question submission from the Observations page Suggest-a-question
// drawer. Captures the proposed question + optional context + the user's
// email (via Supabase session) + the current client_key. Writes to
// chapter_observations.question_submissions with status='pending' for
// Chapter-team review.
//
// Authentication: same surface as the dashboard itself — either Supabase
// session OR the legacy CHAPTER_DASH_TOKEN cookie. Operators authenticated
// for /chapter/* can submit; everyone else gets 401.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getCurrentChapterUser } from "@/app/lib/auth/chapter-user";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const LEGACY_COOKIE = "chapter_auth";

export async function POST(req: NextRequest) {
  // Auth: prefer Supabase user; fall back to legacy token cookie.
  const chapterUser = await getCurrentChapterUser();
  let submittedByEmail: string | null = null;

  if (chapterUser) {
    submittedByEmail = chapterUser.email;
  } else {
    const expectedToken = process.env.CHAPTER_DASH_TOKEN;
    const cookieStore = await cookies();
    if (!expectedToken || cookieStore.get(LEGACY_COOKIE)?.value !== expectedToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    // Legacy-token sessions have no identity; leave email null.
  }

  let body: { client_key?: string; question_text?: string; context_text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clientKey = (body.client_key || "").trim();
  const questionText = (body.question_text || "").trim();
  const contextText = (body.context_text || "").trim() || null;

  if (!clientKey) {
    return NextResponse.json({ error: "missing_client_key" }, { status: 400 });
  }
  if (!questionText || questionText.length < 8) {
    return NextResponse.json(
      { error: "question_too_short", hint: "Minimum 8 characters" },
      { status: 400 },
    );
  }
  if (questionText.length > 1000) {
    return NextResponse.json(
      { error: "question_too_long", hint: "Maximum 1000 characters" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .schema("chapter_observations")
    .from("question_submissions")
    .insert({
      submitted_by_email: submittedByEmail,
      client_key: clientKey,
      question_text: questionText,
      context_text: contextText,
    });

  if (error) {
    console.error("[observations-submissions] insert failed:", error.message);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
