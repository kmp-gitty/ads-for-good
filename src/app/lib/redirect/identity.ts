// Identity + journey cookie management for the redirect endpoint.
//
// On every /r/... hit we ensure two cookies exist on the response:
//   chapter_journey   — uuid scoped to a single browser-session journey
//   chapter_identity  — long-lived anonymous_id for the visitor
//
// If incoming cookies exist, we reuse them (so the click stitches to any
// pre-existing pixel-tracked session). Otherwise we mint fresh uuids. Same
// cookie names that pixel.js writes — by design, so the redirect's click and
// any subsequent pixel events share one journey/identity.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const JOURNEY_COOKIE = "chapter_journey";
const IDENTITY_COOKIE = "chapter_identity";

// Journey: browser-session scoped (~ 24h with rolling renewal on each event).
// Matches the lifespan the pixel uses.
const JOURNEY_TTL_DAYS = 1;
// Identity: long-lived anonymous_id stable across visits.
const IDENTITY_TTL_DAYS = 365;

export type ResolvedIdentity = {
  journeyId: string;
  identityKey: string;        // `anonymous_id:<uuid>` or `email_sha256:<hash>` etc.
  isNewJourney: boolean;
  isNewIdentity: boolean;
};

function uuid(): string {
  return crypto.randomUUID();
}

export function resolveIdentity(req: NextRequest): ResolvedIdentity {
  const incomingJourney = req.cookies.get(JOURNEY_COOKIE)?.value;
  const incomingIdentity = req.cookies.get(IDENTITY_COOKIE)?.value;

  const journeyId = incomingJourney || uuid();
  const identityKey = incomingIdentity || `anonymous_id:${uuid()}`;

  return {
    journeyId,
    identityKey,
    isNewJourney: !incomingJourney,
    isNewIdentity: !incomingIdentity,
  };
}

// Attach Set-Cookie headers to a NextResponse. The redirect endpoint typically
// returns a 302 — Set-Cookie is preserved by browsers across redirects.
export function applyIdentityCookies(
  res: NextResponse,
  resolved: ResolvedIdentity,
  hostname: string
): NextResponse {
  // Cookie domain: leading dot so the cookie is visible across subdomains of
  // the redirect host. For ads4good.com → ".ads4good.com". For a future
  // dedicated redirect domain (e.g. ".chptr.link") → ".chptr.link". Skip the
  // dot for localhost since browsers reject domain attribute on localhost.
  const domain = hostname === "localhost" || hostname.startsWith("127.")
    ? undefined
    : `.${hostname.replace(/^www\./, "")}`;

  res.cookies.set(JOURNEY_COOKIE, resolved.journeyId, {
    domain,
    path: "/",
    maxAge: JOURNEY_TTL_DAYS * 24 * 3600,
    sameSite: "lax",
    secure: true,
    httpOnly: false, // pixel.js needs to read this
  });

  res.cookies.set(IDENTITY_COOKIE, resolved.identityKey, {
    domain,
    path: "/",
    maxAge: IDENTITY_TTL_DAYS * 24 * 3600,
    sameSite: "lax",
    secure: true,
    httpOnly: false, // pixel.js needs to read this
  });

  return res;
}
