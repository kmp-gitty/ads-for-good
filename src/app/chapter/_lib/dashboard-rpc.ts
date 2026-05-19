// Shared cached RPC helpers for dashboard pages.
//
// Why this exists:
//   PostgREST has a built-in 8s statement_timeout on RPC calls. The dashboard's
//   per-page Supabase queries (purchase_overview, funnel_overview, etc.) read
//   from large materialized views and can take several seconds cold. Without
//   caching, every viewer hits the DB and a cold-cache hit can blow the
//   timeout. Worse, at multi-tenant scale (50+ clients), uncached load grows
//   linearly with viewers.
//
//   With this helper, each (rpc, client_key, window) tuple is computed at most
//   once per cache TTL regardless of how many dashboard tabs are open. DB load
//   becomes a function of (clients × range_codes), not viewer count.
//
// How it works:
//   - `bucketedNow()` snaps the current time to a 5-minute boundary, so the
//     cache key is stable for everyone hitting the dashboard in the same
//     5-min slice. Without bucketing, `now()` would change every millisecond
//     and the cache would never hit.
//   - `cachedRpc()` wraps a Supabase RPC call in Next's `unstable_cache` with
//     a 5-min revalidate. Cache key includes rpc name + client_key + window.
//   - Page components import the typed wrappers below and call them like
//     ordinary async functions.

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const BUCKET_MS = 5 * 60 * 1000;
/** Current time snapped to the start of the current 5-minute bucket.
 *  Pass this as `now` into rangeToWindow() so cache keys are stable across
 *  rapid-fire page loads. Trade-off: dashboard data is up to 5 minutes stale. */
export function bucketedNow(): Date {
  return new Date(Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS);
}

const REVALIDATE_SEC = 300;

export type RpcArgs = {
  p_client_key: string;
  p_start_ts: string;   // ISO
  p_end_ts:   string;   // ISO
};

/** Build a cached RPC wrapper. One per RPC name so cache entries are isolated. */
function makeCachedRpc<TRow>(rpcName: string, schema: string = "chapter_reporting") {
  return unstable_cache(
    async (args: RpcArgs): Promise<TRow[]> => {
      const r = await supabase.schema(schema).rpc(rpcName, args);
      if (r.error) {
        console.error(`[dashboard-rpc] ${schema}.${rpcName} failed:`, {
          message: r.error.message, details: r.error.details, hint: r.error.hint, code: r.error.code,
        });
        return [];
      }
      return (Array.isArray(r.data) ? r.data : []) as TRow[];
    },
    [`dashboard-rpc:${schema}:${rpcName}`],
    {
      revalidate: REVALIDATE_SEC,
      tags: [`dashboard-rpc:${rpcName}`],
    },
  );
}

// Row types — must match the Postgres RPC RETURNS TABLE shape. supabase-js
// returns numeric columns as strings; consumers cast with Number() at use.

export type PurchaseOverviewRow = {
  total_orders: number | null;
  total_revenue: number | null;
  avg_order_value: number | null;
};

export type JourneyOverviewRow = {
  total_journeys: number | null;
  identified_journeys: number | null;
  pct_identified: number | null;
  identify_events: number | null;
  sessions_per_identification: number | null;
};

export type EngagementQualityRow = {
  total_journeys: number | null;
  journeys_with_time: number | null;
  engagement_rate: number | null;
  bounce_journeys: number | null;
  bounce_rate: number | null;
  avg_events_per_journey: number | null;
};

export type FunnelStepRow = {
  step_ord: number;
  step_name: string;
  journeys: number | null;
  share_pct: number | null;
  drop_pct: number | null;
};

export type ChannelPerformanceRow = {
  channel: string;
  journeys: number | null;
  orders: number | null;
  revenue: number | null;
  cr: number | null;
};

export const cachedPurchaseOverview     = makeCachedRpc<PurchaseOverviewRow>("purchase_overview");
export const cachedJourneyOverview      = makeCachedRpc<JourneyOverviewRow>("journey_overview");
export const cachedEngagementQuality    = makeCachedRpc<EngagementQualityRow>("engagement_quality");
export const cachedFunnelOverview       = makeCachedRpc<FunnelStepRow>("funnel_overview");
export const cachedChannelPerformance   = makeCachedRpc<ChannelPerformanceRow>("channel_performance_overview");
