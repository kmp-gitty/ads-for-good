// R1.4 — Platform-reported vs Chapter-resolved conversion discrepancy.
//
// Stance: "Platform reporting is materially over- or under-counting
// conversions vs Chapter's identity-resolved view." (Theme: Data Integrity)
//
// CAPABILITY-GATED: requires platform conversion data (Meta Pixel,
// Google Ads conversion API, TikTok Pixel reports, etc) ingested into a
// chapter_config.platform_conversions table or equivalent. None ingested
// today across active clients.
//
// The seed row in chapter_recommendations.rules is INSERTed with
// enabled = false so the cron skips it. Re-enable + populate this evaluator
// once platform-conversion ingest lands.

import type { RuleEvaluator, RuleEvaluationResult } from "../types";

export const R1_4: RuleEvaluator = async (_ctx): Promise<RuleEvaluationResult | null> => {
  // No-op until platform conversion data is ingested. The DB-level
  // `enabled = false` flag is the real gate; this is belt-and-suspenders.
  return null;
};
