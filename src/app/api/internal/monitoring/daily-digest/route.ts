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

const DASHBOARD_MVS = [
  "journey_bot_classification_v1",
  "journey_funnel_steps_v1",
  "journey_entry_channel_v1",
] as const;

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
    DASHBOARD_MVS.map(async (mv): Promise<MvStaleness> => {
      const { data, error } = await supabase
        .schema("chapter_reporting")
        .from(mv)
        .select("journey_start_ts")
        .order("journey_start_ts", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { mv, ok: false, error: error.message };
      }
      if (!data) {
        return { mv, ok: false, error: "empty MV" };
      }
      const mvMs = new Date(data.journey_start_ts as string).getTime();
      const gapHours = (sourceMs - mvMs) / 3_600_000;
      return {
        mv,
        ok: true,
        max_ts: data.journey_start_ts as string,
        gap_hours: gapHours,
      };
    })
  );

  return { source_max: sourceMax, results };
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
  return stage.split(".").pop() ?? stage;
}

// Read max(snapshot_ts) from each global snapshot table directly. These
// aren't tracked per-client in _snapshot_runs (they're global) but they ARE
// refreshed by the 04:00 UTC cron (Sprint 3 follow-on, June 11).
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

  const chainStaleness = await checkAttributionChainStaleness();
  const chainProblems = chainStaleness.filter((r) => !r.ok);

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
    mv_staleness: mvStaleness,
    mv_stale_count: staleMvs.length,
    mv_error_count: erroredMvs.length,
    chain_staleness: chainStaleness,
    chain_problem_count: chainProblems.length,
    global_staleness: globalStaleness,
    global_stale_count: staleGlobals.length + erroredGlobals.length,
  });
}
