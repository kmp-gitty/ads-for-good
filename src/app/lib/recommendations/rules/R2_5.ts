// R2.5 — Single-touch new-customer acquisition. (Theme: Channel Value)
//
// Ported from Observations A4. The channel with the highest share of one-touch
// first-ever conversions. Double-edged: either exceptionally efficient cold
// acquisition worth leaning into (the "decisive acquisition" signal — e.g. an
// SEO/email channel that closes new customers same-session), or missing
// pre-identification touches (pixel/stitching gaps) inflating the number.
// Reads new-customer chapters (chapter_id = 0) over the last 4 weeks via
// chapter_reporting.rec_a4_single_touch.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function titleCase(s: string): string {
  return s.replace(/[()]/g, "").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const R2_5: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("rec_a4_single_touch", {
      p_client_key: ctx.client_key,
      p_now: ctx.data_window_end.toISOString(),
    });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : null) as
    | { channel: string; single_count: number; total_n: number; single_share: number; total_new: number; thin_share: number | null }
    | undefined;
  if (!row) return null; // gated out (< 20 new / < 10 per channel / < 40% single-touch)

  const share = Number(row.single_share);
  const sharePct = Math.round(share * 100);
  const channelName = titleCase(row.channel);

  // Coverage-gap guard: when a large share of the "single-touch" closes are thin
  // (<=2 events), the single-touch is likely an artifact of missing pre-conversion
  // browsing (a pixel/stitching gap — e.g. a cross-domain booking flow), NOT
  // decisive cold acquisition. Downgrade + caveat rather than flag a strong signal.
  const thinShare = row.thin_share == null ? null : Number(row.thin_share);
  const coverageGap = thinShare != null && thinShare >= 0.30;

  let severity: "high" | "medium" | "low" = share >= 0.70 ? "high" : share >= 0.55 ? "medium" : "low";
  let ordinal = share >= 0.70 ? 3 : share >= 0.55 ? 2 : 1;
  const band = share >= 0.70 ? "single-70-plus" : share >= 0.55 ? "single-55-70" : "single-40-55";
  let confidence: "strong" | "moderate" | "early_signal" =
    row.total_n >= 30 ? "strong" : row.total_n >= 15 ? "moderate" : "early_signal";

  const evidence = [
    {
      source: "Path Patterns",
      fact: `${sharePct}% of new customers via ${channelName} converted single-touch (${row.single_count} of ${row.total_n}, last 4 weeks)`,
      deeplink: chapterUrl(ctx.client_key, "paths"),
    },
  ];

  if (coverageGap) {
    severity = "low";
    ordinal = 1;
    confidence = "early_signal";
    evidence.push({
      source: "Raw Performance",
      fact: `Caveat: ${Math.round(thinShare! * 100)}% of these single-touch closes are thin sessions (≤2 events) — pre-conversion browsing is likely not being captured (a pixel/stitching gap), so read this as a coverage issue to fix, not proven cold acquisition`,
      deeplink: chapterUrl(ctx.client_key, "raw"),
    });
  }

  return {
    rule_id: "R2.5",
    fired: true,
    subject_key: row.channel,
    data: {
      channel: channelName,
      single_share_pct: sharePct,
      single_count: row.single_count,
      total_n: row.total_n,
      thin_share_pct: thinShare == null ? null : Math.round(thinShare * 100),
      coverage_gap_suspected: coverageGap,
    },
    dedup_bucket: { band, coverage_gap: coverageGap },
    severity_ordinal: ordinal,
    evidence,
    confidence,
    severity_weight: severity,
    action_type: "strategic_prompting",
  };
};
