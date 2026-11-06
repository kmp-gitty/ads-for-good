import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Nightly slide impression rollups for every client with the impression script
// switched on (chapter_config.clients.impression_hosts). Per client, via
// chapter_publisher.refresh_slide_rollups: rebuild the last 3 days of daily
// totals and the current reader months, create upcoming monthly partitions,
// drop raw partitions older than 180 days, trim reader months older than 3 years.
//
// Schedule: 05:45 UTC.
export const maxDuration = 300;

type Result =
  | { client_key: string; ok: true; ms: number; steps: Record<string, number> }
  | { client_key: string; ok: false; error: string };

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  const conn = process.env.DATABASE_DIRECT_URL;
  if (!conn) return NextResponse.json({ error: "DATABASE_DIRECT_URL not configured" }, { status: 500 });

  const sql = postgres(conn, { ssl: "require", prepare: false, max: 1, keep_alive: 60, connect_timeout: 10, idle_timeout: 20 });
  const results: Result[] = [];
  try {
    const clients = await sql<{ client_key: string }[]>`
      SELECT client_key FROM chapter_config.clients
      WHERE impression_hosts IS NOT NULL AND cardinality(impression_hosts) > 0
      ORDER BY 1
    `;
    for (const c of clients) {
      const start = Date.now();
      try {
        const rows = (await sql.unsafe(
          `SELECT step, n FROM chapter_publisher.refresh_slide_rollups($1::text, 3)`,
          [c.client_key],
        )) as unknown as { step: string; n: number }[];
        const steps: Record<string, number> = {};
        for (const r of rows) steps[r.step] = Number(r.n);
        results.push({ client_key: c.client_key, ok: true, ms: Date.now() - start, steps });
      } catch (err) {
        results.push({ client_key: c.client_key, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  const failures = results.filter((r): r is Extract<Result, { ok: false }> => !r.ok);
  if (failures.length > 0) {
    try {
      await postToGChat({
        text: [
          `🚨 *Slide impression rollups failed* (${failures.length} client(s))`,
          "",
          ...failures.map((f) => `• \`${f.client_key}\` — ${f.error.slice(0, 200)}`),
          "",
          "_Raw page views are still being collected; totals catch up on the next successful run (it rebuilds 3 days)._",
        ].join("\n"),
      });
    } catch (err) {
      console.error("[refresh-slide-impressions] GChat post failed:", err);
    }
  }
  return NextResponse.json({ ok: failures.length === 0, results, failed_count: failures.length });
}
