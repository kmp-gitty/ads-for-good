// R1.3 — Identity stitching coverage dropped vs the client's own baseline.
//
// Stance: "Your journey-stitching coverage has fallen meaningfully below where
// it normally runs — recent attribution is more fragmented than usual."
// (Theme: Data Integrity)
//
// REC2 — the trigger is now RELATIVE to the client's own trailing 3-month
// baseline, not an arbitrary absolute 40% floor. Different businesses have
// different structural stitch ceilings (a Shopify store that collects email at
// checkout vs a booking site), so a one-size floor mislabels a client whose
// healthy norm is 25%. A chronically-low-but-stable rate is that client's
// structural norm, not a recommendation; we only fire when coverage DROPS from
// where it has been. (An outlier-vs-peers check is the future surprise-scanner.)
//
// Trigger: current 4-week stitch rate is below the trailing 3-month baseline by
//   - >= 3 percentage points, OR
//   - >= 15% relative.
//
// Stitching = share of non-bot journeys with multi-event activity that resolve
// to a canonical identity, approximated via journey_resolved_v1 (same
// dashboard-canonical filter used elsewhere).

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const DROP_THRESHOLD_PT = 3;    // absolute percentage-point drop
const DROP_THRESHOLD_REL = 15;  // OR relative % drop vs baseline

export const R1_3: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const end = ctx.data_window_end;

  // Current = last 4 weeks. Baseline = the trailing 3 months (12 weeks)
  // immediately BEFORE the current window — the client's own recent norm.
  const currentStart  = new Date(end.getTime() - 4  * oneWeekMs);
  const baselineStart = new Date(end.getTime() - 16 * oneWeekMs);
  const baselineEnd   = currentStart;

  const current  = await stitchingRateFor(ctx.client_key, currentStart, end);
  const baseline = await stitchingRateFor(ctx.client_key, baselineStart, baselineEnd);
  // No baseline (client younger than ~3 months, or no traffic) → don't fire.
  if (current === null || baseline === null) return null;

  const droppedPt     = (baseline - current) * 100;
  const droppedRelPct = baseline > 0 ? ((baseline - current) / baseline) * 100 : 0;
  const fired = droppedPt >= DROP_THRESHOLD_PT || droppedRelPct >= DROP_THRESHOLD_REL;
  if (!fired) return null;

  const currentPct = Math.round(current * 100);
  const priorPct   = Math.round(baseline * 100);
  const ptChange   = Math.max(1, Math.round(droppedPt));

  const confidence: "strong" | "moderate" | "early_signal" =
    droppedPt >= 6 || droppedRelPct >= 30 ? "strong" : "moderate";

  const floorOrDropClause =
    `down from its trailing 3-month average of ${priorPct}% (a ${ptChange}pt drop)`;

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
        fact: `Stitching coverage now: ${currentPct}% of journeys resolved to a canonical identity`,
        deeplink: chapterUrl(ctx.client_key, "raw"),
      },
      {
        source: "Customer Journeys",
        fact: `Trailing 3-month baseline: ${priorPct}% — current is a ${ptChange}pt drop`,
        deeplink: chapterUrl(ctx.client_key, "journeys"),
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
