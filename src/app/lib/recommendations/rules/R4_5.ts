// R4.5 — Repeat-purchase tempo shift. (Theme: Lifecycle Health)
//
// Built fresh (Observations R2 had no runner). Median days between a customer's
// consecutive purchases, current 4 weeks vs prior 4 weeks. A LENGTHENING gap is
// an early retention signal — customers taking longer to come back; a SHORTENING
// gap means they're returning faster. Reads consecutive-chapter gaps from the
// canonical_v1 snapshot via chapter_reporting.rec_r2_repeat_tempo. Fires on a
// >= 15% relative shift in either direction (>= 10 repeat purchases per window).

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const R4_5: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("rec_r2_repeat_tempo", {
      p_client_key: ctx.client_key,
      p_now: ctx.data_window_end.toISOString(),
    });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : null) as
    | { curr_median_days: number; prior_median_days: number; curr_n: number; prior_n: number;
        abs_shift_days: number; rel_shift_pct: number | null; direction: string }
    | undefined;
  if (!row || row.rel_shift_pct == null) return null; // gated out

  const relShift = Number(row.rel_shift_pct);            // signed: + = lengthening
  const mag = Math.abs(relShift);
  if (mag < 15) return null;                             // within normal drift

  const lengthening = row.direction === "lengthening";
  const currMed = Number(row.curr_median_days);
  const priorMed = Number(row.prior_median_days);
  const severity = mag >= 30 ? "high" : mag >= 20 ? "medium" : "low";
  const ordinal = mag >= 30 ? 3 : mag >= 20 ? 2 : 1;
  const band = mag >= 30 ? "shift-30-plus" : mag >= 20 ? "shift-20-30" : "shift-15-20";
  const confidence: "strong" | "moderate" | "early_signal" =
    Math.min(row.curr_n, row.prior_n) >= 30 ? "strong" : "moderate";

  // Lengthening is the retention concern; shortening is a positive signal.
  const actionOverride = lengthening
    ? `Repeat purchases are slowing. Consider a lifecycle nudge timed to the new ~${Math.round(currMed)}-day gap — a replenishment reminder or a light win-back before customers drift further.`
    : `Repeat purchases are accelerating — whatever is driving faster return (a recent campaign, product, or lifecycle flow) is working. Identify it and reinforce it.`;

  return {
    rule_id: "R4.5",
    fired: true,
    subject_key: null,
    data: {
      direction: row.direction,
      curr_median_days: Math.round(currMed),
      prior_median_days: Math.round(priorMed),
      shift_pct: Math.round(mag),
    },
    dedup_bucket: { band, direction: row.direction },
    severity_ordinal: ordinal,
    action_override: actionOverride,
    evidence: [
      {
        source: "Lifecycle Overview",
        fact: `Median gap between repeat purchases: ${Math.round(currMed)}d now vs ${Math.round(priorMed)}d prior 4w (${Math.round(mag)}% ${row.direction})`,
        deeplink: chapterUrl(ctx.client_key, "overview"),
      },
    ],
    confidence,
    severity_weight: lengthening ? severity : "low", // a shortening gap is good news → low severity
    action_type: "analytical",
  };
};
