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

// ─────── Time series for sparklines ──────────────────────────────────────────
// dashboard_timeseries returns N equi-width buckets across [start, end). One
// round-trip backs every sparkline on the page (orders/revenue/journeys/
// identified/engagement). Per-bucket sums reconcile to the headline tile RPCs
// when the same window is used; identified count matches journey_overview's
// semantics exactly (no bot filter, by design — flagged inconsistency to
// revisit later).

export type DashboardTimeseriesRow = {
  bucket_idx: number;
  bucket_start: string;
  orders: number | null;
  revenue: number | null;
  journeys: number | null;
  identified: number | null;
  engagement_rate: number | null;
};

type TimeseriesArgs = RpcArgs & { p_n_buckets: number };

export const cachedDashboardTimeseries = unstable_cache(
  async (args: TimeseriesArgs): Promise<DashboardTimeseriesRow[]> => {
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("dashboard_timeseries", args);
    if (r.error) {
      console.error(`[dashboard-rpc] chapter_reporting.dashboard_timeseries failed:`, {
        message: r.error.message, details: r.error.details, hint: r.error.hint, code: r.error.code,
      });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as DashboardTimeseriesRow[];
  },
  ["dashboard-rpc:chapter_reporting:dashboard_timeseries"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:dashboard_timeseries"] },
);

// ─────── Attribution overview (channel × first/last/linear) ────────────────
// One row per channel for the given client + window, with orders + revenue
// totals under each of three attribution models. Page computes percentages
// (channel revenue / sum of channel revenues per model) client-side.

export type AttributionOverviewRow = {
  channel: string;
  first_orders:   number | null;
  first_revenue:  number | null;
  last_orders:    number | null;
  last_revenue:   number | null;
  linear_orders:  number | null;
  linear_revenue: number | null;
};

export const cachedAttributionOverview = makeCachedRpc<AttributionOverviewRow>("attribution_overview");

// ─────── Path combinations (set / collapsed / raw modes) ────────────────────
// One row per (mode-specific grouping key). Returns `channels` + `gaps` arrays
// that drive PathRender directly:
//   - set       → channels = sorted distinct chips; gaps = null
//   - collapsed → channels = [first, last] (or [single] if len=1);
//                 gaps = [middle_step_count] (or null)
//   - raw       → channels = full sequence; gaps = null

export type PathMode = "set" | "collapsed" | "raw";

export type PathCombinationRow = {
  channels:    string[];
  gaps:        number[] | null;
  chapters:    number | null;
  revenue:     number | null;
  aov:         number | null;
  avg_touches: number | null;
};

type PathArgs = RpcArgs & { p_mode: PathMode };

// ─────── Channel roles (per-channel opener/mid/closer/only distribution) ───
// One row per channel. Drives /chapter/channels. Page computes the dominant-
// role label (Closer / Opener / Middle / Generalist / Solo) from these
// percentages with adjustable thresholds.

export type ChannelRoleRow = {
  channel:               string;
  chapters:              number | null;
  revenue_touched:       number | null;
  only_pct:              number | null;
  opener_pct:            number | null;
  mid_pct:               number | null;
  closer_pct:            number | null;
  presence_pct:          number | null;
  /** Chapters where this channel appears AND chapter_id = 0 (first ever
   *  purchase for that identity — acquisition cohort). */
  acquisition_chapters:  number | null;
  /** Chapters where this channel appears AND chapter_id >= 1 (repeat
   *  purchase — retention cohort). */
  retention_chapters:    number | null;
};

export const cachedChannelRolesOverview = makeCachedRpc<ChannelRoleRow>("channel_roles_overview");

// ─────── Lifecycle Overview hero metrics ────────────────────────────────────
// One row of chapter-level aggregates: median touches, median + p90 days to
// close, % multi-touch, % returning purchasers. Drives the /chapter/overview
// hero text + LIFECYCLE_METRICS row.

export type LifecycleOverviewRow = {
  total_chapters:        number | null;
  median_touches:        number | null;
  median_days_to_close:  number | null;
  p90_days_to_close:     number | null;
  multi_touch_chapters:  number | null;
  multi_touch_pct:       number | null;
  /** Returning purchasers — all-time history.
   *  Chapters whose chapter_id >= 1 (the customer has any prior chapter
   *  in canonical_v1, even before this window). */
  returning_chapters:    number | null;
  returning_pct:         number | null;
  /** Returning purchasers — within-window only.
   *  Chapters that are NOT the customer's first chapter inside this window
   *  (regardless of all-time history). Smaller, captures repeat-purchase
   *  velocity during the period. */
  in_window_returning_chapters: number | null;
  in_window_returning_pct:      number | null;
};

export const cachedLifecycleOverview = makeCachedRpc<LifecycleOverviewRow>("lifecycle_overview");

// ─────── Path length trend (12 weekly buckets) ──────────────────────────────
// Per-bucket median + p90 of path_length. Mirrors dashboard_timeseries shape;
// page passes p_n_buckets explicitly (typically 12 for the weekly chart).

export type PathLengthTrendRow = {
  bucket_idx:      number;
  bucket_start:    string;
  chapters:        number | null;
  median_touches:  number | null;
  avg_touches:     number | null;
  /** P90 = 90th percentile. UI labels this "90% Max" — 90% of chapters had
   *  AT MOST this many touches; the top 10% had more. */
  p90_touches:     number | null;
};

type PathLengthTrendArgs = RpcArgs & { p_n_buckets: number };

export const cachedPathLengthTrend = unstable_cache(
  async (args: PathLengthTrendArgs): Promise<PathLengthTrendRow[]> => {
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("path_length_trend", args);
    if (r.error) {
      console.error("[dashboard-rpc] path_length_trend failed:", {
        message: r.error.message, details: r.error.details, hint: r.error.hint, code: r.error.code,
      });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as PathLengthTrendRow[];
  },
  ["dashboard-rpc:chapter_reporting:path_length_trend"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:path_length_trend"] },
);

// ─────── Channel co-occurrence affinity (Matrix view) ──────────────────────
// One row per ordered (src, dst) pair of distinct channels. affinity_pct is
// asymmetric — % of `src` chapters that ALSO contain `dst`.

export type ChannelAffinityRow = {
  src:           string;
  dst:           string;
  co_chapters:   number | null;
  src_chapters:  number | null;
  affinity_pct:  number | null;
};

export const cachedChannelAffinityOverview = makeCachedRpc<ChannelAffinityRow>("channel_affinity_overview");

// ─────── Journeys page ──────────────────────────────────────────────────────
// Two list-level RPCs + three detail-level RPCs. List RPCs are window-bound
// and accept action + outcome filters. Detail RPCs are lifetime (all-time)
// per identity and require server-side audit-logging — see logPiiView in
// src/app/lib/audit/pii-views.ts.

export type JourneysFilterArgs = RpcArgs & {
  p_action?:  string | null;
  p_outcome?: string | null;
  p_limit?:   number;
};

export type JourneysStatsRow = {
  total_identities:  number | null;
  converted_count:   number | null;
  pct_converted:     number | null;
  total_ltv:         number | null;
  avg_ltv:           number | null;
  median_ltv:        number | null;
};

export type JourneysListRow = {
  canonical_identity_key:  string;
  matching_events:         number | null;
  lifetime_chapters:       number | null;
  lifetime_value:          number | null;
  last_purchase_ts:        string | null;
  last_activity_ts:        string | null;
  outcome:                 string;     // 'converted' | 'open'
};

export const cachedJourneysStats = unstable_cache(
  async (args: JourneysFilterArgs): Promise<JourneysStatsRow[]> => {
    const r = await supabase.schema("chapter_reporting").rpc("journeys_overview_stats", args);
    if (r.error) {
      console.error("[dashboard-rpc] journeys_overview_stats failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as JourneysStatsRow[];
  },
  ["dashboard-rpc:chapter_reporting:journeys_overview_stats"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:journeys_overview_stats"] },
);

export const cachedJourneysList = unstable_cache(
  async (args: JourneysFilterArgs): Promise<JourneysListRow[]> => {
    const r = await supabase.schema("chapter_reporting").rpc("journeys_overview_list", args);
    if (r.error) {
      console.error("[dashboard-rpc] journeys_overview_list failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as JourneysListRow[];
  },
  ["dashboard-rpc:chapter_reporting:journeys_overview_list"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:journeys_overview_list"] },
);

// ── Detail RPCs (per identity, lifetime) ────────────────────────────────────

export type JourneyDetailChapterRow = {
  chapter_id:    number;
  first_ts:      string;
  boundary_ts:   string;
  channel_path:  string;
  revenue:       number | null;
  currency:      string | null;
};

export type JourneyDetailEventRow = {
  chapter_id:  number;
  event_ts:    string;
  event_name:  string;
  is_boundary: boolean;
};

export type JourneyDetailAliasRow = {
  alias_key:        string;
  first_seen_ts:    string | null;
  method:           string;
  is_deterministic: boolean;
  confidence:       number;
};

type JourneyDetailArgs = {
  p_client_key:             string;
  p_canonical_identity_key: string;
};

const _makeDetailRpc = <T>(rpcName: string, tag: string) => unstable_cache(
  async (args: JourneyDetailArgs): Promise<T[]> => {
    const r = await supabase.schema("chapter_reporting").rpc(rpcName, args);
    if (r.error) {
      console.error(`[dashboard-rpc] ${rpcName} failed:`, { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as T[];
  },
  [`dashboard-rpc:chapter_reporting:${rpcName}`],
  { revalidate: REVALIDATE_SEC, tags: [tag] },
);

export const cachedJourneyDetailChapters = _makeDetailRpc<JourneyDetailChapterRow>("journey_detail_chapters", "dashboard-rpc:journey_detail_chapters");
export const cachedJourneyDetailEvents   = _makeDetailRpc<JourneyDetailEventRow>("journey_detail_events", "dashboard-rpc:journey_detail_events");
export const cachedJourneyDetailAliases  = _makeDetailRpc<JourneyDetailAliasRow>("journey_detail_aliases", "dashboard-rpc:journey_detail_aliases");

// ─────── Lift & Incrementality — Correlation tab ────────────────────────────
// One row per channel actually present in the client's data within window.
// Two distinct metric spaces (see RPC comments):
//   - Identity-level (conversion rate): ids_with/without, conv_ids_with/without
//   - Chapter-level (continuous, converters only): AOV / days-to-close / touches
//     each with mean + sample stddev for the SE noise gate in TS.
//
// Statistical honesty gate is applied CLIENT-SIDE in TS — see CorrelationTab
// component. Three states:
//   - Hidden:    min(n_with, n_without) < 30
//   - Noise:     |delta| < 2 × SE(delta)    → grayed render
//   - Confident: |delta| ≥ 2 × SE(delta)    → colored render

export type CorrelationChannelRow = {
  channel: string;
  // Identity-level (conversion rate)
  ids_with:         number | null;
  ids_without:      number | null;
  conv_ids_with:    number | null;
  conv_ids_without: number | null;
  // Chapter-level (converters only) with mean + sample stddev per arm
  chapters_with:    number | null;
  chapters_without: number | null;
  aov_with:         number | null;
  aov_sd_with:      number | null;
  aov_without:      number | null;
  aov_sd_without:   number | null;
  days_with:        number | null;
  days_sd_with:     number | null;
  days_without:     number | null;
  days_sd_without:  number | null;
  touches_with:     number | null;
  touches_sd_with:  number | null;
  touches_without:  number | null;
  touches_sd_without: number | null;
};

export const cachedCorrelationChannelOverview = makeCachedRpc<CorrelationChannelRow>("correlation_channel_overview");

// ─────── Lift & Incrementality — Incrementality tab ─────────────────────────
// One row per (channel × bucket). Returns sufficient statistics for the
// TS-layer regression-adjusted lift computation per spec §6 (Lin's-style
// adjustment with pre-channel touches as the covariate).
//
// adj_diff = (y_with - y_without) - β·(x_with - x_without)
// SE(adj_diff) ≈ sqrt((1 - r²) · s_y² · (1/n_with + 1/n_without))
//
// Population is CONVERTERS ONLY (canonical_v1 chapters in window) — Inc-
// rementality compares converter outcomes by channel presence, NOT con-
// version rate (that's the Correlation tab).

export type IncrementalityAxis = "subscriber" | "value_band" | "location";

export type IncrementalityRow = {
  channel:       string;
  bucket:        string;
  bucket_label:  string;
  // Conv rate (identity-level; NULL on value_band axis per RPC contract)
  ids_with:         number | null;
  ids_without:      number | null;
  conv_ids_with:    number | null;
  conv_ids_without: number | null;
  // AOV chapter counts + stats (pre-channel touch covariate)
  n_with:        number | null;
  n_without:     number | null;
  aov_with:        number | null;
  aov_sd_with:     number | null;
  aov_without:     number | null;
  aov_sd_without:  number | null;
  aov_cov_with:    number | null;
  aov_cov_without: number | null;
  aov_slope:       number | null;
  aov_r2:          number | null;
  // Time to close — STRICT SUBSET (chapter_id ≥ 1; recency covariate)
  days_n_with:     number | null;
  days_n_without:  number | null;
  days_with:        number | null;
  days_sd_with:     number | null;
  days_without:     number | null;
  days_sd_without:  number | null;
  days_cov_with:    number | null;   // mean recency (days since prior purchase)
  days_cov_without: number | null;
  days_slope:       number | null;
  days_r2:          number | null;
};

type IncrementalityArgs = RpcArgs & { p_cohort_axis: IncrementalityAxis };

// Lightweight metadata RPC that exposes the auto-derived cohort cutoffs
// (subscriber count, value-band terciles, top regions) for the description
// box next to the cohort axis picker on the Incrementality tab.
export type IncrementalityAxisMetadataRow = {
  subscriber_count: number | null;
  value_band_n:     number | null;
  value_band_p33:   number | null;
  value_band_p67:   number | null;
  value_band_max:   number | null;
  top_regions:      string[] | null;
  total_regions:    number | null;
};

export const cachedIncrementalityAxisMetadata = makeCachedRpc<IncrementalityAxisMetadataRow>("incrementality_axis_metadata");

// ─────── Lift & Incrementality — Contribution tab (Tab 3) ──────────────────
// One row per channel. Returns raw components for:
//   - Measure A: Incremental Loss projection (incremental_rate + variance →
//     CI in TS, then × touched_chapters for the range)
//   - Measure B: Contribution Index (3 signals — TS normalizes 0-1 across
//     channels and averages)
//   - 2×2 quadrant (TS median-splits on incremental_rate + contribution_index)

export type ContributionChannelRow = {
  channel:                    string;
  touched_chapters:           number | null;
  touched_revenue:            number | null;
  total_chapters:             number | null;
  total_revenue:              number | null;
  participation_rate:         number | null;
  fractional_revenue:         number | null;
  fractional_orders:          number | null;
  recurrence_score:           number | null;
  incremental_rate:           number | null;
  incremental_rate_variance:  number | null;
  incremental_buckets_n:      number | null;
  cohort_axis_used:           string;
};

export const cachedContributionOverview = makeCachedRpc<ContributionChannelRow>("contribution_overview");

export const cachedIncrementalityChannelOverview = unstable_cache(
  async (args: IncrementalityArgs): Promise<IncrementalityRow[]> => {
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("incrementality_channel_overview", args);
    if (r.error) {
      console.error("[dashboard-rpc] incrementality_channel_overview failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as IncrementalityRow[];
  },
  ["dashboard-rpc:chapter_reporting:incrementality_channel_overview"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:incrementality_channel_overview"] },
);

export const cachedPathCombinationsOverview = unstable_cache(
  async (args: PathArgs): Promise<PathCombinationRow[]> => {
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("path_combinations_overview", args);
    if (r.error) {
      console.error("[dashboard-rpc] path_combinations_overview failed:", {
        message: r.error.message, details: r.error.details, hint: r.error.hint, code: r.error.code,
      });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as PathCombinationRow[];
  },
  ["dashboard-rpc:chapter_reporting:path_combinations_overview"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:path_combinations_overview"] },
);

// ─────── Prior-period window helper ──────────────────────────────────────────
// Returns the same-duration window immediately preceding [start, end). Caller
// uses this to call the existing tile RPCs a second time with the prior args
// — no new RPC needed. Cache stays effective because the prior window is also
// stable within a 5-min bucket.
export function priorWindow(start: Date, end: Date): { start: Date; end: Date } {
  const durMs = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - durMs), end: new Date(start.getTime()) };
}
