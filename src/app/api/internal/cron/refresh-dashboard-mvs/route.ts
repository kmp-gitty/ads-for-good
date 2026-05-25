import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

export const maxDuration = 300;

const MVS = [
  "chapter_reporting.journey_bot_classification_v1",
  "chapter_reporting.journey_funnel_steps_v1",
  "chapter_reporting.journey_entry_channel_v1",
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

  const failures = results.filter((r): r is Extract<MvResult, { ok: false }> => !r.ok);

  if (failures.length > 0) {
    const lines = [
      `🚨 *Dashboard MV refresh failed* (${failures.length}/${MVS.length} MVs)`,
      "",
      ...failures.map(
        (f) => `• \`${f.mv}\` — failed during *${f.phase}*: ${f.error.slice(0, 200)}`
      ),
      "",
      "_Dashboard tiles will be serving stale data until next successful refresh. See `feedback_stale_mv_cache_illusion.md`._",
    ];
    try {
      await postToGChat({ text: lines.join("\n") });
    } catch (err) {
      console.error("[refresh-dashboard-mvs] GChat post failed:", err);
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    results,
    failed_count: failures.length,
  });
}
