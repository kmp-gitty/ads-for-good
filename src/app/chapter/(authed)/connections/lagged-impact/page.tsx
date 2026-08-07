// Server component for /chapter/connections/lagged-impact.
//
// v1: lightweight tier, one channel pair, 5 fixed lag windows (7/14/30/60/90d).
// Treatment/analysis window = ALL available history for the client, so the
// A-touch cohorts are as large as possible (short windows starve lag analysis
// and push most cells below the n>=30 floor). The RPC right-censors internally
// (eff_end = MAX(ts) - lag), so recent touches whose full lag window hasn't
// elapsed are excluded — no artificial 1/3–2/3 split needed. The Ranked tab
// ranks every pair at one SELECTABLE lag; Explore shows one pair across all lags.
//
// The top calendar Range no longer drives this page (it only feeds the CSI
// cross-link). Heavyweight tier + heatmap + seasonality calendar deferred.

import LaggedImpactClient from "./LaggedImpactClient";
import {
  bucketedNow,
  cachedClientConfig,
  cachedClientDataSpan,
  cachedLaggedImpactPair,
  cachedLaggedImpactPairSeries,
  cachedLaggedImpactRanked,
} from "../../../_lib/dashboard-rpc";

type SearchParams = Promise<{
  client?:          string;
  range?:           string;
  channel_a?:       string;
  channel_b?:       string;
  ranked_lag_days?: string;
}>;

const DEFAULT_RANGE      = "90d";
const DEFAULT_A          = "email";
const DEFAULT_B          = "(direct)";
const LAG_DAYS_LIST      = [7, 14, 30, 60, 90];
const DEFAULT_RANKED_LAG = 30;
const DAY_MS             = 24 * 60 * 60 * 1000;

export default async function LaggedImpactPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range     = (params.range && params.range.trim()) || DEFAULT_RANGE; // kept only for the CSI cross-link
  const channelA  = (params.channel_a && params.channel_a.trim()) || DEFAULT_A;
  const channelB  = (params.channel_b && params.channel_b.trim()) || DEFAULT_B;

  // Keep the config cache warm (other pages read display_tz); windows here are
  // all-time so we don't need it for date math.
  await cachedClientConfig(clientKey);
  const span = await cachedClientDataSpan(clientKey);

  // Treatment/analysis window = ALL available history. Fall back to a trailing
  // 90d if the client has no session entries yet.
  const now   = bucketedNow();
  const start = span.first_ts ? new Date(span.first_ts) : new Date(now.getTime() - 90 * DAY_MS);
  const end   = span.last_ts  ? new Date(span.last_ts)  : now;
  const spanDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / DAY_MS));

  // Every default lag that leaves treatment room (eff_end = last - lag > first).
  const fitting       = LAG_DAYS_LIST.filter(d => d < spanDays);
  const effectiveLags = fitting.length ? fitting : [LAG_DAYS_LIST[0]];

  // Ranked tab lag — from ?ranked_lag_days, validated to an available lag.
  const reqRankedLag  = parseInt(params.ranked_lag_days || "", 10);
  const rankedLagDays = effectiveLags.includes(reqRankedLag)
    ? reqRankedLag
    : (effectiveLags.includes(DEFAULT_RANKED_LAG) ? DEFAULT_RANKED_LAG : effectiveLags[effectiveLags.length - 1]);

  // Explore per-pair calls (all fitting lags), ranked-pairs discovery table (one
  // selectable lag), and the volume series — all over the all-time window.
  const [results, rankedPairs, series] = await Promise.all([
    Promise.all(
      effectiveLags.map(async (lagDays) => {
        const rows = await cachedLaggedImpactPair({
          p_client_key:      clientKey,
          p_channel_a:       channelA,
          p_channel_b:       channelB,
          p_treatment_start: start.toISOString(),
          p_treatment_end:   end.toISOString(),
          p_lag_days:        lagDays,
        });
        return { lagDays, row: rows[0] ?? null };
      }),
    ),
    cachedLaggedImpactRanked({
      p_client_key:      clientKey,
      p_treatment_start: start.toISOString(),
      p_treatment_end:   end.toISOString(),
      p_lag_days:        rankedLagDays,
    }),
    cachedLaggedImpactPairSeries({
      p_client_key: clientKey,
      p_channel_a:  channelA,
      p_channel_b:  channelB,
      p_start_ts:   start.toISOString(),
      p_end_ts:     end.toISOString(),
      p_n_buckets:  16,
    }),
  ]);

  return (
    <LaggedImpactClient
      clientKey={clientKey}
      range={range}
      channelA={channelA}
      channelB={channelB}
      treatmentStart={start.toISOString()}
      treatmentEnd={end.toISOString()}
      spanDays={spanDays}
      results={results}
      allLagDays={LAG_DAYS_LIST}
      rankedPairs={rankedPairs}
      rankedLagDays={rankedLagDays}
      rankedLagOptions={effectiveLags}
      series={series}
    />
  );
}
