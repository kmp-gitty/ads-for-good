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
// Schedule: 03:00 UTC. Moved from 04:00 → 03:00 on June 30, 2026 to fix the
// chain-order bug: attribution chain at 03:30 UTC reads journey_bot_classification_v1
// to filter bots. With MV refresh at 04:00 (AFTER chain), the chain saw 23.5h-stale
// classifications and missed same-day journeys' purchases (they fell through to v2's
// '(direct)' fallback). Refreshing at 03:00 gives a 30-min buffer for the typical ~3 min
// refresh (worst-case cold-cache ~13 min still safely finishes before 03:30); chain
// reads fresh MV. Miss window narrowed from ~23.5h to 30 min (journeys arriving 03:00-03:30
// still miss tonight, get picked up tomorrow when lifecycle's incremental watermark
// catches their canonicals). Derived-snapshots cron fires at 04:25 UTC, well after both
// MV refresh + chain finish.
export const maxDuration = 800;

// The three journey_* rollups were REMOVED from this list on 2026-09-25 and
// converted to incremental snapshot tables -- see JOURNEY_ROLLUPS below.
// REFRESH ... CONCURRENTLY rescanned all 10.76M pixel_events and rebuilt all
// 1,152,290 rows nightly to produce ~3,661 genuinely-changed rows (0.32%).
const MVS = [
  // Sprint 1.5 — picker MVs for Cross-Source Influence (pageOptions / campaignOptions).
  // Pre-aggregated 90d summaries so the dropdowns are bounded index scans.
  "chapter_reporting.connections_top_pages_90d_v1",
  "chapter_reporting.connections_top_campaigns_90d_v1",
  // 9.3 — per-page distinct-identity base rates (page lift in connections_panel).
  // Reads journey_bot_classification_v1, so it MUST refresh AFTER the journey
  // rollups below -- that ordering is why the rollup step runs first.
  "chapter_reporting.connections_page_base_v1",
];

type MvResult =
  | { mv: string; ok: true; refresh_ms: number; analyze_ms: number }
  | { mv: string; ok: false; phase: "refresh" | "analyze"; error: string };

type RollupResult =
  | { client_key: string; ok: true; mode: string; affected: number; ms: number }
  | { client_key: string; ok: false; error: string };

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
  const rollups: RollupResult[] = [];

  try {
    await sql`SET statement_timeout = '30min'`;

    // ---- Journey rollups (incremental snapshot tables) --------------------
    // Runs BEFORE the MV loop: connections_page_base_v1 reads
    // journey_bot_classification_v1, which is now a facade over
    // journey_bot_classification_snapshot, so the snapshot has to be current
    // first or the page-base MV materialises yesterday's classifications.
    //
    // Per-client so one client's failure cannot starve the others (the
    // attribution chain learned this the hard way when EOS's hang starved
    // NSC + projectagram for a month).
    const rollupClients = await sql<{ client_key: string }[]>`
      SELECT client_key FROM chapter_config.client_secrets WHERE revoked_at IS NULL
      UNION
      SELECT DISTINCT client_key FROM chapter_reporting.journey_bot_classification_snapshot
      ORDER BY 1`;

    for (const { client_key } of rollupClients) {
      const t0 = Date.now();
      try {
        const [row] = await sql<{ mode: string; affected_journeys: string }[]>`
          SELECT mode, affected_journeys
          FROM chapter_reporting.refresh_journey_rollups(${client_key}::text)`;
        rollups.push({
          client_key,
          ok: true,
          mode: row?.mode ?? "unknown",
          affected: Number(row?.affected_journeys ?? 0),
          ms: Date.now() - t0,
        });
      } catch (err) {
        rollups.push({
          client_key,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ---- Remaining true MVs ----------------------------------------------
    // Guarded on relkind so this cron is correct in EITHER deploy order
    // relative to the DB-side facade swap: an object that is no longer a
    // materialized view is skipped rather than erroring on REFRESH. Removes
    // the code-before-DB / DB-before-code ordering dependency entirely.
    const stillMatview = new Set(
      (
        await sql<{ full_name: string }[]>`
          SELECT n.nspname || '.' || c.relname AS full_name
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind = 'm' AND n.nspname = 'chapter_reporting'`
      ).map((r) => r.full_name),
    );

    for (const mv of MVS) {
      if (!stillMatview.has(mv)) {
        console.warn(`[refresh-dashboard-mvs] skipping ${mv} — not a materialized view`);
        continue;
      }
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
  const rollupFailures = rollups.filter(
    (r): r is Extract<RollupResult, { ok: false }> => !r.ok,
  );

  if (rollupFailures.length > 0) {
    try {
      await postToGChat({
        text: [
          `🚨 *Journey rollup refresh failed* (${rollupFailures.length}/${rollups.length} clients)`,
          "",
          ...rollupFailures.map(
            (f) => `• \`${f.client_key}\` — ${f.error.slice(0, 200)}`,
          ),
          "",
          "_journey_bot_classification / entry_channel / funnel_steps are serving stale rows for these clients._",
        ].join("\n"),
      });
    } catch (err) {
      console.error("[refresh-dashboard-mvs] GChat post failed:", err);
    }
  }

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
    ok: mvFailures.length === 0 && rollupFailures.length === 0,
    rollups,
    results,
    failed_count: mvFailures.length + rollupFailures.length,
  });
}
