// R2.4 — Efficient channel with low spend share.
//
// Stance: "A channel shows strong lift and efficient outcomes but receives a
// small share of investment; possibly under-invested." (Theme: Channel Value)
//
// Trigger conditions (per spec):
//   - Channel's lift score ≥0.40 AND
//   - Channel's revenue-per-touchpoint in top tertile AND
//   - Channel's presence in converting paths <20%
//
// Without spend data, "investment" is inferred from presence_share — low
// presence in converting paths combined with strong lift + efficient revenue
// is the same actionable signal.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const LIFT_FLOOR = 0.40;
const PRESENCE_CEIL = 0.20;

export const R2_4: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const [contribution, roles] = await Promise.all([
    callRpc("contribution_overview", ctx.client_key, ctx.data_window_start, ctx.data_window_end),
    callRpc("channel_roles_overview", ctx.client_key, ctx.data_window_start, ctx.data_window_end),
  ]);
  if (!contribution || !roles) return null;

  type Row = {
    channel: string;
    lift_score: number;
    presence_share: number;
    revenue_per_chapter: number;
  };

  const summary: Row[] = [];
  for (const c of contribution) {
    const channel = String(c.channel);
    const role = roles.find(r => r.channel === channel);
    if (!role) continue;
    const chapters = Number(role.chapters ?? 0);
    const revenueTouched = Number(role.revenue_touched ?? 0);
    if (chapters === 0) continue;
    summary.push({
      channel,
      lift_score: Number(c.incremental_rate ?? 0),
      presence_share: Number(c.participation_rate ?? 0),
      revenue_per_chapter: revenueTouched / chapters,
    });
  }
  if (summary.length === 0) return null;

  // Top tertile cutoff for revenue_per_chapter.
  const sortedRevPerChapter = summary.map(r => r.revenue_per_chapter).sort((a, b) => a - b);
  const tertileCut = sortedRevPerChapter[Math.floor(sortedRevPerChapter.length * (2 / 3))];

  const candidates = summary.filter(r =>
    r.lift_score >= LIFT_FLOOR &&
    r.revenue_per_chapter >= tertileCut &&
    r.presence_share < PRESENCE_CEIL,
  );
  if (candidates.length === 0) return null;

  // Best candidate: highest lift among efficient + low-presence channels.
  const best = candidates.sort((a, b) => b.lift_score - a.lift_score)[0];

  const liftStr = best.lift_score.toFixed(2);
  const presencePct = Math.round(best.presence_share * 100);
  const revPerTouch = Math.round(best.revenue_per_chapter);

  const margins = [
    best.lift_score - LIFT_FLOOR,
    PRESENCE_CEIL - best.presence_share,
  ];
  const comfortableCount = margins.filter(m => m >= 0.05).length;
  const confidence: "strong" | "moderate" | "early_signal" =
    comfortableCount === 2 ? "strong" :
    comfortableCount === 1 ? "moderate" : "early_signal";

  return {
    rule_id: "R2.4",
    fired: true,
    subject_key: best.channel,
    data: {
      channel: titleCase(best.channel),
      lift_score: liftStr,
      rev_per_touch: `$${revPerTouch.toLocaleString()}`,
      presence_share: presencePct,
    },
    evidence: [
      {
        source: "Lift, Incrementality & Value",
        fact: `${titleCase(best.channel)} incremental rate ${liftStr} (clear positive lift)`,
        deeplink: chapterUrl(ctx.client_key, "lift"),
      },
      {
        source: "Channel Roles",
        fact: `$${revPerTouch.toLocaleString()} revenue per touched chapter (top-tertile efficiency)`,
        deeplink: chapterUrl(ctx.client_key, "channels"),
      },
      {
        source: "Path Patterns",
        fact: `Appears in only ${presencePct}% of converting chapters`,
        deeplink: chapterUrl(ctx.client_key, "paths"),
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
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
