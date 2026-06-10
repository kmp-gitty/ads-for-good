// Consent gate for the Tier 1 redirect endpoint.
//
// Policy: always-on, no toggle.
// Consent enforcement is not a tunable behavior — it matches the same contract
// /api/chapter/collect already honors. If a client legitimately doesn't need
// consent enforcement (B2B, internal tooling), the right knob is "default
// state = opt_in for this client" at the config layer, NOT "ignore consent."
//
// Source of truth: a `chapter_consent` cookie scoped to the redirect domain
// (e.g. `.ads4good.com`). Values: `opt_in` / `opt_out` / absent.
//
// Default policy when the cookie is absent: collect (= opt_in). This is the
// industry-standard US default. EU-strict mode (collect ONLY when explicitly
// opt_in) is a future per-client config knob — see `applyConsentPolicy` below.
//
// Cross-domain caveat: the consent cookie is set on the redirect's apex,
// NOT on the destination storefront's apex. If a visitor opts out on
// eosfabrics.com but never on ads4good.com, the redirect doesn't see it
// until/unless a /api/consent-sync endpoint propagates the choice across
// apexes. That sync is a follow-on; not in scope here.
//
// What "blocked" means in this module:
//   - Skip the click_logger insert (no row written to pixel_events)
//   - Skip applyIdentityCookies (no new identifiers issued; existing cookies
//     are NOT cleared — that's the consent banner's job, not ours)
// Reading from identity_canon / segments for rule evaluation is NOT skipped:
// the visitor opted out of FUTURE collection, not out of being routed by
// existing context. Routing is the service they're asking for by clicking.

import type { NextRequest } from "next/server";

const CONSENT_COOKIE = "chapter_consent";

export type ConsentState = "opt_in" | "opt_out" | "unknown";

export type ConsentDecision = {
  state: ConsentState;
  allowCollection: boolean;
};

export function readConsentState(req: NextRequest): ConsentState {
  const cookie = req.cookies.get(CONSENT_COOKIE)?.value;
  if (cookie === "opt_out") return "opt_out";
  if (cookie === "opt_in") return "opt_in";
  return "unknown";
}

// applyConsentPolicy turns a raw consent state into a collection decision.
// `defaultWhenUnknown` is the per-client knob: US clients default to "opt_in"
// (collect unless explicit opt-out); EU-strict clients default to "opt_out"
// (collect only on explicit opt-in). For v1 every client uses the US default;
// per-client overrides land when first EU client onboards.
export function applyConsentPolicy(
  state: ConsentState,
  defaultWhenUnknown: "opt_in" | "opt_out" = "opt_in",
): ConsentDecision {
  if (state === "opt_out") return { state, allowCollection: false };
  if (state === "opt_in") return { state, allowCollection: true };
  return { state, allowCollection: defaultWhenUnknown === "opt_in" };
}
