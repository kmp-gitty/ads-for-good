// R1.3 — Identity-resolution coverage dropped vs the client's own baseline.
//
// Stance: "The share of your engaged traffic that we can tie to a known identity
// has fallen meaningfully below where it normally runs." (Theme: Data Integrity)
//
// FIX (Aug 6, 2026): the old metric was (non-bot multi-event journeys) / (ALL
// journeys) — the denominator had NO bot filter, so the rate equalled
// (100 − bot_share) and fired a HIGH-severity false alarm whenever bot/crawler
// traffic surged (e.g. the Aug meta-externalads spike), NOT on any real change in
// identity stitching. (The old code also assumed journey_resolved_v1 has a
// canonical_identity_key column — it doesn't — so it never actually measured
// resolution.) Now measured by chapter_reporting.rec_r1_3_stitch_coverage: the
// known-identity rate among NON-BOT ENGAGED journeys (canonical resolved via
// journeys.last_identity_key → identity_canon). Both numerator and denominator are
// non-bot-engaged, so bot volume can't move it.
//
// Only fires where identity resolution is a MATERIAL quantity (baseline ≥
// MIN_BASELINE_RATE) — a pure-anonymous ecom store whose structural identification
// is ~1% shouldn't alarm on noise. Trigger: current 4-week rate below the trailing
// 3-month baseline by ≥ 3pt OR ≥ 15% relative.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const DROP_THRESHOLD_PT = 3;      // absolute percentage-point drop
const DROP_THRESHOLD_REL = 15;    // OR relative % drop vs baseline
const MIN_BASELINE_RATE = 0.05;   // only meaningful where resolution is material (≥5%)
const MIN_ENGAGED_CURRENT = 100;  // avoid tiny-sample noise

export const R1_3: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const end = ctx.data_window_end;

  // Current = last 4 weeks. Baseline = the trailing 3 months (12 weeks)
  // immediately BEFORE the current window — the client's own recent norm.
  const currentStart  = new Date(end.getTime() - 4  * oneWeekMs);
  const baselineStart = new Date(end.getTime() - 16 * oneWeekMs);
  const baselineEnd   = currentStart;

  const cur  = await coverageFor(ctx.client_key, currentStart, end);
  const base = await coverageFor(ctx.client_key, baselineStart, baselineEnd);
  if (!cur || !base) return null;                       // young client / no traffic
  if (cur.engaged < MIN_ENGAGED_CURRENT) return null;   // too little real traffic to judge
  if (base.rate < MIN_BASELINE_RATE) return null;       // resolution isn't material for this client

  const current = cur.rate, baseline = base.rate;
  const droppedPt     = (baseline - current) * 100;
  const droppedRelPct = baseline > 0 ? ((baseline - current) / baseline) * 100 : 0;
  const fired = droppedPt >= DROP_THRESHOLD_PT || droppedRelPct >= DROP_THRESHOLD_REL;
  if (!fired) return null;

  const currentPct = Math.round(current * 100);
  const priorPct   = Math.round(baseline * 100);
  const ptChange   = Math.max(1, Math.round(droppedPt));

  const confidence: "strong" | "moderate" | "early_signal" =
    droppedPt >= 6 || droppedRelPct >= 30 ? "strong" : "moderate";

  return {
    rule_id: "R1.3",
    fired: true,
    subject_key: null,
    data: {
      known_rate_now: currentPct,
      known_rate_prior: priorPct,
      pt_change: ptChange,
      floor_or_drop_clause: `down from its trailing 3-month average of ${priorPct}% (a ${ptChange}pt drop)`,
    },
    evidence: [
      {
        source: "Customer Journeys",
        fact: `${currentPct}% of engaged journeys resolved to a known identity — down from a ${priorPct}% trailing-3-month baseline (a ${ptChange}pt drop)`,
        deeplink: chapterUrl(ctx.client_key, "journeys"),
      },
    ],
    confidence,
    severity_weight: "high",
    action_type: "mechanical",
  };
};

async function coverageFor(
  client_key: string,
  start: Date,
  end: Date,
): Promise<{ rate: number; engaged: number } | null> {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("rec_r1_3_stitch_coverage", {
      p_client_key: client_key,
      p_start_ts: start.toISOString(),
      p_end_ts: end.toISOString(),
    });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : null) as
    | { engaged: number; known_n: number; known_rate: number }
    | undefined;
  if (!row || !row.engaged) return null;
  return { rate: Number(row.known_rate ?? 0) / 100, engaged: Number(row.engaged) };
}
