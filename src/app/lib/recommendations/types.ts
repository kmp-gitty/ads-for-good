// Types for the Recommendations engine. Shared across evaluators, cron,
// and rendering layer.

export type Theme =
  | "data_integrity"
  | "channel_value"
  | "channel_synergy"
  | "lifecycle_health"
  | "customer_quality"
  | "emerging_patterns";

export type Confidence = "strong" | "moderate" | "early_signal";

export type SeverityWeight = "high" | "medium" | "low";

export type ActionType = "mechanical" | "analytical" | "strategic_prompting";

export type Evidence = {
  source: string;
  fact: string;
  deeplink: string;
};

// What a rule evaluator returns.
export type RuleEvaluationResult = {
  rule_id: string;
  fired: boolean;
  // Subject this finding is about (e.g. channel name, page path, segment).
  // null for portfolio-wide findings.
  subject_key: string | null;
  // Structured data the phrasing/action templates draw from.
  data: Record<string, unknown>;
  evidence: Evidence[];
  confidence: Confidence;
  severity_weight: SeverityWeight;
  action_type: ActionType;
  // Optional override of the rule's default action template (some rules
  // produce different actions depending on direction — e.g. R4.3 increase
  // vs decrease — and want to inject custom action text).
  action_override?: string;
  // Part 2 write-time dedup: rule-declared severity band (jsonb) + monotone
  // ordinal for escalation detection. Both optional — engine falls back to
  // a coarse default when absent (see defaultBucket in the cron route).
  // Two observations with equal `dedup_bucket` values are substance-equivalent.
  // Higher `severity_ordinal` = more severe; escalation triggers state='changed'.
  dedup_bucket?: Record<string, unknown>;
  severity_ordinal?: number;
};

export type RuleContext = {
  client_key: string;
  data_window_start: Date;
  data_window_end: Date;
};

// Function signature every rule evaluator implements.
export type RuleEvaluator = (
  ctx: RuleContext,
) => Promise<RuleEvaluationResult | null>;
