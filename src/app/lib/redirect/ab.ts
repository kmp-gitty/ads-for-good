// A/B bucket assignment — deterministic + sticky given (identity_key, seed).
//
// Hash(identity_key + seed) → integer in [0, 99] → mapped to bucket name
// based on the experiment's bucket weights. Same identity_key + seed always
// produces the same bucket — no per-click DB write, no cookie write, no
// drift across devices for the same identity.
//
// Bucket weights must sum to 100. Examples:
//   { "A": 50, "B": 50 }                            — standard A/B
//   { "control": 90, "treatment": 10 }              — low-traffic test
//   { "v1": 33, "v2": 33, "v3": 34 }                — multivariate (~100)

import crypto from "crypto";
import { AbExperiment } from "./rules";

/**
 * Returns the bucket name for this identity under the given experiment.
 * Returns null if the bucket weights are malformed (don't sum to 100).
 */
export function assignBucket(
  identityKey: string,
  experiment: AbExperiment
): string | null {
  const h = crypto
    .createHash("sha256")
    .update(`${identityKey}|${experiment.seed}`)
    .digest("hex");
  // Take first 8 hex chars → 32-bit unsigned int → mod 100 for percent bucket
  const bucketPercent = parseInt(h.slice(0, 8), 16) % 100;

  let cumulative = 0;
  // Stable iteration order: sort keys so the bucket assignment doesn't shift
  // if the operator re-keys the weights JSON.
  const sortedBuckets = Object.entries(experiment.buckets).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [name, weight] of sortedBuckets) {
    cumulative += weight;
    if (bucketPercent < cumulative) {
      return name;
    }
  }

  // Weights sum to < 100 (operator misconfig); use the last bucket as fallback
  // so we never return null in production for an enabled experiment.
  const lastBucket = sortedBuckets[sortedBuckets.length - 1];
  return lastBucket ? lastBucket[0] : null;
}
