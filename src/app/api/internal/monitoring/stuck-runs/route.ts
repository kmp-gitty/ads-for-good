import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chapterSchemas } from "@/app/lib/chapter-db";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUCK_THRESHOLD_MINUTES = 60;

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60_000).toISOString();

  const { data, error } = await chapterSchemas
    .reporting(supabase)
    .from("_snapshot_runs")
    .select("run_id, label, target_table, started_at, snapshot_ts_hi")
    .eq("status", "running")
    .lt("started_at", cutoff)
    .order("started_at", { ascending: true });

  if (error) {
    console.error("[stuck-runs] query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stuck = data ?? [];
  if (stuck.length === 0) {
    return NextResponse.json({ ok: true, stuck_count: 0 });
  }

  const lines = stuck.map((r) => {
    const ageMin = Math.round(
      (Date.now() - new Date(r.started_at).getTime()) / 60_000
    );
    return `• *${r.label}* → \`${r.target_table}\` — running for ${ageMin} min (run_id: \`${r.run_id}\`)`;
  });

  const text = [
    `🚨 *Stuck snapshot runs detected* (${stuck.length} row${stuck.length === 1 ? "" : "s"} in \`status='running'\` > ${STUCK_THRESHOLD_MINUTES} min)`,
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
      { error: "alert query ok but GChat post failed", stuck_count: stuck.length },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, stuck_count: stuck.length, alerted: true });
}
