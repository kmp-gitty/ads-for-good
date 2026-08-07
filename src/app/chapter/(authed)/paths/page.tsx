// Server component for /chapter/paths.
//
// Fetches all 3 modes (set/collapsed/raw) for both current and prior windows.
// 6 RPC calls in parallel via Promise.all; each is independently cached for
// 5 min by unstable_cache so toggle-between-modes is free after first load.

import PathsClient from "./PathsClient";
import { rangeToWindow, compareWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedClientConfig,
  cachedPathCombinationsOverview,
  cachedPurchaseOverview,
  cachedJourneyOverview,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{
  client?: string;
  range?: string;
  compare?: string;
}>;

export default async function PathsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range = (params.range && params.range.trim()) || "30d";
  const compareCode = (params.compare && params.compare.trim()) || "prior";

  const clientConfig = await cachedClientConfig(clientKey);
  const now = bucketedNow();
  const { start, end } = rangeToWindow(range, now, clientConfig.display_tz);
  const baseArgs = { p_client_key: clientKey };
  const window = { p_start_ts: start.toISOString(), p_end_ts: end.toISOString() };
  // Comparison window driven by the global Compare control (prior / yoy / none).
  // 'all' range has no defined prior → fall back to prior-period.
  const cmpWin = compareCode === "none"
    ? null
    : (compareWindow(range, compareCode, now, clientConfig.display_tz) ?? priorWindow(start, end));
  const priorWin = cmpWin
    ? { p_start_ts: cmpWin.start.toISOString(), p_end_ts: cmpWin.end.toISOString() }
    : null;

  const [
    setCur, collapsedCur, rawCur,
    setPrior, collapsedPrior, rawPrior,
    purchase, journey, purchasePrior, journeyPrior,
  ] = await Promise.all([
    cachedPathCombinationsOverview({ ...baseArgs, ...window,    p_mode: "set" }),
    cachedPathCombinationsOverview({ ...baseArgs, ...window,    p_mode: "collapsed" }),
    cachedPathCombinationsOverview({ ...baseArgs, ...window,    p_mode: "raw" }),
    priorWin ? cachedPathCombinationsOverview({ ...baseArgs, ...priorWin, p_mode: "set" })       : Promise.resolve([]),
    priorWin ? cachedPathCombinationsOverview({ ...baseArgs, ...priorWin, p_mode: "collapsed" }) : Promise.resolve([]),
    priorWin ? cachedPathCombinationsOverview({ ...baseArgs, ...priorWin, p_mode: "raw" })       : Promise.resolve([]),
    cachedPurchaseOverview({ ...baseArgs, ...window }),
    cachedJourneyOverview({ ...baseArgs, ...window }),
    priorWin ? cachedPurchaseOverview({ ...baseArgs, ...priorWin }) : Promise.resolve([]),
    priorWin ? cachedJourneyOverview({ ...baseArgs, ...priorWin })  : Promise.resolve([]),
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
