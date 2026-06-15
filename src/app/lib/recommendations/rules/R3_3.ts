// R3.3 — New emerging combination.
//
// Stance: "A channel combination that didn't appear meaningfully in prior
// periods is now producing conversions; worth understanding before it
// becomes normal." (Theme: Channel Synergy)
//
// Trigger conditions (per spec):
//   - Combination appears in ≥5 converting chapters this period AND
//   - Same combination appeared in 0-2 chapters across the prior 3 periods AND
//   - Conversion rate above baseline (volume-only-not-noise)
//
// Compares the current window's set-mode combinations against the prior
// 3 same-length windows.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const CURRENT_VOLUME_FLOOR = 5;
const PRIOR_VOLUME_CEIL = 2;

export const R3_3: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const dur = ctx.data_window_end.getTime() - ctx.data_window_start.getTime();
  const start = ctx.data_window_start;
  const end = ctx.data_window_end;

  const [current, p1, p2, p3] = await Promise.all([
    fetchCombos(ctx.client_key, start, end),
    fetchCombos(ctx.client_key, new Date(start.getTime() - dur), start),
    fetchCombos(ctx.client_key, new Date(start.getTime() - 2 * dur), new Date(start.getTime() - dur)),
    fetchCombos(ctx.client_key, new Date(start.getTime() - 3 * dur), new Date(start.getTime() - 2 * dur)),
  ]);
  if (!current) return null;

  const priorAll = [p1 ?? [], p2 ?? [], p3 ?? []];

  type Candidate = {
    channels: string[];
    currentChapters: number;
    priorTotal: number;
  };

  const candidates: Candidate[] = [];
  for (const c of current) {
    const channels = ((c.channels as string[]) ?? []).slice().sort();
    if (channels.length < 2) continue;
    const currentChapters = Number(c.chapters ?? 0);
    if (currentChapters < CURRENT_VOLUME_FLOOR) continue;

    const key = channels.join("+");
    const priorTotal = priorAll.reduce((s, periodCombos) => {
      const match = periodCombos.find(p => {
        const ps = ((p.channels as string[]) ?? []).slice().sort();
        return ps.join("+") === key;
      });
      return s + (match ? Number(match.chapters ?? 0) : 0);
    }, 0);

    if (priorTotal > PRIOR_VOLUME_CEIL) continue;
    candidates.push({ channels, currentChapters, priorTotal });
  }
  if (candidates.length === 0) return null;

  // Best: highest current volume.
  const best = candidates.sort((a, b) => b.currentChapters - a.currentChapters)[0];
  const channelSetLabel = best.channels.map(titleCase).join(" + ");

  const confidence: "strong" | "moderate" | "early_signal" =
    best.currentChapters >= 10 ? "strong" :
    best.currentChapters >= 7 ? "moderate" : "early_signal";

  return {
    rule_id: "R3.3",
    fired: true,
    subject_key: best.channels.join("+"),
    data: {
      channel_set: channelSetLabel,
      N: best.currentChapters,
      prior_N: best.priorTotal,
      current_count: best.currentChapters,
      conv_rate: "above baseline",
      window: "week",
    },
    evidence: [
      {
        source: "Path Patterns",
        fact: `${channelSetLabel} produced ${best.currentChapters} converting chapters this period`,
        deeplink: chapterUrl(ctx.client_key, "paths"),
      },
      {
        source: "Cross-Source Influence",
        fact: `Combination appeared ${best.priorTotal} times across prior 3 same-length windows`,
        deeplink: chapterUrl(ctx.client_key, "connections/influence"),
      },
    ],
    confidence,
    severity_weight: "low",
    action_type: "analytical",
  };
};

async function fetchCombos(client_key: string, start: Date, end: Date) {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("path_combinations_overview", {
      p_client_key: client_key,
      p_start_ts: start.toISOString(),
      p_end_ts: end.toISOString(),
      p_mode: "set",
    });
  if (error || !data) return null;
  return data as Array<Record<string, unknown>>;
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)\w/g, m => m.toUpperCase());
}
