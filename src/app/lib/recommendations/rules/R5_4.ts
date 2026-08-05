// R5.4 — Lapsed cohort opportunity. (Theme: Customer Quality)
//
// Built fresh (Observations R3 had no runner). Known buyers whose LAST purchase
// was 90–365 days ago — quiet but recoverable, and already identified. A warm
// win-back audience. Reads last-purchase-per-customer from the canonical_v1
// snapshot via chapter_reporting.rec_r3_lapsed_cohort. The RPC gates at >= 20
// total buyers and >= 10 lapsed, so a returned row always fires; severity scales
// with the lapsed share.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function money(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}

export const R5_4: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("rec_r3_lapsed_cohort", {
      p_client_key: ctx.client_key,
      p_now: ctx.data_window_end.toISOString(),
    });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : null) as
    | { lapsed_n: number; total_buyers: number; lapsed_share: number; lapsed_value: number }
    | undefined;
  if (!row) return null; // gated out (< 20 buyers or < 10 lapsed)

  const share = Number(row.lapsed_share);
  const sharePct = Math.round(share * 100);
  const lapsedValue = Number(row.lapsed_value ?? 0);
  const severity = share >= 0.30 ? "high" : share >= 0.15 ? "medium" : "low";
  const ordinal = share >= 0.30 ? 3 : share >= 0.15 ? 2 : 1;
  const band = share >= 0.30 ? "lapsed-30-plus" : share >= 0.15 ? "lapsed-15-30" : "lapsed-under-15";
  const confidence: "strong" | "moderate" | "early_signal" =
    row.lapsed_n >= 50 ? "strong" : row.lapsed_n >= 20 ? "moderate" : "early_signal";

  return {
    rule_id: "R5.4",
    fired: true,
    subject_key: null,
    data: {
      lapsed_n: row.lapsed_n,
      lapsed_share_pct: sharePct,
      lapsed_value: money(lapsedValue),
      total_buyers: row.total_buyers,
    },
    dedup_bucket: { band },
    severity_ordinal: ordinal,
    evidence: [
      {
        source: "Customer Journeys",
        fact: `${row.lapsed_n} buyers (${sharePct}% of ${row.total_buyers}) last purchased 3–12 months ago · ${money(lapsedValue)} prior value`,
        deeplink: chapterUrl(ctx.client_key, "journeys"),
      },
    ],
    confidence,
    severity_weight: severity,
    action_type: "strategic_prompting",
  };
};
