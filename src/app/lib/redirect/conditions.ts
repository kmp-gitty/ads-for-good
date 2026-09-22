// Condition evaluator. Each rule's condition_jsonb is an OBJECT whose KEYS are
// condition types and VALUES are condition parameters. ALL conditions in the
// object must match for the rule to fire (AND semantics).
//
// Examples:
//   {} — always matches (catch-all default rule)
//   { "is_returning_visitor": true } — seen before this session (works for
//     ANONYMOUS visitors; no identity stitching required)
//   { "is_returning_visitor": { "within_days": 30 } } — seen in the last 30 days
//   { "previous_purchase": true } — has bought before (needs a KNOWN identity)
//   { "is_returning_visitor": true, "has_open_cart": true } — fires on
//     returning visitors WITH an open cart (both must be true)
//   { "country_in": ["US", "CA"], "device_type": "mobile" } — US/Canada mobile
//   { "ab_bucket": { "experiment_id": "hero_test", "bucket": "B" } } — assigned to bucket B
//
// Adding a new condition type = add an entry to the registry below. Each
// evaluator is async (some need DB lookups) and returns bool. Unknown
// condition types fail-safe (return false, log warning) so a typo can't
// match all visitors.

import { GeoContext } from "./geo";
import { DeviceContext } from "./device";
import { SegmentContext } from "./segments";
import { CartContext } from "./cart";
import { AbExperiment } from "./rules";
import { assignBucket } from "./ab";

export type EvalContext = {
  client_key: string;
  identityKey: string;
  query: Record<string, string>;   // parsed URL query params (incl. utm_*)
  referrer: string | null;
  now: Date;                        // request time
  geo: GeoContext;
  device: DeviceContext;
  segments: SegmentContext;
  cart: CartContext;
  abExperiments: Map<string, AbExperiment>;
};

type Evaluator = (param: unknown, ctx: EvalContext) => boolean;

// ─── Individual evaluators ────────────────────────────────────────────────

// VISIT-based pair — these work for ANONYMOUS visitors (no stitching needed),
// and they are exact inverses of each other.
const isNewVisitor: Evaluator = (p, ctx) => ctx.segments.is_new_visitor === Boolean(p);

// true            → seen at any point before this session
// { within_days } → seen before this session AND within the last N days
const isReturningVisitor: Evaluator = (p, ctx) => {
  if (typeof p === "boolean") return ctx.segments.is_returning_visitor === p;
  if (typeof p === "object" && p !== null) {
    const n = Number((p as { within_days?: unknown }).within_days);
    if (!Number.isFinite(n) || n <= 0) return false;
    const d = ctx.segments.days_since_previous_visit;
    return d !== null && d <= n;
  }
  return false;
};

// PURCHASE-based — needs a stitched, known canonical. Renamed from
// is_returning_visitor (Sep 17 2026): it reads canonical_v1, which holds only
// purchase chapters, so it has always meant "has bought before."
const previousPurchase: Evaluator = (p, ctx) => ctx.segments.previous_purchase === Boolean(p);
const hasConvertedEver: Evaluator = (p, ctx) => ctx.segments.has_converted_ever === Boolean(p);

const hasConvertedInDays: Evaluator = (p, ctx) => {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return false;
  const d = ctx.segments.days_since_last_conversion;
  return d !== null && d <= n;
};

const audienceTag: Evaluator = (p, ctx) => {
  if (typeof p === "string") return ctx.segments.audience_tags.includes(p);
  if (Array.isArray(p)) return p.some((t) => ctx.segments.audience_tags.includes(String(t)));
  return false;
};

const hasOpenCart: Evaluator = (p, ctx) => ctx.cart.has_open_cart === Boolean(p);
const cartOlderThanHours: Evaluator = (p, ctx) => {
  const n = Number(p);
  if (!Number.isFinite(n)) return false;
  return ctx.cart.hours_since_cart !== null && ctx.cart.hours_since_cart >= n;
};

const dayOfWeek: Evaluator = (p, ctx) => {
  // p = number 0-6 OR array of numbers (0=Sunday in JS)
  const d = ctx.now.getUTCDay();
  if (typeof p === "number") return p === d;
  if (Array.isArray(p)) return p.includes(d);
  return false;
};
const hourOfDay: Evaluator = (p, ctx) => {
  // p = { from: 0-23, to: 0-23 } UTC; supports cross-midnight (from > to)
  const h = ctx.now.getUTCHours();
  if (typeof p !== "object" || p === null) return false;
  const range = p as { from?: number; to?: number };
  if (typeof range.from !== "number" || typeof range.to !== "number") return false;
  if (range.from <= range.to) return h >= range.from && h < range.to;
  return h >= range.from || h < range.to; // cross-midnight
};
const dateRange: Evaluator = (p, ctx) => {
  // p = { from?: ISO, to?: ISO } — either bound optional
  if (typeof p !== "object" || p === null) return false;
  const r = p as { from?: string; to?: string };
  const t = ctx.now.getTime();
  if (r.from && t < new Date(r.from).getTime()) return false;
  if (r.to   && t >= new Date(r.to).getTime()) return false;
  return true;
};

const queryParam: Evaluator = (p, ctx) => {
  // p = { "utm_source": "mailchimp" } — every listed param must match
  if (typeof p !== "object" || p === null) return false;
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
    if (ctx.query[k] !== String(v)) return false;
  }
  return true;
};

const referrerMatches: Evaluator = (p, ctx) => {
  if (typeof p !== "string" || !ctx.referrer) return false;
  try {
    return new RegExp(p, "i").test(ctx.referrer);
  } catch {
    return false;
  }
};

const countryIn: Evaluator = (p, ctx) => {
  if (!ctx.geo.country) return false;
  if (typeof p === "string") return ctx.geo.country === p;
  if (Array.isArray(p)) return p.includes(ctx.geo.country);
  return false;
};
const regionIn: Evaluator = (p, ctx) => {
  if (!ctx.geo.region) return false;
  if (typeof p === "string") return ctx.geo.region === p;
  if (Array.isArray(p)) return p.includes(ctx.geo.region);
  return false;
};

const deviceType: Evaluator = (p, ctx) =>
  typeof p === "string" && ctx.device.device_type === p;
const osIs: Evaluator = (p, ctx) => {
  if (typeof p === "string") return ctx.device.os === p;
  if (Array.isArray(p)) return p.includes(ctx.device.os);
  return false;
};

const abBucket: Evaluator = (p, ctx) => {
  // p = { experiment_id: "X", bucket: "A" }
  if (typeof p !== "object" || p === null) return false;
  const cfg = p as { experiment_id?: string; bucket?: string };
  if (!cfg.experiment_id || !cfg.bucket) return false;
  const expt = ctx.abExperiments.get(cfg.experiment_id);
  if (!expt) return false;
  return assignBucket(ctx.identityKey, expt) === cfg.bucket;
};

// ─── Registry ─────────────────────────────────────────────────────────────
//
// Each entry declares BOTH the evaluator and which slice of EvalContext it
// reads. `needs` is load-bearing: the redirect route uses requiredContext()
// below to decide whether to pay for the segment / cart DB lookups at all.
//
// WHY THE DECLARATION LIVES HERE AND NOT IN A PARALLEL LIST: a gate that
// doesn't know about a newly-added condition would hand the evaluator an
// EMPTY context, and the evaluator would then compare against defaults and
// silently answer the wrong question (e.g. `previous_purchase: false` would
// MATCH a real buyer). Co-locating `needs` with `fn` means adding a condition
// forces you to declare its requirement on the same line, and TypeScript
// fails the build if you don't.
type ContextNeed = "segments" | "cart" | null;
type RegistryEntry = { fn: Evaluator; needs: ContextNeed };

const REGISTRY: Record<string, RegistryEntry> = {
  // Visit + purchase + cohort history → resolveSegments()
  is_new_visitor: { fn: isNewVisitor, needs: "segments" },
  is_returning_visitor: { fn: isReturningVisitor, needs: "segments" },
  previous_purchase: { fn: previousPurchase, needs: "segments" },
  has_converted_ever: { fn: hasConvertedEver, needs: "segments" },
  has_converted_in_days: { fn: hasConvertedInDays, needs: "segments" },
  audience_tag: { fn: audienceTag, needs: "segments" },

  // Live cart state → resolveCart()
  has_open_cart: { fn: hasOpenCart, needs: "cart" },
  cart_older_than_hours: { fn: cartOlderThanHours, needs: "cart" },

  // Everything below is answerable from the request itself (headers, query,
  // clock) or is pure computation — no database round trip.
  day_of_week: { fn: dayOfWeek, needs: null },
  hour_of_day: { fn: hourOfDay, needs: null },
  date_range: { fn: dateRange, needs: null },
  query_param: { fn: queryParam, needs: null },
  referrer_matches: { fn: referrerMatches, needs: null },
  country_in: { fn: countryIn, needs: null },
  region_in: { fn: regionIn, needs: null },
  device_type: { fn: deviceType, needs: null },
  os: { fn: osIs, needs: null },
  ab_bucket: { fn: abBucket, needs: null },
};

export type RequiredContext = { segments: boolean; cart: boolean };

/**
 * Which context slices must be resolved before this set of rules can be
 * evaluated. Call with every enabled rule's condition_jsonb for the slug.
 *
 * A catch-all rule ({}) needs nothing — evaluateConditions returns true
 * without reading ctx at all. An UNKNOWN condition key also needs nothing,
 * because evaluateConditions fails closed on it (the rule can never match),
 * so fetching context for it would be pure waste.
 */
export function requiredContext(
  conditionObjects: Array<Record<string, unknown>>
): RequiredContext {
  const out: RequiredContext = { segments: false, cart: false };
  for (const conditions of conditionObjects) {
    for (const k of Object.keys(conditions ?? {})) {
      const need = REGISTRY[k]?.needs;
      if (need === "segments") out.segments = true;
      else if (need === "cart") out.cart = true;
    }
    if (out.segments && out.cart) break; // nothing left to learn
  }
  return out;
}

/**
 * Evaluate a rule's condition_jsonb against the eval context.
 * Empty object {} → matches everything (catch-all default).
 * Unknown condition types → log warning and FAIL CLOSED (no match) so a
 * typo can't accidentally make a rule match all traffic.
 */
export function evaluateConditions(
  conditions: Record<string, unknown>,
  ctx: EvalContext
): boolean {
  const keys = Object.keys(conditions);
  if (keys.length === 0) return true;

  for (const k of keys) {
    const evaluator = REGISTRY[k]?.fn;
    if (!evaluator) {
      console.warn(`[redirect-conditions] unknown condition type: ${k}`);
      return false;
    }
    if (!evaluator(conditions[k], ctx)) return false;
  }
  return true;
}

export function listConditionTypes(): string[] {
  return Object.keys(REGISTRY).sort();
}
