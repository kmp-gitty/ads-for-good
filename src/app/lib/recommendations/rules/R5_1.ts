// R5.1 — Channel ROAS vs customer quality mismatch.
//
// Stance: "A channel's short-term ROAS understates (or overstates) the
// quality of customers it acquires." (Theme: Customer Quality & LTV)
//
// CAPABILITY-GATED: requires per-channel spend data + first-purchase ROAS to
// compare against LTV signals. No spend data ingested today across active
// clients.
//
// The seed row in chapter_recommendations.rules is INSERTed with
// enabled = false so the cron skips it. Re-enable once spend ingest lands
// (Google Ads / Meta / TikTok ads APIs OR operator CSV upload).

import type { RuleEvaluator, RuleEvaluationResult } from "../types";

export const R5_1: RuleEvaluator = async (_ctx): Promise<RuleEvaluationResult | null> => {
  return null;
};
