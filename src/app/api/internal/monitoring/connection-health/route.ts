import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// PRIMARY on purpose. Connection saturation on the primary is what took the DB
// down for 8h on Aug 28 2026 — and nothing alerted (discovered only because
// some n8n workflows failed and someone noticed). Saturation CLIMBED for ~90 min
// before it broke, so a simple utilization threshold catches it within minutes.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UTIL_WARN_PCT = 70; // % of max_connections — saturation is the mechanism
const IDLE_TXN_WARN_S = 60; // idle-in-transaction age — the leak signature
const LONG_QUERY_WARN_S = 120; // a single query monopolising the primary

type Health = {
  client_conns: number;
  active: number;
  idle_in_txn: number;
  oldest_idle_txn_s: number;
  longest_active_s: number;
  max_conns: number;
};

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase.rpc("chapter_connection_health");

  // If we can't even read health, that is itself a signal — the primary may be
  // saturated to the point PostgREST can't get a connection. Alert on it.
  if (error) {
    try {
      await postToGChat({
        text: `⚠️ *DB connection-health check FAILED* — \`${error.message}\`. The primary may be saturated (PostgREST couldn't get a connection). Check \`pg_stat_activity\` immediately.`,
      });
    } catch (e) {
      console.error("[connection-health] GChat post failed:", e);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const h = data as Health;
  const util = Math.round((h.client_conns / h.max_conns) * 100);
  const alerts: string[] = [];

  if (util >= UTIL_WARN_PCT) {
    alerts.push(`• Connection utilization *${util}%* (${h.client_conns}/${h.max_conns} slots)`);
  }
  if (h.idle_in_txn > 0 && h.oldest_idle_txn_s >= IDLE_TXN_WARN_S) {
    alerts.push(
      `• *${h.idle_in_txn}* idle-in-transaction, oldest *${h.oldest_idle_txn_s}s* — the leak signature (should self-reap at 30s on app roles)`
    );
  }
  if (h.longest_active_s >= LONG_QUERY_WARN_S) {
    alerts.push(
      `• Longest active query *${h.longest_active_s}s* — possible runaway on the primary (ad-hoc query? use the replica — see db-connection-runbook.md)`
    );
  }

  if (alerts.length === 0) {
    return NextResponse.json({ ok: true, util, ...h });
  }

  const text = [
    `🚨 *DB connection health — primary approaching the ${h.max_conns}-slot limit*`,
    "",
    ...alerts,
    "",
    "_First check: `select state,count(*) from pg_stat_activity where backend_type='client backend' group by state;` — then find the monopoliser via `pg_stat_statements order by max_exec_time desc`._",
  ].join("\n");

  try {
    await postToGChat({ text });
  } catch (err) {
    console.error("[connection-health] GChat post failed:", err);
    return NextResponse.json(
      { error: "alert computed but GChat post failed", util },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, util, alerted: true, ...h });
}
