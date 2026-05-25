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

const DASHBOARD_MVS = [
  "journey_bot_classification_v1",
  "journey_funnel_steps_v1",
  "journey_entry_channel_v1",
] as const;

type MvStaleness =
  | { mv: string; ok: true; max_ts: string; gap_hours: number }
  | { mv: string; ok: false; error: string };

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
  });
}
