// R5.5 — Top-value customers cooling off. (Theme: Customer Quality)
//
// Crosses cumulative LTV tier (stature) with windowed value trajectory (momentum):
// top-tercile-by-lifetime-value customers whose spend fell >50% over the last 90
// days vs the prior 90. The urgent churn signal — a proven high-value customer is
// far more expensive to replace than to retain, and the still-recently-active
// window is when a nudge works. Distinct from R5.4 (lapsed = the broad win-back
// pool); this is specifically your BEST customers trending down. Reads the shared
// chapter_reporting.rec_r5_value_momentum over the complete buyer set (v2).

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

export const R5_5: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("rec_r5_value_momentum", {
      p_client_key: ctx.client_key,
      p_now: ctx.data_window_end.toISOString(),
    });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : null) as
    | { total_buyers: number; top_tier_n: number; cooling_n: number; cooling_ltv: number;
        cooling_silent_n: number; rising_n: number; rising_recent_value: number }
    | undefined;
  if (!row || row.cooling_n < 20) return null; // too few at-risk VIPs to act on

  const share = row.top_tier_n > 0 ? row.cooling_n / row.top_tier_n : 0;
  const severity = share >= 0.30 ? "high" : share >= 0.15 ? "medium" : "low";
  const ordinal = severity === "high" ? 3 : severity === "medium" ? 2 : 1;
  const band = `cooling-${severity}`;
  const confidence: "strong" | "moderate" | "early_signal" =
    row.cooling_n >= 50 ? "strong" : "moderate";

  return {
    rule_id: "R5.5",
    fired: true,
    subject_key: null,
    data: {
      cooling_n: row.cooling_n,
      cooling_ltv: money(Number(row.cooling_ltv ?? 0)),
      cooling_silent_n: row.cooling_silent_n,
    },
    dedup_bucket: { band },
    severity_ordinal: ordinal,
    evidence: [
      {
        source: "Customer Journeys",
        fact: `${row.cooling_n} top-tier customers spending <50% of their prior 90d · ${row.cooling_silent_n} fully silent · ${money(Number(row.cooling_ltv ?? 0))} lifetime value`,
        deeplink: chapterUrl(ctx.client_key, "journeys"),
      },
    ],
    confidence,
    severity_weight: severity,
    action_type: "strategic_prompting",
  };
};
