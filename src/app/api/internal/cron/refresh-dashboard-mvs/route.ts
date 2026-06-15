import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Refreshes the 6 dashboard MVs (REFRESH MATERIALIZED VIEW CONCURRENTLY +
// ANALYZE on each). Per-client + global snapshots that depend on these MVs
// were SPLIT OUT to /api/internal/cron/refresh-derived-snapshots on
// June 15, 2026 after the bundled cron blew the 800s Vercel timeout.
//
// Why split: REFRESH MV CONCURRENTLY scans the source query to compute its
// diff even when there are zero new rows. With ~580 MB of materialized
// output across 6 MVs and pixel-event source tables in the millions,
// cold-buffer refresh runs 10-13 min on its own. Bundling snapshot work
// behind that consistently overran 800s, so journey_resolved_v1 +
// attribution_tables silently went days stale. Splitting gives each section
// its own 800s/300s budget; chained schedule keeps the ordering invariant
// (derived snapshots fire AFTER MVs are refreshed).
//
// Schedule: 04:00 UTC. Derived-snapshots cron fires 25 min later (04:25 UTC).
export const maxDuration = 800;

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
  } finally {
    await sql.end({ timeout: 5 });
  }

  const mvFailures = results.filter((r): r is Extract<MvResult, { ok: false }> => !r.ok);

  if (mvFailures.length > 0) {
    const lines: string[] = [];
    lines.push(`🚨 *Dashboard MV refresh failed* (${mvFailures.length}/${MVS.length} MVs)`);
    lines.push("");
    lines.push(
      ...mvFailures.map(
        (f) => `• \`${f.mv}\` — failed during *${f.phase}*: ${f.error.slice(0, 200)}`,
      ),
    );
    lines.push("");
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
    ok: mvFailures.length === 0,
    results,
    failed_count: mvFailures.length,
  });
}
