// Email identifier extraction for the Tier 1 redirect endpoint.
//
// At click time we look at the inbound query string for one of three optional
// "identity hint" params. They correspond to the three flavors of solution 2
// for cross-device stitching (linking the redirect's anonymous_id directly to
// a known canonical identifier):
//
//   ?rh=<64-hex>                  Flavor #1 (free): pre-hashed email_sha256.
//                                  Use when the ESP can hash in merge tags
//                                  or the operator pre-hashes recipients at
//                                  send time. Zero PII in URL.
//
//   ?re=user@example.com          Flavor #2 (universal): plaintext email,
//                                  hashed server-side here. Used when an ESP
//                                  only exposes plaintext in merge tags.
//                                  PII transits the URL once; the redirect
//                                  hashes immediately and never logs plaintext.
//
//   ?rid=<opaque-token>           Flavor #3 (privacy-strongest): opaque ESP
//                                  per-recipient identifier (Mailchimp UNIQID,
//                                  Klaviyo person.id). Resolved to email_sha256
//                                  via chapter_config.email_engagement_events
//                                  by recipient-lookup.ts. Token is meaningless
//                                  to anyone without backend access.
//
// Precedence (highest privacy first): rh > rid > re. If multiple are present
// we take the most-private one and ignore the others.
//
// Hint params are STRIPPED from the forwarded destination URL and the click
// log so they never propagate beyond the redirect server.

import crypto from "crypto";

export type EmailHint =
  | { source: "prehashed"; email_sha256: string }
  | { source: "plaintext"; email_sha256: string }
  | { source: "token"; token: string }
  | null;

// Param names we recognize as identity hints. Anything matching is stripped
// from the forwarded URL + click log, even if we couldn't resolve it to an
// identity (PII never leaks downstream).
export const HINT_PARAM_NAMES = ["rh", "re", "rid"] as const;

const HEX_64 = /^[0-9a-f]{64}$/i;
// Liberal email shape — we only use this to discriminate ?re from ?rid, not
// to validate addresses. Anything with an @ and a dot is treated as plaintext.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hashEmail(plaintext: string): string {
  return sha256Hex(normalizeEmail(plaintext));
}

export function extractEmailHint(query: Record<string, string>): EmailHint {
  // Precedence: most-private wins.
  const rh = (query.rh || "").trim();
  if (rh && HEX_64.test(rh)) {
    return { source: "prehashed", email_sha256: rh.toLowerCase() };
  }

  const rid = (query.rid || "").trim();
  if (rid) {
    return { source: "token", token: rid };
  }

  const re = (query.re || "").trim();
  if (re && EMAIL_SHAPE.test(re)) {
    return { source: "plaintext", email_sha256: hashEmail(re) };
  }

  return null;
}

// Build a copy of `query` with all hint params removed. Used to strip PII
// before the query is logged or forwarded to the destination.
export function stripHintParams(query: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if ((HINT_PARAM_NAMES as readonly string[]).includes(k)) continue;
    cleaned[k] = v;
  }
  return cleaned;
}
