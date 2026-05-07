import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chapterSchemas } from "@/app/lib/chapter-db";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WINDOW_HOURS = 24;

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

  const runs = data ?? [];
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
  });
}
