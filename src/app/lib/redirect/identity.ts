// Identity + journey cookie management for the redirect endpoint.
//
// On every /r/... hit we ensure two cookies exist on the response:
//   up_journey_<client_key>  — uuid scoped to a browser-session journey
//   up_anon_<client_key>     — long-lived anonymous_id (raw uuid) for the visitor
//
// Same cookie NAMES + VALUE FORMAT that the pixel API (/api/pixel/collect)
// reads and writes, so the redirect handler on chapter.<client>.com and the
// pixel API on the same origin share ONE anonymous_id for the visitor. Cookie
// scope is the eTLD+1 apex (`.notsocavalier.com`) so the pixel running on
// `notsocavalier.com` also sees them.
//
// The cookie stores a RAW UUID (36 chars) so it matches the pixel API's
// existing shape (that route validates existingAnon against the UUID regex
// before use). Downstream code that needs the identity_key in prefixed form
// gets it via `identityKey = anonymous_id:<raw_uuid>` — that's kept in the
// ResolvedIdentity object.
//
// SameSite=None; Secure is required for the cookie to survive the pixel's
// cross-origin fetch from notsocavalier.com → chapter.notsocavalier.com. Lax
// would work for the redirect's own top-level navigation but be dropped by
// the pixel's XHR.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const IDENTITY_PREFIX = "anonymous_id:";
const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

// Journey: browser-session scoped. Matches pixel API's 30-day TTL so a
// visitor's journey persists across visits within the month.
const JOURNEY_TTL_DAYS = 30;
// Identity: long-lived anonymous_id stable across visits.
const IDENTITY_TTL_DAYS = 365;

export type ResolvedIdentity = {
  journeyId: string;
  identityKey: string;        // `anonymous_id:<uuid>` — used for click logs, alias inserts, etc.
  rawAnonymousId: string;     // The raw uuid — what actually gets stored in the cookie.
  isNewJourney: boolean;
  isNewIdentity: boolean;
};

function uuid(): string {
  return crypto.randomUUID();
}

function cookieNames(clientKey: string) {
  return {
    journey: `up_journey_${clientKey}`,
    identity: `up_anon_${clientKey}`,
  };
}

export function resolveIdentity(req: NextRequest, clientKey: string): ResolvedIdentity {
  const { journey, identity } = cookieNames(clientKey);
  const incomingJourney = req.cookies.get(journey)?.value;
  const rawAnon = req.cookies.get(identity)?.value;

  // Only accept cookie values that look like raw UUIDs — defends against
  // garbage or an old-format cookie (`anonymous_id:...`) written by earlier
  // versions of the redirect handler leaking through.
  const validJourney = incomingJourney && UUID_REGEX.test(incomingJourney) ? incomingJourney : null;
  const validRawAnon = rawAnon && UUID_REGEX.test(rawAnon) ? rawAnon : null;

  const journeyId = validJourney || uuid();
  const rawAnonymousId = validRawAnon || uuid();
  const identityKey = `${IDENTITY_PREFIX}${rawAnonymousId}`;

  return {
    journeyId,
    identityKey,
    rawAnonymousId,
    isNewJourney: !validJourney,
    isNewIdentity: !validRawAnon,
  };
}

// Attach Set-Cookie headers to a NextResponse. The redirect endpoint typically
// returns a 302 — Set-Cookie is preserved by browsers across redirects.
export function applyIdentityCookies(
  res: NextResponse,
  resolved: ResolvedIdentity,
  hostname: string,
  clientKey: string,
): NextResponse {
  const { journey, identity } = cookieNames(clientKey);

  // Cookie domain: leading dot so the cookie is visible across subdomains of
  // the redirect host. For chapter.notsocavalier.com strip the leftmost
  // subdomain to get .notsocavalier.com — that's the shared apex with the
  // storefront (where the pixel runs). Without this, redirect-side cookies
  // scope to .chapter.notsocavalier.com only, invisible to the pixel on
  // notsocavalier.com → identity fragmentation.
  const domain = (() => {
    if (hostname === "localhost" || hostname.startsWith("127.")) return undefined;
    const stripped = hostname.replace(/^www\./, "");
    const parts = stripped.split(".");
    if (parts.length <= 2) return `.${stripped}`;
    return `.${parts.slice(1).join(".")}`;
  })();

  // On localhost we can't use SameSite=None (browsers require Secure with it
  // and localhost isn't https). Fall back to Lax for dev-only.
  const isLocal = hostname === "localhost" || hostname.startsWith("127.");
  const sameSite: "lax" | "none" = isLocal ? "lax" : "none";
  const secure = !isLocal;

  res.cookies.set(journey, resolved.journeyId, {
    domain,
    path: "/",
    maxAge: JOURNEY_TTL_DAYS * 24 * 3600,
    sameSite,
    secure,
    httpOnly: false, // pixel.js needs to read this
  });

  res.cookies.set(identity, resolved.rawAnonymousId, {
    domain,
    path: "/",
    maxAge: IDENTITY_TTL_DAYS * 24 * 3600,
    sameSite,
    secure,
    httpOnly: false, // pixel.js needs to read this
  });

  return res;
}
