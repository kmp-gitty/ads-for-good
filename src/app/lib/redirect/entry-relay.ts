// Entry-relay cookie for the Tier 1 redirect.
//
// PROBLEM this solves (the "orphaned ad click" seam):
//   A visitor arrives via a wrapped entry link (Google Ads, email, QR, any
//   Chapter Link). The redirect appends ?chid=<identity> to the destination so
//   the storefront pixel can alias its own anon back to the redirect's identity
//   (solution 1, see template.ts). That works when the destination is the
//   storefront directly — but Google Ads routes the click through an
//   intermediary (google.com/asnc/...) that STRIPS our ?chid before the visitor
//   ever reaches the site. Result: the ad-landing identity is orphaned and the
//   paid entry can't be threaded to the on-site session.
//
// FIX: stash the same handoff context in a first-party cookie on the eTLD+1
//   apex (.notsocavalier.com). Google's intermediary can't touch a cookie on
//   the client's own registrable domain, so it survives the detour. The pixel
//   reads it on landing and aliases unconditionally (exactly like ?chid does),
//   plus stamps the session with the entry channel + click id.
//
// SCOPE: only set on redirects that carry inbound attribution (gclid / gbraid /
//   wbraid / utm_source) — i.e. real ENTRY clicks. Plain exit redirects (e.g. a
//   book-now click leaving to Square) carry none of these, so they never set it.
//
// The stored `g` (click id) is captured now for the forthcoming Google Ads
// server-side conversion relay (the book-now redirect will read it), but the
// only CONSUMER wired today is the pixel's identity alias + entry-channel stamp.

import { NextResponse } from "next/server";
import { apexCookieDomain } from "./identity";

// Short-lived: entry context is only relevant for the landing that immediately
// follows the click. 60 min comfortably covers ad→land→browse→book while
// guarding against a stale cookie being consumed on an unrelated later visit.
const ENTRY_TTL_SECONDS = 60 * 60;

export type EntryContext = {
  identityKey: string;   // prefixed `anonymous_id:<uuid>` — matches ?chid shape
  journeyId: string;
  slug: string;
  gclid?: string | null; // the strongest available Google click id
  utmSource?: string | null;
};

// True when the click carries inbound attribution — the signal that this is an
// entry worth relaying (vs a plain exit redirect).
export function hasInboundAttribution(query: Record<string, string>): boolean {
  return Boolean(query.gclid || query.gbraid || query.wbraid || query.utm_source);
}

// Prefer the strongest click id: gclid (standard) → gbraid (iOS app) → wbraid
// (iOS web). Any one is enough for the later conversion upload.
export function pickClickId(query: Record<string, string>): string | null {
  return query.gclid || query.gbraid || query.wbraid || null;
}

// Compact JSON payload. Keys are single-letter to keep the cookie small (click
// ids are long). NOTE: return raw JSON — Next's cookies.set() URL-encodes the
// value itself, so encoding here too would double-encode and the pixel's single
// decodeURIComponent would leave invalid JSON. The pixel decodes exactly once.
function encodePayload(ctx: EntryContext): string {
  const payload: Record<string, string | number> = {
    a: ctx.identityKey,
    j: ctx.journeyId,
    s: ctx.slug,
    t: Math.floor(Date.now() / 1000),
  };
  if (ctx.gclid) payload.g = ctx.gclid;
  if (ctx.utmSource) payload.u = ctx.utmSource;
  return JSON.stringify(payload);
}

// Set the entry-relay cookie on the 302 response. SameSite=Lax (not None): the
// pixel reads it via document.cookie on the storefront — same registrable
// domain — so it never rides a cross-origin request, and Lax is the
// ITP-friendlier choice for a cookie set during a cross-site entry navigation.
export function applyEntryRelayCookie(
  res: NextResponse,
  hostname: string,
  clientKey: string,
  ctx: EntryContext,
): NextResponse {
  const isLocal = hostname === "localhost" || hostname.startsWith("127.");
  res.cookies.set(`chapter_entry_${clientKey}`, encodePayload(ctx), {
    domain: apexCookieDomain(hostname),
    path: "/",
    maxAge: ENTRY_TTL_SECONDS,
    sameSite: "lax",
    secure: !isLocal,
    httpOnly: false, // pixel.js reads it on landing
  });
  return res;
}
