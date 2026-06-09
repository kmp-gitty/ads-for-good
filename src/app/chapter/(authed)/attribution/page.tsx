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
  cachedPurchaseOverview,
  cachedJourneyOverview,
  cachedEngagementQuality,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{
  client?: string;
  range?: string;
}>;

export default async function AttributionPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range = (params.range && params.range.trim()) || "30d";

  const clientConfig = await cachedClientConfig(clientKey);
  const { start, end } = rangeToWindow(range, bucketedNow(), clientConfig.display_tz);
  const args = {
    p_client_key: clientKey,
    p_start_ts: start.toISOString(),
    p_end_ts:   end.toISOString(),
  };
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
    attribution, purchase, journey, engagement,
    purchasePrior, journeyPrior, engagementPrior,
  ] = await Promise.all([
    cachedAttributionOverview(args),
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
      summary={purchase[0] ?? null}
      journey={journey[0] ?? null}
      engagement={engagement[0] ?? null}
      priorSummary={purchasePrior[0] ?? null}
      priorJourney={journeyPrior[0] ?? null}
      priorEngagement={engagementPrior[0] ?? null}
      clientKey={clientKey}
      range={range}
    />
  );
}
