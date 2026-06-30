// Nightly cron at 04:00 UTC — populates chapter_reporting.usage_snapshot.
//
// One row per (snapshot_date, client_key). Today's row is upserted (so a
// re-run during the day overwrites with fresher counts). Computes MTD usage
// + tier math + chain health. Cost columns stay NULL for now (populated by a
// future rate-card cron).
//
// Schedule: 04:00 UTC — after the attribution chain at 03:30 UTC (so today's
// chain timing is recorded in _snapshot_runs). Well before other crons.
//
// Reads:
//   - chapter_reporting.journey_bot_classification_v1 (MTD journey counts by bot_class)
//   - chapter_ingest.pixel_events (cumulative event count per client + total events MTD)
//   - chapter_reporting._snapshot_runs (today's chain elapsed time)
//   - chapter_config.clients (tier + retention_days + active client list)

import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Vercel's maxDuration on /api/internal/cron/refresh-attribution-chain ceiling
// — used to compute chain_headroom_pct.
const CHAIN_CRON_CEILING_SECONDS = 600;

export const maxDuration = 300;

type ClientResult =
  | { client_key: string; ok: true; row_count: number; elapsed_ms: number }
  | { client_key: string; ok: false; error: string };

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
    idle_timeout: 20,
  });

  const results: ClientResult[] = [];
  try {
    await sql`SET statement_timeout = '5min'`;

    // List of active clients (those with non-revoked client_secrets).
    const clients = await sql<{ client_key: string; tier: string | null; retention_days: number | null }[]>`
      SELECT c.client_key, c.tier, c.retention_days
      FROM chapter_config.clients c
      WHERE EXISTS (
        SELECT 1 FROM chapter_config.client_secrets s
        WHERE s.client_key = c.client_key AND s.revoked_at IS NULL
      )
      ORDER BY c.client_key
    `;

    for (const client of clients) {
      const start = Date.now();
      try {
        await computeAndUpsertSnapshot(sql, client.client_key, client.tier, client.retention_days);
        results.push({ client_key: client.client_key, ok: true, row_count: 1, elapsed_ms: Date.now() - start });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ client_key: client.client_key, ok: false, error: msg });
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  const failures = results.filter((r): r is Extract<ClientResult, { ok: false }> => !r.ok);
  if (failures.length > 0) {
    try {
      await postToGChat({
        text: `🚨 usage_snapshot cron — ${failures.length}/${results.length} clients failed\n\n` +
          failures.map(f => `• ${f.client_key}: ${f.error.slice(0, 200)}`).join("\n"),
      });
    } catch (e) {
      console.error("[refresh-usage-snapshot] GChat post failed:", e);
    }
  }

  return NextResponse.json({ ok: failures.length === 0, results, failed_count: failures.length });
}

async function computeAndUpsertSnapshot(
  sql: postgres.Sql,
  clientKey: string,
  tier: string | null,
  retentionDays: number | null,
): Promise<void> {
  // Single statement that gathers everything via parallel CTEs then upserts.
  await sql`
    WITH
    today AS (SELECT (now() AT TIME ZONE 'UTC')::date AS d, date_trunc('month', now() AT TIME ZONE 'UTC')::date AS month_start),
    mtd_journeys AS (
      SELECT
        COUNT(*) FILTER (WHERE bot_class = 'human_likely')::int AS human_likely,
        COUNT(*) FILTER (WHERE bot_class = 'suspect')::int AS suspect,
        COUNT(*) FILTER (WHERE bot_class = 'bot_likely')::int AS bot_likely,
        COUNT(*)::int AS total
      FROM chapter_reporting.journey_bot_classification_v1 jbc, today
      WHERE jbc.client_key = ${clientKey}
        AND jbc.journey_start_ts >= today.month_start
    ),
    mtd_events AS (
      SELECT COUNT(*)::bigint AS total_events
      FROM chapter_ingest.pixel_events pe, today
      WHERE pe.client_key = ${clientKey}
        AND pe.ts >= today.month_start
    ),
    cumulative AS (
      SELECT COUNT(*)::bigint AS total
      FROM chapter_ingest.pixel_events
      WHERE client_key = ${clientKey}
    ),
    human_event_total AS (
      -- Total events attributed to human_likely journeys (MTD).
      SELECT COUNT(pe.*)::bigint AS events
      FROM chapter_ingest.pixel_events pe, today
      WHERE pe.client_key = ${clientKey}
        AND pe.ts >= today.month_start
        AND EXISTS (
          SELECT 1 FROM chapter_reporting.journey_bot_classification_v1 jbc
          WHERE jbc.client_key = pe.client_key
            AND jbc.journey_id = pe.journey_id
            AND jbc.bot_class = 'human_likely'
        )
    ),
    chain_today AS (
      SELECT MAX(EXTRACT(EPOCH FROM (finished_at - started_at))::int)::int AS sec
      FROM chapter_reporting._snapshot_runs r, today
      WHERE r.client_key = ${clientKey}
        AND r.target_table = 'chapter_attribution.chapter_channel_paths_canonical_v2_snapshot'
        AND r.status = 'ok'
        AND r.started_at::date = today.d
    ),
    computed AS (
      SELECT
        mj.human_likely, mj.suspect, mj.bot_likely, mj.total AS total_journeys,
        me.total_events,
        c.total AS cumulative_events,
        chain_today.sec AS chain_seconds_today,
        het.events AS human_events,
        chapter_reporting.tier_journey_ceiling(${tier}) AS ceiling
      FROM mtd_journeys mj, mtd_events me, cumulative c
      LEFT JOIN human_event_total het ON TRUE
      LEFT JOIN chain_today ON TRUE
    )
    INSERT INTO chapter_reporting.usage_snapshot (
      snapshot_date, client_key, tier, retention_days, classifier_version,
      human_likely_journeys, suspect_journeys, bot_likely_journeys, total_journeys, total_events,
      avg_events_per_human_journey,
      tier_journey_ceiling, utilization_pct,
      chain_seconds_today, chain_headroom_pct,
      cumulative_events_to_date,
      computed_at
    )
    SELECT
      (now() AT TIME ZONE 'UTC')::date,
      ${clientKey},
      ${tier},
      ${retentionDays},
      'v1',
      cp.human_likely, cp.suspect, cp.bot_likely, cp.total_journeys, cp.total_events,
      CASE WHEN cp.human_likely > 0 THEN (cp.human_events::numeric / cp.human_likely)::numeric(8, 2) ELSE NULL END,
      cp.ceiling,
      CASE WHEN cp.ceiling > 0 THEN (cp.human_likely::numeric / cp.ceiling * 100)::numeric(5, 2) ELSE NULL END,
      cp.chain_seconds_today,
      CASE WHEN cp.chain_seconds_today IS NOT NULL
           THEN ((${CHAIN_CRON_CEILING_SECONDS} - cp.chain_seconds_today)::numeric / ${CHAIN_CRON_CEILING_SECONDS} * 100)::numeric(5, 2)
           ELSE NULL END,
      cp.cumulative_events,
      now()
    FROM computed cp
    ON CONFLICT (snapshot_date, client_key)
    DO UPDATE SET
      tier = EXCLUDED.tier,
      retention_days = EXCLUDED.retention_days,
      human_likely_journeys = EXCLUDED.human_likely_journeys,
      suspect_journeys = EXCLUDED.suspect_journeys,
      bot_likely_journeys = EXCLUDED.bot_likely_journeys,
      total_journeys = EXCLUDED.total_journeys,
      total_events = EXCLUDED.total_events,
      avg_events_per_human_journey = EXCLUDED.avg_events_per_human_journey,
      tier_journey_ceiling = EXCLUDED.tier_journey_ceiling,
      utilization_pct = EXCLUDED.utilization_pct,
      chain_seconds_today = EXCLUDED.chain_seconds_today,
      chain_headroom_pct = EXCLUDED.chain_headroom_pct,
      cumulative_events_to_date = EXCLUDED.cumulative_events_to_date,
      computed_at = EXCLUDED.computed_at
  `;
}
