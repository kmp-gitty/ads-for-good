// R2.3 — Channel with weak lift despite broad presence.
//
// Stance: "A channel appears in many converting paths but shows no measurable
// causal lift; possible wasted spend." (Theme: Channel Value & Investment)
//
// Trigger conditions (per spec):
//   - Channel appears in ≥75% of converting chapters AND
//   - Channel's lift score below 0.15 AND
//   - Differences between chapters-with vs chapters-without on conversion
//     rate, AOV, time-to-close show <5% gap
//
// For EOS this is the Direct pattern: ~74% participation, near-zero lift,
// minimal AOV/days/touches differential. R2.3 surfaces it as the canonical
// "data shows the spend isn't doing causal work" case.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const PRESENCE_THRESHOLD = 0.75;
const LIFT_THRESHOLD = 0.15;
const DIFFERENTIAL_THRESHOLD = 0.05;

export const R2_3: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  // Pull contribution_overview for the window — gives us per-channel
  // participation_rate + incremental_rate (proxy for lift).
  const { data: contrib, error: contribErr } = await supabase
    .schema("chapter_reporting")
    .rpc("contribution_overview", {
      p_client_key: ctx.client_key,
      p_start_ts: ctx.data_window_start.toISOString(),
      p_end_ts: ctx.data_window_end.toISOString(),
    });
  if (contribErr || !contrib) return null;

  // Pull correlation_channel_overview for AOV / days / touches differentials.
  const { data: correlation, error: corrErr } = await supabase
    .schema("chapter_reporting")
    .rpc("correlation_channel_overview", {
      p_client_key: ctx.client_key,
      p_start_ts: ctx.data_window_start.toISOString(),
      p_end_ts: ctx.data_window_end.toISOString(),
    });
  if (corrErr || !correlation) return null;

  type ContribRow = {
    channel: string;
    participation_rate: number;
    incremental_rate: number | null;
    touched_chapters: number;
  };
  type CorrRow = {
    channel: string;
    aov_with: number | null;
    aov_without: number | null;
    days_with: number | null;
    days_without: number | null;
    touches_with: number | null;
    touches_without: number | null;
    conv_ids_with: number | null;
    conv_ids_without: number | null;
    ids_with: number | null;
    ids_without: number | null;
  };

  const contribRows = contrib as ContribRow[];
  const corrRows = correlation as CorrRow[];

  for (const c of contribRows) {
    if (c.participation_rate === null || c.participation_rate < PRESENCE_THRESHOLD) continue;

    const incremental = Math.abs(c.incremental_rate ?? 0);
    if (incremental > LIFT_THRESHOLD) continue;

    // Check the differential signals via the correlation row.
    const corr = corrRows.find((r) => r.channel === c.channel);
    if (!corr) continue;

    const aovDiff = relDiff(corr.aov_with, corr.aov_without);
    const daysDiff = relDiff(corr.days_with, corr.days_without);
    const touchesDiff = relDiff(corr.touches_with, corr.touches_without);
    const convRateWith =
      corr.ids_with && corr.conv_ids_with !== null ? corr.conv_ids_with / corr.ids_with : null;
    const convRateWithout =
      corr.ids_without && corr.conv_ids_without !== null
        ? corr.conv_ids_without / corr.ids_without
        : null;
    const convDiff = relDiff(convRateWith, convRateWithout);

    const allDiffsSmall =
      smallDiff(aovDiff) && smallDiff(daysDiff) && smallDiff(touchesDiff) && smallDiff(convDiff);

    if (!allDiffsSmall) continue;

    // Confidence: all three conditions clearly met = strong; 2 of 3 with
    // small margins = moderate; just barely met = early signal.
    const presenceMargin = c.participation_rate - PRESENCE_THRESHOLD;
    const liftMargin = LIFT_THRESHOLD - incremental;
    const confidence =
      presenceMargin >= 0.10 && liftMargin >= 0.10 ? "strong" :
      presenceMargin >= 0.05 || liftMargin >= 0.05 ? "moderate" :
      "early_signal";

    const presencePct = Math.round(c.participation_rate * 100);

    return {
      rule_id: "R2.3",
      fired: true,
      subject_key: c.channel,
      data: {
        channel: titleCase(c.channel),
        presence_share: presencePct,
        lift_score: incremental.toFixed(2),
      },
      evidence: [
        {
          source: "Channel Roles",
          fact: `${titleCase(c.channel)} appears in ${presencePct}% of converting chapters`,
          deeplink: "/chapter/channels",
        },
        {
          source: "Lift, Incrementality & Value",
          fact: `Incremental rate ${incremental.toFixed(2)} (below 0.15 floor)`,
          deeplink: "/chapter/lift",
        },
        {
          source: "Path Patterns",
          fact: `Chapters with vs without ${titleCase(c.channel)} differ by <${DIFFERENTIAL_THRESHOLD * 100}% on conversion, AOV, and time-to-close`,
          deeplink: "/chapter/paths",
        },
      ],
      confidence,
      severity_weight: "high",
      action_type: "strategic_prompting",
    };
  }

  return { rule_id: "R2.3", fired: false, subject_key: null, data: {}, evidence: [], confidence: "early_signal", severity_weight: "high", action_type: "strategic_prompting" };
};

function relDiff(a: number | null, b: number | null): number | null {
  if (a === null || b === null || a === 0) return null;
  return Math.abs((a - b) / a);
}
function smallDiff(d: number | null): boolean {
  if (d === null) return true; // treat missing as not-disqualifying
  return d < DIFFERENTIAL_THRESHOLD;
}
function titleCase(s: string): string {
  return s.replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}
