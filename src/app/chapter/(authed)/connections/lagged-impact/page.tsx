// Server component for /chapter/connections/lagged-impact.
//
// v1: lightweight tier, one channel pair, 5 fixed lag windows (7/14/30/60/90d).
// Default treatment window = first 1/3 of the analysis range; lookforward = 2/3.
// This split is critical: spec §5.4 excludes anyone who touched channel B
// during the treatment window, so the treatment window MUST be narrower than
// the analysis range or every identity gets excluded.
//
// Heavyweight tier + heatmap + seasonality calendar are deferred (see spec §1/§3).

import LaggedImpactClient from "./LaggedImpactClient";
import { rangeToWindow } from "../../../_components/format";
import { bucketedNow, cachedClientConfig, cachedLaggedImpactPair, cachedLaggedImpactPairSeries } from "../../../_lib/dashboard-rpc";

type SearchParams = Promise<{
  client?:     string;
  range?:      string;
  channel_a?:  string;
  channel_b?:  string;
}>;

const DEFAULT_RANGE   = "90d";
const DEFAULT_A       = "email";
const DEFAULT_B       = "(direct)";
const LAG_DAYS_LIST   = [7, 14, 30, 60, 90];

export default async function LaggedImpactPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range     = (params.range && params.range.trim()) || DEFAULT_RANGE;
  const channelA  = (params.channel_a && params.channel_a.trim()) || DEFAULT_A;
  const channelB  = (params.channel_b && params.channel_b.trim()) || DEFAULT_B;

  const clientConfig = await cachedClientConfig(clientKey);
  const { start, end } = rangeToWindow(range, bucketedNow(), clientConfig.display_tz);

  // Treatment window = first 1/3 of analysis range. Gives 2/3 for lookforward
  // observability so longer lag windows have data to look at.
  const totalMs = end.getTime() - start.getTime();
  const treatmentEnd = new Date(start.getTime() + Math.floor(totalMs / 3));

  // Filter to lags that fit within the lookforward room (no point computing
  // a 90d lag if we only have 60d of post-treatment history).
  const lookforwardMs = end.getTime() - treatmentEnd.getTime();
  const lookforwardDays = Math.floor(lookforwardMs / (1000 * 60 * 60 * 24));
  const lagsToRun = LAG_DAYS_LIST.filter(d => d <= lookforwardDays);

  // Run the lag-window calls and the time-series for the expander in
  // parallel — the series is the entire analysis window, sampled into
  // ~16 buckets.
  const [results, series] = await Promise.all([
    Promise.all(
      lagsToRun.map(async (lagDays) => {
        const rows = await cachedLaggedImpactPair({
          p_client_key:      clientKey,
          p_channel_a:       channelA,
          p_channel_b:       channelB,
          p_treatment_start: start.toISOString(),
          p_treatment_end:   treatmentEnd.toISOString(),
          p_lag_days:        lagDays,
        });
        return { lagDays, row: rows[0] ?? null };
      }),
    ),
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
      treatmentEnd={treatmentEnd.toISOString()}
      lookforwardDays={lookforwardDays}
      results={results}
      allLagDays={LAG_DAYS_LIST}
      series={series}
    />
  );
}
