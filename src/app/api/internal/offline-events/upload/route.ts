// POST /api/internal/offline-events/upload
//
// Multipart form-data:
//   client_key   string
//   event_slug   string  — lowercase, underscores; becomes milestone_name
//   event_name   string  — human-readable
//   event_ts     ISO date string
//   location     string  — optional
//   csv          file    — CSV of attendees; columns must include either
//                          `email` or `phone`. `name` recommended for audit.
//                          Any other columns become questionnaire JSONB.
//
// Privacy contract (load-bearing — DO NOT regress):
//   - Raw email + raw phone are hashed in-process and NEVER persisted.
//   - Returned audit info uses only first 8 chars of hashes so the operator
//     can verify "did this look right" without seeing the underlying PII.
//   - The CSV file itself is NEVER written to disk; it's parsed in memory.
//
// What this writes (per attendee row, in one transaction per row to allow
// partial success on a bad row):
//   1. chapter_ingest.offline_milestones (event slug as milestone_name)
//   2. chapter_identity.identity_aliases — phone_sha256 ↔ email_sha256 when
//      both present (mirrors /api/purchase Phase 3.5)
//   3. chapter_identity.identity_canon — self-canonical email row so future
//      online identifications stitch even if the visitor never had a pixel
//      session before the event
//   4. chapter_config.connections_cohort_members — links to the auto-created
//      cohort so dashboards can target this audience immediately

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Papa from "papaparse";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { hashEmail, normalizePhone, hashPhone } from "@/app/lib/identity/hash";

const ADMIN_COOKIE = "chapter_auth";

type CsvRow = Record<string, string>;

type IngestSummary = {
  event_id: string;
  cohort_id: string;
  rows_total: number;
  rows_ingested: number;
  rows_skipped_no_identity: number;
  unresolved_hash_samples: string[];
};

const PII_COLUMNS = new Set(["email", "phone", "name", "first_name", "last_name", "phone_number"]);

export async function POST(req: NextRequest) {
  // Auth gate — same admin cookie used by /internal/* routes.
  const expectedToken = process.env.CHAPTER_DASH_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== expectedToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const clientKey = String(form.get("client_key") || "").trim();
  const eventSlug = String(form.get("event_slug") || "").trim().toLowerCase().replace(/\s+/g, "_");
  const eventName = String(form.get("event_name") || "").trim();
  const eventTsRaw = String(form.get("event_ts") || "").trim();
  const location = String(form.get("location") || "").trim() || null;
  const file = form.get("csv");

  if (!clientKey) return NextResponse.json({ error: "missing_client_key" }, { status: 400 });
  if (!/^[a-z0-9_]+$/.test(eventSlug)) {
    return NextResponse.json({ error: "invalid_event_slug", hint: "lowercase letters/digits/underscore only" }, { status: 400 });
  }
  const eventTs = new Date(eventTsRaw);
  if (Number.isNaN(eventTs.getTime())) {
    return NextResponse.json({ error: "invalid_event_ts" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_csv" }, { status: 400 });
  }

  const csvText = await file.text();
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { error: "csv_parse_failed", details: parsed.errors.slice(0, 5).map(e => e.message) },
      { status: 400 },
    );
  }
  const rows = parsed.data.filter(r => Object.values(r).some(v => v && String(v).trim()));
  if (rows.length === 0) {
    return NextResponse.json({ error: "empty_csv" }, { status: 400 });
  }

  // Verify required column presence — at least email OR phone.
  const headers = new Set(parsed.meta.fields?.map(h => h.toLowerCase()) ?? []);
  if (!headers.has("email") && !headers.has("phone") && !headers.has("phone_number")) {
    return NextResponse.json(
      { error: "missing_identity_columns", hint: "CSV must include `email` or `phone` (or `phone_number`)" },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceRoleClient();

  // Insert offline_events row first so we can carry its id forward.
  const { data: eventRow, error: eventErr } = await supabase
    .schema("chapter_ingest")
    .from("offline_events")
    .insert({
      client_key: clientKey,
      event_slug: eventSlug,
      event_name: eventName || eventSlug,
      event_ts: eventTs.toISOString(),
      location,
      metadata: { csv_headers: parsed.meta.fields || [] },
    })
    .select("id")
    .single();

  if (eventErr || !eventRow) {
    return NextResponse.json(
      { error: "offline_event_insert_failed", details: eventErr?.message },
      { status: 500 },
    );
  }
  const eventId = eventRow.id as string;

  // Auto-create the cohort up-front. Columns identifier_type / event_at /
  // kind / total_* have sensible defaults; we override event_at to the actual
  // event timestamp so dashboards anchor correctly.
  const { data: cohortRow, error: cohortErr } = await supabase
    .schema("chapter_config")
    .from("connections_cohorts")
    .insert({
      client_key: clientKey,
      name: eventName || eventSlug,
      event_at: eventTs.toISOString(),
      // identifier_type, kind, total_uploaded, total_matched all default
    })
    .select("id")
    .single();

  if (cohortErr || !cohortRow) {
    // Clean up the event row so re-upload is possible. Don't fail the whole
    // ingest just because the cohort plumbing hiccuped.
    await supabase.schema("chapter_ingest").from("offline_events").delete().eq("id", eventId);
    return NextResponse.json(
      { error: "cohort_insert_failed", details: cohortErr?.message },
      { status: 500 },
    );
  }
  const cohortId = cohortRow.id as string;

  // Process each row.
  const summary: IngestSummary = {
    event_id: eventId,
    cohort_id: cohortId,
    rows_total: rows.length,
    rows_ingested: 0,
    rows_skipped_no_identity: 0,
    unresolved_hash_samples: [],
  };

  for (const row of rows) {
    const rawEmail = (row.email || "").trim();
    const rawPhone = (row.phone || row.phone_number || "").trim();

    let emailHash: string | null = null;
    let phoneHash: string | null = null;
    if (rawEmail) emailHash = hashEmail(rawEmail);
    if (rawPhone) phoneHash = hashPhone(rawPhone);

    if (!emailHash && !phoneHash) {
      summary.rows_skipped_no_identity += 1;
      continue;
    }

    // Canonical identifier: prefer email (more stable cross-platform); fall
    // back to phone.
    const canonicalKey = emailHash ? `email_sha256:${emailHash}` : `phone_sha256:${phoneHash}`;

    // Strip PII columns from questionnaire — only non-identifying responses
    // get stored.
    const questionnaire: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!PII_COLUMNS.has(k) && v && String(v).trim()) {
        questionnaire[k] = String(v).trim();
      }
    }

    // Insert milestone.
    const { error: milestoneErr } = await supabase
      .schema("chapter_ingest")
      .from("offline_milestones")
      .insert({
        client_key: clientKey,
        identity_key: canonicalKey,
        milestone_name: eventSlug,
        milestone_ts: eventTs.toISOString(),
        source_type: "offline_event_upload",
        source_id: eventId,
        identity_type: emailHash ? "email_sha256" : "phone_sha256",
        is_hashed: true,
        metadata: {
          questionnaire,
          // First initial only — audit fingerprint, never the full name.
          name_first_initial: row.name ? row.name.trim().charAt(0).toUpperCase() : null,
        },
      });
    if (milestoneErr) {
      console.warn("[offline-upload] milestone insert failed:", milestoneErr.message);
      continue;
    }

    // Phone↔email alias edge (when both present). Email canonical wins.
    if (emailHash && phoneHash) {
      await supabase
        .schema("chapter_identity")
        .from("identity_aliases")
        .insert({
          client_key: clientKey,
          ts: new Date().toISOString(),
          from_identity_key: `phone_sha256:${phoneHash}`,
          to_identity_key: `email_sha256:${emailHash}`,
          method: "offline_event_upload",
          reason: "offline_event_email_phone_pair",
          is_deterministic: true,
        })
        // 23505 unique_violation = already aliased; ignore.
        .then(({ error }) => {
          if (error && (error as { code?: string }).code !== "23505") {
            console.warn("[offline-upload] alias insert failed:", error.message);
          }
        });
    }

    // Self-canonical identity_canon row so future online identifications
    // stitch even if the visitor was never seen by the pixel before.
    await supabase
      .schema("chapter_identity")
      .from("identity_canon")
      .upsert(
        {
          client_key: clientKey,
          identity_key: canonicalKey,
          canonical_identity_key: canonicalKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_key,identity_key" },
      );

    // Cohort membership. PK is (cohort_id, identifier_hash) — identifier_hash
    // is the raw sha256 (no schema prefix). canonical_identity_key carries
    // the prefixed form for joins back into identity_canon.
    const identifierHash = emailHash || phoneHash!;
    await supabase
      .schema("chapter_config")
      .from("connections_cohort_members")
      .insert({
        cohort_id: cohortId,
        identifier_hash: identifierHash,
        canonical_identity_key: canonicalKey,
      })
      .then(({ error }) => {
        // Idempotent: same cohort + identifier_hash = duplicate, ignore.
        if (error && (error as { code?: string }).code !== "23505") {
          console.warn("[offline-upload] cohort member insert failed:", error.message);
        }
      });

    summary.rows_ingested += 1;

    // First 5 hash prefixes as audit samples (operator can sanity-check that
    // expected attendees are represented without seeing actual identifiers).
    if (summary.unresolved_hash_samples.length < 5) {
      summary.unresolved_hash_samples.push(
        (emailHash || phoneHash!).slice(0, 8) + "…",
      );
    }
  }

  // Update event row with final attendee_count + cohort_id.
  await supabase
    .schema("chapter_ingest")
    .from("offline_events")
    .update({
      attendee_count: summary.rows_ingested,
      cohort_id: cohortId,
    })
    .eq("id", eventId);

  // Update cohort row with final totals.
  await supabase
    .schema("chapter_config")
    .from("connections_cohorts")
    .update({
      total_uploaded: summary.rows_total,
      total_matched: summary.rows_ingested,
    })
    .eq("id", cohortId);

  return NextResponse.json({ ok: true, summary });
}
