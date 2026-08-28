// Server component for /chapter/channels.

import ChannelsClient from "./ChannelsClient";
import { rangeToWindow, compareWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedClientConfig,
  cachedChannelRolesOverview,
  cachedChannelAffinityOverview,
  cachedPurchaseOverview,
  cachedJourneyOverview,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{ client?: string; range?: string; compare?: string }>;

// force-dynamic: analytics pages read searchParams + navigate via router.replace;
// without this Next 16 caches the RSC and soft nav (row click / sort) shows stale
// until a hard refresh. Dynamic classification -> Router Cache staleTime 0 -> refetch.
export const dynamic = "force-dynamic";

export default async function ChannelsPage({ searchParams }: { searchParams: SearchParams }) {
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
  // Comparison window driven by the global Compare control:
  //   prior → immediately-preceding same-length window
  //   yoy   → same window one year earlier
  //   none  → no comparison (client hides the deltas)
  // 'all' range has no defined prior → fall back to prior-period.
  const cmpWin = compareCode === "none"
    ? null
    : (compareWindow(range, compareCode, now, clientConfig.display_tz) ?? priorWindow(start, end));
  const priorArgs = cmpWin
    ? { p_client_key: clientKey, p_start_ts: cmpWin.start.toISOString(), p_end_ts: cmpWin.end.toISOString() }
    : null;

  const [roles, rolesPrior, affinity, purchase, journey, purchasePrior, journeyPrior] = await Promise.all([
    cachedChannelRolesOverview(args),
    priorArgs ? cachedChannelRolesOverview(priorArgs) : Promise.resolve([]),
    cachedChannelAffinityOverview(args),
    cachedPurchaseOverview(args),
    cachedJourneyOverview(args),
    priorArgs ? cachedPurchaseOverview(priorArgs) : Promise.resolve([]),
    priorArgs ? cachedJourneyOverview(priorArgs) : Promise.resolve([]),
  ]);

  return (
    <ChannelsClient
      roles={roles}
      rolesPrior={rolesPrior}
      affinity={affinity}
      summary={purchase[0] ?? null}
      journey={journey[0] ?? null}
      priorSummary={purchasePrior[0] ?? null}
      priorJourney={journeyPrior[0] ?? null}
      clientKey={clientKey}
      range={range}
    />
  );
}
