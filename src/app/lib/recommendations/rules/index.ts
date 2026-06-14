// Rule registry — maps rule_id to evaluator. The cron iterates over this list
// rather than dispatching via reflection so the type system catches missing
// or misnamed rules at compile time. Adding a new rule = write the evaluator
// + add an entry here + INSERT a row into chapter_recommendations.rules.
//
// Capability-gated rules (R1.4 platform-vs-Chapter discrepancy, R5.1 ROAS-vs-
// LTV mismatch) are registered here as no-op stubs and seeded with
// `enabled = false` in the DB. The cron only evaluates enabled rules so the
// stubs never run; re-enable + populate the evaluator once spend / platform
// conversion ingest lands.

import type { RuleEvaluator } from "../types";
import { R1_1 } from "./R1_1";
import { R1_2 } from "./R1_2";
import { R1_3 } from "./R1_3";
import { R1_4 } from "./R1_4";
import { R2_1 } from "./R2_1";
import { R2_2 } from "./R2_2";
import { R2_3 } from "./R2_3";
import { R2_4 } from "./R2_4";
import { R3_1 } from "./R3_1";
import { R3_2 } from "./R3_2";
import { R3_3 } from "./R3_3";
import { R4_1 } from "./R4_1";
import { R4_2 } from "./R4_2";
import { R4_3 } from "./R4_3";
import { R5_1 } from "./R5_1";
import { R5_2 } from "./R5_2";
import { R5_3 } from "./R5_3";
import { R6_1 } from "./R6_1";
import { R6_2 } from "./R6_2";
import { R6_3 } from "./R6_3";

export const RULE_EVALUATORS: Record<string, RuleEvaluator> = {
  "R1.1": R1_1,
  "R1.2": R1_2,
  "R1.3": R1_3,
  "R1.4": R1_4,
  "R2.1": R2_1,
  "R2.2": R2_2,
  "R2.3": R2_3,
  "R2.4": R2_4,
  "R3.1": R3_1,
  "R3.2": R3_2,
  "R3.3": R3_3,
  "R4.1": R4_1,
  "R4.2": R4_2,
  "R4.3": R4_3,
  "R5.1": R5_1,
  "R5.2": R5_2,
  "R5.3": R5_3,
  "R6.1": R6_1,
  "R6.2": R6_2,
  "R6.3": R6_3,
};
