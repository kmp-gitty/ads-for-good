// R1.3 — Identity stitching coverage gap.
//
// Stance: "A material share of journeys is failing to stitch to canonical
// identity; downstream attribution is incomplete." (Theme: Data Integrity)
//
// Trigger conditions (per spec):
//   - Stitching rate <40% in current period, OR
//   - Stitching rate dropped ≥3pt vs trailing 4-week average
//
// Stitching = share of identified journeys whose anonymous_id resolves to a
// canonical identity (i.e. journey was cross-stitched, not just minted a new
// anonymous_id). We approximate via journey_resolved_v1 — non-bot journeys
// with event_count > 1 and a canonical_identity_key are "stitched"; others
// are loose. This is the same dashboard-canonical filter used elsewhere.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const FLOOR_THRESHOLD = 0.40; // 40%
const DROP_THRESHOLD_PT = 3;

export const R1_3: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const end = ctx.data_window_end;

  const current = await stitchingRateFor(ctx.client_key, new Date(end.getTime() - 4 * oneWeekMs), end);
  if (current === null) return null;

  const trailingRates: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const wEnd = new Date(end.getTime() - i * 4 * oneWeekMs);
    const wStart = new Date(wEnd.getTime() - 4 * oneWeekMs);
    const r = await stitchingRateFor(ctx.client_key, wStart, wEnd);
    if (r !== null) trailingRates.push(r);
  }

  if (trailingRates.length === 0) return null;
  const trailingAvg = trailingRates.reduce((s, n) => s + n, 0) / trailingRates.length;

  const belowFloor = current < FLOOR_THRESHOLD;
  const droppedPt = (trailingAvg - current) * 100;
  const droppedMeaningfully = droppedPt >= DROP_THRESHOLD_PT;

  if (!belowFloor && !droppedMeaningfully) return null;

  const currentPct = Math.round(current * 100);
  const priorPct = Math.round(trailingAvg * 100);
  const ptChange = Math.round(droppedPt);

  // Confidence: both conditions met = strong; one = moderate; just crossing = early
  const confidence: "strong" | "moderate" | "early_signal" =
    belowFloor && droppedMeaningfully ? "strong" :
    (belowFloor && current < FLOOR_THRESHOLD - 0.05) || droppedPt >= DROP_THRESHOLD_PT + 2 ? "moderate" :
    "early_signal";

  // Direction-aware floor_or_drop_clause matches spec template.
  const floorOrDropClause = belowFloor
    ? `below the healthy floor of ${Math.round(FLOOR_THRESHOLD * 100)}%`
    : `a ${ptChange}pt drop from the trailing average`;

  return {
    rule_id: "R1.3",
    fired: true,
    subject_key: null,
    data: {
      stitching_share: currentPct,
      floor_or_drop_clause: floorOrDropClause,
      prior_rate: priorPct,
      pt_change: ptChange,
    },
    evidence: [
      {
        source: "Raw Performance",
        fact: `Stitching coverage: ${currentPct}% of journeys resolved to canonical identity`,
        deeplink: "/chapter/raw",
      },
      {
        source: "Customer Journeys",
        fact: `Trailing 16-week average: ${priorPct}%${belowFloor ? " — current below 40% floor" : ""}`,
        deeplink: "/chapter/journeys",
      },
    ],
    confidence,
    severity_weight: "high",
    action_type: "mechanical",
  };
};

async function stitchingRateFor(
  client_key: string,
  start: Date,
  end: Date,
): Promise<number | null> {
  // Total non-bot journeys vs subset with multi-event activity (proxy for
  // stitched). canonical_identity_key on journey_resolved_v1 is always
  // populated when bot_class indicates a real human signal.
  const total = await supabase
    .schema("chapter_reporting")
    .from("journey_resolved_v1")
    .select("*", { count: "exact", head: true })
    .eq("client_key", client_key)
    .gte("entry_ts", start.toISOString())
    .lt("entry_ts", end.toISOString());

  const stitched = await supabase
    .schema("chapter_reporting")
    .from("journey_resolved_v1")
    .select("*", { count: "exact", head: true })
    .eq("client_key", client_key)
    .in("bot_class", ["human_likely", "suspect"])
    .gt("event_count", 1)
    .gte("entry_ts", start.toISOString())
    .lt("entry_ts", end.toISOString());

  if (total.error || stitched.error) return null;
  if (!total.count || total.count === 0) return null;
  return (stitched.count ?? 0) / total.count;
}
