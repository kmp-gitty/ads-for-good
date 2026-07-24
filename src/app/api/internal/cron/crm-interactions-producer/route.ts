import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// crm.interactions producer — nightly cron.
//
// Bridges signals OBSERVED about a prospect into crm.interactions:
//
//   1. Site visits:  chapter_journey.journeys × chapter_identity.identity_links
//      joined to a prospect's email_sha256 canonical. One interaction per
//      new journey for adsforgood_prod. type='site_visit', source='chapter_pixel'.
//
//   2. Inquiry submissions:  chapter_inquiries.threads where created_by_email
//      matches a prospect's email. One interaction per new thread.
//      type='inquiry', source='chapter_inquiry'. (Note: the internal source
//      label in results/GChat alerts below is still 'inquiry_submitted' —
//      that's the branch label, distinct from the DB type value.)
//
// Both producers are idempotent via partial UNIQUE indexes on
// metadata->>'journey_id' / metadata->>'thread_id'. Reruns are safe.
//
// Hard limit per run (LIMIT 500 per source) prevents one bad day from
// blasting the table — typical daily volume should be << 100.
//
// Schedule: 06:30 UTC daily, after observations engine (05:00) and after
// connections-snapshots (05:30) so any signal-shape changes elsewhere have
// landed.

export const maxDuration = 300;

const TARGET_CLIENT_KEY = "adsforgood_prod";
const PER_SOURCE_LIMIT = 500;

type Result = {
  source: "site_visit" | "inquiry_submitted";
  inserted: number;
  ms: number;
};

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  const conn = process.env.DATABASE_DIRECT_URL;
  if (!conn) {
    return NextResponse.json({ error: "DATABASE_DIRECT_URL not configured" }, { status: 500 });
  }

  const sql = postgres(conn, {
    ssl: "require",
    prepare: false,
    max: 1,
    keep_alive: 60,
    connect_timeout: 10,
  });

  const results: Result[] = [];
  const errors: { source: string; error: string }[] = [];

  try {
    await sql`SET statement_timeout = '5min'`;

    // ── Site visits ──────────────────────────────────────────────────────────
    // Pixel events flow into chapter_ingest.pixel_events with a raw identity_key.
    // chapter_identity.identity_links bridges journey_id → canonical_identity_key
    // (via the canonical resolver), so we use it as the JOIN backbone here.
    //
    // For each (prospect, journey) pair where canonical matches the prospect's
    // email_sha256, INSERT one interaction. Dedup via ON CONFLICT on the
    // partial unique index over (prospect_id, metadata->>'journey_id').
    const siteStart = Date.now();
    try {
      const inserted = await sql<{ inserted: number }[]>`
        WITH prospect_keys AS (
          SELECT id AS prospect_id,
                 'email_sha256:' || encode(digest(lower(email), 'sha256'), 'hex') AS canonical_key
          FROM crm.prospects
          WHERE email IS NOT NULL AND chapter_seeded = true
        ),
        candidate_journeys AS (
          SELECT
            pk.prospect_id,
            il.journey_id,
            j.first_seen   AS occurred_at,
            j.first_touch,
            j.country,
            j.city
          FROM prospect_keys pk
          JOIN chapter_identity.identity_links il
            ON il.identity_key = pk.canonical_key
           AND il.client_key   = ${TARGET_CLIENT_KEY}
          JOIN chapter_journey.journeys j
            ON j.id          = il.journey_id
           AND j.client_key  = ${TARGET_CLIENT_KEY}
          ORDER BY j.first_seen DESC
          LIMIT ${PER_SOURCE_LIMIT}
        ),
        ins AS (
          INSERT INTO crm.interactions
            (prospect_id, type, source, occurred_at, summary, metadata)
          SELECT
            cj.prospect_id,
            'site_visit',
            'chapter_pixel',
            cj.occurred_at,
            CASE
              WHEN cj.first_touch ? 'utm_source' THEN 'Visit via ' || (cj.first_touch->>'utm_source')
              WHEN cj.first_touch->>'referrer' IS NOT NULL THEN 'Visit from ' || regexp_replace(cj.first_touch->>'referrer', '^https?://', '')
              ELSE 'Direct visit'
            END,
            jsonb_build_object(
              'journey_id',  cj.journey_id::text,
              'client_key',  ${TARGET_CLIENT_KEY}::text,
              'first_touch', cj.first_touch,
              'country',     cj.country,
              'city',        cj.city
            )
          FROM candidate_journeys cj
          ON CONFLICT (prospect_id, (metadata->>'journey_id'))
            WHERE type = 'site_visit' AND metadata ? 'journey_id'
            DO NOTHING
          RETURNING 1
        )
        SELECT COUNT(*)::int AS inserted FROM ins
      `;
      results.push({
        source: "site_visit",
        inserted: inserted[0]?.inserted ?? 0,
        ms: Date.now() - siteStart,
      });
    } catch (err) {
      errors.push({
        source: "site_visit",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── Inquiry submissions ──────────────────────────────────────────────────
    // chapter_inquiries.threads.created_by_email is plaintext; match it
    // directly to crm.prospects.email (also plaintext). Dedup on thread_id
    // via the second partial unique index.
    const inqStart = Date.now();
    try {
      const inserted = await sql<{ inserted: number }[]>`
        WITH candidate_threads AS (
          SELECT
            p.id        AS prospect_id,
            t.id        AS thread_id,
            t.client_key,
            t.subject,
            t.category,
            t.created_at
          FROM crm.prospects p
          JOIN chapter_inquiries.threads t
            ON lower(t.created_by_email) = lower(p.email)
          WHERE p.email IS NOT NULL
          ORDER BY t.created_at DESC
          LIMIT ${PER_SOURCE_LIMIT}
        ),
        ins AS (
          INSERT INTO crm.interactions
            (prospect_id, type, source, occurred_at, summary, metadata)
          SELECT
            ct.prospect_id,
            -- 'inquiry' matches crm.interactions.interactions_type_check
            -- (nouns only: site_visit / gbp / yelp / inquiry / review / referral / other).
            -- The producer was writing 'inquiry_submitted' since June 19, 2026, which
            -- the CHECK constraint has silently rejected every night.
            'inquiry',
            'chapter_inquiry',
            ct.created_at,
            'Inquiry: ' || ct.subject,
            jsonb_build_object(
              'thread_id',  ct.thread_id::text,
              'client_key', ct.client_key,
              'category',   ct.category
            )
          FROM candidate_threads ct
          ON CONFLICT (prospect_id, (metadata->>'thread_id'))
            WHERE type = 'inquiry' AND metadata ? 'thread_id'
            DO NOTHING
          RETURNING 1
        )
        SELECT COUNT(*)::int AS inserted FROM ins
      `;
      results.push({
        source: "inquiry_submitted",
        inserted: inserted[0]?.inserted ?? 0,
        ms: Date.now() - inqStart,
      });
    } catch (err) {
      errors.push({
        source: "inquiry_submitted",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  if (errors.length > 0) {
    const lines: string[] = [
      `🚨 *crm.interactions producer — ${errors.length} source(s) failed*`,
      "",
      ...errors.map(e => `• \`${e.source}\` — ${e.error.slice(0, 200)}`),
    ];
    try {
      await postToGChat({ text: lines.join("\n") });
    } catch (err) {
      console.error("[crm-interactions-producer] GChat post failed:", err);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    results,
    errors,
  });
}
