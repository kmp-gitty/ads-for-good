// Server component for /chapter/observations.
// Pulls real findings from chapter_observations via cached RPCs.

import ObservationsClient from "./ObservationsClient";
import {
  cachedObservationsList,
  cachedObservationsHistory,
  cachedObservationsDormant,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{ client?: string }>;

export default async function ObservationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";

  const [findings, history, dormant] = await Promise.all([
    cachedObservationsList({ p_client_key: clientKey }),
    cachedObservationsHistory({ p_client_key: clientKey, p_lookback_days: 28 }),
    cachedObservationsDormant({ p_client_key: clientKey }),
  ]);

  return (
    <ObservationsClient
      clientKey={clientKey}
      findings={findings}
      history={history}
      dormant={dormant}
    />
  );
}
