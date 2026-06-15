// R6.3 — Outlier behavior detected.
//
// Stance: "Something in the data is well outside normal ranges and is worth a
// direct look before it propagates." (Theme: Emerging Patterns)
//
// Trigger conditions (per spec):
//   - A monitored metric (daily journey volume, daily revenue) moved >3 SD
//     from its trailing 8-week distribution this period
//   - Not explained by an existing data integrity rule
//
// Watches daily journey count + daily order count + daily revenue. Pulls
// per-day buckets via dashboard_timeseries and computes z-scores from a
// trailing 8-week distribution.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const Z_THRESHOLD = 3.0;
const TRAILING_DAYS = 56; // 8 weeks

export const R6_3: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const oneDayMs = 24 * 3600 * 1000;
  const trailingStart = new Date(ctx.data_window_end.getTime() - TRAILING_DAYS * oneDayMs);

  // Single timeseries pull covering current + trailing 8w. n_buckets per day.
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("dashboard_timeseries", {
      p_client_key: ctx.client_key,
      p_start_ts: trailingStart.toISOString(),
      p_end_ts: ctx.data_window_end.toISOString(),
      p_n_buckets: TRAILING_DAYS,
    });
  if (error || !data) return null;

  const rows = data as Array<Record<string, unknown>>;
  if (rows.length < TRAILING_DAYS / 2) return null;

  const metrics = ["journeys", "orders", "revenue"] as const;
  type MetricName = typeof metrics[number];

  type Outlier = {
    name: MetricName;
    current: number;
    expected_low: number;
    expected_high: number;
    z: number;
  };

  const outliers: Outlier[] = [];
  for (const name of metrics) {
    const series = rows.map(r => Number(r[name] ?? 0)).filter(v => Number.isFinite(v));
    if (series.length < 14) continue;

    // Current period = most recent day; trailing = all but last 3 days
    const current = series[series.length - 1];
    const trailing = series.slice(0, series.length - 3);
    if (trailing.length < 7) continue;
    const mean = trailing.reduce((s, v) => s + v, 0) / trailing.length;
    const variance = trailing.reduce((s, v) => s + (v - mean) * (v - mean), 0) / trailing.length;
    const sd = Math.sqrt(variance);
    if (sd === 0) continue;

    const z = (current - mean) / sd;
    if (Math.abs(z) < Z_THRESHOLD) continue;

    outliers.push({
      name,
      current,
      expected_low: Math.max(0, mean - 2 * sd),
      expected_high: mean + 2 * sd,
      z,
    });
  }
  if (outliers.length === 0) return null;

  // Biggest absolute z wins.
  const best = outliers.sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0];

  const confidence: "strong" | "moderate" | "early_signal" =
    Math.abs(best.z) >= 4 ? "strong" :
    Math.abs(best.z) >= 3.5 ? "moderate" : "early_signal";

  const metricLabel = labelFor(best.name);
  const sigmaStr = Math.abs(best.z).toFixed(1);
  const currentValue = best.name === "revenue"
    ? `$${Math.round(best.current).toLocaleString()}`
    : Math.round(best.current).toLocaleString();
  const lowValue = best.name === "revenue"
    ? `$${Math.round(best.expected_low).toLocaleString()}`
    : Math.round(best.expected_low).toLocaleString();
  const highValue = best.name === "revenue"
    ? `$${Math.round(best.expected_high).toLocaleString()}`
    : Math.round(best.expected_high).toLocaleString();

  return {
    rule_id: "R6.3",
    fired: true,
    subject_key: best.name,
    data: {
      metric_name: metricLabel,
      current_value: currentValue,
      expected_low: lowValue,
      expected_high: highValue,
      n_sigma: sigmaStr,
      window: "day",
    },
    evidence: [
      {
        source: "Raw Performance",
        fact: `${metricLabel} hit ${currentValue} (expected range ${lowValue}-${highValue})`,
        deeplink: chapterUrl(ctx.client_key, "raw"),
      },
      {
        source: "Lifecycle Overview",
        fact: `${sigmaStr}σ deviation from trailing 8-week distribution`,
        deeplink: chapterUrl(ctx.client_key, "overview"),
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
  };
};

function labelFor(name: string): string {
  switch (name) {
    case "journeys": return "Daily journey volume";
    case "orders": return "Daily order volume";
    case "revenue": return "Daily revenue";
    default: return name;
  }
}
