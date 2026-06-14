// Rule registry — maps rule_id to evaluator. The cron iterates over this list
// rather than dispatching via reflection so the type system catches missing
// or misnamed rules at compile time. Adding a new rule = write the evaluator
// + add an entry here + INSERT a row into chapter_recommendations.rules.

import type { RuleEvaluator } from "../types";
import { R1_1 } from "./R1_1";
import { R2_3 } from "./R2_3";
import { R4_1 } from "./R4_1";

export const RULE_EVALUATORS: Record<string, RuleEvaluator> = {
  "R1.1": R1_1,
  "R2.3": R2_3,
  "R4.1": R4_1,
};
