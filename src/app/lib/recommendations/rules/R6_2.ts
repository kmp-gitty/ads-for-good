// R6.2 — Sustained directional trend across the lifecycle.
//
// Stance: "A core lifecycle metric has been moving in one direction for
// multiple consecutive periods; pattern is no longer noise." (Theme: Emerging)
//
// Trigger conditions (per spec):
//   - One of [path_length, time_to_close, identification_rate,
//     single_touch_share] has moved in same direction across 4+ periods
//   - Cumulative change ≥15%
//
// Watches 4 lifecycle metrics across 5 consecutive 2-week periods and fires
// on the strongest sustained trend that isn't already caught by R4.x rules.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const CUMULATIVE_THRESHOLD = 0.15;
const PERIOD_WEEKS = 2;
const MIN_CONSECUTIVE = 4;

export const R6_2: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const periods: { start: Date; end: Date }[] = [];
  for (let i = 0; i < 5; i++) {
    const end = new Date(ctx.data_window_end.getTime() - i * PERIOD_WEEKS * oneWeekMs);
    const start = new Date(end.getTime() - PERIOD_WEEKS * oneWeekMs);
    periods.push({ start, end });
  }

  // For each metric, compute one value per period.
  const metricsByPeriod = await Promise.all(periods.map(p => snapshotMetrics(ctx.client_key, p.start, p.end)));
  // metricsByPeriod[0] = current; metricsByPeriod[4] = oldest

  const metricNames = ["path_length", "time_to_close", "identification_rate", "single_touch_share"] as const;
  type MetricName = typeof metricNames[number];

  type Candidate = {
    name: MetricName;
    direction: "increase" | "decrease";
    consecutive: number;
    cumulative: number;
    trend_start_value: number;
    current_value: number;
  };

  const candidates: Candidate[] = [];
  for (const name of metricNames) {
    const series = metricsByPeriod.map(m => (m ? m[name] : null));
    const valid = series.filter((v): v is number => v !== null);
    if (valid.length < MIN_CONSECUTIVE + 1) continue;

    // Walk series oldest→newest checking for consistent direction.
    const reversed = series.slice().reverse(); // index 0 = oldest
    let direction: "increase" | "decrease" | null = null;
    let consecutive = 0;
    for (let i = 1; i < reversed.length; i++) {
      const prev = reversed[i - 1];
      const cur = reversed[i];
      if (prev === null || cur === null) {
        consecutive = 0;
        direction = null;
        continue;
      }
      const stepDir: "increase" | "decrease" = cur > prev ? "increase" : "decrease";
      if (direction === null) {
        direction = stepDir;
        consecutive = 1;
      } else if (direction === stepDir) {
        consecutive += 1;
      } else {
        direction = stepDir;
        consecutive = 1;
      }
    }
    if (direction === null || consecutive < MIN_CONSECUTIVE - 1) continue;

    const oldest = reversed.find((v): v is number => v !== null);
    const newest = series[0];
    if (oldest === null || oldest === undefined || newest === null || oldest === 0) continue;
    const cumulative = Math.abs((newest - oldest) / oldest);
    if (cumulative < CUMULATIVE_THRESHOLD) continue;

    candidates.push({
      name,
      direction,
      consecutive: consecutive + 1, // count of periods including the start
      cumulative,
      trend_start_value: oldest,
      current_value: newest,
    });
  }
  if (candidates.length === 0) return null;

  // Pick the strongest cumulative move that isn't path_length OR
  // time_to_close (those are R4.1 / R4.2 territory — give R6.2 a different
  // metric when possible to avoid redundancy).
  const nonR4 = candidates.filter(c => c.name !== "path_length" && c.name !== "time_to_close");
  const pickFrom = nonR4.length > 0 ? nonR4 : candidates;
  const best = pickFrom.sort((a, b) => b.cumulative - a.cumulative)[0];

  const confidence: "strong" | "moderate" | "early_signal" =
    best.consecutive >= 6 && best.cumulative >= 0.20 ? "strong" :
    best.consecutive >= 5 ? "moderate" : "early_signal";

  const metricLabel = labelFor(best.name);
  const directionWord = best.direction === "increase" ? "upward" : "downward";
  const pctChange = Math.round(best.cumulative * 100 * (best.direction === "increase" ? 1 : -1));

  return {
    rule_id: "R6.2",
    fired: true,
    subject_key: best.name,
    data: {
      metric_name: metricLabel,
      direction: best.direction,
      direction_word: directionWord,
      N: best.consecutive,
      pct_change: pctChange,
      trend_start_value: best.trend_start_value.toFixed(2),
      current_value: best.current_value.toFixed(2),
    },
    evidence: [
      {
        source: "Lifecycle Overview",
        fact: `${metricLabel}: ${best.trend_start_value.toFixed(2)} → ${best.current_value.toFixed(2)} over ${best.consecutive} consecutive periods`,
        deeplink: chapterUrl(ctx.client_key, "overview"),
      },
      {
        source: "Observations",
        fact: `Cumulative ${pctChange}% shift, sustained direction`,
        deeplink: chapterUrl(ctx.client_key, "observations"),
      },
    ],
    confidence,
    severity_weight: "low",
    action_type: "analytical",
  };
};

async function snapshotMetrics(client_key: string, start: Date, end: Date): Promise<Record<string, number | null> | null> {
  const [overview, journey, paths] = await Promise.all([
    supabase.schema("chapter_reporting").rpc("lifecycle_overview", {
      p_client_key: client_key, p_start_ts: start.toISOString(), p_end_ts: end.toISOString(),
    }),
    supabase.schema("chapter_reporting").rpc("journey_overview", {
      p_client_key: client_key, p_start_ts: start.toISOString(), p_end_ts: end.toISOString(),
    }),
    supabase.schema("chapter_attribution").from("chapter_channel_paths_canonical_v1_snapshot")
      .select("channel_path")
      .eq("client_key", client_key)
      .gte("boundary_ts", start.toISOString())
      .lt("boundary_ts", end.toISOString()),
  ]);

  if (overview.error || journey.error || paths.error) return null;
  const overviewRow = (overview.data as Array<Record<string, unknown>>)?.[0] ?? null;
  const journeyRow = (journey.data as Array<Record<string, unknown>>)?.[0] ?? null;
  if (!overviewRow || !journeyRow) return null;

  const total = Number(journeyRow.total_journeys ?? 0);
  const identified = Number(journeyRow.identified_count ?? 0);
  const idRate = total > 0 ? identified / total : null;

  const pathRows = paths.data ?? [];
  if (pathRows.length === 0) return null;
  let single = 0;
  for (const r of pathRows) {
    const p = (r as { channel_path?: string }).channel_path;
    if (p && p.split(" → ").length === 1) single += 1;
  }
  const singleShare = pathRows.length > 0 ? single / pathRows.length : null;

  return {
    path_length: Number(overviewRow.median_touches ?? 0) || null,
    time_to_close: Number(overviewRow.median_days_to_close ?? 0) || null,
    identification_rate: idRate,
    single_touch_share: singleShare,
  };
}

function labelFor(name: string): string {
  switch (name) {
    case "path_length": return "Median touches to close";
    case "time_to_close": return "Median time-to-close";
    case "identification_rate": return "Identification rate";
    case "single_touch_share": return "Single-touch close share";
    default: return name;
  }
}
