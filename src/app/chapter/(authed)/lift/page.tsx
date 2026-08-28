// Server component for /chapter/lift.
//
// Only the Correlation tab is live-wired (May 26, 2026). Incrementality +
// Causation tabs remain on mockdata — design phase happens in Claude Chat
// before implementation (see CLAUDE.md Priority 1).
//
// Page-default window is 90d (not 30d like other pages) because correlation
// cards apply an n≥30 noise gate per channel — a wider window passes the gate
// more often at EOS's ~270 conv/mo volume. Per the locked design decision in
// the Correlation tab spec §6.

import LiftClient from "./LiftClient";
import { rangeToWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedClientConfig,
  cachedCorrelationChannelOverview,
  cachedIncrementalityChannelOverview,
  cachedIncrementalityAxisMetadata,
  cachedContributionOverview,
  cachedSubscriberRetentionLens,
  priorWindow,
} from "../../_lib/dashboard-rpc";

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

type SearchParams = Promise<{ client?: string; range?: string }>;

// force-dynamic: analytics pages read searchParams + navigate via router.replace;
// without this Next 16 caches the RSC and soft nav (row click / sort) shows stale
// until a hard refresh. Dynamic classification -> Router Cache staleTime 0 -> refetch.
export const dynamic = "force-dynamic";

export default async function LiftPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  // Page-default = 90d (vs 30d elsewhere) — see top-of-file comment.
  const range     = (params.range  && params.range.trim())  || "90d";

  const clientConfig = await cachedClientConfig(clientKey);
  const { start, end } = rangeToWindow(range, bucketedNow(), clientConfig.display_tz);
  const args = {
    p_client_key: clientKey,
    p_start_ts: start.toISOString(),
    p_end_ts:   end.toISOString(),
  };

  // CR2 — prior window (same length, immediately preceding) for the Correlation
  // tab's opt-in period-over-period comparison. Independently cached.
  const prior = priorWindow(start, end);
  const priorArgs = { p_client_key: clientKey, p_start_ts: prior.start.toISOString(), p_end_ts: prior.end.toISOString() };
  const priorRangeLabel = `${fmtDay(prior.start)} – ${fmtDay(prior.end)}`;

  // Fetch correlation (current + prior) + all 3 incrementality axes + axis
  // metadata in parallel. Each is independently cached so toggling is free.
  const [correlation, correlationPrior, incSubscriber, incValueBand, incLocation, axisMeta, contribution, retention] = await Promise.all([
    cachedCorrelationChannelOverview(args),
    cachedCorrelationChannelOverview(priorArgs),
    cachedIncrementalityChannelOverview({ ...args, p_cohort_axis: "subscriber" }),
    cachedIncrementalityChannelOverview({ ...args, p_cohort_axis: "value_band" }),
    cachedIncrementalityChannelOverview({ ...args, p_cohort_axis: "location" }),
    cachedIncrementalityAxisMetadata(args),
    cachedContributionOverview(args),
    // R3 — all-time buyer population (not window-scoped); p_now bucketed for cache stability.
    cachedSubscriberRetentionLens({ p_client_key: clientKey, p_now: bucketedNow().toISOString() }),
  ]);

  return (
    <LiftClient
      correlation={correlation}
      correlationPrior={correlationPrior}
      priorRangeLabel={priorRangeLabel}
      retention={retention}
      incrementality={{
        subscriber: incSubscriber,
        value_band: incValueBand,
        location:   incLocation,
      }}
      axisMetadata={axisMeta[0] ?? null}
      contribution={contribution}
      clientKey={clientKey}
      range={range}
    />
  );
}
