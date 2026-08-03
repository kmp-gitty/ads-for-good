// Server component for /chapter/attribution.
//
// Reads URL params (?client=<key>&range=<window>), runs the cached
// attribution_overview RPC, and passes the results to AttributionClient.
//
// URL contract (per CLAUDE.md "📊 Chapter Dashboard"):
//   ?client = client_key   (e.g. eos_fabrics, projectagram_reels)
//   ?range  = window       (7d / 14d / 30d / 60d / 90d / mtd / qtd / ytd / custom-ISO-pair)

import AttributionClient from "./AttributionClient";
import { rangeToWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedClientConfig,
  cachedAttributionOverview,
  cachedAttributionModelIndicators,
  cachedAttributionFirstTouchCoverage,
  cachedPurchaseOverview,
  cachedJourneyOverview,
  cachedEngagementQuality,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{
  client?: string;
  range?: string;
  lookback?: string;
}>;

export default async function AttributionPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range = (params.range && params.range.trim()) || "30d";

  // 6.4 — attribution lookback: how many days before EACH boundary to count
  // touches. Default unlimited (null → RPC reproduces today's numbers exactly).
  const lookback = (params.lookback && params.lookback.trim()) || "unlimited";
  const lookbackDays = /^\d+$/.test(lookback) ? Number(lookback) : null;

  const clientConfig = await cachedClientConfig(clientKey);
  const { start, end } = rangeToWindow(range, bucketedNow(), clientConfig.display_tz);
  const args = {
    p_client_key: clientKey,
    p_start_ts: start.toISOString(),
    p_end_ts:   end.toISOString(),
  };
  // attribution_overview alone takes the lookback; the other RPCs are 3-arg.
  const attributionArgs = { ...args, p_lookback_days: lookbackDays };
  const prior = priorWindow(start, end);
  const priorArgs = {
    p_client_key: clientKey,
    p_start_ts: prior.start.toISOString(),
    p_end_ts:   prior.end.toISOString(),
  };

  // attribution_overview powers the bump chart + allocation table.
  // The other 3 RPCs feed the standard TopBar KPI strip (Orders/Revenue/AOV/
  // Journeys/% Identified) so attribution shares the same header as other pages.
  const [
    attribution, indicators, coverage, purchase, journey, engagement,
    purchasePrior, journeyPrior, engagementPrior,
  ] = await Promise.all([
    cachedAttributionOverview(attributionArgs),
    cachedAttributionModelIndicators(args),
    // 6.5(a) — only when a lookback is set (unlimited has nothing "beyond").
    lookbackDays != null
      ? cachedAttributionFirstTouchCoverage({ ...args, p_lookback_days: lookbackDays })
      : Promise.resolve([]),
    cachedPurchaseOverview(args),
    cachedJourneyOverview(args),
    cachedEngagementQuality(args),
    cachedPurchaseOverview(priorArgs),
    cachedJourneyOverview(priorArgs),
    cachedEngagementQuality(priorArgs),
  ]);

  return (
    <AttributionClient
      attribution={attribution}
      indicators={indicators}
      coverage={coverage}
      summary={purchase[0] ?? null}
      journey={journey[0] ?? null}
      engagement={engagement[0] ?? null}
      priorSummary={purchasePrior[0] ?? null}
      priorJourney={journeyPrior[0] ?? null}
      priorEngagement={engagementPrior[0] ?? null}
      clientKey={clientKey}
      range={range}
      lookback={lookback}
      boundaryEvent={clientConfig.boundary_event_name}
    />
  );
}
