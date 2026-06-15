// R1.2 — Identification rate dropped meaningfully.
//
// Stance: "Chapter's ability to track customers across sessions has degraded;
// investigate identification touchpoints." (Theme: Data Integrity & Trust)
//
// Trigger conditions (per spec):
//   - Identification rate dropped ≥5pt vs trailing 4-week average
//   - Drop sustained 2+ weeks (not a single-week blip)
//
// Source data: chapter_reporting.journey_overview gives identified + total per
// window. We call it once per week-bucket over 6 weeks (current + 4 trailing).

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const DROP_THRESHOLD_PT = 5; // 5 percentage points

export const R1_2: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const end = ctx.data_window_end;

  // 6 weekly windows: index 0 = current week, 1-4 = trailing 4w, 5 = older.
  const weeklyRates: (number | null)[] = [];
  for (let i = 0; i < 6; i++) {
    const wEnd = new Date(end.getTime() - i * oneWeekMs);
    const wStart = new Date(wEnd.getTime() - oneWeekMs);
    weeklyRates.push(await identifiedRateFor(ctx.client_key, wStart, wEnd));
  }

  const current = weeklyRates[0];
  const trailing = weeklyRates.slice(1, 5).filter((r): r is number => r !== null);
  if (current === null || trailing.length < 2) return null;

  const trailingAvg = trailing.reduce((s, n) => s + n, 0) / trailing.length;
  const dropPt = (trailingAvg - current) * 100;

  if (dropPt < DROP_THRESHOLD_PT) {
    return null;
  }

  // Sustained for 2+ weeks: check that the prior week was also below trailing.
  const priorWeek = weeklyRates[1];
  const sustainedWeeks = priorWeek !== null && (trailingAvg - priorWeek) * 100 >= DROP_THRESHOLD_PT ? 2 : 1;

  if (sustainedWeeks < 2) {
    return null;
  }

  // Confidence: stronger when 3+ weeks below the trailing average.
  const weeksBelow = weeklyRates.slice(0, 3).filter(
    (r) => r !== null && (trailingAvg - r) * 100 >= DROP_THRESHOLD_PT,
  ).length;
  const confidence: "strong" | "moderate" | "early_signal" =
    weeksBelow >= 3 ? "strong" : weeksBelow === 2 ? "moderate" : "early_signal";

  const currentPct = Math.round(current * 100);
  const priorPct = Math.round(trailingAvg * 100);
  const ptChange = priorPct - currentPct;

  return {
    rule_id: "R1.2",
    fired: true,
    subject_key: null,
    data: {
      prior_rate: priorPct,
      current_rate: currentPct,
      pt_change: ptChange,
      N: weeksBelow,
    },
    evidence: [
      {
        source: "Raw Performance",
        fact: `Identification rate: ${currentPct}% current week vs ${priorPct}% trailing 4-week average`,
        deeplink: chapterUrl(ctx.client_key, "raw"),
      },
      {
        source: "Observations",
        fact: `Drop sustained across ${weeksBelow} of the last 3 weeks`,
        deeplink: chapterUrl(ctx.client_key, "observations"),
      },
    ],
    confidence,
    severity_weight: "high",
    action_type: "analytical",
  };
};

async function identifiedRateFor(
  client_key: string,
  start: Date,
  end: Date,
): Promise<number | null> {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("journey_overview", {
      p_client_key: client_key,
      p_start_ts: start.toISOString(),
      p_end_ts: end.toISOString(),
    });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const total = Number((row as { total_journeys?: number | string }).total_journeys ?? 0);
  const identified = Number((row as { identified_count?: number | string }).identified_count ?? 0);
  if (total === 0) return null;
  return identified / total;
}
