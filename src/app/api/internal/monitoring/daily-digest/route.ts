import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chapterSchemas } from "@/app/lib/chapter-db";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";
import type { SnapshotRunRow } from "@/app/lib/monitoring/types";

const supabase = createClient(
  process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WINDOW_HOURS = 24;
const MV_STALENESS_THRESHOLD_HOURS = 24;
const CHAIN_STALENESS_THRESHOLD_HOURS = 24;

// Per-MV column spec — the digest queries `max(ts_column)` to assess freshness.
// journey_funnel_steps_v1 has NO timestamp column (it's a per-journey rollup of
// boolean has_* flags), so we omit it from the freshness check. Row-count
// drift vs source is a separate signal not currently surfaced; flag for
// follow-on if it ever matters.
const DASHBOARD_MVS = [
  { name: "journey_bot_classification_v1", ts_column: "journey_start_ts" },
  { name: "journey_entry_channel_v1", ts_column: "entry_ts" },
] as const;

// Every MV refreshed by the 03:00 UTC refresh-dashboard-mvs cron. The ts_column
// check above can only cover the 2 that carry a timestamp; this list is the
// REFRESH-EXECUTION check and covers all of them via last_analyze (the cron
// ANALYZEs each MV after refreshing it).
//
// Why both signals: the ts_column gap answers "is the DATA current relative to
// source"; last_analyze answers "did the refresh JOB actually run". An overrun
// of the cron's 800s budget shows up in the second, not the first — and it
// fails on the LAST MVs first, which is precisely the set the ts_column check
// cannot see (connections_page_base_v1 is the slowest at ~295s mean).
const MV_REFRESH_STALENESS_THRESHOLD_HOURS = 26;

// Attribution chain stages refreshed by the 03:30 UTC cron (Sprint 1.1).
// Each (active client × stage) tuple should have a fresh _snapshot_runs row
// within CHAIN_STALENESS_THRESHOLD_HOURS, otherwise the cron silently failed
// or skipped that client.
const ATTRIBUTION_CHAIN_STAGES = [
  "chapter_model.lifecycle_chapters_snapshot",
  "chapter_attribution.chapter_channel_paths_canonical_v1_snapshot",
  "chapter_attribution.chapter_channel_paths_canonical_v2_snapshot",
  // Sprint 3 — denormalized journey resolution; refreshed by 04:00 cron.
  "journey_resolved_v1",
  // Jul 30 — materialization of chapter_purchase_summary; feeds Channels/Paths/
  // Attribution + 5 other RPCs. Refreshed by refresh-derived-snapshots (04:25).
  "chapter_purchase_summary_snapshot",
] as const;

// Global (non-per-client) snapshot tables. We check max(snapshot_ts) on the
// table directly since they're not per-client in _snapshot_runs.
// Format: { table, schema, ts_column }.
const GLOBAL_SNAPSHOTS = [
  {
    table: "attribution_linear_chapter_v1",
    schema: "chapter_reporting",
    ts_column: "snapshot_ts",
  },
  {
    table: "purchase_channel_final_v1",
    schema: "chapter_reporting",
    ts_column: "snapshot_ts",
  },
] as const;

type GlobalSnapshotStaleness =
  | { snapshot: string; ok: true; max_ts: string; gap_hours: number }
  | { snapshot: string; ok: false; error: string };

// Square access tokens stored in chapter_config.square_oauth_tokens are
// Personal Access Tokens — long-lived, no refresh flow. They invalidate only
// on manual revocation by the seller (or Square-side abuse rotation). The
// monitor here calls /v2/merchants with each non-revoked token; 401/403 means
// the token is dead and ingest will be silently broken until rotated.
type SquareAuthHealth =
  | { client_key: string; merchant_id: string; ok: true }
  | { client_key: string; merchant_id: string; ok: false; status: number | null; error: string };

// Pixel ingest liveness. THE GAP THIS CLOSES: every check in this digest
// watched a DOWNSTREAM stage (MV freshness, chain freshness, refresh
// execution, global snapshots) and none watched the SOURCE. projectagram's
// pixel died 2026-06-10 and nothing alerted for 3.5 months, because the crons
// kept running fine -- they just had nothing to process, so every freshness
// check stayed green. We monitored the pipeline, not the faucet.
type PixelIngestHealth = {
  client_key: string;
  pixel_expected: boolean;
  collection_enabled: boolean;
  newest_ingest: string | null;
  last_seen_fallback: string | null;
  hours_since_newest: number | null;
  events_24h: number;
  median_events_prior_7d: number;
  pct_of_median: number | null;
  status: "ok" | "stale" | "never" | "degraded" | "not_expected" | "collection_disabled";
};

type MvStaleness =
  | { mv: string; ok: true; max_ts: string; gap_hours: number }
  | { mv: string; ok: false; error: string };

type ChainStaleness = {
  client_key: string;
  stage: string;
  ok: boolean;
  last_ok_at: string | null;
  gap_hours: number | null;
};

async function checkMvStaleness(): Promise<{
  source_max: string | null;
  results: MvStaleness[];
}> {
  const { data: src, error: srcErr } = await supabase
    .schema("chapter_journey")
    .from("journeys")
    .select("first_seen")
    .order("first_seen", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (srcErr || !src) {
    return { source_max: null, results: [] };
  }

  const sourceMax = src.first_seen as string;
  const sourceMs = new Date(sourceMax).getTime();

  const results = await Promise.all(
    DASHBOARD_MVS.map(async ({ name, ts_column }): Promise<MvStaleness> => {
      const { data, error } = await supabase
        .schema("chapter_reporting")
        .from(name)
        .select(ts_column)
        .order(ts_column, { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { mv: name, ok: false, error: error.message };
      }
      if (!data) {
        return { mv: name, ok: false, error: "empty MV" };
      }
      const tsValue = (data as Record<string, unknown>)[ts_column] as string;
      const mvMs = new Date(tsValue).getTime();
      const gapHours = (sourceMs - mvMs) / 3_600_000;
      return {
        mv: name,
        ok: true,
        max_ts: tsValue,
        gap_hours: gapHours,
      };
    })
  );

  return { source_max: sourceMax, results };
}

type MvRefresh = {
  mv_name: string;
  last_refresh: string | null;
  hours_since_refresh: number | null;
};

// Reads last_analyze for every MV in chapter_reporting via a SECURITY DEFINER
// RPC (pg_stat_all_tables is not reachable through PostgREST for API roles).
async function checkMvRefreshFreshness(): Promise<{
  ok: boolean;
  error?: string;
  rows: MvRefresh[];
}> {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("dashboard_mv_refresh_freshness");

  if (error) return { ok: false, error: error.message, rows: [] };
  return { ok: true, rows: (data ?? []) as MvRefresh[] };
}

// Cross-products active clients × attribution chain stages and reports the
// freshness gap on each. If the 03:30 UTC cron fan-out succeeded for a client,
// all 3 stages should have an 'ok' run with snapshot_ts_hi within ~24h. A
// stale or missing combo means the cron silently failed for that client's
// stage — exactly the case the digest is meant to surface.
async function checkAttributionChainStaleness(): Promise<ChainStaleness[]> {
  const { data: clientRows, error: clientErr } = await supabase
    .schema("chapter_config")
    .from("client_secrets")
    .select("client_key")
    .is("revoked_at", null);

  if (clientErr || !clientRows) {
    return [];
  }

  const clientKeys = Array.from(new Set(clientRows.map((r) => r.client_key as string))).sort();

  // Single query to pull all latest-ok runs across the chain stages, then
  // build the (client × stage) lookup in JS. Avoids N×M sequential queries.
  const { data: runs, error: runsErr } = await chapterSchemas
    .reporting(supabase)
    .from("_snapshot_runs")
    .select("client_key, target_table, snapshot_ts_hi")
    .eq("status", "ok")
    .in("target_table", ATTRIBUTION_CHAIN_STAGES as unknown as string[])
    .order("snapshot_ts_hi", { ascending: false });

  if (runsErr) {
    console.error("[daily-digest] chain staleness query failed:", runsErr);
    return [];
  }

  // Build map of (client_key, target_table) → most recent snapshot_ts_hi.
  // Rows are pre-sorted DESC so first-seen wins.
  const latest = new Map<string, string>();
  for (const r of (runs ?? []) as Array<{ client_key: string; target_table: string; snapshot_ts_hi: string }>) {
    const key = `${r.client_key}::${r.target_table}`;
    if (!latest.has(key)) latest.set(key, r.snapshot_ts_hi);
  }

  const now = Date.now();
  const results: ChainStaleness[] = [];
  for (const client_key of clientKeys) {
    for (const stage of ATTRIBUTION_CHAIN_STAGES) {
      const lastOk = latest.get(`${client_key}::${stage}`) ?? null;
      if (!lastOk) {
        results.push({ client_key, stage, ok: false, last_ok_at: null, gap_hours: null });
        continue;
      }
      const gapHours = (now - new Date(lastOk).getTime()) / 3_600_000;
      results.push({
        client_key,
        stage,
        ok: gapHours <= CHAIN_STALENESS_THRESHOLD_HOURS,
        last_ok_at: lastOk,
        gap_hours: gapHours,
      });
    }
  }

  return results;
}

// Shorten stage table name for readability in the digest message.
function shortStage(stage: string): string {
  if (stage.endsWith("lifecycle_chapters_snapshot")) return "lifecycle";
  if (stage.endsWith("canonical_v1_snapshot")) return "canonical_v1";
  if (stage.endsWith("canonical_v2_snapshot")) return "canonical_v2";
  if (stage === "journey_resolved_v1") return "journey_resolved";
  if (stage === "chapter_purchase_summary_snapshot") return "purchase_summary";
  return stage.split(".").pop() ?? stage;
}

// Read max(snapshot_ts) from each global snapshot table directly. These
// aren't tracked per-client in _snapshot_runs (they're global) but they ARE
// refreshed by the 04:00 UTC cron (Sprint 3 follow-on, June 11).
type RedirectHostCoverage = {
  client_key: string;
  host_count: number;
  missing: string[];
};

async function checkGlobalSnapshotStaleness(): Promise<GlobalSnapshotStaleness[]> {
  return Promise.all(
    GLOBAL_SNAPSHOTS.map(async (snap): Promise<GlobalSnapshotStaleness> => {
      const { data, error } = await supabase
        .schema(snap.schema)
        .from(snap.table)
        .select(snap.ts_column)
        .order(snap.ts_column, { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        return { snapshot: snap.table, ok: false, error: error.message };
      }
      if (!data) {
        return { snapshot: snap.table, ok: false, error: "empty table" };
      }
      const maxTs = (data as Record<string, unknown>)[snap.ts_column] as string;
      const gapHours = (Date.now() - new Date(maxTs).getTime()) / 3_600_000;
      return { snapshot: snap.table, ok: true, max_ts: maxTs, gap_hours: gapHours };
    }),
  );
}

/**
 * Per-HOST redirect fallback coverage for multi-property tenants.
 *
 * A tenant like ACJ serves ONE client_key from several 1P hosts, one per paper.
 * `default_redirect_destination` is per-CLIENT, so it can only name one of them
 * — a malformed link on any other paper sends the reader to that one. The
 * `default_redirect_destinations` map fixes this per host, but nothing forces
 * an operator adding a SIXTH paper to `links_hosts` to also add its fallback.
 *
 * That omission is SILENT: the reader still gets a 302 to a real page, the
 * click still logs, every reporting surface looks healthy — they just land on
 * the wrong property. This is the detector for exactly that drift.
 *
 * Single-host clients are skipped: the per-client default is the correct and
 * sufficient answer for them, so flagging them would be pure noise.
 */
async function checkRedirectHostFallbackCoverage(): Promise<RedirectHostCoverage[]> {
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("client_key, links_host, links_hosts, default_redirect_destinations");
  if (error || !data) return [];

  // Mirrors normalizeHostKey() in src/app/lib/redirect/rules.ts — links_hosts
  // stores hosts WITH the scheme, the map is keyed bare.
  const bare = (h: string) =>
    h.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");

  const out: RedirectHostCoverage[] = [];
  for (const row of data as Array<{
    client_key: string;
    links_host: string | null;
    links_hosts: string[] | null;
    default_redirect_destinations: Record<string, string> | null;
  }>) {
    const hosts = Array.from(
      new Set([...(row.links_hosts ?? []), ...(row.links_host ? [row.links_host] : [])].map(bare).filter(Boolean)),
    );
    if (hosts.length < 2) continue; // single-property — per-client default is correct
    const covered = new Set(Object.keys(row.default_redirect_destinations ?? {}).map(bare));
    const missing = hosts.filter((h) => !covered.has(h));
    out.push({ client_key: row.client_key, host_count: hosts.length, missing });
  }
  return out;
}

async function checkSquareTokenHealth(): Promise<SquareAuthHealth[]> {
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("square_oauth_tokens")
    .select("client_key, merchant_id, environment, access_token")
    .is("revoked_at", null);

  if (error || !data || data.length === 0) return [];

  const results = await Promise.all(
    data.map(async (row): Promise<SquareAuthHealth> => {
      const base = row.environment === "sandbox"
        ? "https://connect.squareupsandbox.com"
        : "https://connect.squareup.com";
      try {
        const r = await fetch(`${base}/v2/merchants`, {
          headers: {
            "Authorization": `Bearer ${row.access_token}`,
            "Square-Version": "2024-01-17",
            "Accept": "application/json",
          },
          // Short timeout: token health check shouldn't hang the digest.
          signal: AbortSignal.timeout(10_000),
        });
        if (r.ok) {
          return { client_key: row.client_key, merchant_id: row.merchant_id, ok: true };
        }
        const text = await r.text().catch(() => "");
        return {
          client_key: row.client_key,
          merchant_id: row.merchant_id,
          ok: false,
          status: r.status,
          error: text.slice(0, 200) || `HTTP ${r.status}`,
        };
      } catch (err) {
        return {
          client_key: row.client_key,
          merchant_id: row.merchant_id,
          ok: false,
          status: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return results;
}

// Self-serve signup abuse summary (added 2026-07-30). Counts blocked
// (success=false) attempts on the open signup endpoint over the digest window,
// grouped by failure_reason. Catches the low-and-slow pattern that stays under
// the 15-min attack-alert threshold. Attack-shaped reasons (honeypot_filled /
// rate_limited / turnstile_*) are the ones that matter; invalid_email etc. are
// benign typos, shown for completeness.
type SignupAbuse = { total: number; byReason: { reason: string; count: number }[] };

async function checkPixelIngestHealth(): Promise<PixelIngestHealth[]> {
  const { data, error } = await chapterSchemas
    .reporting(supabase)
    .rpc("pixel_ingest_health");

  if (error || !data) {
    console.error("[daily-digest] pixel_ingest_health failed:", error);
    return [];
  }
  return data as PixelIngestHealth[];
}

async function checkSignupAbuse(sinceIso: string): Promise<SignupAbuse> {
  const { data, error } = await supabase
    .schema("chapter_audit")
    .from("api_auth_attempts")
    .select("failure_reason")
    .eq("endpoint", "/api/chapter-auth/signup")
    .eq("success", false)
    .gte("ts", sinceIso);

  if (error || !data) return { total: 0, byReason: [] };

  const m = new Map<string, number>();
  for (const r of data as Array<{ failure_reason: string | null }>) {
    const k = r.failure_reason || "unknown";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const byReason = Array.from(m.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
  return { total: data.length, byReason };
}

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60_000).toISOString();

  const { data, error } = await chapterSchemas
    .reporting(supabase)
    .from("_snapshot_runs")
    .select("run_id, label, target_table, status, started_at, finished_at, row_count, error_message")
    .gte("started_at", since)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[daily-digest] query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const runs = (data ?? []) as SnapshotRunRow[];
  const ok = runs.filter((r) => r.status === "ok");
  const failed = runs.filter((r) => r.status === "failed");
  const running = runs.filter((r) => r.status === "running");

  const failureLines = failed.slice(0, 10).map((r) => {
    const errSnippet = (r.error_message ?? "(no message)").slice(0, 120);
    return `  ❌ *${r.label}* — ${errSnippet}`;
  });

  const stuckLines = running.map((r) => {
    const ageMin = Math.round(
      (Date.now() - new Date(r.started_at).getTime()) / 60_000
    );
    return `  ⏱ *${r.label}* — still running ${ageMin} min`;
  });

  const totalRows = ok.reduce((sum, r) => sum + (r.row_count ?? 0), 0);

  const lines: string[] = [
    `📊 *Chapter snapshot health — last ${WINDOW_HOURS}h*`,
    "",
    `*Runs:* ${runs.length} total — ✅ ${ok.length} ok · ❌ ${failed.length} failed · ⏱ ${running.length} running`,
    `*Rows written (ok runs):* ${totalRows.toLocaleString()}`,
  ];

  if (failed.length > 0) {
    lines.push("", "*Failures:*");
    lines.push(...failureLines);
    if (failed.length > failureLines.length) {
      lines.push(`  …and ${failed.length - failureLines.length} more`);
    }
  }

  if (running.length > 0) {
    lines.push("", "*Currently running:*");
    lines.push(...stuckLines);
  }

  if (runs.length === 0) {
    lines.push("", "_No snapshot runs in the last 24h. Either nothing scheduled, or `_snapshot_runs` not being written to._");
  }

  const mvStaleness = await checkMvStaleness();
  const staleMvs = mvStaleness.results.filter(
    (r): r is Extract<MvStaleness, { ok: true }> =>
      r.ok && r.gap_hours > MV_STALENESS_THRESHOLD_HOURS
  );
  const erroredMvs = mvStaleness.results.filter(
    (r): r is Extract<MvStaleness, { ok: false }> => !r.ok
  );

  lines.push("", "*Dashboard MV freshness:*");
  if (mvStaleness.source_max === null) {
    lines.push("  ⚠ could not read `chapter_journey.journeys` max(first_seen)");
  } else if (staleMvs.length === 0 && erroredMvs.length === 0) {
    const maxGap = Math.max(
      ...mvStaleness.results
        .filter((r): r is Extract<MvStaleness, { ok: true }> => r.ok)
        .map((r) => r.gap_hours)
    );
    lines.push(`  ✅ all ${DASHBOARD_MVS.length} MVs within ${MV_STALENESS_THRESHOLD_HOURS}h of source (max gap ${maxGap.toFixed(1)}h)`);
  } else {
    for (const r of staleMvs) {
      lines.push(`  ⚠ \`${r.mv}\` — ${r.gap_hours.toFixed(1)}h behind source`);
    }
    for (const r of erroredMvs) {
      lines.push(`  ❌ \`${r.mv}\` — ${r.error.slice(0, 120)}`);
    }
  }

  // Refresh-execution check — covers ALL MVs, including the 4 with no timestamp
  // column that the check above is structurally blind to.
  const mvRefresh = await checkMvRefreshFreshness();
  if (!mvRefresh.ok) {
    lines.push(`  ⚠ could not read MV refresh times — ${(mvRefresh.error ?? "").slice(0, 120)}`);
  } else if (mvRefresh.rows.length === 0) {
    lines.push("  ⚠ no materialized views found in `chapter_reporting`");
  } else {
    const neverRefreshed = mvRefresh.rows.filter((r) => r.hours_since_refresh === null);
    const staleRefresh = mvRefresh.rows.filter(
      (r) =>
        r.hours_since_refresh !== null &&
        r.hours_since_refresh > MV_REFRESH_STALENESS_THRESHOLD_HOURS
    );
    if (neverRefreshed.length === 0 && staleRefresh.length === 0) {
      const maxAge = Math.max(...mvRefresh.rows.map((r) => r.hours_since_refresh ?? 0));
      lines.push(
        `  ✅ all ${mvRefresh.rows.length} MVs refreshed within ${MV_REFRESH_STALENESS_THRESHOLD_HOURS}h (oldest ${maxAge.toFixed(1)}h ago)`
      );
    } else {
      for (const r of staleRefresh) {
        lines.push(`  ⚠ \`${r.mv_name}\` — last refreshed ${(r.hours_since_refresh ?? 0).toFixed(1)}h ago`);
      }
      for (const r of neverRefreshed) {
        lines.push(`  ❌ \`${r.mv_name}\` — no recorded refresh (ANALYZE never ran)`);
      }
    }
  }

  const chainStaleness = await checkAttributionChainStaleness();
  const chainProblems = chainStaleness.filter((r) => !r.ok);

  const ingestHealth = await checkPixelIngestHealth();
  // 'not_expected' / 'collection_disabled' are deliberately silenced (links-only
  // tenants, practice tenants, kill-switched clients) but still counted so a
  // silenced tenant never becomes invisible.
  const ingestProblems = ingestHealth.filter(
    (r) => r.status === "stale" || r.status === "never" || r.status === "degraded",
  );
  const ingestSilenced = ingestHealth.filter(
    (r) => r.status === "not_expected" || r.status === "collection_disabled",
  );

  lines.push("", "*Pixel ingest liveness:*");
  if (ingestHealth.length === 0) {
    lines.push("  ⚠ could not read `pixel_ingest_health`");
  } else if (ingestProblems.length === 0) {
    const healthy = ingestHealth.length - ingestSilenced.length;
    lines.push(
      `  ✅ ${healthy} client(s) sending${ingestSilenced.length > 0 ? ` · ${ingestSilenced.length} silenced by config` : ""}`,
    );
  } else {
    for (const r of ingestProblems) {
      if (r.status === "never") {
        lines.push(`  ❌ \`${r.client_key}\` — no pixel events ever received`);
      } else if (r.status === "stale") {
        const days = r.hours_since_newest ? (r.hours_since_newest / 24).toFixed(1) : "?";
        const last = (r.newest_ingest ?? r.last_seen_fallback ?? "").slice(0, 10);
        lines.push(`  ❌ \`${r.client_key}\` — nothing received for ${days}d (last: ${last})`);
      } else {
        lines.push(
          `  ⚠ \`${r.client_key}\` — ${r.events_24h} events/24h, ${r.pct_of_median}% of its 7d median (${r.median_events_prior_7d}/day)`,
        );
      }
    }
  }

  lines.push("", "*Per-client snapshot freshness (03:30 + 04:00 UTC crons):*");
  if (chainStaleness.length === 0) {
    lines.push("  ⚠ could not read client list or `_snapshot_runs`");
  } else if (chainProblems.length === 0) {
    const maxGap = Math.max(...chainStaleness.map((r) => r.gap_hours ?? 0));
    const clientCount = new Set(chainStaleness.map((r) => r.client_key)).size;
    lines.push(
      `  ✅ all ${clientCount} client(s) × ${ATTRIBUTION_CHAIN_STAGES.length} stages within ${CHAIN_STALENESS_THRESHOLD_HOURS}h (max gap ${maxGap.toFixed(1)}h)`
    );
  } else {
    for (const r of chainProblems.slice(0, 15)) {
      if (r.last_ok_at === null) {
        lines.push(`  ❌ \`${r.client_key}\` · ${shortStage(r.stage)} — no successful run found`);
      } else {
        lines.push(`  ⚠ \`${r.client_key}\` · ${shortStage(r.stage)} — ${r.gap_hours!.toFixed(1)}h behind`);
      }
    }
    if (chainProblems.length > 15) {
      lines.push(`  …and ${chainProblems.length - 15} more`);
    }
  }

  const globalStaleness = await checkGlobalSnapshotStaleness();
  const staleGlobals = globalStaleness.filter(
    (r): r is Extract<GlobalSnapshotStaleness, { ok: true }> =>
      r.ok && r.gap_hours > CHAIN_STALENESS_THRESHOLD_HOURS,
  );
  const erroredGlobals = globalStaleness.filter(
    (r): r is Extract<GlobalSnapshotStaleness, { ok: false }> => !r.ok,
  );

  lines.push("", "*Global snapshot freshness (04:00 UTC cron):*");
  if (staleGlobals.length === 0 && erroredGlobals.length === 0) {
    const maxGap = Math.max(
      ...globalStaleness
        .filter((r): r is Extract<GlobalSnapshotStaleness, { ok: true }> => r.ok)
        .map((r) => r.gap_hours),
    );
    lines.push(`  ✅ all ${GLOBAL_SNAPSHOTS.length} global snapshots within ${CHAIN_STALENESS_THRESHOLD_HOURS}h (max gap ${maxGap.toFixed(1)}h)`);
  } else {
    for (const r of staleGlobals) {
      lines.push(`  ⚠ \`${r.snapshot}\` — ${r.gap_hours.toFixed(1)}h behind`);
    }
    for (const r of erroredGlobals) {
      lines.push(`  ❌ \`${r.snapshot}\` — ${r.error.slice(0, 120)}`);
    }
  }

  const squareHealth = await checkSquareTokenHealth();
  const squareFailures = squareHealth.filter(
    (r): r is Extract<SquareAuthHealth, { ok: false }> => !r.ok,
  );

  if (squareHealth.length > 0) {
    lines.push("", "*Square token health:*");
    if (squareFailures.length === 0) {
      lines.push(`  ✅ all ${squareHealth.length} Square token(s) authenticated against /v2/merchants`);
    } else {
      for (const r of squareFailures) {
        const code = r.status === null ? "network" : `HTTP ${r.status}`;
        lines.push(`  ❌ \`${r.client_key}\` (merchant ${r.merchant_id}) — ${code}: ${r.error.slice(0, 120)}`);
      }
    }
  }

  const hostCoverage = await checkRedirectHostFallbackCoverage();
  if (hostCoverage.length > 0) {
    lines.push("", "*Per-host redirect fallback coverage (multi-property tenants):*");
    const gaps = hostCoverage.filter((r) => r.missing.length > 0);
    if (gaps.length === 0) {
      lines.push(
        `  ✅ all ${hostCoverage.length} multi-property tenant(s) have a fallback for every 1P host`,
      );
    } else {
      for (const r of gaps) {
        lines.push(
          `  ⚠ \`${r.client_key}\` — ${r.missing.length} of ${r.host_count} host(s) have no per-host fallback: ${r.missing.slice(0, 5).join(", ")}`,
        );
      }
      lines.push(
        "    Readers who mistype a link on those hosts land on the per-client default (the wrong property).",
      );
    }
  }

  const signupAbuse = await checkSignupAbuse(since);
  lines.push("", "*Self-serve signup abuse (24h):*");
  if (signupAbuse.total === 0) {
    lines.push("  ✅ no blocked signup attempts");
  } else {
    lines.push(`  ⚠ ${signupAbuse.total} blocked signup attempt(s):`);
    for (const r of signupAbuse.byReason.slice(0, 8)) {
      lines.push(`    • \`${r.reason}\` — ${r.count}`);
    }
  }

  try {
    await postToGChat({ text: lines.join("\n") });
  } catch (err) {
    console.error("[daily-digest] GChat post failed:", err);
    return NextResponse.json(
      { error: "digest query ok but GChat post failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    total: runs.length,
    ok_count: ok.length,
    failed_count: failed.length,
    running_count: running.length,
    signup_abuse: signupAbuse,
    mv_staleness: mvStaleness,
    mv_stale_count: staleMvs.length,
    mv_error_count: erroredMvs.length,
    chain_staleness: chainStaleness,
    chain_problem_count: chainProblems.length,
    global_staleness: globalStaleness,
    global_stale_count: staleGlobals.length + erroredGlobals.length,
    ingest_health: ingestHealth,
    ingest_problem_count: ingestProblems.length,
    square_health: squareHealth,
    square_failure_count: squareFailures.length,
  });
}
