import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

export const maxDuration = 300;

const MVS = [
  "chapter_reporting.journey_bot_classification_v1",
  "chapter_reporting.journey_funnel_steps_v1",
  "chapter_reporting.journey_entry_channel_v1",
  // Sprint 1.5 — picker MVs for Cross-Source Influence (pageOptions / campaignOptions).
  // Pre-aggregated 90d summaries so the dropdowns are bounded index scans.
  "chapter_reporting.connections_top_pages_v1",
  "chapter_reporting.connections_top_pages_90d_v1",
  "chapter_reporting.connections_top_campaigns_90d_v1",
];

type MvResult =
  | { mv: string; ok: true; refresh_ms: number; analyze_ms: number }
  | { mv: string; ok: false; phase: "refresh" | "analyze"; error: string };

type SnapshotResult =
  | { snapshot: string; client_key: string; ok: true; refresh_ms: number; rows: number }
  | { snapshot: string; client_key: string; ok: false; error: string };

// Per-client snapshots that depend on the journey MVs above. Refreshed AFTER
// the MV pass so they pick up the freshest source data. Sprint 3 added
// journey_resolved_v1 (denormalized journey resolution); future per-client
// snapshots register here.
const PER_CLIENT_SNAPSHOTS = [
  {
    snapshot: "journey_resolved_v1",
    refreshFn: "chapter_reporting.refresh_journey_resolved_v1",
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

  const results: MvResult[] = [];
  const snapshotResults: SnapshotResult[] = [];

  try {
    await sql`SET statement_timeout = '30min'`;

    for (const mv of MVS) {
      const refreshStart = Date.now();
      try {
        await sql.unsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${mv}`);
      } catch (err) {
        results.push({
          mv,
          ok: false,
          phase: "refresh",
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
      const refresh_ms = Date.now() - refreshStart;

      const analyzeStart = Date.now();
      try {
        await sql.unsafe(`ANALYZE ${mv}`);
      } catch (err) {
        results.push({
          mv,
          ok: false,
          phase: "analyze",
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
      const analyze_ms = Date.now() - analyzeStart;

      results.push({ mv, ok: true, refresh_ms, analyze_ms });
    }

    // Per-client snapshot refresh (depends on the journey MVs above being fresh).
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
  } finally {
    await sql.end({ timeout: 5 });
  }

  const mvFailures = results.filter((r): r is Extract<MvResult, { ok: false }> => !r.ok);
  const snapFailures = snapshotResults.filter(
    (r): r is Extract<SnapshotResult, { ok: false }> => !r.ok,
  );

  if (mvFailures.length > 0 || snapFailures.length > 0) {
    const lines: string[] = [];
    if (mvFailures.length > 0) {
      lines.push(`🚨 *Dashboard MV refresh failed* (${mvFailures.length}/${MVS.length} MVs)`);
      lines.push("");
      lines.push(
        ...mvFailures.map(
          (f) => `• \`${f.mv}\` — failed during *${f.phase}*: ${f.error.slice(0, 200)}`,
        ),
      );
      lines.push("");
    }
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
    lines.push(
      "_Dashboard tiles will be serving stale data until next successful refresh. See `feedback_stale_mv_cache_illusion.md`._",
    );
    try {
      await postToGChat({ text: lines.join("\n") });
    } catch (err) {
      console.error("[refresh-dashboard-mvs] GChat post failed:", err);
    }
  }

  return NextResponse.json({
    ok: mvFailures.length === 0 && snapFailures.length === 0,
    results,
    snapshot_results: snapshotResults,
    failed_count: mvFailures.length + snapFailures.length,
  });
}
