// R5.2 — Acquisition channel quality differs from common assumption.
//
// Stance: "Customers acquired through one channel show meaningfully different
// quality than customers acquired through another." (Theme: Customer Quality)
//
// Trigger conditions (per spec):
//   - Two channels show ≥40% difference in average customer LTV-proxy
//   - Each channel has ≥30 acquired customers in the window
//   - Pattern stable across 2+ comparison periods
//
// LTV proxy: revenue_touched per acquisition-chapter (chapter_id = 0). We
// read channel_roles_overview which already exposes the acquisition split
// (acquisition_chapters + revenue_touched per channel).

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const QUALITY_DIFFERENCE_FLOOR = 0.40; // 40% gap between channels
const MIN_CUSTOMERS = 30;

export const R5_2: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const dur = ctx.data_window_end.getTime() - ctx.data_window_start.getTime();
  const [current, prior] = await Promise.all([
    fetchRoles(ctx.client_key, ctx.data_window_start, ctx.data_window_end),
    fetchRoles(ctx.client_key, new Date(ctx.data_window_start.getTime() - dur), ctx.data_window_start),
  ]);
  if (!current) return null;

  type Row = { channel: string; acquisition_chapters: number; revenue_per_customer: number };

  const buildSummary = (rows: Array<Record<string, unknown>>): Row[] =>
    rows
      .map(r => {
        const acquisition = Number(r.acquisition_chapters ?? 0);
        const revenue = Number(r.revenue_touched ?? 0);
        return {
          channel: String(r.channel),
          acquisition_chapters: acquisition,
          revenue_per_customer: acquisition === 0 ? 0 : revenue / acquisition,
        };
      })
      .filter(r => r.acquisition_chapters >= MIN_CUSTOMERS);

  const currentSummary = buildSummary(current);
  if (currentSummary.length < 2) return null;
  const priorSummary = prior ? buildSummary(prior) : [];

  // Find the pair with the largest gap that exists in BOTH windows.
  let best: { high: Row; low: Row; multiplier: number } | null = null;
  for (let i = 0; i < currentSummary.length; i++) {
    for (let j = 0; j < currentSummary.length; j++) {
      if (i === j) continue;
      const high = currentSummary[i];
      const low = currentSummary[j];
      if (low.revenue_per_customer === 0) continue;
      const ratio = high.revenue_per_customer / low.revenue_per_customer;
      if (ratio - 1 < QUALITY_DIFFERENCE_FLOOR) continue;

      // Stability: same direction in prior window
      const priorHigh = priorSummary.find(r => r.channel === high.channel);
      const priorLow = priorSummary.find(r => r.channel === low.channel);
      const priorStable =
        priorHigh && priorLow && priorLow.revenue_per_customer > 0 &&
        priorHigh.revenue_per_customer / priorLow.revenue_per_customer > 1.2;
      if (!priorStable) continue;

      if (!best || ratio > best.multiplier) {
        best = { high, low, multiplier: ratio };
      }
    }
  }
  if (!best) return null;

  const confidence: "strong" | "moderate" | "early_signal" =
    best.high.acquisition_chapters >= 100 && best.low.acquisition_chapters >= 100 ? "strong" :
    best.high.acquisition_chapters >= 50 && best.low.acquisition_chapters >= 50 ? "moderate" :
    "early_signal";

  const multiplier = best.multiplier.toFixed(1);
  const highValue = Math.round(best.high.revenue_per_customer);
  const lowValue = Math.round(best.low.revenue_per_customer);

  return {
    rule_id: "R5.2",
    fired: true,
    subject_key: `${best.high.channel}->${best.low.channel}`,
    data: {
      high_quality_channel: titleCase(best.high.channel),
      low_quality_channel: titleCase(best.low.channel),
      quality_multiplier: multiplier,
      quality_metric: "revenue per acquired customer",
      high_value: `$${highValue.toLocaleString()}`,
      low_value: `$${lowValue.toLocaleString()}`,
      n: best.high.acquisition_chapters,
      n2: best.low.acquisition_chapters,
    },
    evidence: [
      {
        source: "Channel Roles",
        fact: `${titleCase(best.high.channel)}: $${highValue.toLocaleString()} / customer (${best.high.acquisition_chapters} acquired)`,
        deeplink: "/chapter/channels",
      },
      {
        source: "Channel Roles",
        fact: `${titleCase(best.low.channel)}: $${lowValue.toLocaleString()} / customer (${best.low.acquisition_chapters} acquired)`,
        deeplink: "/chapter/channels",
      },
      {
        source: "Customer Journeys",
        fact: `${multiplier}x revenue difference, sustained across current + prior window`,
        deeplink: "/chapter/journeys",
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
  };
};

async function fetchRoles(client_key: string, start: Date, end: Date) {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("channel_roles_overview", {
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
