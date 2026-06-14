// R2.1 — Channel over-credit risk under last-touch.
//
// Stance: "A channel's credit under last-touch attribution may overstate its
// actual contribution to outcomes." (Theme: Channel Value & Investment)
//
// Trigger conditions (per spec):
//   - Channel's last-touch share ≥25% AND
//   - Channel's lift/incrementality score below 0.20 AND
//   - Channel appears in ≥60% of converting chapters AND
//   - Channel rarely opens paths (opener share <20%)
//
// Picks the single worst-offending channel each run; multi-subject rules
// surface one card per (rule, subject) which the state machine tracks
// independently.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const LAST_TOUCH_THRESHOLD = 0.25;
const LIFT_THRESHOLD = 0.20;
const PRESENCE_THRESHOLD = 0.60;
const OPENER_THRESHOLD = 0.20;

export const R2_1: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const [attribution, contribution, roles] = await Promise.all([
    callRpc("attribution_overview", ctx.client_key, ctx.data_window_start, ctx.data_window_end),
    callRpc("contribution_overview", ctx.client_key, ctx.data_window_start, ctx.data_window_end),
    callRpc("channel_roles_overview", ctx.client_key, ctx.data_window_start, ctx.data_window_end),
  ]);
  if (!attribution || !contribution || !roles) return null;

  // Build a per-channel summary by joining the three rowsets on channel name.
  type Row = {
    channel: string;
    last_touch_share: number;
    lift_score: number;
    presence_share: number;
    opener_share: number;
    first_touch_share: number;
  };

  const totalLastTouchOrders = attribution.reduce(
    (s, r) => s + Number((r as { last_touch_orders?: number | string }).last_touch_orders ?? 0),
    0,
  );
  const totalFirstTouchOrders = attribution.reduce(
    (s, r) => s + Number((r as { first_touch_orders?: number | string }).first_touch_orders ?? 0),
    0,
  );
  if (totalLastTouchOrders === 0 || totalFirstTouchOrders === 0) return null;

  const summary: Row[] = [];
  for (const attr of attribution as Array<Record<string, unknown>>) {
    const channel = String(attr.channel);
    const contrib = (contribution as Array<Record<string, unknown>>).find(c => c.channel === channel);
    const role = (roles as Array<Record<string, unknown>>).find(r => r.channel === channel);
    if (!contrib || !role) continue;
    summary.push({
      channel,
      last_touch_share: Number(attr.last_touch_orders ?? 0) / totalLastTouchOrders,
      first_touch_share: Number(attr.first_touch_orders ?? 0) / totalFirstTouchOrders,
      lift_score: Math.abs(Number(contrib.incremental_rate ?? 0)),
      presence_share: Number(contrib.participation_rate ?? 0),
      opener_share: Number(role.opener_pct ?? 0) / 100,
    });
  }

  // Pick the channel that triggers all 4 conditions with the largest
  // (last_touch_share - opener_share) margin — that's the most asymmetric
  // case of "closes a lot, opens rarely".
  const candidates = summary.filter(r =>
    r.last_touch_share >= LAST_TOUCH_THRESHOLD &&
    r.lift_score < LIFT_THRESHOLD &&
    r.presence_share >= PRESENCE_THRESHOLD &&
    r.opener_share < OPENER_THRESHOLD,
  );
  if (candidates.length === 0) return null;

  const worst = candidates.sort((a, b) =>
    (b.last_touch_share - b.opener_share) - (a.last_touch_share - a.opener_share),
  )[0];

  const ltPct = Math.round(worst.last_touch_share * 100);
  const presencePct = Math.round(worst.presence_share * 100);
  const openerPct = Math.round(worst.opener_share * 100);

  // Confidence: comfortable margins on all 4 = strong; 3 of 4 clearly = moderate
  const margins = [
    worst.last_touch_share - LAST_TOUCH_THRESHOLD,
    LIFT_THRESHOLD - worst.lift_score,
    worst.presence_share - PRESENCE_THRESHOLD,
    OPENER_THRESHOLD - worst.opener_share,
  ];
  const comfortableCount = margins.filter(m => m >= 0.05).length;
  const confidence: "strong" | "moderate" | "early_signal" =
    comfortableCount === 4 ? "strong" :
    comfortableCount >= 3 ? "moderate" : "early_signal";

  return {
    rule_id: "R2.1",
    fired: true,
    subject_key: worst.channel,
    data: {
      channel: titleCase(worst.channel),
      last_touch_share: ltPct,
      presence_share: presencePct,
      opener_share: openerPct,
      lift_score: worst.lift_score.toFixed(2),
    },
    evidence: [
      {
        source: "Attribution Models",
        fact: `${titleCase(worst.channel)} closes ${ltPct}% of chapters under last-touch`,
        deeplink: "/chapter/attribution",
      },
      {
        source: "Channel Roles",
        fact: `Present in ${presencePct}% of converting paths but opens only ${openerPct}%`,
        deeplink: "/chapter/channels",
      },
      {
        source: "Lift, Incrementality & Value",
        fact: `Incremental rate ${worst.lift_score.toFixed(2)} (below 0.20 floor)`,
        deeplink: "/chapter/lift",
      },
    ],
    confidence,
    severity_weight: "high",
    action_type: "strategic_prompting",
  };
};

async function callRpc(rpcName: string, clientKey: string, start: Date, end: Date) {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc(rpcName, {
      p_client_key: clientKey,
      p_start_ts: start.toISOString(),
      p_end_ts: end.toISOString(),
    });
  if (error || !data) return null;
  return data as Array<Record<string, unknown>>;
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)\w/g, m => m.toUpperCase());
}
