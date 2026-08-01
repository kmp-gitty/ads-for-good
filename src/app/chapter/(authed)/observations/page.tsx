// Server component for /chapter/observations.
// Pulls real findings from chapter_observations via cached RPCs.

import { redirect } from "next/navigation";
import ObservationsClient from "./ObservationsClient";
import { getCurrentChapterUserOrLegacy } from "@/app/lib/auth/chapter-user";
import {
  cachedObservationsList,
  cachedObservationsHistory,
  cachedObservationsDormant,
} from "../../_lib/dashboard-rpc";

type SearchParams = Promise<{ client?: string }>;

export default async function ObservationsPage({ searchParams }: { searchParams: SearchParams }) {
  // 1.1 — Observations is retired from the operator-facing surface; it stays
  // accessible to chapter_staff (and the legacy CHAPTER_DASH_TOKEN operator,
  // who resolves to a chapter_staff row) for firing inspection + threshold
  // tuning. Non-staff hitting the URL directly go to Recommendations.
  const gateUser = await getCurrentChapterUserOrLegacy();
  if (gateUser && gateUser.role !== "chapter_staff") redirect("/chapter/recommendations");

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
