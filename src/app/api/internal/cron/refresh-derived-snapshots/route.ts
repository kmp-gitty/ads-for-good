import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Refreshes snapshots that DEPEND on the dashboard MVs being fresh:
//   - PER_CLIENT: journey_resolved_v1 (one row per client)
//   - GLOBAL:     attribution_linear_chapter_v1 + purchase_channel_final_v1
//
// Split out from /api/internal/cron/refresh-dashboard-mvs on June 15 after
// the bundled cron blew the 800s Vercel timeout — MV refresh alone is taking
// 10-13 min on cold buffers (REFRESH MATERIALIZED VIEW CONCURRENTLY scans
// source tables to compute diff even when there are zero new rows), so the
// snapshot loops never reached completion. Splitting gives each section its
// own budget. This route is fast (~30-60s for all 4 clients + global) so
// 300s maxDuration is comfortable.
//
// Schedule: 04:25 UTC, 25 minutes after refresh-dashboard-mvs starts. By
// then the MV refresh has had time to complete (typical ~7-10 min) and the
// snapshots read fresh source data.
export const maxDuration = 300;

type SnapshotResult =
  | { snapshot: string; client_key: string; ok: true; refresh_ms: number; rows: number }
  | { snapshot: string; client_key: string; ok: false; error: string };

type GlobalSnapshotResult =
  | { snapshot: string; ok: true; refresh_ms: number; rows: number }
  | { snapshot: string; ok: false; error: string };

const PER_CLIENT_SNAPSHOTS = [
  {
    snapshot: "journey_resolved_v1",
    refreshFn: "chapter_reporting.refresh_journey_resolved_v1",
  },
];

// Sprint 9 Phase 2 — snapshot the 3 dashboard RPCs measured >1s on EOS.
// Each entry pre-aggregates the RPC's default-arg result into a jsonb blob.
// Page wrappers do snapshot-first lookup; non-default-arg calls fall back
// to the live RPC.
const DASHBOARD_RPC_SNAPSHOTS = [
  {
    snapshot: "incrementality_snapshot_v1 (90d subscriber)",
    sqlTemplate: `
      INSERT INTO chapter_reporting.incrementality_snapshot_v1
        (client_key, cohort_axis, window_days, rows, snapshot_ts_hi)
      SELECT $1::text, 'subscriber', 90,
             COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb), now()
      FROM chapter_reporting.incrementality_channel_overview(
        $1::text,
        (now() - interval '90 days')::timestamptz,
        now(),
        'subscriber'
      ) t
      ON CONFLICT (client_key, cohort_axis, window_days) DO UPDATE SET
        rows = EXCLUDED.rows,
        snapshot_ts_hi = EXCLUDED.snapshot_ts_hi,
        built_at = now()
    `,
  },
  {
    snapshot: "contribution_snapshot_v1 (90d)",
    sqlTemplate: `
      INSERT INTO chapter_reporting.contribution_snapshot_v1
        (client_key, window_days, rows, snapshot_ts_hi)
      SELECT $1::text, 90,
             COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb), now()
      FROM chapter_reporting.contribution_overview(
        $1::text,
        (now() - interval '90 days')::timestamptz,
        now()
      ) t
      ON CONFLICT (client_key, window_days) DO UPDATE SET
        rows = EXCLUDED.rows,
        snapshot_ts_hi = EXCLUDED.snapshot_ts_hi,
        built_at = now()
    `,
  },
  {
    snapshot: "journeys_overview_list_snapshot_v1 (30d, default filters)",
    sqlTemplate: `
      INSERT INTO chapter_reporting.journeys_overview_list_snapshot_v1
        (client_key, window_days, rows, snapshot_ts_hi)
      SELECT $1::text, 30,
             COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb), now()
      FROM chapter_reporting.journeys_overview_list(
        $1::text,
        (now() - interval '30 days')::timestamptz,
        now(),
        NULL,
        NULL,
        50
      ) t
      ON CONFLICT (client_key, window_days) DO UPDATE SET
        rows = EXCLUDED.rows,
        snapshot_ts_hi = EXCLUDED.snapshot_ts_hi,
        built_at = now()
    `,
  },
];

// Global (non per-client) snapshot loaders.
// NOTE: refresh_attribution_tables hardcodes boundary_event_name='purchase'
// so Not So Cavalier (appointment_booked) will be empty until the loader
// is generalized — tracked as a backlog item.
const GLOBAL_SNAPSHOTS = [
  {
    snapshot: "attribution_tables (linear_chapter + channel_final)",
    sql: "SELECT sum(rows_written) AS rows FROM chapter_reporting.refresh_attribution_tables()",
  },
];

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  const conn = process.env.DATABASE_DIRECT_URL;
  if (!conn) {
    return NextResponse.json(
      { error: "DATABASE_DIRECT_URL not configured" },
      { status: 500 }
    );
  }

  const sql = postgres(conn, {
    ssl: "require",
    prepare: false,
    max: 1,
    keep_alive: 60,
    connect_timeout: 10,
    idle_timeout: 20,
  });

  const snapshotResults: SnapshotResult[] = [];
  const globalSnapshotResults: GlobalSnapshotResult[] = [];

  try {
    await sql`SET statement_timeout = '10min'`;

    // Per-client snapshot refresh
    const clients = await sql<{ client_key: string }[]>`
      SELECT client_key FROM chapter_config.client_secrets WHERE revoked_at IS NULL
    `;
    for (const snap of PER_CLIENT_SNAPSHOTS) {
      for (const c of clients) {
        const start = Date.now();
        try {
          const rows = await sql.unsafe(
            `SELECT rows_written FROM ${snap.refreshFn}($1::text)`,
            [c.client_key]
          );
          snapshotResults.push({
            snapshot: snap.snapshot,
            client_key: c.client_key,
            ok: true,
            refresh_ms: Date.now() - start,
            rows: Number((rows[0] as { rows_written?: number })?.rows_written ?? 0),
          });
        } catch (err) {
          snapshotResults.push({
            snapshot: snap.snapshot,
            client_key: c.client_key,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Sprint 9 Phase 2 — dashboard RPC snapshots (per-client)
    for (const snap of DASHBOARD_RPC_SNAPSHOTS) {
      for (const c of clients) {
        const start = Date.now();
        try {
          await sql.unsafe(snap.sqlTemplate, [c.client_key]);
          snapshotResults.push({
            snapshot: snap.snapshot,
            client_key: c.client_key,
            ok: true,
            refresh_ms: Date.now() - start,
            rows: 0, // upsert; row count not tracked here
          });
        } catch (err) {
          snapshotResults.push({
            snapshot: snap.snapshot,
            client_key: c.client_key,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Global snapshot loaders
    for (const snap of GLOBAL_SNAPSHOTS) {
      const start = Date.now();
      try {
        const result = await sql.unsafe(snap.sql);
        globalSnapshotResults.push({
          snapshot: snap.snapshot,
          ok: true,
          refresh_ms: Date.now() - start,
          rows: Number((result[0] as { rows?: number })?.rows ?? 0),
        });
      } catch (err) {
        globalSnapshotResults.push({
          snapshot: snap.snapshot,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  const snapFailures = snapshotResults.filter(
    (r): r is Extract<SnapshotResult, { ok: false }> => !r.ok,
  );
  const globalSnapFailures = globalSnapshotResults.filter(
    (r): r is Extract<GlobalSnapshotResult, { ok: false }> => !r.ok,
  );

  if (snapFailures.length > 0 || globalSnapFailures.length > 0) {
    const lines: string[] = [];
    if (snapFailures.length > 0) {
      lines.push(`🚨 *Per-client snapshot refresh failed* (${snapFailures.length} entries)`);
      lines.push("");
      lines.push(
        ...snapFailures.map(
          (f) => `• \`${f.snapshot}\` / \`${f.client_key}\` — ${f.error.slice(0, 200)}`,
        ),
      );
      lines.push("");
    }
    if (globalSnapFailures.length > 0) {
      lines.push(`🚨 *Global snapshot refresh failed* (${globalSnapFailures.length} entries)`);
      lines.push("");
      lines.push(
        ...globalSnapFailures.map(
          (f) => `• \`${f.snapshot}\` — ${f.error.slice(0, 200)}`,
        ),
      );
      lines.push("");
    }
    lines.push(
      "_Dashboard tiles depending on these snapshots will serve stale data until next successful refresh._",
    );
    try {
      await postToGChat({ text: lines.join("\n") });
    } catch (err) {
      console.error("[refresh-derived-snapshots] GChat post failed:", err);
    }
  }

  return NextResponse.json({
    ok: snapFailures.length === 0 && globalSnapFailures.length === 0,
    snapshot_results: snapshotResults,
    global_snapshot_results: globalSnapshotResults,
    failed_count: snapFailures.length + globalSnapFailures.length,
  });
}
