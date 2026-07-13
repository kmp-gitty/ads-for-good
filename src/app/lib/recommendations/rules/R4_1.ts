// R4.1 — Path length growing sustainably.
//
// Stance: "Customers are taking more touchpoints to close than before; the
// journey is becoming harder." (Theme: Customer Lifecycle Health)
//
// Trigger conditions (per spec):
//   - Median touches to close has increased ≥20% vs trailing 8-week average
//   - Trend is consistent across 3+ recent periods (not a single-week spike)
//
// Uses canonical_v1_snapshot's channel_path array_length as the touch-count
// proxy (same metric C4 + path_length_trend use).
//
// Part 2 severity bands (write-time dedup):
//   | Band              | pct_change | Ordinal | Operator meaning        |
//   | growth-20-50      | 20-49%     | 1       | Moderate consideration  |
//   | growth-50-100     | 50-99%     | 2       | High consideration      |
//   | growth-100-plus   | 100%+      | 3       | Severe / structural     |

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const GROWTH_THRESHOLD = 0.20; // 20%
const PERIOD_WEEKS = 2; // Each period = 2 weeks
const REQUIRED_PERIODS = 3;

export const R4_1: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  // Pull median touch count per 2-week period over the trailing 10 weeks.
  // Most recent 2w window vs trailing 8w median.
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const periodEnd = ctx.data_window_end;
  const periodMedians: number[] = [];

  for (let i = 0; i < 5; i++) {
    const end = new Date(periodEnd.getTime() - i * PERIOD_WEEKS * oneWeekMs);
    const start = new Date(end.getTime() - PERIOD_WEEKS * oneWeekMs);
    const m = await medianTouchesFor(ctx.client_key, start, end);
    if (m === null) continue;
    periodMedians.push(m);
  }

  if (periodMedians.length < REQUIRED_PERIODS) return null;

  // periodMedians[0] = most recent 2w, [1] = prior 2w, etc.
  const current = periodMedians[0];
  const trailing = periodMedians.slice(1);
  const trailingMean = trailing.reduce((s, n) => s + n, 0) / trailing.length;
  if (trailingMean === 0) return null;

  const growth = (current - trailingMean) / trailingMean;
  if (growth < GROWTH_THRESHOLD) {
    return { rule_id: "R4.1", fired: false, subject_key: null, data: {}, evidence: [], confidence: "early_signal", severity_weight: "medium", action_type: "analytical" };
  }

  // Consistency check: at least 3 of the most-recent periods show an
  // upward trend vs the period before.
  let consistentRises = 0;
  for (let i = 0; i < periodMedians.length - 1; i++) {
    if (periodMedians[i] > periodMedians[i + 1]) consistentRises += 1;
  }
  if (consistentRises < REQUIRED_PERIODS) {
    return { rule_id: "R4.1", fired: false, subject_key: null, data: {}, evidence: [], confidence: "early_signal", severity_weight: "medium", action_type: "analytical" };
  }

  const confidence: "strong" | "moderate" | "early_signal" =
    growth >= 0.35 && consistentRises >= 4 ? "strong" :
    growth >= 0.25 || consistentRises >= 4 ? "moderate" :
    "early_signal";

  const pctChange = Math.round(growth * 100);
  const bucket = bucketR4_1(pctChange);

  return {
    rule_id: "R4.1",
    fired: true,
    subject_key: null,
    data: {
      current_touches: current.toFixed(1),
      trailing_touches: trailingMean.toFixed(1),
      pct_change: pctChange,
      N: consistentRises,
    },
    dedup_bucket: bucket.bucket,
    severity_ordinal: bucket.ordinal,
    evidence: [
      {
        source: "Lifecycle Overview",
        fact: `Median touches to close: ${current.toFixed(1)} (current 2w) vs ${trailingMean.toFixed(1)} (prior 8w)`,
        deeplink: chapterUrl(ctx.client_key, "overview"),
      },
      {
        source: "Observations",
        fact: `Consistent upward trend across ${consistentRises + 1} of the last ${periodMedians.length} periods`,
        deeplink: chapterUrl(ctx.client_key, "observations"),
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
  };
};

function bucketR4_1(pctChange: number): { bucket: Record<string, unknown>; ordinal: number } {
  if (pctChange >= 100) return { bucket: { band: "growth-100-plus" }, ordinal: 3 };
  if (pctChange >= 50) return { bucket: { band: "growth-50-100" }, ordinal: 2 };
  return { bucket: { band: "growth-20-50" }, ordinal: 1 };
}

async function medianTouchesFor(
  client_key: string,
  start: Date,
  end: Date,
): Promise<number | null> {
  // Pull channel_path lengths in the window and compute median in JS.
  // canonical_v1 row counts are small (~hundreds per 2w for EOS), so this is fine.
  const { data, error } = await supabase
    .schema("chapter_attribution")
    .from("chapter_channel_paths_canonical_v1_snapshot")
    .select("channel_path, boundary_event_name")
    .eq("client_key", client_key)
    .gte("boundary_ts", start.toISOString())
    .lt("boundary_ts", end.toISOString())
    .not("channel_path", "is", null);

  if (error || !data || data.length === 0) return null;

  // Filter to the client's boundary event (purchase / appointment_booked / etc).
  // For simplicity at v1 we accept all boundary_event_name values in the
  // window — multi-tenant generalization of canonical_v1's filtering is a
  // separate concern. For EOS this is effectively 'purchase'.
  const lengths = data
    .map((r) => {
      const path = (r as { channel_path?: string }).channel_path;
      if (!path) return 0;
      return path.split(" → ").length;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  if (lengths.length === 0) return null;
  const mid = Math.floor(lengths.length / 2);
  return lengths.length % 2 === 0
    ? (lengths[mid - 1] + lengths[mid]) / 2
    : lengths[mid];
}
