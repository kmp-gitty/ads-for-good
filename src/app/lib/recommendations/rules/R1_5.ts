// R1.5 — Direct first-touch creep. (Theme: Data Integrity)
//
// Ported from Observations I3. An elevated share of converting chapters whose
// FIRST touch is (direct) usually means marketing attribution signal is leaking
// — UTMs stripped, click-IDs expired, referrers lost — so real sources get
// miscredited as Direct. Reads the canonical_v1 snapshot over the last 14 days
// via chapter_reporting.rec_i3_direct_creep. Fires only when the share is
// actually elevated (> 40%); below that is normal.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const R1_5: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("rec_i3_direct_creep", {
      p_client_key: ctx.client_key,
      p_now: ctx.data_window_end.toISOString(),
    });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : null) as
    | { direct_share: number; n_direct: number; n_total: number }
    | undefined;
  if (!row) return null; // gated out (n_total < 10)

  const share = Number(row.direct_share);
  if (share <= 0.40) return null; // normal — don't fire

  const sharePct = Math.round(share * 100);
  const band = share > 0.55 ? "elevated-55-plus" : "elevated-40-55";
  const ordinal = share > 0.55 ? 2 : 1;
  const severity = share > 0.55 ? "high" : "medium";
  const confidence: "strong" | "moderate" | "early_signal" =
    share > 0.55 && row.n_total >= 30 ? "strong" :
    row.n_total >= 30 ? "moderate" : "early_signal";

  return {
    rule_id: "R1.5",
    fired: true,
    subject_key: null,
    data: {
      direct_share_pct: sharePct,
      n_direct: row.n_direct,
      n_total: row.n_total,
    },
    dedup_bucket: { band },
    severity_ordinal: ordinal,
    evidence: [
      {
        source: "Channel Roles",
        fact: `(direct) is the first touch on ${sharePct}% of converting chapters (${row.n_direct} of ${row.n_total}, last 14 days)`,
        deeplink: chapterUrl(ctx.client_key, "channels"),
      },
    ],
    confidence,
    severity_weight: severity,
    action_type: "mechanical",
  };
};
