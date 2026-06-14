// Weekly Recommendations engine cron — Mondays 06:00 UTC.
//
// For each active client:
//   For each enabled rule in chapter_recommendations.rules:
//     Run rule evaluator (pre-written SQL, parameterized by client + window)
//     If fired:
//       Look up prior finding for (client, rule, subject) → determine state
//       Render card text via Claude (or fallback template substitution)
//       Insert into findings
//   Mark prior findings as 'resolved' when this run didn't refire them
//
// Failure surfacing: any cron-level error → GChat alert. Per-rule failures are
// caught and logged but don't kill the run.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { RULE_EVALUATORS } from "@/app/lib/recommendations/rules";
import { renderRecommendationCard } from "@/app/lib/claude/render-card";
import type { RuleEvaluationResult } from "@/app/lib/recommendations/types";

export const maxDuration = 300;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const TRAILING_WINDOW_DAYS = 7;

type RuleConfig = {
  rule_id: string;
  theme: string;
  name: string;
  severity_weight: "high" | "medium" | "low";
  phrasing_template: { headline: string; story: string };
  action_template: { action: string };
  action_type: "mechanical" | "analytical" | "strategic_prompting";
  enabled: boolean;
};

type RunSummary = {
  client_key: string;
  ok: boolean;
  rules_evaluated: number;
  rules_fired: number;
  rules_skipped: number;
  api_calls: number;
  fallback_renders: number;
  error?: string;
};

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  const summaries: RunSummary[] = [];
  let topLevelError: string | null = null;

  try {
    // Active clients from client_secrets (the source-of-truth for "is this
    // client operational right now").
    const { data: clients, error: clientsErr } = await supabase
      .schema("chapter_config")
      .from("client_secrets")
      .select("client_key")
      .is("revoked_at", null);
    if (clientsErr) throw clientsErr;
    const clientKeys = Array.from(new Set((clients ?? []).map((r) => r.client_key as string)));

    // Rule config — fetched once, reused across all clients in this run.
    const { data: rules, error: rulesErr } = await supabase
      .schema("chapter_recommendations")
      .from("rules")
      .select("*")
      .eq("enabled", true);
    if (rulesErr) throw rulesErr;
    const ruleConfigs = (rules ?? []) as RuleConfig[];

    for (const clientKey of clientKeys) {
      summaries.push(await runForClient(clientKey, ruleConfigs));
    }
  } catch (err) {
    topLevelError = err instanceof Error ? err.message : String(err);
    console.error("[refresh-recommendations] top-level error:", topLevelError);
  }

  // GChat alert on any failure.
  const failures = summaries.filter((s) => !s.ok);
  if (topLevelError || failures.length > 0) {
    const lines: string[] = [];
    lines.push(`🚨 *Recommendations cron — issues*`);
    if (topLevelError) lines.push(`  ❌ top-level: ${topLevelError.slice(0, 200)}`);
    for (const f of failures) {
      lines.push(`  ❌ \`${f.client_key}\` — ${(f.error ?? "unknown").slice(0, 160)}`);
    }
    try {
      await postToGChat({ text: lines.join("\n") });
    } catch (err) {
      console.error("[refresh-recommendations] GChat post failed:", err);
    }
  }

  return NextResponse.json({
    ok: !topLevelError && failures.length === 0,
    summaries,
    top_level_error: topLevelError,
  });
}

async function runForClient(clientKey: string, ruleConfigs: RuleConfig[]): Promise<RunSummary> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - TRAILING_WINDOW_DAYS * 24 * 3600 * 1000);

  // Open run row
  const { data: runRow, error: runErr } = await supabase
    .schema("chapter_recommendations")
    .from("runs")
    .insert({ client_key: clientKey, status: "running" })
    .select("id")
    .single();
  if (runErr || !runRow) {
    return {
      client_key: clientKey, ok: false,
      rules_evaluated: 0, rules_fired: 0, rules_skipped: 0, api_calls: 0, fallback_renders: 0,
      error: runErr?.message ?? "could not open run row",
    };
  }
  const runId = runRow.id as string;

  let evaluated = 0;
  let fired = 0;
  let skipped = 0;
  let apiCalls = 0;
  let fallbacks = 0;
  const firedKeys = new Set<string>(); // (rule_id::subject_key) — used to resolve stale findings

  try {
    for (const ruleCfg of ruleConfigs) {
      const evaluator = RULE_EVALUATORS[ruleCfg.rule_id];
      if (!evaluator) {
        skipped++;
        continue;
      }
      evaluated++;
      try {
        const result = await evaluator({
          client_key: clientKey,
          data_window_start: windowStart,
          data_window_end: windowEnd,
        });
        if (!result || !result.fired) continue;

        // Dedup: look up the most recent non-dismissed finding for this
        // (client, rule, subject). Determine state: new / standing / changed.
        const state = await determineState(clientKey, result);

        // Render card text via Claude.
        const rendered = await renderRecommendationCard(
          ruleCfg.phrasing_template,
          { action: result.action_override ?? ruleCfg.action_template.action },
          result.data,
        );
        if (rendered.render_method === "claude") apiCalls++;
        else fallbacks++;

        const dedupKey = `${result.rule_id}::${result.subject_key ?? ""}`;
        firedKeys.add(dedupKey);

        await supabase.schema("chapter_recommendations").from("findings").insert({
          client_key: clientKey,
          rule_id: result.rule_id,
          theme: ruleCfg.theme,
          subject_key: result.subject_key,
          headline: rendered.card.headline,
          story: rendered.card.story,
          evidence: result.evidence,
          action: rendered.card.action,
          action_type: result.action_type,
          confidence: result.confidence,
          severity_weight: result.severity_weight,
          state,
          raw_metrics: result.data,
          render_method: rendered.render_method,
          data_window_start: windowStart.toISOString(),
          data_window_end: windowEnd.toISOString(),
        });
        fired++;
      } catch (err) {
        console.warn(`[refresh-recommendations] rule ${ruleCfg.rule_id} failed for ${clientKey}:`, err);
        skipped++;
      }
    }

    // Resolve stale findings — rules that fired previously but didn't fire
    // this run. Mark as 'resolved'.
    await markStaleAsResolved(clientKey, firedKeys);

    await supabase
      .schema("chapter_recommendations")
      .from("runs")
      .update({
        status: "ok",
        completed_at: new Date().toISOString(),
        rules_evaluated: evaluated,
        rules_fired: fired,
        rules_skipped: skipped,
        api_calls: apiCalls,
        fallback_renders: fallbacks,
      })
      .eq("id", runId);

    return {
      client_key: clientKey, ok: true,
      rules_evaluated: evaluated, rules_fired: fired, rules_skipped: skipped,
      api_calls: apiCalls, fallback_renders: fallbacks,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await supabase
      .schema("chapter_recommendations")
      .from("runs")
      .update({
        status: "error", completed_at: new Date().toISOString(),
        rules_evaluated: evaluated, rules_fired: fired, rules_skipped: skipped,
        api_calls: apiCalls, fallback_renders: fallbacks, error_message: errMsg,
      })
      .eq("id", runId);
    return {
      client_key: clientKey, ok: false,
      rules_evaluated: evaluated, rules_fired: fired, rules_skipped: skipped,
      api_calls: apiCalls, fallback_renders: fallbacks, error: errMsg,
    };
  }
}

// State machine for the new finding vs. the most recent prior finding.
async function determineState(
  clientKey: string,
  result: RuleEvaluationResult,
): Promise<"new" | "standing" | "changed"> {
  const { data: prior } = await supabase
    .schema("chapter_recommendations")
    .from("findings")
    .select("raw_metrics")
    .eq("client_key", clientKey)
    .eq("rule_id", result.rule_id)
    .is("dismissed_at", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Match subject_key explicitly — both nulls match, otherwise must equal.
  if (!prior) return "new";

  // Compare raw_metrics. Stringify with sorted keys for stable comparison.
  const priorMetrics = (prior as { raw_metrics?: unknown }).raw_metrics;
  if (stableStringify(priorMetrics) === stableStringify(result.data)) return "standing";
  return "changed";
}

async function markStaleAsResolved(clientKey: string, firedKeys: Set<string>): Promise<void> {
  const { data: priorFindings } = await supabase
    .schema("chapter_recommendations")
    .from("findings")
    .select("id, rule_id, subject_key, state")
    .eq("client_key", clientKey)
    .in("state", ["new", "standing", "changed"]) // active states
    .is("dismissed_at", null);

  if (!priorFindings) return;

  const toResolve = priorFindings.filter((f) => {
    const key = `${(f as { rule_id: string }).rule_id}::${(f as { subject_key: string | null }).subject_key ?? ""}`;
    return !firedKeys.has(key);
  });

  if (toResolve.length === 0) return;

  await supabase
    .schema("chapter_recommendations")
    .from("findings")
    .update({ state: "resolved" })
    .in("id", toResolve.map((f) => (f as { id: string }).id));
}

function stableStringify(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((v as Record<string, unknown>)[k])).join(",") + "}";
}
