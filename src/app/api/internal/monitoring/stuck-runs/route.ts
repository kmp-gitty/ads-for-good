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

const STUCK_THRESHOLD_MINUTES = 60;

// Engine run-logs to watch beyond the snapshot chain. Each is a per-client
// run-log with a `status`/`started_at` row that flips to 'running' at start and
// 'ok'/'error' at finish — a stuck 'running' means the cron died mid-run (Vercel
// maxDuration) and left the row open. These were previously UNMONITORED: the
// recommendations cron hung on EOS from 2026-07-06 through 07-27 (starving later
// clients) and nothing alerted, because this route only watched _snapshot_runs.
const ENGINE_RUN_LOGS: {
  schema: (db: any) => any;
  table: string;
  label: string;
}[] = [
  { schema: chapterSchemas.recommendations, table: "runs", label: "recommendations engine" },
];

function ageMin(startedAt: string): number {
  return Math.round((Date.now() - new Date(startedAt).getTime()) / 60_000);
}

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60_000).toISOString();
  const lines: string[] = [];
  let stuckCount = 0;

  // ── snapshot chain (_snapshot_runs) ──
  const { data: snapData, error: snapErr } = await chapterSchemas
    .reporting(supabase)
    .from("_snapshot_runs")
    .select("run_id, label, target_table, started_at, snapshot_ts_hi")
    .eq("status", "running")
    .lt("started_at", cutoff)
    .order("started_at", { ascending: true });

  if (snapErr) {
    console.error("[stuck-runs] _snapshot_runs query failed:", snapErr);
    return NextResponse.json({ error: snapErr.message }, { status: 500 });
  }

  const snapStuck = (snapData ?? []) as Pick<
    SnapshotRunRow,
    "run_id" | "label" | "target_table" | "started_at" | "snapshot_ts_hi"
  >[];
  for (const r of snapStuck) {
    stuckCount++;
    lines.push(
      `• *${r.label}* → \`${r.target_table}\` — running for ${ageMin(r.started_at)} min (run_id: \`${r.run_id}\`)`
    );
  }

  // ── engine run-logs (recommendations, …) ──
  for (const log of ENGINE_RUN_LOGS) {
    const { data, error } = await log
      .schema(supabase)
      .from(log.table)
      .select("id, client_key, started_at")
      .eq("status", "running")
      .lt("started_at", cutoff)
      .order("started_at", { ascending: true });

    if (error) {
      // Don't fail the whole monitor if one engine log is unreadable — surface it.
      console.error(`[stuck-runs] ${log.label} query failed:`, error);
      lines.push(`• ⚠️ *${log.label}* run-log query failed: ${error.message}`);
      continue;
    }

    const rows = (data ?? []) as { id: string; client_key: string; started_at: string }[];
    for (const r of rows) {
      stuckCount++;
      lines.push(
        `• *${log.label}* (${r.client_key}) — running for ${ageMin(r.started_at)} min (id: \`${r.id}\`)`
      );
    }
  }

  if (stuckCount === 0) {
    return NextResponse.json({ ok: true, stuck_count: 0 });
  }

  const text = [
    `🚨 *Stuck runs detected* (${stuckCount} row${stuckCount === 1 ? "" : "s"} in \`status='running'\` > ${STUCK_THRESHOLD_MINUTES} min)`,
    "",
    ...lines,
    "",
    "_Investigate via `pg_stat_activity` filtered by `application_name` — see `feedback_avoid_pooler_for_long_queries.md` playbook._",
  ].join("\n");

  try {
    await postToGChat({ text });
  } catch (err) {
    console.error("[stuck-runs] GChat post failed:", err);
    return NextResponse.json(
      { error: "alert query ok but GChat post failed", stuck_count: stuckCount },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, stuck_count: stuckCount, alerted: true });
}
