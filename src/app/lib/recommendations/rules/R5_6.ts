// R5.6 — Customers accelerating. (Theme: Customer Quality)
//
// The positive mirror of R5.5. Existing customers whose spend rose >=50% over the
// last 90 days vs the prior 90 — they're heating up. The mid-value ones are
// emerging VIPs, and catching a customer on the way up is the cheapest path to a
// high-value relationship. An opportunity signal (low severity — an upside to lean
// into, not a problem). Reads the shared chapter_reporting.rec_r5_value_momentum.

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

export const R5_6: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("rec_r5_value_momentum", {
      p_client_key: ctx.client_key,
      p_now: ctx.data_window_end.toISOString(),
    });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : null) as
    | { total_buyers: number; rising_n: number; rising_recent_value: number }
    | undefined;
  if (!row || row.rising_n < 20) return null; // too few accelerating to act on

  // Coarse band on the cohort size (for dedup / escalation). Positive signal, so
  // severity stays low — it's an opportunity to lean into, not a problem to fix.
  const band = row.rising_n >= 100 ? "rising-large" : row.rising_n >= 50 ? "rising-med" : "rising-small";
  const ordinal = row.rising_n >= 100 ? 3 : row.rising_n >= 50 ? 2 : 1;
  const confidence: "strong" | "moderate" | "early_signal" =
    row.rising_n >= 50 ? "strong" : "moderate";

  return {
    rule_id: "R5.6",
    fired: true,
    subject_key: null,
    data: {
      rising_n: row.rising_n,
      rising_recent_value: money(Number(row.rising_recent_value ?? 0)),
    },
    dedup_bucket: { band },
    severity_ordinal: ordinal,
    evidence: [
      {
        source: "Customer Journeys",
        fact: `${row.rising_n} existing customers up 50%+ in the last 90 days · ${money(Number(row.rising_recent_value ?? 0))} recent spend`,
        deeplink: chapterUrl(ctx.client_key, "journeys"),
      },
    ],
    confidence,
    severity_weight: "low",
    action_type: "strategic_prompting",
  };
};
