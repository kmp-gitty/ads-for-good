// Server component for /chapter/paths.
//
// Fetches all 3 modes (set/collapsed/raw) for both current and prior windows.
// 6 RPC calls in parallel via Promise.all; each is independently cached for
// 5 min by unstable_cache so toggle-between-modes is free after first load.

import PathsClient from "./PathsClient";
import { rangeToWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedPathCombinationsOverview,
  cachedPurchaseOverview,
  cachedJourneyOverview,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{
  client?: string;
  range?: string;
}>;

export default async function PathsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range = (params.range && params.range.trim()) || "30d";

  const { start, end } = rangeToWindow(range, bucketedNow());
  const baseArgs = { p_client_key: clientKey };
  const window = { p_start_ts: start.toISOString(), p_end_ts: end.toISOString() };
  const prior = priorWindow(start, end);
  const priorWin = { p_start_ts: prior.start.toISOString(), p_end_ts: prior.end.toISOString() };

  const [
    setCur, collapsedCur, rawCur,
    setPrior, collapsedPrior, rawPrior,
    purchase, journey, purchasePrior, journeyPrior,
  ] = await Promise.all([
    cachedPathCombinationsOverview({ ...baseArgs, ...window,    p_mode: "set" }),
    cachedPathCombinationsOverview({ ...baseArgs, ...window,    p_mode: "collapsed" }),
    cachedPathCombinationsOverview({ ...baseArgs, ...window,    p_mode: "raw" }),
    cachedPathCombinationsOverview({ ...baseArgs, ...priorWin,  p_mode: "set" }),
    cachedPathCombinationsOverview({ ...baseArgs, ...priorWin,  p_mode: "collapsed" }),
    cachedPathCombinationsOverview({ ...baseArgs, ...priorWin,  p_mode: "raw" }),
    cachedPurchaseOverview({ ...baseArgs, ...window }),
    cachedJourneyOverview({ ...baseArgs, ...window }),
    cachedPurchaseOverview({ ...baseArgs, ...priorWin }),
    cachedJourneyOverview({ ...baseArgs, ...priorWin }),
  ]);

  return (
    <PathsClient
      combos={{
        set:       { current: setCur,       prior: setPrior },
        collapsed: { current: collapsedCur, prior: collapsedPrior },
        raw:       { current: rawCur,       prior: rawPrior },
      }}
      summary={purchase[0] ?? null}
      journey={journey[0] ?? null}
      priorSummary={purchasePrior[0] ?? null}
      priorJourney={journeyPrior[0] ?? null}
      clientKey={clientKey}
      range={range}
    />
  );
}
