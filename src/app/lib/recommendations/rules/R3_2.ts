// R3.2 — Lagged channel influence detected.
//
// Stance: "Activity in one channel measurably influences purchase activity in
// another channel days or weeks later; treating channels in isolation misses
// this effect." (Theme: Channel Synergy)
//
// Trigger conditions (per spec):
//   - Lagged Impact analysis shows a pair with correlation ≥0.4 at offset ≥3d
//   - Pattern stable across the analysis window
//
// Source: lagged_impact_pair returns a single row per channel pair with the
// peak correlation and best lag offset. Iterate over the channel pairs we
// care about and pick the strongest qualifying one.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const CORRELATION_FLOOR = 0.40;
const MIN_LAG_DAYS = 3;

export const R3_2: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  // First fetch contribution_overview to enumerate active channels for the
  // window; iterate over pairs that include channels with material presence.
  const { data: contrib, error: contribErr } = await supabase
    .schema("chapter_reporting")
    .rpc("contribution_overview", {
      p_client_key: ctx.client_key,
      p_start_ts: ctx.data_window_start.toISOString(),
      p_end_ts: ctx.data_window_end.toISOString(),
    });
  if (contribErr || !contrib) return null;

  const channels = (contrib as Array<Record<string, unknown>>)
    .filter(c => Number(c.participation_rate ?? 0) >= 0.10)
    .map(c => String(c.channel));

  if (channels.length < 2) return null;

  type Candidate = {
    channel_a: string;
    channel_b: string;
    correlation: number;
    lag_days: number;
  };

  const candidates: Candidate[] = [];
  // Iterate ordered pairs (a -> b at lag) for all combinations.
  for (let i = 0; i < channels.length; i++) {
    for (let j = 0; j < channels.length; j++) {
      if (i === j) continue;
      const { data, error } = await supabase
        .schema("chapter_reporting")
        .rpc("lagged_impact_pair", {
          p_client_key: ctx.client_key,
          p_start_ts: ctx.data_window_start.toISOString(),
          p_end_ts: ctx.data_window_end.toISOString(),
          p_channel_a: channels[i],
          p_channel_b: channels[j],
        });
      if (error || !data) continue;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) continue;
      const correlation = Number((row as { correlation?: number }).correlation ?? 0);
      const lag_days = Number((row as { peak_lag_days?: number }).peak_lag_days ?? 0);
      if (Math.abs(correlation) < CORRELATION_FLOOR) continue;
      if (lag_days < MIN_LAG_DAYS) continue;
      candidates.push({ channel_a: channels[i], channel_b: channels[j], correlation, lag_days });
    }
  }
  if (candidates.length === 0) return null;

  const best = candidates.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))[0];

  const confidence: "strong" | "moderate" | "early_signal" =
    Math.abs(best.correlation) >= 0.50 ? "strong" :
    Math.abs(best.correlation) >= 0.45 ? "moderate" : "early_signal";

  return {
    rule_id: "R3.2",
    fired: true,
    subject_key: `${best.channel_a}->${best.channel_b}`,
    data: {
      channel_a: titleCase(best.channel_a),
      channel_b: titleCase(best.channel_b),
      lag_days: best.lag_days,
      correlation: best.correlation.toFixed(2),
    },
    evidence: [
      {
        source: "Lagged Impact",
        fact: `${titleCase(best.channel_a)} → ${titleCase(best.channel_b)}: ${best.correlation.toFixed(2)} correlation at ${best.lag_days}-day lag`,
        deeplink: "/chapter/connections/lagged-impact",
      },
      {
        source: "Cross-Source Influence",
        fact: `${titleCase(best.channel_a)} activity precedes ${titleCase(best.channel_b)} conversions with consistent offset`,
        deeplink: "/chapter/connections/influence",
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
  };
};

function titleCase(s: string): string {
  return s.replace(/(^|\s)\w/g, m => m.toUpperCase());
}
