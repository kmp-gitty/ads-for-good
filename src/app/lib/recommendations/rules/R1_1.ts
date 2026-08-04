// R1.1 — Elevated bot traffic reaching the pixel (already excluded).
//
// Stance (REC3-corrected): bots are ALREADY excluded from every analytical
// metric + billed verified-journeys, so this is an honest FYI — "here's how much
// bot-like traffic reaches the pixel; it's already filtered; check your bot
// protection if it's unexpectedly high" — NOT "your metrics are polluted, add
// mitigation." Chapter cannot observe a client's mitigation (it's blind to bots
// blocked upstream by a firewall), so the reported share is what got THROUGH
// whatever protection they already run. (Theme: Data Integrity & Trust)
//
// Trigger conditions:
//   - Bot share ≥ 30% in current period
//   - Pattern persists across last 2+ comparison periods (stability check)
//   (There is no "no mitigation" check — Chapter can't observe mitigation.)
//
// Part 2 severity bands (write-time dedup; ordinals drive escalation state):
//   | Band                | Range   | Ordinal | Operator meaning                    |
//   | elevated-30-50      | 30-49%  | 1       | Typical for ecom; informational     |
//   | elevated-50-70      | 50-69%  | 2       | High; worth a bot-protection check  |
//   | elevated-70-plus    | 70%+    | 3       | Very high; likely scraping/attack   |
//
// Same-band drift → state='standing'. Escalation to higher band → state='changed'.
// De-escalation while still triggering → state='standing' (attenuation captured
// by confidence field, not state).

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

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
    return { rule_id: "R1.1", fired: false, subject_key: null, data: {}, evidence: [], confidence: "early_signal", severity_weight: "low", action_type: "mechanical" };
  }

  const confidence =
    currentShare >= BOT_THRESHOLD && priorAboveThreshold >= 2 ? "strong" :
    currentShare >= BOT_THRESHOLD && priorAboveThreshold >= 1 ? "moderate" :
    "early_signal";

  const botSharePct = Math.round(currentShare * 100);
  const bucket = bucketR1_1(botSharePct);

  return {
    rule_id: "R1.1",
    fired: true,
    subject_key: null, // portfolio-wide
    data: {
      bot_share: botSharePct,
      N: priorAboveThreshold >= 2 ? 12 : priorAboveThreshold >= 1 ? 8 : 4,
      current_share_pct: `${botSharePct}%`,
      prior_periods_above_threshold: priorAboveThreshold,
    },
    dedup_bucket: bucket.bucket,
    severity_ordinal: bucket.ordinal,
    evidence: [
      {
        source: "Raw Performance",
        fact: `${Math.round(currentShare * 100)}% of sessions classified bot-like (trailing 4 weeks) — excluded from every analytical metric`,
        deeplink: chapterUrl(ctx.client_key, "raw"),
      },
      {
        source: "Raw Performance",
        fact: `Excluded from your billed verified-journey count`,
        deeplink: chapterUrl(ctx.client_key, "raw"),
      },
    ],
    confidence,
    // REC3 — 'low', not 'high': bots are ALREADY excluded from every analytical
    // metric + billed verified-journeys, so this is an FYI (check your bot
    // protection if unexpectedly high), not an urgent metric-accuracy fix.
    severity_weight: "low",
    action_type: "mechanical",
  };
};

// Part 2 severity band bucketing — declared alongside the rule so the
// state-transition logic is inspectable next to the finding shape.
function bucketR1_1(botSharePct: number): { bucket: Record<string, unknown>; ordinal: number } {
  if (botSharePct >= 70) return { bucket: { band: "elevated-70-plus" }, ordinal: 3 };
  if (botSharePct >= 50) return { bucket: { band: "elevated-50-70" }, ordinal: 2 };
  return { bucket: { band: "elevated-30-50" }, ordinal: 1 };
}

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
