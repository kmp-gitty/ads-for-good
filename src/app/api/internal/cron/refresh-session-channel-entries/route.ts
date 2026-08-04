import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Refreshes chapter_reporting.session_channel_entries_v1 — the full-population,
// SESSION-grain channel-entries source (CSI3 / #2). It reuses canonical_v1's
// exact sessionizer + channel classifier but over ALL resolved journeys (not
// just chapter-formers), so intra-journey channel returns are visible.
//
// Consumers: Cross-Source Influence channel connections (connections_panel),
// Lagged Impact (lagged_impact_pair + _series), and connections_return_loop.
// Before the fix these read journey-entry grain (blind to intra-journey returns,
// collapsed to ~0 post-5.1) or the chapter-scoped session table (~15% of the
// population). This is the single correct source.
//
// Full per-client rebuild (DELETE + re-sessionize the 180d lookback). ~3 min on
// EOS; well under the 30-min statement budget.
//
// Schedule: 05:00 UTC — BEFORE refresh-connections-snapshots (05:30), which
// rebuilds connections_panel_snapshot_v1 by calling connections_panel (which now
// reads this table). This must be fresh first. (Attribution chain at 03:30 is
// unaffected — it uses canonical_v1's own chapter-scoped session table.)
export const maxDuration = 800;

type Result = { client_key: string; ok: boolean; rows?: number; ms?: number; error?: string };

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
    idle_timeout: 30,
  });

  const results: Result[] = [];

  try {
    await sql`SET statement_timeout = '30min'`;

    // ?client=<key> processes just one client (backfills / retries).
    const onlyClient = new URL(req.url).searchParams.get("client")?.trim();
    const clients = onlyClient
      ? [{ client_key: onlyClient }]
      : await sql<{ client_key: string }[]>`
          SELECT client_key FROM chapter_config.client_secrets WHERE revoked_at IS NULL
        `;

    for (const c of clients) {
      const t = Date.now();
      try {
        const r = await sql<{ rows_inserted: number }[]>`
          SELECT rows_inserted FROM chapter_reporting.refresh_session_channel_entries_v1(${c.client_key})
        `;
        results.push({ client_key: c.client_key, ok: true, rows: Number(r[0]?.rows_inserted ?? 0), ms: Date.now() - t });
      } catch (err) {
        results.push({
          client_key: c.client_key,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    await sql.end({ timeout: 10 });
  }

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    try {
      await postToGChat({
        text:
          `🚨 *session_channel_entries_v1 refresh — ${failures.length} client(s) failed*\n` +
          failures.map((f) => `• \`${f.client_key}\` — ${f.error?.slice(0, 160)}`).join("\n") +
          `\n_Cross-Source Influence channel connections + Lagged Impact will serve stale/empty for these clients._`,
      });
    } catch (e) {
      console.error("[refresh-session-channel-entries] GChat post failed:", e);
    }
  }

  return NextResponse.json({ ok: failures.length === 0, results });
}
