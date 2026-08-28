// Server component for /chapter/recommendations.
// Reads current + 28-day history of findings from chapter_recommendations, plus
// the business-context KPI strip (orders / revenue / AOV / journeys / %
// identified) for the selected range so the top strip is per-client, not mock.

import RecommendationsClient from "./RecommendationsClient";
import { rangeToWindow, compareWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedClientConfig,
  cachedPurchaseOverview,
  cachedJourneyOverview,
  cachedRecommendationsCurrent,
  cachedRecommendationsHistory,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{ client?: string; range?: string; compare?: string }>;

// force-dynamic: analytics pages read searchParams + navigate via router.replace;
// without this Next 16 caches the RSC and soft nav (row click / sort) shows stale
// until a hard refresh. Dynamic classification -> Router Cache staleTime 0 -> refetch.
export const dynamic = "force-dynamic";

export default async function RecommendationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range = (params.range && params.range.trim()) || "30d";
  const compareCode = (params.compare && params.compare.trim()) || "prior";

  const clientConfig = await cachedClientConfig(clientKey);
  const now = bucketedNow();
  const { start, end } = rangeToWindow(range, now, clientConfig.display_tz);
  const args = {
    p_client_key: clientKey,
    p_start_ts: start.toISOString(),
    p_end_ts:   end.toISOString(),
  };

  // KPI-strip movement vs the comparison window (this page has no Compare
  // control, so it defaults to prior-period; 'all' has no defined prior).
  const cmpWin = compareCode === "none"
    ? null
    : (compareWindow(range, compareCode, now, clientConfig.display_tz) ?? priorWindow(start, end));
  const priorArgs = cmpWin
    ? { p_client_key: clientKey, p_start_ts: cmpWin.start.toISOString(), p_end_ts: cmpWin.end.toISOString() }
    : null;

  const [current, history, purchase, journey, purchasePrior, journeyPrior] = await Promise.all([
    cachedRecommendationsCurrent({ clientKey }),
    cachedRecommendationsHistory({ clientKey, lookbackDays: 28 }),
    cachedPurchaseOverview(args),
    cachedJourneyOverview(args),
    priorArgs ? cachedPurchaseOverview(priorArgs) : Promise.resolve([]),
    priorArgs ? cachedJourneyOverview(priorArgs) : Promise.resolve([]),
  ]);

  return (
    <RecommendationsClient
      clientKey={clientKey}
      current={current}
      history={history}
      summary={purchase[0] ?? null}
      journey={journey[0] ?? null}
      priorSummary={purchasePrior[0] ?? null}
      priorJourney={journeyPrior[0] ?? null}
    />
  );
}
