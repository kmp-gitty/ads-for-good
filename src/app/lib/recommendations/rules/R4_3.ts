// R4.3 — Single-touch close rate shifting.
//
// Stance: "The share of conversions closing on a single touchpoint is
// shifting; the meaning of 'warm audience' is changing." (Theme: Lifecycle)
//
// Trigger conditions (per spec):
//   - Single-touch close share shifted ≥10pt vs trailing 8-week average
//   - Sustained 2+ periods
//
// Bidirectional — fires whether share went up or down. Action template
// branches on direction.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const SHIFT_THRESHOLD_PT = 10;
const PERIOD_WEEKS = 2;
const REQUIRED_PERIODS = 2;

export const R4_3: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const end = ctx.data_window_end;
  const shares: number[] = [];

  for (let i = 0; i < 5; i++) {
    const wEnd = new Date(end.getTime() - i * PERIOD_WEEKS * oneWeekMs);
    const wStart = new Date(wEnd.getTime() - PERIOD_WEEKS * oneWeekMs);
    const s = await singleTouchShareFor(ctx.client_key, wStart, wEnd);
    if (s !== null) shares.push(s);
  }
  if (shares.length < REQUIRED_PERIODS + 1) return null;

  const current = shares[0];
  const trailing = shares.slice(1);
  const trailingMean = trailing.reduce((s, n) => s + n, 0) / trailing.length;
  const shiftPt = (current - trailingMean) * 100;
  if (Math.abs(shiftPt) < SHIFT_THRESHOLD_PT) return null;

  const direction: "increase" | "decrease" = shiftPt > 0 ? "increase" : "decrease";

  // Consistency: at least 2 periods (current + prior) move in same direction
  // relative to trailing mean.
  const priorShiftPt = (shares[1] - trailingMean) * 100;
  const sustained =
    (direction === "increase" && priorShiftPt >= SHIFT_THRESHOLD_PT / 2) ||
    (direction === "decrease" && priorShiftPt <= -SHIFT_THRESHOLD_PT / 2);
  if (!sustained) return null;

  const confidence: "strong" | "moderate" | "early_signal" =
    Math.abs(shiftPt) >= 15 ? "strong" :
    Math.abs(shiftPt) >= 12 ? "moderate" : "early_signal";

  const currentPct = Math.round(current * 100);
  const priorPct = Math.round(trailingMean * 100);

  const directionClause = direction === "increase"
    ? "the business is leaning more on warm, ready-to-buy traffic"
    : "more customers are taking multi-touch paths, and last-touch attribution is becoming less informative";
  const directionAction = direction === "increase"
    ? "Worth investigating: which channels are producing the additional single-touch closes? If it's returning customers via direct or email, the change is healthy. If it's new sources gaming a single touchpoint, attribution may be hiding other contributions."
    : "Worth investigating: as multi-touch increases, last-touch attribution becomes less reliable. Consider weighting toward first-touch or linear models in budget conversations until the new path shape stabilizes.";

  return {
    rule_id: "R4.3",
    fired: true,
    subject_key: null,
    data: {
      prior_share: priorPct,
      current_share: currentPct,
      direction_clause: directionClause,
      direction_specific_context_paragraph: directionClause,
      shift_pt: Math.abs(Math.round(shiftPt)),
      direction,
    },
    evidence: [
      {
        source: "Lifecycle Overview",
        fact: `Single-touch close share: ${currentPct}% (current 2w) vs ${priorPct}% (trailing 8w)`,
        deeplink: chapterUrl(ctx.client_key, "overview"),
      },
      {
        source: "Observations",
        fact: `Shift sustained across last 2+ periods`,
        deeplink: chapterUrl(ctx.client_key, "observations"),
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
    action_override: directionAction,
  };
};

async function singleTouchShareFor(
  client_key: string,
  start: Date,
  end: Date,
): Promise<number | null> {
  // Single-touch = chapters where channel_path has exactly one segment.
  // Approximate: array_length(channel_path, 1) = 1 in canonical_v1.
  const { data, error } = await supabase
    .schema("chapter_attribution")
    .from("chapter_channel_paths_canonical_v1_snapshot")
    .select("channel_path")
    .eq("client_key", client_key)
    .gte("boundary_ts", start.toISOString())
    .lt("boundary_ts", end.toISOString());
  if (error || !data || data.length === 0) return null;

  let total = 0;
  let singleTouch = 0;
  for (const r of data) {
    const path = (r as { channel_path?: string }).channel_path;
    if (!path) continue;
    total += 1;
    if (path.split(" → ").length === 1) singleTouch += 1;
  }
  if (total === 0) return null;
  return singleTouch / total;
}
