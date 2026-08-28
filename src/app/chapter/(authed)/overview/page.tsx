// Server component for /chapter/overview (Lifecycle Overview).
//
// Combines:
//   - lifecycle_overview RPC (chapter-level aggregates for the hero + metrics row)
//   - path_length_trend RPC (12-bucket weekly chart)
//   - channel_roles_overview RPC (top-5 preview, reused from /chapter/channels)
//   - path_combinations_overview RPC (top-5 preview, reused from /chapter/paths)
//
// The "Chapter observations this week" tile stays mock until the question-
// library engine exists (per CLAUDE.md Future Work).

import OverviewClient from "./OverviewClient";
import { rangeToWindow, compareWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedClientConfig,
  cachedLifecycleOverview,
  cachedPathLengthTrend,
  cachedChannelRolesOverview,
  cachedPathCombinationsOverview,
  cachedPurchaseOverview,
  cachedJourneyOverview,
  cachedJourneyCompleteness,
  cachedEngagementQuality,
  cachedRecommendationsCurrent,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{ client?: string; range?: string; compare?: string }>;

// Path-length trend has its own per-tile time-range picker (4w/12w/26w/52w).
// Pre-fetch all 4 windows server-side so the picker toggles instantly with no
// loading state. Each window is independently cached for 5 min by
// unstable_cache, so DB cost is bounded regardless of how many viewers toggle.
const WEEK_MS = 7 * 24 * 3600 * 1000;
const TREND_WINDOWS = { "4w": 4, "12w": 12, "26w": 26, "52w": 52 } as const;
export type TrendWindow = keyof typeof TREND_WINDOWS;

// force-dynamic: analytics pages read searchParams + navigate via router.replace;
// without this Next 16 caches the RSC and soft nav (row click / sort) shows stale
// until a hard refresh. Dynamic classification -> Router Cache staleTime 0 -> refetch.
export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range = (params.range && params.range.trim()) || "30d";
  const compareCode = (params.compare && params.compare.trim()) || "prior";

  const clientConfig = await cachedClientConfig(clientKey);
  const now = bucketedNow();
  const { start, end } = rangeToWindow(range, now, clientConfig.display_tz);
  const winArgs = {
    p_client_key: clientKey,
    p_start_ts: start.toISOString(),
    p_end_ts:   end.toISOString(),
  };
  // Comparison window driven by the global Compare control (prior / yoy / none).
  // 'all' range has no defined prior → fall back to prior-period.
  const cmpWin = compareCode === "none"
    ? null
    : (compareWindow(range, compareCode, now, clientConfig.display_tz) ?? priorWindow(start, end));
  const priorArgs = cmpWin
    ? { p_client_key: clientKey, p_start_ts: cmpWin.start.toISOString(), p_end_ts: cmpWin.end.toISOString() }
    : null;

  // Build the 4 trend windows. End ts is snapped to the 5-min bucket so cache
  // keys stay stable across rapid reloads. Bucket counts stay at 12 across all
  // windows for a consistent visual cadence.
  const trendEnd = bucketedNow();
  const trendArgsFor = (weeks: number) => ({
    p_client_key: clientKey,
    p_start_ts: new Date(trendEnd.getTime() - weeks * WEEK_MS).toISOString(),
    p_end_ts:   trendEnd.toISOString(),
    p_n_buckets: 12,
  });

  const [
    lifecycle, lifecyclePrior,
    trend4w, trend12w, trend26w, trend52w,
    channels, combosSet, combosCollapsed, combosRaw,
    purchase, journey, engagement,
    purchasePrior, journeyPrior, engagementPrior,
    completeness, completenessPrior,
    recommendations,
  ] = await Promise.all([
    cachedLifecycleOverview(winArgs),
    priorArgs ? cachedLifecycleOverview(priorArgs) : Promise.resolve([]),
    cachedPathLengthTrend(trendArgsFor(TREND_WINDOWS["4w"])),
    cachedPathLengthTrend(trendArgsFor(TREND_WINDOWS["12w"])),
    cachedPathLengthTrend(trendArgsFor(TREND_WINDOWS["26w"])),
    cachedPathLengthTrend(trendArgsFor(TREND_WINDOWS["52w"])),
    cachedChannelRolesOverview(winArgs),
    cachedPathCombinationsOverview({ ...winArgs, p_mode: "set" }),
    cachedPathCombinationsOverview({ ...winArgs, p_mode: "collapsed" }),
    cachedPathCombinationsOverview({ ...winArgs, p_mode: "raw" }),
    cachedPurchaseOverview(winArgs),
    cachedJourneyOverview(winArgs),
    cachedEngagementQuality(winArgs),
    priorArgs ? cachedPurchaseOverview(priorArgs) : Promise.resolve([]),
    priorArgs ? cachedJourneyOverview(priorArgs) : Promise.resolve([]),
    priorArgs ? cachedEngagementQuality(priorArgs) : Promise.resolve([]),
    cachedJourneyCompleteness(winArgs),
    priorArgs ? cachedJourneyCompleteness(priorArgs) : Promise.resolve([]),
    cachedRecommendationsCurrent({ clientKey }),
  ]);

  return (
    <OverviewClient
      lifecycle={lifecycle[0] ?? null}
      lifecyclePrior={lifecyclePrior[0] ?? null}
      trends={{ "4w": trend4w, "12w": trend12w, "26w": trend26w, "52w": trend52w }}
      channels={channels}
      combos={{ set: combosSet, collapsed: combosCollapsed, raw: combosRaw }}
      summary={purchase[0] ?? null}
      journey={journey[0] ?? null}
      engagement={engagement[0] ?? null}
      priorSummary={purchasePrior[0] ?? null}
      priorJourney={journeyPrior[0] ?? null}
      priorEngagement={engagementPrior[0] ?? null}
      completeness={completeness[0] ?? null}
      priorCompleteness={completenessPrior[0] ?? null}
      recommendations={recommendations}
      clientKey={clientKey}
      range={range}
    />
  );
}
