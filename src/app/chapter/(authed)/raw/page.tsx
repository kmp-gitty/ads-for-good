// Server component for /chapter/raw.
//
// Reads URL params (?client=<key>&range=<window>), runs the cached
// chapter_reporting.* RPCs (see _lib/dashboard-rpc), and passes the results
// to RawClient. RawClient owns the interactive UI; this file owns data fetch.
//
// URL contract (per CLAUDE.md "📊 Chapter Dashboard"):
//   ?client = client_key   (e.g. eos_fabrics, projectagram_reels)
//   ?range  = window       (7d / 14d / 30d / 60d / 90d / mtd / qtd / ytd / custom-ISO-pair)
//
// Defaults: client_key=eos_fabrics, range=30d.

import RawClient from "./RawClient";
import { rangeToWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedClientConfig,
  cachedPurchaseOverview,
  cachedJourneyOverview,
  cachedEngagementQuality,
  cachedFunnelOverview,
  cachedChannelPerformance,
  cachedDashboardTimeseries,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{
  client?: string;
  range?: string;
}>;

export default async function RawPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range = (params.range && params.range.trim()) || "30d";

  // Snap "now" to a 5-min bucket so cache keys are stable for everyone in the
  // same bucket. Dashboard data is up to 5 min stale (acceptable for analytics).
  const clientConfig = await cachedClientConfig(clientKey);
  const { start, end } = rangeToWindow(range, bucketedNow(), clientConfig.display_tz);
  const args = {
    p_client_key: clientKey,
    p_start_ts: start.toISOString(),
    p_end_ts:   end.toISOString(),
  };

  // Prior-period window: same-duration window immediately preceding [start, end).
  // We call the headline tile RPCs again with shifted args to compute movement
  // deltas. Cached separately because the args are different.
  const prior = priorWindow(start, end);
  const priorArgs = {
    p_client_key: clientKey,
    p_start_ts: prior.start.toISOString(),
    p_end_ts:   prior.end.toISOString(),
  };

  const [
    purchase, journey, engagement, funnel, channels, timeseries,
    purchasePrior, journeyPrior, engagementPrior,
  ] = await Promise.all([
    cachedPurchaseOverview(args),
    cachedJourneyOverview(args),
    cachedEngagementQuality(args),
    cachedFunnelOverview(args),
    cachedChannelPerformance(args),
    cachedDashboardTimeseries({ ...args, p_n_buckets: 12 }),
    cachedPurchaseOverview(priorArgs),
    cachedJourneyOverview(priorArgs),
    cachedEngagementQuality(priorArgs),
  ]);

  const summary    = purchase[0]   ?? null;
  const journeyRow = journey[0]    ?? null;
  const engageRow  = engagement[0] ?? null;
  const priorSummary    = purchasePrior[0]   ?? null;
  const priorJourneyRow = journeyPrior[0]    ?? null;
  const priorEngageRow  = engagementPrior[0] ?? null;

  return (
    <RawClient
      summary={summary}
      journey={journeyRow}
      engagement={engageRow}
      funnel={funnel}
      channels={channels}
      timeseries={timeseries}
      priorSummary={priorSummary}
      priorJourney={priorJourneyRow}
      priorEngagement={priorEngageRow}
      clientKey={clientKey}
      range={range}
    />
  );
}
