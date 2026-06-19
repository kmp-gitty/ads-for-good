import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Sprint 9 Phase 1A — refresh chapter_reporting.connections_panel_snapshot_v1.
//
// Pre-computes connections_panel results for the top-N anchors of each type
// per client × both directions × both connection_types, for the DEFAULT
// 30d/30d window combo. App at /chapter/connections/influence reads from
// this snapshot; non-default windows + non-top anchors fall back to live RPC.
//
// Math per client:
//   ~10 channels + 15 top pages + 15 top campaigns + ~10 cohorts = ~50 anchors
//   × 2 directions × 2 connection_types = ~200 combos
// At ~3s per connections_panel call on warm primary:
//   serial = ~10 min per client
//   8-way parallel = ~1-2 min per client
// 4 clients × ~2 min = ~8 min, comfortably under maxDuration=800.
//
// Schedule: 05:30 UTC, after derived-snapshots (04:25) so this reads fresh
// canonical_v1 + journey_resolved data. Runs daily.
export const maxDuration = 800;

const WINDOW_DAYS = 30;
const OUTCOME_WINDOW_DAYS = 30;
// Concurrency was 8; lowered to 3 (June 19) because cold-replica buffer
// cache thrashing was making 8 parallel connections_panel calls each take
// 2-8 min on EOS (each holds journeys/canonical pages in I/O wait). With
// lower concurrency, earlier queries warm the cache for later ones AND
// individual queries don't compete for buffer slots. Net: serial-warm
// beats parallel-cold for this workload.
const CONCURRENCY = 3;
const TOP_N_PAGES = 15;
const TOP_N_CAMPAIGNS = 15;

// Hardcoded channel vocabulary — matches the channel taxonomy used in
// dashboard mockdata + the channel classifier in canonical_v1's session-entry
// resolver. Adding a new channel requires bumping this list.
const CHANNELS = [
  "direct", "email", "organic_search", "paid_search", "meta",
  "paid_social", "tiktok", "referral", "affiliate", "sms",
];

type Combo = {
  anchor_type: "channel" | "page" | "campaign" | "cohort";
  anchor_key: string;
  direction: "upstream" | "downstream";
  connection_type: "channel" | "page";
};

type WorkerResult =
  | { ok: true; client_key: string; combo: Combo; ms: number; row_count: number }
  | { ok: false; client_key: string; combo: Combo; error: string };

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

  // Pool size matches CONCURRENCY so all workers can write in parallel.
  const sql = postgres(conn, {
    ssl: "require",
    prepare: false,
    max: CONCURRENCY,
    keep_alive: 60,
    connect_timeout: 10,
    idle_timeout: 30,
  });

  const allResults: WorkerResult[] = [];
  const tStart = Date.now();

  try {
    await sql`SET statement_timeout = '15min'`;

    // Optional ?client=<key> param — process just one client. Lets us run
    // backfills one client at a time when network stability is iffy (each
    // run is short enough to finish reliably). Without the param: full set.
    //
    // Optional ?skip_existing=true param — for retries after a crash. Filters
    // out (anchor_type, anchor_key, direction, connection_type) combos that
    // already have a row in the snapshot for this client. Default false so
    // the nightly cron does a full rebuild (snapshots go stale otherwise).
    const url = new URL(req.url);
    const onlyClient = url.searchParams.get("client")?.trim();
    const skipExisting = url.searchParams.get("skip_existing") === "true";

    let clients: { client_key: string }[];
    if (onlyClient) {
      clients = [{ client_key: onlyClient }];
    } else {
      clients = await sql<{ client_key: string }[]>`
        SELECT client_key FROM chapter_config.client_secrets WHERE revoked_at IS NULL
      `;
    }

    for (const c of clients) {
      const clientResults = await refreshClient(sql, c.client_key, skipExisting);
      allResults.push(...clientResults);
    }
  } finally {
    await sql.end({ timeout: 10 });
  }

  const failures = allResults.filter((r): r is Extract<WorkerResult, { ok: false }> => !r.ok);
  const successes = allResults.filter((r): r is Extract<WorkerResult, { ok: true }> => r.ok);
  const totalMs = Date.now() - tStart;

  if (failures.length > 0) {
    // Group failures by client to make the alert readable.
    const byClient = new Map<string, typeof failures>();
    for (const f of failures) {
      const set = byClient.get(f.client_key) ?? [];
      set.push(f);
      byClient.set(f.client_key, set);
    }
    const lines: string[] = [
      `🚨 *connections_panel snapshot refresh — ${failures.length} failures*`,
      "",
    ];
    for (const [client, fs] of byClient) {
      lines.push(`*${client}* (${fs.length} failed)`);
      for (const f of fs.slice(0, 5)) {
        lines.push(
          `• \`${f.combo.anchor_type}:${f.combo.anchor_key} ${f.combo.direction}/${f.combo.connection_type}\` — ${f.error.slice(0, 120)}`,
        );
      }
      if (fs.length > 5) lines.push(`  …and ${fs.length - 5} more`);
      lines.push("");
    }
    lines.push("_Cross-Source Influence will fall back to live RPC for affected anchors._");
    try {
      await postToGChat({ text: lines.join("\n") });
    } catch (err) {
      console.error("[refresh-connections-snapshots] GChat post failed:", err);
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    total_ms: totalMs,
    success_count: successes.length,
    failed_count: failures.length,
    failures: failures.slice(0, 50), // cap response size
  });
}

// ─── per-client orchestration ───────────────────────────────────────────────

async function refreshClient(
  sql: postgres.Sql,
  client_key: string,
  skipExisting: boolean = false,
): Promise<WorkerResult[]> {
  // Pull anchor lists. Channels are hardcoded; pages/campaigns/cohorts come
  // from existing reporting views/MVs.
  const [pageRows, campaignRows, cohortRows] = await Promise.all([
    sql<{ page_path: string }[]>`
      SELECT page_path
      FROM chapter_reporting.connections_top_pages_90d_v1
      WHERE client_key = ${client_key}
      ORDER BY rank ASC
      LIMIT ${TOP_N_PAGES}
    `,
    sql<{ campaign_id: string }[]>`
      SELECT campaign_id
      FROM chapter_reporting.connections_top_campaigns_90d_v1
      WHERE client_key = ${client_key}
      ORDER BY rank ASC
      LIMIT ${TOP_N_CAMPAIGNS}
    `,
    sql<{ id: string }[]>`
      SELECT id
      FROM chapter_config.connections_cohorts
      WHERE client_key = ${client_key}
      ORDER BY created_at DESC
    `,
  ]);

  let combos: Combo[] = [];
  const directions: Combo["direction"][] = ["upstream", "downstream"];
  const connTypes: Combo["connection_type"][] = ["channel", "page"];

  for (const channel of CHANNELS) {
    for (const d of directions) for (const ct of connTypes) {
      combos.push({ anchor_type: "channel", anchor_key: channel, direction: d, connection_type: ct });
    }
  }
  for (const p of pageRows) {
    for (const d of directions) for (const ct of connTypes) {
      combos.push({ anchor_type: "page", anchor_key: p.page_path, direction: d, connection_type: ct });
    }
  }
  for (const c of campaignRows) {
    for (const d of directions) for (const ct of connTypes) {
      combos.push({ anchor_type: "campaign", anchor_key: c.campaign_id, direction: d, connection_type: ct });
    }
  }
  for (const co of cohortRows) {
    for (const d of directions) for (const ct of connTypes) {
      combos.push({ anchor_type: "cohort", anchor_key: co.id, direction: d, connection_type: ct });
    }
  }

  // Skip combos already in the snapshot for this client when requested
  // (retries after partial failure). Filter as one set lookup.
  if (skipExisting) {
    const existing = await sql<{
      anchor_type: string;
      anchor_key: string;
      direction: string;
      connection_type: string;
    }[]>`
      SELECT anchor_type, anchor_key, direction, connection_type
      FROM chapter_reporting.connections_panel_snapshot_v1
      WHERE client_key = ${client_key}
    `;
    const seen = new Set(
      existing.map((r) => `${r.anchor_type}|${r.anchor_key}|${r.direction}|${r.connection_type}`),
    );
    const before = combos.length;
    const filtered = combos.filter(
      (c) => !seen.has(`${c.anchor_type}|${c.anchor_key}|${c.direction}|${c.connection_type}`),
    );
    console.log(
      `[refresh-connections-snapshots] ${client_key}: skip_existing filtered ${before} → ${filtered.length} combos`,
    );
    combos = filtered;
  }

  // Anchor windows use the current default 30d range. We freeze the time
  // window once per refresh so all snapshot rows for this client share a
  // consistent snapshot_ts_hi for replicability.
  const snapshotTsHi = new Date();
  const startTs = new Date(snapshotTsHi.getTime() - 90 * 24 * 3600 * 1000); // wide default range
  const endTs = snapshotTsHi;

  // Worker pool.
  const queue = [...combos];
  const results: WorkerResult[] = [];

  await Promise.all(
    Array.from({ length: CONCURRENCY }).map(async () => {
      while (true) {
        const combo = queue.shift();
        if (!combo) break;
        const tStart = Date.now();
        try {
          const row_count = await refreshOne(sql, client_key, combo, startTs, endTs, snapshotTsHi);
          results.push({ ok: true, client_key, combo, ms: Date.now() - tStart, row_count });
        } catch (err) {
          results.push({
            ok: false,
            client_key,
            combo,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }),
  );

  return results;
}

// ─── single combo refresh ───────────────────────────────────────────────────
//
// Builds the anchor_payload jsonb shape that connections_panel expects, calls
// it, jsonb-aggregates the rows, and upserts into the snapshot table.
async function refreshOne(
  sql: postgres.Sql,
  client_key: string,
  combo: Combo,
  startTs: Date,
  endTs: Date,
  snapshotTsHi: Date,
): Promise<number> {
  const anchorPayload =
    combo.anchor_type === "channel"
      ? { channel: combo.anchor_key, start_ts: startTs.toISOString(), end_ts: endTs.toISOString() }
    : combo.anchor_type === "page"
      ? { page_path: combo.anchor_key, start_ts: startTs.toISOString(), end_ts: endTs.toISOString() }
    : combo.anchor_type === "campaign"
      ? { campaign_id: combo.anchor_key, start_ts: startTs.toISOString(), end_ts: endTs.toISOString() }
      : { cohort_id: combo.anchor_key, start_ts: startTs.toISOString(), end_ts: endTs.toISOString() };

  // Single SQL roundtrip: compute connections_panel rows, jsonb_agg them,
  // upsert. ON CONFLICT replaces the existing row so reruns are idempotent.
  const result = await sql<{ row_count: number }[]>`
    INSERT INTO chapter_reporting.connections_panel_snapshot_v1 (
      client_key, anchor_type, anchor_key, direction, connection_type,
      window_days, outcome_window_days, rows, row_count, snapshot_ts_hi
    )
    SELECT
      ${client_key},
      ${combo.anchor_type},
      ${combo.anchor_key},
      ${combo.direction},
      ${combo.connection_type},
      ${WINDOW_DAYS},
      ${OUTCOME_WINDOW_DAYS},
      COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb),
      COUNT(*),
      ${snapshotTsHi}
    FROM chapter_reporting.connections_panel(
      ${client_key},
      ${combo.anchor_type},
      ${sql.json(anchorPayload)}::jsonb,
      ${combo.direction},
      ${WINDOW_DAYS},
      ${OUTCOME_WINDOW_DAYS},
      ARRAY[]::text[],
      ${combo.connection_type},
      ARRAY[]::text[]
    ) t
    ON CONFLICT (client_key, anchor_type, anchor_key, direction, connection_type, window_days, outcome_window_days)
    DO UPDATE SET
      rows = EXCLUDED.rows,
      row_count = EXCLUDED.row_count,
      snapshot_ts_hi = EXCLUDED.snapshot_ts_hi,
      built_at = now()
    RETURNING row_count
  `;

  return Number(result[0]?.row_count ?? 0);
}
