// Weekly Recommendations engine cron — Mondays 06:00 UTC.
//
// For each active client:
//   For each enabled rule in chapter_recommendations.rules:
//     Run rule evaluator (pre-written SQL, parameterized by client + window)
//     If fired:
//       Compute severity bucket (rule-declared or coarse default)
//       Render card text via Claude (or fallback template substitution)
//       writeFindingRow:
//         if active finding exists for (client, rule, subject):
//           UPDATE in place — new state via bucket comparison, append to history
//         else:
//           INSERT new row — set prior_finding_id if a resolved row exists
//   Mark stale findings as 'resolved' when this run didn't refire them
//   (compared by last_observed_at vs run_started_at)
//
// Part 2 (write-time dedup) — one row per active finding for a (client, rule,
// subject), updated in place as long as the finding is active. Substance
// change is detected via severity-band bucketing (escalation-asymmetric —
// escalation triggers state='changed', de-escalation while still triggering
// is state='standing' with confidence attenuation captured on the row).
// See CLAUDE.md "Recommendations dedup Part 2" for the design rationale.
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
    // Supabase errors are plain objects (not Error instances), so `String(err)`
    // gives "[object Object]". JSON-stringify when the err isn't an Error to
    // surface the actual `code`/`details`/`hint`/`message`. Always log the raw
    // value too — Vercel's logger expands objects so the trace is intact.
    topLevelError = err instanceof Error
      ? err.message
      : (err && typeof err === "object" ? safeStringify(err) : String(err));
    console.error("[refresh-recommendations] top-level error (raw):", err);
    console.error("[refresh-recommendations] top-level error (str):", topLevelError);
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
  let inserted = 0;
  let updated = 0;
  // Timestamp captured once at run start — used as the "touched this run"
  // marker for the stale-findings sweep. Any active finding whose
  // last_observed_at < run_started_at didn't fire this run → resolved.
  const runStartedAt = new Date();

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

        // Compute severity bucket. Rule-declared takes precedence; coarse
        // default handles unimplemented rules.
        const bucket = result.dedup_bucket !== undefined && result.severity_ordinal !== undefined
          ? { bucket: result.dedup_bucket, ordinal: result.severity_ordinal }
          : defaultBucket(result.data);

        // Render card text via Claude.
        const rendered = await renderRecommendationCard(
          ruleCfg.phrasing_template,
          { action: result.action_override ?? ruleCfg.action_template.action },
          result.data,
        );
        if (rendered.render_method === "claude") apiCalls++;
        else fallbacks++;

        const writeResult = await writeFindingRow({
          clientKey,
          ruleCfg,
          result,
          bucket,
          rendered,
          runStartedAt,
          windowStart,
          windowEnd,
        });
        if (writeResult.action === "inserted") inserted++;
        else updated++;
        fired++;
      } catch (err) {
        console.warn(`[refresh-recommendations] rule ${ruleCfg.rule_id} failed for ${clientKey}:`, err);
        skipped++;
      }
    }

    // Resolve stale findings — active findings whose last_observed_at is
    // older than this run's start didn't fire this run → resolved.
    await markStaleAsResolved(clientKey, runStartedAt);

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

    console.log(`[refresh-recommendations] ${clientKey}: ${fired} fired (${inserted} inserted, ${updated} updated)`);

    return {
      client_key: clientKey, ok: true,
      rules_evaluated: evaluated, rules_fired: fired, rules_skipped: skipped,
      api_calls: apiCalls, fallback_renders: fallbacks,
    };
  } catch (err) {
    const errMsg = err instanceof Error
      ? err.message
      : (err && typeof err === "object" ? safeStringify(err) : String(err));
    console.error(`[refresh-recommendations] per-client error for ${clientKey} (raw):`, err);
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

// Part 2 write-time dedup helpers.

type FindingState = "new" | "standing" | "changed" | "resolved";
type Bucket = { bucket: Record<string, unknown>; ordinal: number };

type ActiveFinding = {
  id: string;
  state: FindingState;
  dedup_bucket: Record<string, unknown> | null;
  dedup_ordinal: number | null;
  confidence: string;
  raw_metrics: Record<string, unknown> | null;
  last_observed_at: string;
  first_observed_at: string;
  run_count: number;
  history: unknown[] | null;
};

type WriteFindingArgs = {
  clientKey: string;
  ruleCfg: RuleConfig;
  result: RuleEvaluationResult;
  bucket: Bucket;
  rendered: { render_method: "claude" | "fallback"; card: { headline: string; story: string; action: string } };
  runStartedAt: Date;
  windowStart: Date;
  windowEnd: Date;
};

// One row per active finding for a (client, rule, subject). If an active row
// exists, update it in place (state via bucket comparison, append prior
// observation to history). Otherwise insert a new row and set prior_finding_id
// if a prior resolved row exists for the same (rule, subject).
async function writeFindingRow(
  args: WriteFindingArgs,
): Promise<{ action: "inserted" | "updated"; state: FindingState; findingId: string }> {
  const { clientKey, ruleCfg, result, bucket, rendered, runStartedAt, windowStart, windowEnd } = args;

  const active = await lookupActiveFinding(clientKey, result.rule_id, result.subject_key);

  if (active) {
    // Update path: determine state via bucket comparison.
    const priorBucket = active.dedup_bucket ?? {};
    const priorOrdinal = active.dedup_ordinal ?? 0;

    let newState: FindingState;
    if (stableStringify(priorBucket) === stableStringify(bucket.bucket)) {
      newState = "standing";
    } else if (bucket.ordinal > priorOrdinal) {
      newState = "changed";
    } else {
      // De-escalation while still triggering — attenuation captured by
      // confidence transition, state stays standing.
      newState = "standing";
    }

    const priorSnapshot = {
      observed_at: active.last_observed_at,
      confidence: active.confidence,
      raw_metrics: active.raw_metrics,
      dedup_bucket: priorBucket,
      dedup_ordinal: priorOrdinal,
      state_transition_to: active.state,
    };
    const priorHistory: unknown[] = Array.isArray(active.history) ? active.history : [];
    const newHistory = [...priorHistory, priorSnapshot].slice(-20);

    const { error: updateErr } = await supabase
      .schema("chapter_recommendations")
      .from("findings")
      .update({
        state: newState,
        confidence: result.confidence,
        severity_weight: result.severity_weight,
        action_type: result.action_type,
        raw_metrics: result.data,
        dedup_bucket: bucket.bucket,
        dedup_ordinal: bucket.ordinal,
        last_observed_at: runStartedAt.toISOString(),
        run_count: active.run_count + 1,
        history: newHistory,
        headline: rendered.card.headline,
        story: rendered.card.story,
        action: rendered.card.action,
        evidence: result.evidence,
        render_method: rendered.render_method,
        data_window_end: windowEnd.toISOString(),
      })
      .eq("id", active.id);

    if (updateErr) throw updateErr;

    return { action: "updated", state: newState, findingId: active.id };
  }

  // Insert path — look up the most recent resolved finding to set prior_finding_id.
  const priorResolvedId = await lookupPriorResolvedFinding(clientKey, result.rule_id, result.subject_key);
  const nowIso = runStartedAt.toISOString();

  const { data: insertedRow, error: insertErr } = await supabase
    .schema("chapter_recommendations")
    .from("findings")
    .insert({
      client_key: clientKey,
      rule_id: result.rule_id,
      theme: ruleCfg.theme,
      subject_key: result.subject_key,
      state: "new",
      confidence: result.confidence,
      severity_weight: result.severity_weight,
      action_type: result.action_type,
      raw_metrics: result.data,
      dedup_bucket: bucket.bucket,
      dedup_ordinal: bucket.ordinal,
      evidence: result.evidence,
      headline: rendered.card.headline,
      story: rendered.card.story,
      action: rendered.card.action,
      render_method: rendered.render_method,
      generated_at: nowIso,
      first_observed_at: nowIso,
      last_observed_at: nowIso,
      run_count: 1,
      history: [],
      prior_finding_id: priorResolvedId,
      data_window_start: windowStart.toISOString(),
      data_window_end: windowEnd.toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !insertedRow) throw insertErr ?? new Error("insert returned no row");

  return { action: "inserted", state: "new", findingId: insertedRow.id as string };
}

async function lookupActiveFinding(
  clientKey: string,
  ruleId: string,
  subjectKey: string | null,
): Promise<ActiveFinding | null> {
  let q = supabase
    .schema("chapter_recommendations")
    .from("findings")
    .select("id, state, dedup_bucket, dedup_ordinal, confidence, raw_metrics, last_observed_at, first_observed_at, run_count, history")
    .eq("client_key", clientKey)
    .eq("rule_id", ruleId)
    .neq("state", "resolved")     // Fix for the resolved-lookup bug — never treat a resolved row as prior
    .is("dismissed_at", null);
  q = subjectKey === null ? q.is("subject_key", null) : q.eq("subject_key", subjectKey);
  const { data } = await q.order("last_observed_at", { ascending: false }).limit(1).maybeSingle();
  return (data as ActiveFinding | null) ?? null;
}

async function lookupPriorResolvedFinding(
  clientKey: string,
  ruleId: string,
  subjectKey: string | null,
): Promise<string | null> {
  let q = supabase
    .schema("chapter_recommendations")
    .from("findings")
    .select("id")
    .eq("client_key", clientKey)
    .eq("rule_id", ruleId)
    .eq("state", "resolved")
    .is("dismissed_at", null);
  q = subjectKey === null ? q.is("subject_key", null) : q.eq("subject_key", subjectKey);
  const { data } = await q.order("generated_at", { ascending: false }).limit(1).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

// Coarse default bucket for rules that don't declare their own. Looks for a
// primary numeric metric in a conventional order + quartile-buckets it.
// Rules with compound or trend-shape metrics should override with an explicit
// dedup_bucket + severity_ordinal on their RuleEvaluationResult return.
function defaultBucket(data: Record<string, unknown>): Bucket {
  const candidates = ["pct_change", "bot_share", "stitching_share", "current_share_pct", "score"];
  let primaryValue: number | null = null;
  let primaryKey: string | null = null;

  for (const key of candidates) {
    const v = data[key];
    if (typeof v === "number") {
      primaryValue = v;
      primaryKey = key;
      break;
    }
    if (typeof v === "string") {
      const parsed = parseFloat(v);
      if (!isNaN(parsed)) {
        primaryValue = parsed;
        primaryKey = key;
        break;
      }
    }
  }

  if (primaryValue === null) {
    // Rule fired without a numeric primary metric — one bucket while active,
    // so it stays 'standing' after the first observation.
    return { bucket: { band: "unmatched" }, ordinal: 1 };
  }

  if (primaryValue < 25)  return { bucket: { primary_key: primaryKey, band: "q1-0-25" }, ordinal: 1 };
  if (primaryValue < 50)  return { bucket: { primary_key: primaryKey, band: "q2-25-50" }, ordinal: 2 };
  if (primaryValue < 100) return { bucket: { primary_key: primaryKey, band: "q3-50-100" }, ordinal: 3 };
  return { bucket: { primary_key: primaryKey, band: "q4-100-plus" }, ordinal: 4 };
}

async function markStaleAsResolved(clientKey: string, runStartedAt: Date): Promise<void> {
  // Any active finding whose last_observed_at is older than this run's start
  // wasn't touched by this run → the rule stopped firing for that (rule, subject).
  // Transition to state='resolved'.
  const { error } = await supabase
    .schema("chapter_recommendations")
    .from("findings")
    .update({ state: "resolved" })
    .eq("client_key", clientKey)
    .neq("state", "resolved")
    .is("dismissed_at", null)
    .lt("last_observed_at", runStartedAt.toISOString());

  if (error) {
    console.warn(`[refresh-recommendations] markStaleAsResolved failed for ${clientKey}:`, error);
  }
}

// JSON.stringify with a tolerant fallback for circular refs or BigInts.
function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function stableStringify(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((v as Record<string, unknown>)[k])).join(",") + "}";
}
