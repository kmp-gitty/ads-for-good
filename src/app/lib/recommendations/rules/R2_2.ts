// R2.2 — Channel under-credit risk under last-touch.
//
// Stance: "A channel's last-touch credit understates its contribution; it's
// doing more upstream work than the model captures." (Theme: Channel Value)
//
// Trigger conditions (per spec):
//   - Channel's last-touch share <10% AND
//   - Channel's first-touch share ≥20% AND
//   - Channel's lift score ≥0.30 AND
//   - Channel appears in ≥30% of converting chapters
//
// Mirror of R2.1: surfaces channels that open + contribute but rarely close.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const LAST_TOUCH_CEIL = 0.10;
const FIRST_TOUCH_FLOOR = 0.20;
const LIFT_FLOOR = 0.30;
const PRESENCE_FLOOR = 0.30;

export const R2_2: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const [attribution, contribution] = await Promise.all([
    callRpc("attribution_overview", ctx.client_key, ctx.data_window_start, ctx.data_window_end),
    callRpc("contribution_overview", ctx.client_key, ctx.data_window_start, ctx.data_window_end),
  ]);
  if (!attribution || !contribution) return null;

  const totalLastTouch = sum(attribution, "last_touch_orders");
  const totalFirstTouch = sum(attribution, "first_touch_orders");
  if (totalLastTouch === 0 || totalFirstTouch === 0) return null;

  type Row = {
    channel: string;
    last_touch_share: number;
    first_touch_share: number;
    lift_score: number;
    presence_share: number;
  };

  const summary: Row[] = [];
  for (const attr of attribution) {
    const channel = String(attr.channel);
    const contrib = contribution.find(c => c.channel === channel);
    if (!contrib) continue;
    summary.push({
      channel,
      last_touch_share: Number(attr.last_touch_orders ?? 0) / totalLastTouch,
      first_touch_share: Number(attr.first_touch_orders ?? 0) / totalFirstTouch,
      lift_score: Number(contrib.incremental_rate ?? 0), // signed — positive lift only
      presence_share: Number(contrib.participation_rate ?? 0),
    });
  }

  const candidates = summary.filter(r =>
    r.last_touch_share < LAST_TOUCH_CEIL &&
    r.first_touch_share >= FIRST_TOUCH_FLOOR &&
    r.lift_score >= LIFT_FLOOR &&
    r.presence_share >= PRESENCE_FLOOR,
  );
  if (candidates.length === 0) return null;

  // Pick the channel with the largest (first_touch_share - last_touch_share)
  // gap — strongest "opener but rarely closer" asymmetry.
  const best = candidates.sort((a, b) =>
    (b.first_touch_share - b.last_touch_share) - (a.first_touch_share - a.last_touch_share),
  )[0];

  const ftPct = Math.round(best.first_touch_share * 100);
  const ltPct = Math.round(best.last_touch_share * 100);
  const presencePct = Math.round(best.presence_share * 100);

  const margins = [
    LAST_TOUCH_CEIL - best.last_touch_share,
    best.first_touch_share - FIRST_TOUCH_FLOOR,
    best.lift_score - LIFT_FLOOR,
    best.presence_share - PRESENCE_FLOOR,
  ];
  const comfortableCount = margins.filter(m => m >= 0.05).length;
  const confidence: "strong" | "moderate" | "early_signal" =
    comfortableCount === 4 ? "strong" :
    comfortableCount >= 3 ? "moderate" : "early_signal";

  return {
    rule_id: "R2.2",
    fired: true,
    subject_key: best.channel,
    data: {
      channel: titleCase(best.channel),
      first_touch_share: ftPct,
      last_touch_share: ltPct,
      lift_score: best.lift_score.toFixed(2),
      presence_share: presencePct,
    },
    evidence: [
      {
        source: "Attribution Models",
        fact: `${titleCase(best.channel)} opens ${ftPct}% of paths but only closes ${ltPct}% under last-touch`,
        deeplink: chapterUrl(ctx.client_key, "attribution"),
      },
      {
        source: "Lift, Incrementality & Value",
        fact: `Incremental rate ${best.lift_score.toFixed(2)} (clear positive signal)`,
        deeplink: chapterUrl(ctx.client_key, "lift"),
      },
      {
        source: "Channel Roles",
        fact: `Present in ${presencePct}% of converting chapters`,
        deeplink: chapterUrl(ctx.client_key, "channels"),
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

function sum(rows: Array<Record<string, unknown>>, key: string): number {
  return rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)\w/g, m => m.toUpperCase());
}
