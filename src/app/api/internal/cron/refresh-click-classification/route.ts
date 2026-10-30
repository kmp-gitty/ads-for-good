import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Nightly Chapter Links click classification. Rebuilds
// chapter_reporting.click_classification for every client that has redirect
// rules: each click gets human / human_likely / suspect / bot by a cascade of
// rules (see chapter_reporting.refresh_click_classification). Partner-facing
// counts read human + human_likely, repeats on the same link within 30 min
// counted once.
//
// Nightly, not just once, because the live checks in scanner-detection.ts run
// per Vercel instance and cannot see cross-instance bursts; the replay here sees
// every click. Reviewed clusters in click_exclusion_clusters also take effect
// on the next run.
//
// Schedule: 05:15 UTC, a quiet slot after the snapshot crons.
export const maxDuration = 300;

type Result =
  | { client_key: string; ok: true; ms: number; counts: Record<string, number> }
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

  const results: Result[] = [];

  try {
    const clients = await sql<{ client_key: string }[]>`
      SELECT DISTINCT client_key FROM chapter_config.redirect_rules ORDER BY 1
    `;

    for (const c of clients) {
      const start = Date.now();
      try {
        const rows = (await sql.unsafe(
          `SELECT class, sum(clicks)::int AS clicks
             FROM chapter_reporting.refresh_click_classification($1::text)
            GROUP BY class`,
          [c.client_key],
        )) as unknown as { class: string; clicks: number }[];
        const counts: Record<string, number> = {};
        for (const r of rows) counts[r.class] = Number(r.clicks);
        results.push({ client_key: c.client_key, ok: true, ms: Date.now() - start, counts });
      } catch (err) {
        results.push({
          client_key: c.client_key,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  const failures = results.filter((r): r is Extract<Result, { ok: false }> => !r.ok);
  if (failures.length > 0) {
    const lines = [
      `🚨 *Chapter Links click classification failed* (${failures.length} client(s))`,
      "",
      ...failures.map((f) => `• \`${f.client_key}\` — ${f.error.slice(0, 200)}`),
      "",
      "_Previous night's classification stays in place; new clicks count as human_likely until the next successful run._",
    ];
    try {
      await postToGChat({ text: lines.join("\n") });
    } catch (err) {
      console.error("[refresh-click-classification] GChat post failed:", err);
    }
  }

  return NextResponse.json({ ok: failures.length === 0, results, failed_count: failures.length });
}
