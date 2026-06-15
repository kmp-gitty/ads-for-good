// POST /api/internal/observations/severity-override
//
// Manually override the engine-computed severity on an Observations finding.
// Operators use this when a finding's auto-severity is wrong for their
// context (e.g. Black Friday traffic spike triggering an A1 high-severity
// shift that's actually expected). The override persists on the finding row
// until cleared. The state machine + dedup logic preserves the override
// across cron runs — only severity is overridden, not the rest.
//
// Body: { client_key, question_id, subject_key, severity, reason? }
//   severity: 'high' | 'med' | 'low' | null  (null = clear override)
//   reason:   optional free text, max 500 chars (audit trail)
//
// Auth: same surface as the dashboard — Supabase session OR legacy
// CHAPTER_DASH_TOKEN cookie. Operator email captured when available (used
// for manual_override_by audit field).

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
const VALID_SEVERITIES = new Set(["high", "med", "low"]);

export async function POST(req: NextRequest) {
  // Auth
  const chapterUser = await getCurrentChapterUser();
  let overrideBy: string | null = null;
  if (chapterUser) {
    overrideBy = chapterUser.email;
  } else {
    const expectedToken = process.env.CHAPTER_DASH_TOKEN;
    const cookieStore = await cookies();
    if (!expectedToken || cookieStore.get(LEGACY_COOKIE)?.value !== expectedToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    // Legacy session — no identity attached.
  }

  let body: {
    client_key?: string;
    question_id?: string;
    subject_key?: string;
    severity?: string | null;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clientKey  = (body.client_key  || "").trim();
  const questionId = (body.question_id || "").trim();
  const subjectKey = (body.subject_key || "").trim();
  const severity   = body.severity === null ? null : (body.severity || "").trim();
  const reason     = (body.reason || "").trim() || null;

  if (!clientKey || !questionId || !subjectKey) {
    return NextResponse.json({ error: "missing_finding_identifiers" }, { status: 400 });
  }
  if (severity !== null && !VALID_SEVERITIES.has(severity)) {
    return NextResponse.json(
      { error: "invalid_severity", hint: "Must be 'high' | 'med' | 'low' | null" },
      { status: 400 },
    );
  }
  if (reason && reason.length > 500) {
    return NextResponse.json(
      { error: "reason_too_long", hint: "Maximum 500 characters" },
      { status: 400 },
    );
  }

  // Two operations in one route, differentiated by severity value:
  //   set:   manual_severity_override = severity, audit fields populated
  //   clear: manual_severity_override = NULL, audit fields cleared
  const update = severity === null
    ? {
        manual_severity_override: null,
        manual_override_reason:   null,
        manual_override_by:       null,
        manual_override_at:       null,
      }
    : {
        manual_severity_override: severity,
        manual_override_reason:   reason,
        manual_override_by:       overrideBy,
        manual_override_at:       new Date().toISOString(),
      };

  const { data, error } = await supabase
    .schema("chapter_observations")
    .from("findings")
    .update(update)
    .eq("client_key", clientKey)
    .eq("question_id", questionId)
    .eq("subject_key", subjectKey)
    .select("question_id, subject_key, severity, manual_severity_override");

  if (error) {
    console.error("[severity-override] update failed:", error.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "finding_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, action: severity === null ? "cleared" : "set" });
}
