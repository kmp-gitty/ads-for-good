// Server component for /chapter/channels.

import ChannelsClient from "./ChannelsClient";
import { rangeToWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedChannelRolesOverview,
  cachedChannelAffinityOverview,
  cachedPurchaseOverview,
  cachedJourneyOverview,
  priorWindow,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{ client?: string; range?: string }>;

export default async function ChannelsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range = (params.range && params.range.trim()) || "30d";

  const { start, end } = rangeToWindow(range, bucketedNow());
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

  const [roles, rolesPrior, affinity, purchase, journey, purchasePrior, journeyPrior] = await Promise.all([
    cachedChannelRolesOverview(args),
    cachedChannelRolesOverview(priorArgs),
    cachedChannelAffinityOverview(args),
    cachedPurchaseOverview(args),
    cachedJourneyOverview(args),
    cachedPurchaseOverview(priorArgs),
    cachedJourneyOverview(priorArgs),
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
