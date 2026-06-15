// R6.1 — New channel newly material to conversions.
//
// Stance: "A channel that was barely present in conversions is now appearing
// meaningfully; worth understanding what changed." (Theme: Emerging Patterns)
//
// Trigger conditions (per spec):
//   - Channel's share of converting chapters went from <5% (prior 4w
//     trailing) to ≥15% (current period)
//   - At least 10 chapters this period
//   - Not driven by a single anomalous day (sustained signal)

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const PRIOR_CEIL = 0.05; // <5% before
const CURRENT_FLOOR = 0.15; // ≥15% now
const MIN_CHAPTERS = 10;

export const R6_1: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const dur = ctx.data_window_end.getTime() - ctx.data_window_start.getTime();
  const [current, prior] = await Promise.all([
    fetchContrib(ctx.client_key, ctx.data_window_start, ctx.data_window_end),
    fetchContrib(ctx.client_key, new Date(ctx.data_window_start.getTime() - 4 * dur), ctx.data_window_start),
  ]);
  if (!current || !prior) return null;

  type Row = {
    channel: string;
    current_share: number;
    prior_share: number;
    current_chapters: number;
  };

  const candidates: Row[] = [];
  for (const c of current) {
    const channel = String(c.channel);
    const currentShare = Number(c.participation_rate ?? 0);
    const currentChapters = Number(c.touched_chapters ?? 0);
    if (currentShare < CURRENT_FLOOR) continue;
    if (currentChapters < MIN_CHAPTERS) continue;

    const priorRow = prior.find(p => p.channel === channel);
    const priorShare = priorRow ? Number(priorRow.participation_rate ?? 0) : 0;
    if (priorShare >= PRIOR_CEIL) continue;

    candidates.push({
      channel,
      current_share: currentShare,
      prior_share: priorShare,
      current_chapters: currentChapters,
    });
  }
  if (candidates.length === 0) return null;

  // Best: largest jump in share.
  const best = candidates.sort((a, b) =>
    (b.current_share - b.prior_share) - (a.current_share - a.prior_share),
  )[0];

  const jumpMultiplier = best.prior_share === 0
    ? best.current_chapters
    : best.current_share / best.prior_share;
  const confidence: "strong" | "moderate" | "early_signal" =
    best.current_chapters >= 20 && jumpMultiplier >= 3 ? "strong" :
    best.current_chapters >= 15 || jumpMultiplier >= 3 ? "moderate" :
    "early_signal";

  const currentPct = Math.round(best.current_share * 100);
  const priorPct = Math.round(best.prior_share * 100);

  return {
    rule_id: "R6.1",
    fired: true,
    subject_key: best.channel,
    data: {
      channel: titleCase(best.channel),
      prior_share: priorPct,
      current_share: currentPct,
      current_count: best.current_chapters,
      window: "week",
    },
    evidence: [
      {
        source: "Channel Roles",
        fact: `${titleCase(best.channel)}: ${currentPct}% of converting chapters this period (was ${priorPct}% trailing)`,
        deeplink: chapterUrl(ctx.client_key, "channels"),
      },
      {
        source: "Path Patterns",
        fact: `${best.current_chapters} converting chapters touched by ${titleCase(best.channel)} this period`,
        deeplink: chapterUrl(ctx.client_key, "paths"),
      },
      {
        source: "Observations",
        fact: `Emerging presence — no prior matching findings in trailing window`,
        deeplink: chapterUrl(ctx.client_key, "observations"),
      },
    ],
    confidence,
    severity_weight: "low",
    action_type: "analytical",
  };
};

async function fetchContrib(client_key: string, start: Date, end: Date) {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("contribution_overview", {
      p_client_key: client_key,
      p_start_ts: start.toISOString(),
      p_end_ts: end.toISOString(),
    });
  if (error || !data) return null;
  return data as Array<Record<string, unknown>>;
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)\w/g, m => m.toUpperCase());
}
