// R1.1 — High bot rate with no mitigation in place.
//
// Stance: "Bot traffic is materially polluting downstream metrics; mitigation
// should be considered." (Theme: Data Integrity & Trust)
//
// Trigger conditions (per chapter_recommendations_spec_v1.md):
//   - Bot share ≥ 30% in current period
//   - No mitigation flagged in client config (assumed null today —
//     bot_mitigation_status column not yet on chapter_config.clients)
//   - Pattern persists across last 2+ comparison periods (stability check)

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const BOT_THRESHOLD = 0.30; // 30%

export const R1_1: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  // Compute bot share over the data window (current period) + prior 4-week
  // and prior 8-week buckets so we can apply the stability check.
  const endIso = ctx.data_window_end.toISOString();
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const period1Start = new Date(ctx.data_window_end.getTime() - 4 * oneWeekMs);
  const period2Start = new Date(ctx.data_window_end.getTime() - 8 * oneWeekMs);
  const period3Start = new Date(ctx.data_window_end.getTime() - 12 * oneWeekMs);

  const [p1, p2, p3] = await Promise.all([
    botShareFor(ctx.client_key, period1Start, ctx.data_window_end),
    botShareFor(ctx.client_key, period2Start, period1Start),
    botShareFor(ctx.client_key, period3Start, period2Start),
  ]);

  if (p1 === null) return null;

  const currentShare = p1;
  // Stability: at least 2 prior periods (where data exists) also above threshold.
  const priorAboveThreshold = [p2, p3].filter((v): v is number => v !== null && v >= BOT_THRESHOLD).length;

  if (currentShare < BOT_THRESHOLD) {
    return { rule_id: "R1.1", fired: false, subject_key: null, data: {}, evidence: [], confidence: "early_signal", severity_weight: "high", action_type: "mechanical" };
  }

  const confidence =
    currentShare >= BOT_THRESHOLD && priorAboveThreshold >= 2 ? "strong" :
    currentShare >= BOT_THRESHOLD && priorAboveThreshold >= 1 ? "moderate" :
    "early_signal";

  return {
    rule_id: "R1.1",
    fired: true,
    subject_key: null, // portfolio-wide
    data: {
      bot_share: Math.round(currentShare * 100),
      N: priorAboveThreshold >= 2 ? 12 : priorAboveThreshold >= 1 ? 8 : 4,
      current_share_pct: `${Math.round(currentShare * 100)}%`,
      prior_periods_above_threshold: priorAboveThreshold,
    },
    evidence: [
      {
        source: "Raw Performance",
        fact: `Bot share: ${Math.round(currentShare * 100)}% over the trailing 4 weeks`,
        deeplink: "/chapter/raw",
      },
      {
        source: "Observations",
        fact: `Bot mitigation status: not flagged in client config`,
        deeplink: "/chapter/observations",
      },
    ],
    confidence,
    severity_weight: "high",
    action_type: "mechanical",
  };
};

async function botShareFor(
  client_key: string,
  start: Date,
  end: Date,
): Promise<number | null> {
  // Bot definition matches the dashboard's canonical filter (used by
  // journey_overview, channel_performance_overview, etc.):
  //   non-bot = bot_class IN ('human_likely','suspect') AND event_count > 1
  //   bot     = anything else (bot_likely OR single-event journeys)
  // This is broader than just bot_class='bot_likely' — single-event journeys
  // are also treated as bot-like (no engagement, no scroll, no navigation).
  //
  // Two count-only queries; journey_resolved_v1 is Sprint-3-optimized for scans.
  const [total, nonBot] = await Promise.all([
    supabase
      .schema("chapter_reporting")
      .from("journey_resolved_v1")
      .select("*", { count: "exact", head: true })
      .eq("client_key", client_key)
      .gte("entry_ts", start.toISOString())
      .lt("entry_ts", end.toISOString()),
    supabase
      .schema("chapter_reporting")
      .from("journey_resolved_v1")
      .select("*", { count: "exact", head: true })
      .eq("client_key", client_key)
      .in("bot_class", ["human_likely", "suspect"])
      .gt("event_count", 1)
      .gte("entry_ts", start.toISOString())
      .lt("entry_ts", end.toISOString()),
  ]);

  if (total.error || nonBot.error) return null;
  if (!total.count || total.count === 0) return null;
  const botCount = total.count - (nonBot.count ?? 0);
  return botCount / total.count;
}
