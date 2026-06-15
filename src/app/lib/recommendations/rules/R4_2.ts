// R4.2 — Time-to-close growing meaningfully.
//
// Stance: "The elapsed time between first touch and purchase is growing;
// consideration cycles are lengthening." (Theme: Customer Lifecycle Health)
//
// Trigger conditions (per spec):
//   - Median time-to-close grew ≥30% vs trailing 8-week average
//   - Pattern persists across 3+ periods
//
// Uses canonical_v1's boundary_ts - first_ts span per chapter as the
// time-to-close proxy. Computes per-2-week period medians over 10 weeks.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const GROWTH_THRESHOLD = 0.30;
const PERIOD_WEEKS = 2;
const REQUIRED_PERIODS = 3;

export const R4_2: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const end = ctx.data_window_end;
  const medians: number[] = [];

  for (let i = 0; i < 5; i++) {
    const wEnd = new Date(end.getTime() - i * PERIOD_WEEKS * oneWeekMs);
    const wStart = new Date(wEnd.getTime() - PERIOD_WEEKS * oneWeekMs);
    const m = await medianDaysFor(ctx.client_key, wStart, wEnd);
    if (m !== null) medians.push(m);
  }
  if (medians.length < REQUIRED_PERIODS) return null;

  const current = medians[0];
  const trailing = medians.slice(1);
  const trailingMean = trailing.reduce((s, n) => s + n, 0) / trailing.length;
  if (trailingMean === 0) return null;

  const growth = (current - trailingMean) / trailingMean;
  if (growth < GROWTH_THRESHOLD) return null;

  let consistentRises = 0;
  for (let i = 0; i < medians.length - 1; i++) {
    if (medians[i] > medians[i + 1]) consistentRises += 1;
  }
  if (consistentRises < REQUIRED_PERIODS) return null;

  const confidence: "strong" | "moderate" | "early_signal" =
    growth >= 0.50 && consistentRises >= 4 ? "strong" :
    growth >= 0.40 || consistentRises >= 4 ? "moderate" : "early_signal";

  const pctChange = Math.round(growth * 100);

  return {
    rule_id: "R4.2",
    fired: true,
    subject_key: null,
    data: {
      current_days: current.toFixed(1),
      prior_days: trailingMean.toFixed(1),
      pct_change: pctChange,
      N: consistentRises,
    },
    evidence: [
      {
        source: "Lifecycle Overview",
        fact: `Median time-to-close: ${current.toFixed(1)} days (current 2w) vs ${trailingMean.toFixed(1)} days (prior 8w)`,
        deeplink: chapterUrl(ctx.client_key, "overview"),
      },
      {
        source: "Customer Journeys",
        fact: `Consistent upward trend across ${consistentRises + 1} of last ${medians.length} periods`,
        deeplink: chapterUrl(ctx.client_key, "journeys"),
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
  };
};

async function medianDaysFor(client_key: string, start: Date, end: Date): Promise<number | null> {
  const { data, error } = await supabase
    .schema("chapter_attribution")
    .from("chapter_channel_paths_canonical_v1_snapshot")
    .select("first_ts, boundary_ts")
    .eq("client_key", client_key)
    .gte("boundary_ts", start.toISOString())
    .lt("boundary_ts", end.toISOString());
  if (error || !data || data.length === 0) return null;

  const days = data
    .map(r => {
      const f = (r as { first_ts?: string }).first_ts;
      const b = (r as { boundary_ts?: string }).boundary_ts;
      if (!f || !b) return null;
      return (new Date(b).getTime() - new Date(f).getTime()) / (24 * 3600 * 1000);
    })
    .filter((n): n is number => n !== null && n >= 0)
    .sort((a, b) => a - b);
  if (days.length === 0) return null;
  const mid = Math.floor(days.length / 2);
  return days.length % 2 === 0 ? (days[mid - 1] + days[mid]) / 2 : days[mid];
}
