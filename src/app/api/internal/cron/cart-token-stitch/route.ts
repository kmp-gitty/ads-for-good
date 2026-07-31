import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Daily guarded cart-token stitch — the FALLBACK layer under the two stronger
// same-person signals:
//   1. Chapter anon_id (native, durable now that EOS is on 1P collect)
//   2. shopify_visitor:<_shopify_y> (durable ~1yr first-party cookie, captured
//      by the pixel and identified in real time)
//   3. cart_token (this job) — Shopify's cart cookie persists ~2 weeks
//      independent of localStorage; a token shared across two anon sessions =
//      same person.
//
// Runs chapter_identity.cart_token_stitch_sweep(client) per Shopify client over
// a rolling 16-day lookback (so every 14-day-lifetime token pair is caught by
// the daily run). The function's guards mirror the July 31 one-time backfill:
//   - span <= 14d (a token living longer than its lifetime = reused/default)
//   - cluster <= 3 distinct anons (excludes promiscuous/default tokens)
//   - anon->known only when exactly one known canonical shares the token
//   - anon->anon only when zero known canonicals share it (representative = min key)
//   - ON CONFLICT (client_key, from_identity_key) DO NOTHING — pure fallback:
//     any anon already aliased (by _shopify_y / purchase / a prior sweep) is
//     skipped, so re-runs are idempotent no-ops and each anon holds <=1 edge.
//
// Non-Shopify clients (NSC — Square, no cart_token) return 0/0 harmlessly, so
// we iterate every active client rather than maintain a Shopify allowlist.
//
// Schedule: 03:15 UTC — after refresh-dashboard-mvs (03:00), and crucially
// BEFORE the attribution chain (03:30) so the new aliases propagate through
// trg_sync_canon_from_alias into identity_canon and the same night's chain
// attributes the merged sessions.
export const maxDuration = 300;

type SweepResult =
  | { client_key: string; ok: true; anon_known: number; anon_anon: number; ms: number }
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

  const results: SweepResult[] = [];

  try {
    await sql`SET statement_timeout = '10min'`;

    const clients = await sql<{ client_key: string }[]>`
      SELECT client_key FROM chapter_config.client_secrets WHERE revoked_at IS NULL
    `;

    for (const c of clients) {
      const start = Date.now();
      try {
        const rows = await sql.unsafe(
          `SELECT anon_known_inserted, anon_anon_inserted
             FROM chapter_identity.cart_token_stitch_sweep($1::text)`,
          [c.client_key],
        );
        const row = rows[0] as
          | { anon_known_inserted?: number; anon_anon_inserted?: number }
          | undefined;
        results.push({
          client_key: c.client_key,
          ok: true,
          anon_known: Number(row?.anon_known_inserted ?? 0),
          anon_anon: Number(row?.anon_anon_inserted ?? 0),
          ms: Date.now() - start,
        });
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

  const failures = results.filter(
    (r): r is Extract<SweepResult, { ok: false }> => !r.ok,
  );

  if (failures.length > 0) {
    const lines = [
      `🚨 *Cart-token stitch sweep failed* (${failures.length} client(s))`,
      "",
      ...failures.map((f) => `• \`${f.client_key}\` — ${f.error.slice(0, 200)}`),
      "",
      "_Fallback identity stitching skipped for these clients this run; retries next night._",
    ];
    try {
      await postToGChat({ text: lines.join("\n") });
    } catch (err) {
      console.error("[cart-token-stitch] GChat post failed:", err);
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    results,
    total_anon_known: results.reduce(
      (n, r) => n + (r.ok ? r.anon_known : 0),
      0,
    ),
    total_anon_anon: results.reduce((n, r) => n + (r.ok ? r.anon_anon : 0), 0),
    failed_count: failures.length,
  });
}
