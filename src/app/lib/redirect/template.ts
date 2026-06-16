// Destination template interpolation.
//
// destination_template strings support {param} placeholders that get filled
// from a small set of computed vars + the inbound query string. URL-encoded
// before substitution so a UTM value with spaces or special chars can't
// break the resulting URL.
//
// Reserved vars (always available):
//   {identity_key}          — visitor's anonymous_id or canonical key
//   {journey_id}            — current journey uuid
//   {client_key}            — for cross-client templating in shared configs
//   {country} / {region}    — geo from Vercel headers
//   {device_type} / {os}    — UA classification
//
// Query passthrough:
//   {q:utm_source}          — pulls ?utm_source=... from the inbound URL
//                              (empty string if missing)
//
// Default destination via query:
//   ?to=<encoded-url> in the inbound URL acts as the final fallback if no
//   rule matches AND no rule's destination_template exists. Lets ESPs use
//   `track.example.com/r/x/y?to=https://example.com/landing` to keep
//   "tracking-only" mode trivial.

import { EvalContext } from "./conditions";

export function interpolateTemplate(
  template: string,
  ctx: EvalContext
): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key) => {
    if (key.startsWith("q:")) {
      const val = ctx.query[key.slice(2)] ?? "";
      // Don't URL-encode values that are already URLs — they're being used as
      // the destination base, not as a query parameter value. The Google Ads
      // pattern {q:to}?gclid={q:gclid}... relies on this: encoding the URL
      // would produce https%3A%2F%2F... which isn't a valid destination, and
      // the route would silently fall back to the bare ?to= URL, dropping
      // every other interpolated param along with it.
      if (/^https?:\/\//i.test(val)) return val;
      return encodeURIComponent(val);
    }
    switch (key) {
      case "identity_key": return encodeURIComponent(ctx.identityKey);
      case "client_key":   return encodeURIComponent(ctx.client_key);
      case "country":      return encodeURIComponent(ctx.geo.country ?? "");
      case "region":       return encodeURIComponent(ctx.geo.region ?? "");
      case "city":         return encodeURIComponent(ctx.geo.city ?? "");
      case "device_type":  return encodeURIComponent(ctx.device.device_type);
      case "os":           return encodeURIComponent(ctx.device.os);
      default:             return ""; // unknown var → empty (fail-safe)
    }
  });
}

// Validate a destination is safe to 302 to. Blocks javascript: / data: /
// other non-http schemes that browsers would honor in a redirect. Allows
// http and https only.
export function isValidDestination(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Append the identity handoff params (`chid` + `jid`) to a resolved destination
// URL so the destination's Chapter pixel can alias its anonymous_id back to
// the redirect's identity. Solution 1 of the cross-domain stitching plan.
//
// Skipped entirely when:
//   - destination is invalid (returned as-is so the caller can 404 cleanly)
//   - the template already explicitly set chid (operator override) — we don't
//     stomp explicit operator choices
//   - allowHandoff is false (consent gate denied collection — no new identifiers
//     should ride the URL)
//
// Both params are visible to the destination URL only; the redirect's own
// chapter_identity cookie is on a different apex and isn't readable there.
// The pixel uses `chid` to call /api/identify with previous_identity_key=chid,
// which inserts the alias edge.
export function appendIdentityHandoff(
  url: string,
  identityKey: string,
  journeyId: string,
  allowHandoff: boolean
): string {
  if (!allowHandoff) return url;
  if (!isValidDestination(url)) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("chid")) {
      u.searchParams.set("chid", identityKey);
    }
    if (!u.searchParams.has("jid")) {
      u.searchParams.set("jid", journeyId);
    }
    return u.toString();
  } catch {
    return url;
  }
}
