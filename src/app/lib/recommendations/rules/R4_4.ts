// R4.4 — Step-level funnel drop. (Theme: Lifecycle Health)
//
// Ported from Observations C2, then redesigned: the original page_view →
// add_to_cart step was bot-polluted (page_view distinct-counts include bots that
// never add to cart) AND cost 116s over raw pixel_events. Dropped it — the
// actionable funnel is cart abandonment: add_to_cart → view_cart → purchase, all
// human-ish, low-volume steps that run live in <1s (no snapshot needed). Returns
// the worst-dropping step transition (current 4 weeks vs prior 4 weeks) via
// chapter_reporting.rec_c2_funnel_drop; gated at >= 30 identities at the from-step
// in both windows.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function stepLabel(step: string): string {
  switch (step) {
    case "add_to_cart": return "add-to-cart";
    case "view_cart":   return "cart view";
    case "purchase":    return "purchase";
    default:            return step.replace(/_/g, " ");
  }
}

export const R4_4: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("rec_c2_funnel_drop", {
      p_client_key: ctx.client_key,
      p_now: ctx.data_window_end.toISOString(),
    });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : null) as
    | { from_step: string; to_step: string; curr_n_from: number; curr_n_to: number;
        curr_rate: number; prior_rate: number; abs_drop_pp: number; rel_drop_pct: number | null }
    | undefined;
  if (!row || row.rel_drop_pct == null) return null; // gated out / no qualifying drop

  const absPp = Number(row.abs_drop_pp);
  const relPct = Number(row.rel_drop_pct);
  const fromLabel = stepLabel(row.from_step);
  const toLabel = stepLabel(row.to_step);
  const currRatePct = (Number(row.curr_rate) * 100).toFixed(1);
  const priorRatePct = (Number(row.prior_rate) * 100).toFixed(1);

  // Observations C2 severity bands.
  const severity = absPp >= 10 || relPct >= 30 ? "high" : absPp >= 5 || relPct >= 15 ? "medium" : "low";
  const ordinal = severity === "high" ? 3 : severity === "medium" ? 2 : 1;
  const band = `sev-${severity}`;
  const confidence: "strong" | "moderate" | "early_signal" =
    row.curr_n_from >= 100 ? "strong" : row.curr_n_from >= 50 ? "moderate" : "early_signal";

  return {
    rule_id: "R4.4",
    fired: true,
    subject_key: `${row.from_step}_to_${row.to_step}`,
    data: {
      from_label: fromLabel,
      to_label: toLabel,
      curr_rate_pct: currRatePct,
      prior_rate_pct: priorRatePct,
      abs_drop_pp: Math.round(absPp * 10) / 10,
      rel_drop_pct: Math.round(relPct),
    },
    dedup_bucket: { band, transition: `${row.from_step}_to_${row.to_step}` },
    severity_ordinal: ordinal,
    evidence: [
      {
        source: "Raw Performance",
        fact: `${fromLabel} → ${toLabel}: ${currRatePct}% now vs ${priorRatePct}% prior 4w (${row.curr_n_to} of ${row.curr_n_from})`,
        deeplink: chapterUrl(ctx.client_key, "raw"),
      },
    ],
    confidence,
    severity_weight: severity,
    action_type: "mechanical",
  };
};
