// Dashboard data freshness — returns the cutoff timestamp the dashboard's
// analytical numbers represent for each active client. Reads the most recent
// successful `snapshot_ts_hi` from chapter_reporting._snapshot_runs across the
// snapshots that back the dashboard pages.
//
// Returned as ISO string + the client's display_tz so the TopBar can render
// "Data as of June 10, 2026 — refreshes nightly at 03:30 UTC" in the local
// timezone without round-tripping to the server.

import { createClient } from "@supabase/supabase-js";

// Snapshots whose freshness defines "as of" for analytical pages.
// (Live tables like pixel_events / purchase_events are real-time and don't
// gate the freshness label — operational pages would carry no footer.)
const DASHBOARD_SNAPSHOTS = [
  "chapter_model.lifecycle_chapters_snapshot",
  "chapter_attribution.chapter_channel_paths_canonical_v1_snapshot",
  "chapter_attribution.chapter_channel_paths_canonical_v2_snapshot",
  "journey_resolved_v1",
] as const;

export type ClientFreshness = {
  client_key: string;
  // Most recent snapshot_ts_hi across DASHBOARD_SNAPSHOTS for this client.
  // The "data is as of" moment — anything that happened after this is NOT
  // reflected on the dashboard's analytical pages.
  as_of_iso: string;
  display_tz: string;
};

export async function getDashboardFreshnessByClient(): Promise<Record<string, ClientFreshness>> {
  const supabase = createClient(
    process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const [{ data: runs }, { data: clients }] = await Promise.all([
    supabase
      .schema("chapter_reporting")
      .from("_snapshot_runs")
      .select("client_key, target_table, snapshot_ts_hi")
      .eq("status", "ok")
      .in("target_table", DASHBOARD_SNAPSHOTS as unknown as string[])
      .order("snapshot_ts_hi", { ascending: false }),
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("client_key, display_tz"),
  ]);

  type ClientRow = { client_key: string; display_tz: string | null };
  const tzByClient = new Map<string, string>();
  for (const c of ((clients as ClientRow[] | null) ?? [])) {
    tzByClient.set(c.client_key, c.display_tz ?? "America/Los_Angeles");
  }

  // First-seen per client wins because rows are pre-sorted DESC by snapshot_ts_hi.
  // We use the OLDEST among the 4 snapshots for that client — that's the actual
  // freshness floor.
  type RunRow = { client_key: string; target_table: string; snapshot_ts_hi: string };
  const oldestPerClient = new Map<string, string>();
  const seenPerClient = new Map<string, Set<string>>();
  for (const r of ((runs as RunRow[] | null) ?? [])) {
    const seen = seenPerClient.get(r.client_key) ?? new Set<string>();
    if (seen.has(r.target_table)) continue;
    seen.add(r.target_table);
    seenPerClient.set(r.client_key, seen);
    const cur = oldestPerClient.get(r.client_key);
    if (!cur || new Date(r.snapshot_ts_hi).getTime() < new Date(cur).getTime()) {
      oldestPerClient.set(r.client_key, r.snapshot_ts_hi);
    }
  }

  const result: Record<string, ClientFreshness> = {};
  for (const [client_key, as_of_iso] of oldestPerClient.entries()) {
    result[client_key] = {
      client_key,
      as_of_iso,
      display_tz: tzByClient.get(client_key) ?? "America/Los_Angeles",
    };
  }
  return result;
}
