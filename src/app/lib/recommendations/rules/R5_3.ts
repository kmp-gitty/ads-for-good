// R5.3 — Repeat-purchaser source concentration.
//
// Stance: "One channel is disproportionately producing repeat customers —
// it's a retention engine, not just acquisition." (Theme: Customer Quality)
//
// Trigger conditions (per spec):
//   - Channel's share of touches in repeat-customer chapters ≥2x its share
//     in first-purchase chapters
//   - Channel has appeared in ≥30 repeat-customer chapters
//
// Reads channel_roles_overview which exposes acquisition_chapters (chapter_id
// = 0) and retention_chapters (chapter_id ≥ 1) per channel.

import { createClient } from "@supabase/supabase-js";
import type { RuleEvaluator, RuleEvaluationResult } from "../types";
import { chapterUrl } from "@/app/chapter/_lib/urls";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const MULTIPLIER_FLOOR = 2.0;
const MIN_REPEAT_CHAPTERS = 30;

export const R5_3: RuleEvaluator = async (ctx): Promise<RuleEvaluationResult | null> => {
  const { data: roles, error } = await supabase
    .schema("chapter_reporting")
    .rpc("channel_roles_overview", {
      p_client_key: ctx.client_key,
      p_start_ts: ctx.data_window_start.toISOString(),
      p_end_ts: ctx.data_window_end.toISOString(),
    });
  if (error || !roles) return null;

  const rows = roles as Array<Record<string, unknown>>;
  const totalAcq = rows.reduce((s, r) => s + Number(r.acquisition_chapters ?? 0), 0);
  const totalRet = rows.reduce((s, r) => s + Number(r.retention_chapters ?? 0), 0);
  if (totalAcq === 0 || totalRet === 0) return null;

  type Row = {
    channel: string;
    first_purchase_share: number;
    repeat_share: number;
    repeat_chapters: number;
    multiplier: number;
  };

  const candidates: Row[] = [];
  for (const r of rows) {
    const acq = Number(r.acquisition_chapters ?? 0);
    const ret = Number(r.retention_chapters ?? 0);
    if (ret < MIN_REPEAT_CHAPTERS) continue;
    const firstPurchaseShare = acq / totalAcq;
    const repeatShare = ret / totalRet;
    if (firstPurchaseShare === 0) continue;
    const multiplier = repeatShare / firstPurchaseShare;
    if (multiplier < MULTIPLIER_FLOOR) continue;
    candidates.push({
      channel: String(r.channel),
      first_purchase_share: firstPurchaseShare,
      repeat_share: repeatShare,
      repeat_chapters: ret,
      multiplier,
    });
  }
  if (candidates.length === 0) return null;

  // Best: highest multiplier among qualifying channels.
  const best = candidates.sort((a, b) => b.multiplier - a.multiplier)[0];

  const confidence: "strong" | "moderate" | "early_signal" =
    best.multiplier >= 2.5 && best.repeat_chapters >= 50 ? "strong" :
    best.multiplier >= 2.0 && best.repeat_chapters >= 30 ? "moderate" : "early_signal";

  const fpPct = Math.round(best.first_purchase_share * 100);
  const repPct = Math.round(best.repeat_share * 100);

  return {
    rule_id: "R5.3",
    fired: true,
    subject_key: best.channel,
    data: {
      channel: titleCase(best.channel),
      first_purchase_share: fpPct,
      repeat_share: repPct,
      multiplier: best.multiplier.toFixed(1),
    },
    evidence: [
      {
        source: "Channel Roles",
        fact: `${titleCase(best.channel)}: ${repPct}% of repeat-purchase chapters vs ${fpPct}% of first-purchase chapters`,
        deeplink: chapterUrl(ctx.client_key, "channels"),
      },
      {
        source: "Customer Journeys",
        fact: `${best.repeat_chapters} repeat-customer chapters touched this period`,
        deeplink: chapterUrl(ctx.client_key, "journeys"),
      },
      {
        source: "Path Patterns",
        fact: `${best.multiplier.toFixed(1)}x concentration in returning-customer activity`,
        deeplink: chapterUrl(ctx.client_key, "paths"),
      },
    ],
    confidence,
    severity_weight: "medium",
    action_type: "analytical",
  };
};

function titleCase(s: string): string {
  return s.replace(/(^|\s)\w/g, m => m.toUpperCase());
}
