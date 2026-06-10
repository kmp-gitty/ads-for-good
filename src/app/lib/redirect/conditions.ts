// Condition evaluator. Each rule's condition_jsonb is an OBJECT whose KEYS are
// condition types and VALUES are condition parameters. ALL conditions in the
// object must match for the rule to fire (AND semantics).
//
// Examples:
//   {} — always matches (catch-all default rule)
//   { "is_returning_visitor": true } — fires on returning visitors only
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

const isNewVisitor: Evaluator = (p, ctx) => ctx.segments.is_new_visitor === Boolean(p);
const isReturningVisitor: Evaluator = (p, ctx) => ctx.segments.is_returning_visitor === Boolean(p);
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
const REGISTRY: Record<string, Evaluator> = {
  is_new_visitor: isNewVisitor,
  is_returning_visitor: isReturningVisitor,
  has_converted_ever: hasConvertedEver,
  has_converted_in_days: hasConvertedInDays,
  audience_tag: audienceTag,
  has_open_cart: hasOpenCart,
  cart_older_than_hours: cartOlderThanHours,
  day_of_week: dayOfWeek,
  hour_of_day: hourOfDay,
  date_range: dateRange,
  query_param: queryParam,
  referrer_matches: referrerMatches,
  country_in: countryIn,
  region_in: regionIn,
  device_type: deviceType,
  os: osIs,
  ab_bucket: abBucket,
};

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
    const evaluator = REGISTRY[k];
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
