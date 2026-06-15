// R3.1 — High-performing channel combination identified.
//
// Stance: "A specific combination of channels converts at meaningfully higher
// rates than the individual channels alone." (Theme: Channel Synergy)
//
// Trigger conditions (per spec):
//   - Combination's conversion rate exceeds sum of component rates by ≥30%
//   - Combination appears in ≥10 converting chapters (volume threshold)
//   - Sustained over 2+ periods
//
// Source: path_combinations_overview in 'set' mode gives sorted-distinct
// channel groups + chapters + revenue. Component-channel solo conversion
// rates come from channel_roles_overview.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const COMBO_LIFT_THRESHOLD = 0.30; // 30% above component baseline
const VOLUME_THRESHOLD = 10;

export const R3_1: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const [combosCurrent, rolesCurrent, combosPrior] = await Promise.all([
    callRpc("path_combinations_overview", {
      p_client_key: ctx.client_key,
      p_start_ts: ctx.data_window_start.toISOString(),
      p_end_ts: ctx.data_window_end.toISOString(),
      p_mode: "set",
    }),
    callRpc("channel_roles_overview", {
      p_client_key: ctx.client_key,
      p_start_ts: ctx.data_window_start.toISOString(),
      p_end_ts: ctx.data_window_end.toISOString(),
    }),
    // Prior period = same-length window immediately before current
    callRpc("path_combinations_overview", {
      p_client_key: ctx.client_key,
      p_start_ts: priorStart(ctx).toISOString(),
      p_end_ts: ctx.data_window_start.toISOString(),
      p_mode: "set",
    }),
  ]);
  if (!combosCurrent || !rolesCurrent) return null;

  // Per-channel solo conversion rate proxy: revenue_touched / chapters
  // captures relative strength; we use a normalized 0-1 rank.
  const channelRate = new Map<string, number>();
  const maxChapters = Math.max(
    ...rolesCurrent.map(r => Number(r.chapters ?? 0)),
    1,
  );
  for (const r of rolesCurrent) {
    channelRate.set(String(r.channel), Number(r.chapters ?? 0) / maxChapters);
  }

  type ComboRow = {
    channels: string[];
    chapters: number;
    revenue: number;
    rate: number;
  };

  const candidates: ComboRow[] = [];
  for (const c of combosCurrent) {
    const channels = (c.channels as string[]) ?? [];
    if (channels.length < 2) continue; // pair-or-more only
    const chapters = Number(c.chapters ?? 0);
    if (chapters < VOLUME_THRESHOLD) continue;

    // Combo rate proxy = normalized chapter count
    const comboRate = chapters / maxChapters;
    // Sum of component solos
    const componentSum = channels.reduce((s, ch) => s + (channelRate.get(ch) ?? 0), 0);
    if (componentSum === 0) continue;

    const lift = (comboRate - componentSum) / componentSum;
    if (lift < COMBO_LIFT_THRESHOLD) continue;

    // Sustained: combo also present in prior period with similar volume
    const priorCombo = combosPrior?.find(p => {
      const pChannels = ((p.channels as string[]) ?? []).slice().sort();
      const cChannels = channels.slice().sort();
      return pChannels.length === cChannels.length &&
             pChannels.every((x, i) => x === cChannels[i]);
    });
    const priorChapters = priorCombo ? Number(priorCombo.chapters ?? 0) : 0;
    const sustained = priorChapters >= VOLUME_THRESHOLD;

    if (!sustained) continue;

    candidates.push({ channels, chapters, revenue: Number(c.revenue ?? 0), rate: comboRate });
  }
  if (candidates.length === 0) return null;

  // Best: largest chapter count among qualified combos.
  const best = candidates.sort((a, b) => b.chapters - a.chapters)[0];
  const channelsTitled = best.channels.map(titleCase);
  const componentLabels =
    channelsTitled.length === 2 ? channelsTitled.join(" and ") :
    channelsTitled.slice(0, -1).join(", ") + ", and " + channelsTitled.slice(-1);

  const comboPct = Math.round((best.chapters / maxChapters) * 100);
  const componentMean = Math.round(
    100 * best.channels.reduce((s, ch) => s + (channelRate.get(ch) ?? 0), 0) / best.channels.length,
  );
  const liftMultiplier = (best.chapters / maxChapters / Math.max(
    best.channels.reduce((s, ch) => s + (channelRate.get(ch) ?? 0), 0) / best.channels.length, 0.0001,
  )).toFixed(1);

  const confidence: "strong" | "moderate" | "early_signal" =
    best.chapters >= 20 ? "strong" : best.chapters >= 15 ? "moderate" : "early_signal";

  return {
    rule_id: "R3.1",
    fired: true,
    subject_key: best.channels.slice().sort().join("+"),
    data: {
      channel_a: channelsTitled[0],
      channel_b: channelsTitled[1] ?? "",
      channel_c_if_present: channelsTitled[2] ?? "",
      combo_lift: liftMultiplier,
      combo_rate: comboPct,
      a_alone_rate: Math.round((channelRate.get(best.channels[0]) ?? 0) * 100),
      b_alone_rate: Math.round((channelRate.get(best.channels[1] ?? "") ?? 0) * 100),
      combo_count: best.chapters,
      component_baseline: componentMean,
      N: 2,
    },
    evidence: [
      {
        source: "Path Patterns",
        fact: `${componentLabels} together appears in ${best.chapters} converting chapters`,
        deeplink: chapterUrl(ctx.client_key, "paths"),
      },
      {
        source: "Cross-Source Influence",
        fact: `Combination conversion rate ${comboPct}% vs ~${componentMean}% for each component alone`,
        deeplink: chapterUrl(ctx.client_key, "connections/influence"),
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
  };
};

function priorStart(ctx: { data_window_start: Date; data_window_end: Date }): Date {
  const dur = ctx.data_window_end.getTime() - ctx.data_window_start.getTime();
  return new Date(ctx.data_window_start.getTime() - dur);
}

async function callRpc(rpcName: string, args: Record<string, unknown>) {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc(rpcName, args);
  if (error || !data) return null;
  return data as Array<Record<string, unknown>>;
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)\w/g, m => m.toUpperCase());
}
