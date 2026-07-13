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

// Per-chapter revenue with attribution + refund netting. Works for both
// event-and-order-in-one-shot clients (Shopify: boundary event_name='purchase',
// value carries directly on the row) and split-flow clients (Square:
// event_name='appointment_booked' with value=0, revenue in downstream
// appointment_paid events attributed via nearest-prior-booking per customer).
// Consumers group/sum by channel_path client-side for revenue-by-channel views.
export type ChapterPurchaseSummaryRow = {
  canonical_identity_key: string;
  chapter_id: number;
  first_ts: string;
  boundary_ts: string;
  order_id: string | null;
  channel_path: string | null;
  gross_revenue: number | null;
  refunded: number | null;
  net_revenue: number | null;
  currency: string | null;
};

export const cachedPurchaseOverview       = makeCachedRpc<PurchaseOverviewRow>("purchase_overview");
export const cachedJourneyOverview        = makeCachedRpc<JourneyOverviewRow>("journey_overview");
export const cachedEngagementQuality      = makeCachedRpc<EngagementQualityRow>("engagement_quality");
export const cachedFunnelOverview         = makeCachedRpc<FunnelStepRow>("funnel_overview");
export const cachedChannelPerformance     = makeCachedRpc<ChannelPerformanceRow>("channel_performance_overview");
export const cachedChapterPurchaseSummary = makeCachedRpc<ChapterPurchaseSummaryRow>("chapter_purchase_summary");

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

// Sprint 9 Phase 2 — snapshot-first lookup for journeys_overview_list.
// Snapshot covers (client_key, 30d window, NULL action, NULL outcome, limit=50)
// — the dashboard's first-paint default for the Customer Journeys page.
async function journeysListSnapshotLookup(args: JourneysFilterArgs): Promise<JourneysListRow[] | null> {
  if (args.p_action != null) return null;
  if (args.p_outcome != null) return null;
  if (args.p_limit !== undefined && args.p_limit !== 50) return null;
  if (!matchesDefaultWindow(args, 30)) return null;

  const r = await supabase
    .schema("chapter_reporting")
    .from("journeys_overview_list_snapshot_v1")
    .select("rows")
    .eq("client_key", args.p_client_key)
    .eq("window_days", 30)
    .maybeSingle();
  if (r.error || !r.data) return null;
  return (r.data.rows as JourneysListRow[]) ?? [];
}

export const cachedJourneysList = unstable_cache(
  async (args: JourneysFilterArgs): Promise<JourneysListRow[]> => {
    const snap = await journeysListSnapshotLookup(args);
    if (snap !== null) return snap;
    const r = await supabase.schema("chapter_reporting").rpc("journeys_overview_list", args);
    if (r.error) {
      console.error("[dashboard-rpc] journeys_overview_list failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as JourneysListRow[];
  },
  ["dashboard-rpc:chapter_reporting:journeys_overview_list:v2"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:journeys_overview_list:v2"] },
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

// Sprint 9 Phase 2 — snapshot-first lookups for Lift & Journeys pages.
//
// Tolerant window matching: snapshot is built nightly for a "now − N days
// to now" window; user may load the dashboard hours later. Accept the
// snapshot when (a) window length matches ±1 day, (b) end_ts is within
// last 24h. Custom date ranges or non-default cohort_axis fall back to
// live RPC.
function matchesDefaultWindow(args: { p_start_ts: string; p_end_ts: string }, expectedDays: number): boolean {
  const startMs = new Date(args.p_start_ts).getTime();
  const endMs = new Date(args.p_end_ts).getTime();
  if (!isFinite(startMs) || !isFinite(endMs)) return false;
  const rangeDays = (endMs - startMs) / 86400000;
  if (Math.abs(rangeDays - expectedDays) > 1) return false;
  const endAgeHours = (Date.now() - endMs) / 3600000;
  if (endAgeHours < -1 || endAgeHours > 24) return false;
  return true;
}

async function contributionSnapshotLookup(args: RpcArgs): Promise<ContributionChannelRow[] | null> {
  if (!matchesDefaultWindow(args, 90)) return null;
  const r = await supabase
    .schema("chapter_reporting")
    .from("contribution_snapshot_v1")
    .select("rows")
    .eq("client_key", args.p_client_key)
    .eq("window_days", 90)
    .maybeSingle();
  if (r.error || !r.data) return null;
  return (r.data.rows as ContributionChannelRow[]) ?? [];
}

export const cachedContributionOverview = unstable_cache(
  async (args: RpcArgs): Promise<ContributionChannelRow[]> => {
    const snap = await contributionSnapshotLookup(args);
    if (snap !== null) return snap;
    const r = await supabase.schema("chapter_reporting").rpc("contribution_overview", args);
    if (r.error) {
      console.error("[dashboard-rpc] contribution_overview failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as ContributionChannelRow[];
  },
  ["dashboard-rpc:chapter_reporting:contribution_overview:v2"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:contribution_overview:v2"] },
);

async function incrementalitySnapshotLookup(args: IncrementalityArgs): Promise<IncrementalityRow[] | null> {
  if (args.p_cohort_axis !== "subscriber") return null;
  if (!matchesDefaultWindow(args, 90)) return null;
  const r = await supabase
    .schema("chapter_reporting")
    .from("incrementality_snapshot_v1")
    .select("rows")
    .eq("client_key", args.p_client_key)
    .eq("cohort_axis", "subscriber")
    .eq("window_days", 90)
    .maybeSingle();
  if (r.error || !r.data) return null;
  return (r.data.rows as IncrementalityRow[]) ?? [];
}

export const cachedIncrementalityChannelOverview = unstable_cache(
  async (args: IncrementalityArgs): Promise<IncrementalityRow[]> => {
    const snap = await incrementalitySnapshotLookup(args);
    if (snap !== null) return snap;
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("incrementality_channel_overview", args);
    if (r.error) {
      console.error("[dashboard-rpc] incrementality_channel_overview failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as IncrementalityRow[];
  },
  ["dashboard-rpc:chapter_reporting:incrementality_channel_overview:v2"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:incrementality_channel_overview:v2"] },
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

// ─────── Connections #1 — Cross-Source Influence ────────────────────────────
// Channel anchor only for v1. Resolver returns a lightweight summary; panel
// returns ranked connection rows (per-identity anchor moments + lag window).

export type ConnectionsAnchorPayload =
  | { channel: string;     start_ts: string; end_ts: string }
  | { page_path: string;   start_ts: string; end_ts: string }
  | { campaign_id: string; start_ts: string; end_ts: string }
  | { cohort_id: string;   start_ts: string; end_ts: string };

export type ConnectionsAnchorType = "channel" | "page" | "campaign" | "cohort";

export type ConnectionsAnchorResolveArgs = {
  p_client_key:     string;
  p_anchor_type:    ConnectionsAnchorType;
  p_anchor_payload: ConnectionsAnchorPayload;
};

export type ConnectionsAnchorResolveRow = {
  n_identities:    number | null;
  match_rate:      number | null;
  anchor_summary:  string;
  anchor_start_ts: string;
  anchor_end_ts:   string;
};

// Sprint 9 Phase 1B — snapshot-first lookup for anchor_resolve. Mirrors the
// Phase 1A pattern: read from connections_anchor_meta_snapshot_v1 first
// (~30ms), fall back to live RPC for anchors not in the snapshot.
async function anchorResolveSnapshotLookup(
  args: ConnectionsAnchorResolveArgs,
): Promise<ConnectionsAnchorResolveRow[] | null> {
  const anchorKey = extractAnchorKey(args.p_anchor_type, args.p_anchor_payload as Record<string, unknown>);
  if (!anchorKey) return null;

  const r = await supabase
    .schema("chapter_reporting")
    .from("connections_anchor_meta_snapshot_v1")
    .select("anchor_resolve")
    .eq("client_key", args.p_client_key)
    .eq("anchor_type", args.p_anchor_type)
    .eq("anchor_key", anchorKey)
    .maybeSingle();

  if (r.error || !r.data || !r.data.anchor_resolve) return null;
  return [r.data.anchor_resolve as ConnectionsAnchorResolveRow];
}

export const cachedConnectionsAnchorResolve = unstable_cache(
  async (args: ConnectionsAnchorResolveArgs): Promise<ConnectionsAnchorResolveRow[]> => {
    const snap = await anchorResolveSnapshotLookup(args);
    if (snap !== null) return snap;

    const r = await supabase
      .schema("chapter_reporting")
      .rpc("connections_anchor_resolve", args);
    if (r.error) {
      console.error("[dashboard-rpc] connections_anchor_resolve failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as ConnectionsAnchorResolveRow[];
  },
  // v4 — Phase 1B snapshot-first lookup added; bust cache so stale empties
  // get re-resolved through the snapshot path.
  ["dashboard-rpc:chapter_reporting:connections_anchor_resolve:v4"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:connections_anchor_resolve:v4"] },
);

export type ConnectionsConnectionType = "channel" | "page";

export type ConnectionsPanelArgs = {
  p_client_key:           string;
  p_anchor_type:          ConnectionsAnchorType;
  p_anchor_payload:       ConnectionsAnchorPayload;
  p_direction:            "upstream" | "downstream";
  p_window_days:          number;
  p_outcome_window_days?: number;   // default 30 server-side
  p_exclude_channels?:    string[];
  p_connection_type?:     ConnectionsConnectionType; // default 'channel'
  p_exclude_pages?:       string[];
  p_min_n?:               number;   // default 5; pass 1 for Person anchor
};

export type ConnectionsPanelRow = {
  connected_thing_type:  string;
  connected_thing_id:    string;
  connected_thing_label: string;
  n_identities:          number | null;
  pct_of_anchor:         number | null;
  median_lag_days:       number | null;
  outcome_rate:          number | null;
};

// Sprint 9 Phase 1A — Snapshot-first lookup.
//
// connections_panel is a 3-7s SQL call. Sprint 9 pre-computes it nightly into
// chapter_reporting.connections_panel_snapshot_v1 for the top-N anchors of
// each type, default 30d/30d window. This wrapper checks the snapshot first;
// hit returns in ~50ms, miss falls back to the live RPC (which keeps prior
// behavior for non-default windows + non-top anchors).
//
// Snapshot hit conditions (all must match):
//   - p_window_days = 30 AND p_outcome_window_days = 30
//   - anchor_key is extractable from p_anchor_payload AND has a snapshot row
//
// Exclude args are applied client-side after snapshot read so a snapshot row
// can satisfy any exclude combination.
function extractAnchorKey(
  anchor_type: string,
  payload: Record<string, unknown>,
): string | null {
  if (anchor_type === "channel") return typeof payload.channel === "string" ? payload.channel : null;
  if (anchor_type === "page") return typeof payload.page_path === "string" ? payload.page_path : null;
  if (anchor_type === "campaign") return typeof payload.campaign_id === "string" ? payload.campaign_id : null;
  if (anchor_type === "cohort") return typeof payload.cohort_id === "string" ? payload.cohort_id : null;
  return null;
}

async function snapshotLookup(args: ConnectionsPanelArgs): Promise<ConnectionsPanelRow[] | null> {
  // Only attempt snapshot for the default window combo.
  if (args.p_window_days !== 30 || (args.p_outcome_window_days ?? 30) !== 30) return null;

  const anchorKey = extractAnchorKey(args.p_anchor_type, args.p_anchor_payload as Record<string, unknown>);
  if (!anchorKey) return null;

  const r = await supabase
    .schema("chapter_reporting")
    .from("connections_panel_snapshot_v1")
    .select("rows")
    .eq("client_key", args.p_client_key)
    .eq("anchor_type", args.p_anchor_type)
    .eq("anchor_key", anchorKey)
    .eq("direction", args.p_direction)
    .eq("connection_type", args.p_connection_type ?? "channel")
    .eq("window_days", 30)
    .eq("outcome_window_days", 30)
    .maybeSingle();

  if (r.error || !r.data) return null;
  let rows = (r.data.rows as ConnectionsPanelRow[]) ?? [];

  // Apply exclude args client-side. Cheap (~30 rows max per snapshot) and
  // lets one snapshot row serve any exclude combination.
  const excludeChannels = args.p_exclude_channels ?? [];
  const excludePages = args.p_exclude_pages ?? [];
  if (excludeChannels.length > 0 || excludePages.length > 0) {
    rows = rows.filter((row) => {
      if (row.connected_thing_type === "channel" && excludeChannels.includes(row.connected_thing_id)) return false;
      if (row.connected_thing_type === "page" && excludePages.includes(row.connected_thing_id)) return false;
      return true;
    });
  }
  return rows;
}

export const cachedConnectionsPanel = unstable_cache(
  async (args: ConnectionsPanelArgs): Promise<ConnectionsPanelRow[]> => {
    // 1) Snapshot-first lookup (Sprint 9 Phase 1A — ~50ms hit, ~0ms miss to detect).
    const snap = await snapshotLookup(args);
    if (snap !== null) return snap;

    // 2) Fall back to live RPC for non-snapshot params (non-default window,
    //    anchor outside top-N, or snapshot not yet built for this client).
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("connections_panel", args);
    if (r.error) {
      console.error("[dashboard-rpc] connections_panel failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as ConnectionsPanelRow[];
  },
  // v6 — snapshot-first lookup added. Args shape unchanged but cache must
  // bust so any stale empty entries (from pre-snapshot-enabled cold cache)
  // get re-resolved.
  ["dashboard-rpc:chapter_reporting:connections_panel:v6"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:connections_panel:v6"] },
);

export type ConnectionsPageOption = { page_path: string; views: number };

export type ConnectionsSelfRecurrenceRow = {
  total_anchored:         number;
  n_recurrent:            number;
  pct_recurrent:          number | null;
  avg_chapters_recurrent: number | null;
  revenue_recurrent:      number | null;
};

// Sprint 9 Phase 1B — snapshot-first lookup for self_recurrence.
async function selfRecurrenceSnapshotLookup(
  args: ConnectionsAnchorResolveArgs,
): Promise<ConnectionsSelfRecurrenceRow[] | null> {
  const anchorKey = extractAnchorKey(args.p_anchor_type, args.p_anchor_payload as Record<string, unknown>);
  if (!anchorKey) return null;

  const r = await supabase
    .schema("chapter_reporting")
    .from("connections_anchor_meta_snapshot_v1")
    .select("self_recurrence")
    .eq("client_key", args.p_client_key)
    .eq("anchor_type", args.p_anchor_type)
    .eq("anchor_key", anchorKey)
    .maybeSingle();

  if (r.error || !r.data || !r.data.self_recurrence) return null;
  return [r.data.self_recurrence as ConnectionsSelfRecurrenceRow];
}

export const cachedConnectionsSelfRecurrence = unstable_cache(
  async (args: ConnectionsAnchorResolveArgs): Promise<ConnectionsSelfRecurrenceRow[]> => {
    const snap = await selfRecurrenceSnapshotLookup(args);
    if (snap !== null) return snap;

    const r = await supabase.schema("chapter_reporting").rpc("connections_self_recurrence", args);
    if (r.error) {
      console.error("[dashboard-rpc] connections_self_recurrence failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as ConnectionsSelfRecurrenceRow[];
  },
  // v2 — Phase 1B snapshot-first lookup added.
  ["dashboard-rpc:chapter_reporting:connections_self_recurrence:v2"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:connections_self_recurrence:v2"] },
);

export type ConnectionsCampaignOption = {
  campaign_id:     string;
  campaign_name:   string | null;
  platform:        string | null;
  last_click_ts:   string | null;
  unique_clickers: number;
};

export type ConnectionsCohortOption = {
  cohort_id:       string;
  name:            string;
  identifier_type: string;
  kind:            "system" | "uploaded";
  event_at:        string;
  created_at:      string;
  total_uploaded:  number;
  total_matched:   number;
};

export const cachedConnectionsCohortOptions = unstable_cache(
  async (args: { p_client_key: string; p_limit?: number }): Promise<ConnectionsCohortOption[]> => {
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("connections_cohort_options", args);
    if (r.error) {
      console.error("[dashboard-rpc] connections_cohort_options failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as ConnectionsCohortOption[];
  },
  // v2 — picker return shape gained `kind` (system vs uploaded) so system
  // cohorts can be styled differently in the dropdown.
  ["dashboard-rpc:chapter_reporting:connections_cohort_options:v2"],
  { revalidate: 30, tags: ["dashboard-rpc:connections_cohort_options:v2"] },
);

export const cachedConnectionsCampaignOptions = unstable_cache(
  async (args: RpcArgs & { p_limit?: number }): Promise<ConnectionsCampaignOption[]> => {
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("connections_campaign_options", args);
    if (r.error) {
      console.error("[dashboard-rpc] connections_campaign_options failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as ConnectionsCampaignOption[];
  },
  ["dashboard-rpc:chapter_reporting:connections_campaign_options"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:connections_campaign_options"] },
);

export const cachedConnectionsPageOptions = unstable_cache(
  async (args: RpcArgs & { p_limit?: number }): Promise<ConnectionsPageOption[]> => {
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("connections_page_options", args);
    if (r.error) {
      console.error("[dashboard-rpc] connections_page_options failed:", { ...r.error });
      return [];
    }
    const rows = (Array.isArray(r.data) ? r.data : []) as ConnectionsPageOption[];
    if (rows.length === 0) {
      // First call right after function creation can hit PostgREST while its
      // schema cache is still stale → empty result. Log it so we can spot if
      // this recurs after the cache key bump below.
      console.warn("[dashboard-rpc] connections_page_options returned 0 rows for args:", args);
    }
    return rows;
  },
  // v2 cache namespace — busts stale empty entries from before the PostgREST
  // schema cache caught up to the new function.
  ["dashboard-rpc:chapter_reporting:connections_page_options:v2"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:connections_page_options:v2"] },
);

// ─────── Connections #2 — Lagged Impact ─────────────────────────────────────
// Per-pair / per-lag lightweight-tier RPC. Each call is one (A→B, lag) cell.

export type LaggedImpactArgs = {
  p_client_key:      string;
  p_channel_a:       string;
  p_channel_b:       string;
  p_treatment_start: string;     // ISO
  p_treatment_end:   string;     // ISO
  p_lag_days:        number;
};

export type LaggedImpactRow = {
  treated_n:             number;
  baseline_n:            number;
  treated_return_n:      number;
  baseline_return_n:     number;
  treated_return_rate:   number | null;
  baseline_return_rate:  number | null;
  abs_lift_pp:           number | null;
  rel_lift_pct:          number | null;
  abs_lift_ci_low:       number | null;
  abs_lift_ci_high:      number | null;
  rel_lift_ci_low:       number | null;
  rel_lift_ci_high:      number | null;
  cell_gate_status:      "ok" | "within_noise" | "below_n_floor";
};

export type LaggedImpactSeriesRow = {
  bucket_start:       string;
  bucket_end:         string;
  channel_a_journeys: number;
  channel_b_journeys: number;
};

export const cachedLaggedImpactPairSeries = unstable_cache(
  async (args: {
    p_client_key: string;
    p_channel_a:  string;
    p_channel_b:  string;
    p_start_ts:   string;
    p_end_ts:     string;
    p_n_buckets?: number;
  }): Promise<LaggedImpactSeriesRow[]> => {
    const r = await supabase.schema("chapter_reporting").rpc("lagged_impact_pair_series", args);
    if (r.error) {
      console.error("[dashboard-rpc] lagged_impact_pair_series failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as LaggedImpactSeriesRow[];
  },
  ["dashboard-rpc:chapter_reporting:lagged_impact_pair_series"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:lagged_impact_pair_series"] },
);

export const cachedLaggedImpactPair = unstable_cache(
  async (args: LaggedImpactArgs): Promise<LaggedImpactRow[]> => {
    const r = await supabase
      .schema("chapter_reporting")
      .rpc("lagged_impact_pair", args);
    if (r.error) {
      console.error("[dashboard-rpc] lagged_impact_pair failed:", { ...r.error });
      return [];
    }
    return (Array.isArray(r.data) ? r.data : []) as LaggedImpactRow[];
  },
  ["dashboard-rpc:chapter_reporting:lagged_impact_pair"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:lagged_impact_pair"] },
);

// ─────── Observations engine ────────────────────────────────────────────────

export type ObservationFinding = {
  id:                     string;
  question_id:            string;
  subject_key:            string;
  category:               "acquisition" | "retention" | "conversion" | "channel_mix" | "audience" | "data_integrity";
  severity:               "high" | "med" | "low";
  current_state:          "new" | "standing" | "changed" | "resolved";
  action_type:            "mechanical" | "analytical" | "strategic_prompting";
  headline:               string;
  data:                   { label: string; value: string }[];
  action:                 string;
  page:                   string;
  page_label:             string;
  last_fired_at:          string;
  first_fired_at:         string;
  gating_priority_active: boolean;
  is_hero:                boolean;
  // Manual severity override fields (post-June 14 RPC update). When
  // `manual_override_active` is true, `severity` already reflects the
  // overridden value; `original_severity` carries what the engine computed.
  original_severity:      "high" | "med" | "low";
  manual_override_active: boolean;
  manual_override_reason: string | null;
  manual_override_by:     string | null;
  manual_override_at:     string | null;
};

export type ObservationHistoryRow = {
  recorded_at:   string;
  question_id:   string;
  subject_key:   string;
  category:      string;
  severity:      string;
  current_state: string;
  headline:      string;
  run_id:        string;
};

export type DormantQuestion = {
  question_id:             string;
  name:                    string;
  category:                string;
  min_data_depth_weeks:    number;
  capability_requirements: string[];
  reason:                  string;
};

export const cachedObservationsList = unstable_cache(
  async (args: { p_client_key: string }): Promise<ObservationFinding[]> => {
    const r = await supabase.schema("chapter_reporting").rpc("observations_list_current", args);
    if (r.error) { console.error("[dashboard-rpc] observations_list_current failed:", { ...r.error }); return []; }
    return (Array.isArray(r.data) ? r.data : []) as ObservationFinding[];
  },
  ["dashboard-rpc:chapter_reporting:observations_list_current"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:observations_list_current"] },
);

export const cachedObservationsHistory = unstable_cache(
  async (args: { p_client_key: string; p_lookback_days?: number }): Promise<ObservationHistoryRow[]> => {
    const r = await supabase.schema("chapter_reporting").rpc("observations_list_history", args);
    if (r.error) { console.error("[dashboard-rpc] observations_list_history failed:", { ...r.error }); return []; }
    return (Array.isArray(r.data) ? r.data : []) as ObservationHistoryRow[];
  },
  ["dashboard-rpc:chapter_reporting:observations_list_history"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:observations_list_history"] },
);

export const cachedObservationsDormant = unstable_cache(
  async (args: { p_client_key: string }): Promise<DormantQuestion[]> => {
    const r = await supabase.schema("chapter_reporting").rpc("observations_dormant_questions", args);
    if (r.error) { console.error("[dashboard-rpc] observations_dormant_questions failed:", { ...r.error }); return []; }
    return (Array.isArray(r.data) ? r.data : []) as DormantQuestion[];
  },
  ["dashboard-rpc:chapter_reporting:observations_dormant_questions"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:observations_dormant_questions"] },
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

// ─────── Per-client config (chapter_config.clients) ──────────────────────────
// Single source of truth for `storefront_domain`, `boundary_event_name`,
// `display_tz`. Cached with the same 5-min TTL pattern.
export type ClientConfig = {
  client_key: string;
  storefront_domain: string | null;
  boundary_event_name: string;
  display_tz: string;
};

const DEFAULT_CLIENT_CONFIG = {
  storefront_domain: null,
  boundary_event_name: "purchase",
  display_tz: "America/Los_Angeles",
} as const;

// ─────── Recommendations (chapter_recommendations.findings) ─────────────────
// Direct table reads (no RPC layer); cached the same way as the rest. RLS is
// service-role-only on chapter_recommendations.*, so the existing supabase
// client bypasses RLS the same way it does for chapter_reporting RPCs.

export type RecommendationEvidence = {
  source: string;
  fact: string;
  deeplink: string;
};

export type RecommendationFinding = {
  id:                 string;
  rule_id:            string;
  theme:              "data_integrity" | "channel_value" | "channel_synergy" | "lifecycle_health" | "customer_quality" | "emerging_patterns";
  subject_key:        string | null;
  headline:           string;
  story:              string;
  evidence:           RecommendationEvidence[];
  action:             string;
  action_type:        "mechanical" | "analytical" | "strategic_prompting";
  confidence:         "strong" | "moderate" | "early_signal";
  severity_weight:    "high" | "medium" | "low";
  state:              "new" | "standing" | "changed" | "resolved";
  render_method:      "claude" | "fallback";
  generated_at:       string;
  data_window_start:  string;
  data_window_end:    string;
  // Part 2 write-time dedup columns
  first_observed_at?: string;         // when the finding was first observed
  last_observed_at?:  string;         // most recent observation (updated in place)
  run_count?:         number;         // how many cron runs have observed this finding
  prior_finding_id?:  string | null;  // populated for re-fires after a resolution
};

export const cachedRecommendationsCurrent = unstable_cache(
  async (args: { clientKey: string }): Promise<RecommendationFinding[]> => {
    const r = await supabase
      .schema("chapter_recommendations")
      .from("findings")
      .select("id, rule_id, theme, subject_key, headline, story, evidence, action, action_type, confidence, severity_weight, state, render_method, generated_at, data_window_start, data_window_end, first_observed_at, last_observed_at, run_count, prior_finding_id")
      .eq("client_key", args.clientKey)
      .is("dismissed_at", null)
      .neq("state", "resolved")
      .order("last_observed_at", { ascending: false });
    if (r.error) {
      console.error("[dashboard-rpc] chapter_recommendations.findings (current) failed:", r.error.message);
      return [];
    }
    return (r.data ?? []) as RecommendationFinding[];
  },
  ["dashboard-rpc:chapter_recommendations:findings_current"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:recommendations_current"] },
);

export const cachedRecommendationsHistory = unstable_cache(
  async (args: { clientKey: string; lookbackDays: number }): Promise<RecommendationFinding[]> => {
    // bucketedNow() keeps the cutoff stable for 5 min so cache keys hit.
    const since = new Date(bucketedNow().getTime() - args.lookbackDays * 24 * 3600 * 1000).toISOString();
    const r = await supabase
      .schema("chapter_recommendations")
      .from("findings")
      .select("id, rule_id, theme, subject_key, headline, story, evidence, action, action_type, confidence, severity_weight, state, render_method, generated_at, data_window_start, data_window_end, first_observed_at, last_observed_at, run_count, prior_finding_id")
      .eq("client_key", args.clientKey)
      .gte("generated_at", since)
      .order("generated_at", { ascending: false });
    if (r.error) {
      console.error("[dashboard-rpc] chapter_recommendations.findings (history) failed:", r.error.message);
      return [];
    }
    return (r.data ?? []) as RecommendationFinding[];
  },
  ["dashboard-rpc:chapter_recommendations:findings_history"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:recommendations_history"] },
);

export const cachedClientConfig = unstable_cache(
  async (clientKey: string): Promise<ClientConfig> => {
    const r = await supabase
      .schema("chapter_config")
      .from("clients")
      .select("client_key, storefront_domain, boundary_event_name, display_tz")
      .eq("client_key", clientKey)
      .maybeSingle();
    if (r.error) {
      console.error("[dashboard-rpc] chapter_config.clients lookup failed:", r.error.message);
    }
    return {
      client_key: clientKey,
      ...DEFAULT_CLIENT_CONFIG,
      ...(r.data ?? {}),
    };
  },
  ["dashboard-rpc:chapter_config:clients"],
  { revalidate: REVALIDATE_SEC, tags: ["dashboard-rpc:client-config"] },
);
