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
// The stored click id + platform are captured now for a future per-platform
// server-side conversion relay (Google Ads API / Meta CAPI / TikTok Events /
// etc. — the book-now redirect will read them), but the only CONSUMER wired
// today is the pixel's identity alias + entry-channel stamp.

import { NextResponse } from "next/server";
import { apexCookieDomain } from "./identity";

// Short-lived: entry context is only relevant for the landing that immediately
// follows the click. 60 min comfortably covers ad→land→browse→book while
// guarding against a stale cookie being consumed on an unrelated later visit.
const ENTRY_TTL_SECONDS = 60 * 60;

// Known ad-network click identifiers → platform, across every channel Chapter
// recognizes (the redirect already extracts these into partner_ids). Drives
// both the entry trigger and the click id we stash for a future per-platform
// conversion relay. Order = match priority (one click carries one platform's id
// in practice; Google's three are listed first).
const CLICK_ID_PARAMS: ReadonlyArray<readonly [string, string]> = [
  ["gclid", "google"],
  ["gbraid", "google"],   // iOS app→web
  ["wbraid", "google"],   // iOS web→web
  ["fbclid", "meta"],
  ["ttclid", "tiktok"],
  ["msclkid", "microsoft"],
  ["rdt_cid", "reddit"],
];

export type EntryContext = {
  identityKey: string;   // prefixed `anonymous_id:<uuid>` — matches ?chid shape
  journeyId: string;
  slug: string;
  clickId?: string | null;      // the ad-network click id, whatever channel
  clickPlatform?: string | null; // google / meta / tiktok / microsoft / reddit
  clickKind?: string | null;    // exact param: gclid / gbraid / wbraid / fbclid / ...
  utmSource?: string | null;
};

// True when the click carries inbound attribution from ANY ad channel (a known
// click id) or a tagged campaign (utm_source) — the signal that this is an
// entry worth relaying, vs a plain exit redirect. Channel-agnostic: a bare
// fbclid / ttclid / msclkid / rdt_cid link triggers it even without utm.
export function hasInboundAttribution(query: Record<string, string>): boolean {
  if (query.utm_source) return true;
  return CLICK_ID_PARAMS.some(([param]) => query[param]);
}

// The strongest available click id + its platform + its exact kind (the param
// name — gclid/gbraid/wbraid/fbclid/...), across every ad channel. Returns null
// when none present (e.g. a utm-only campaign link — still an entry, just no
// click id to relay). The kind lets the Google Ads feed place gclid vs gbraid vs
// wbraid in their distinct columns.
export function pickClickId(query: Record<string, string>): { id: string; platform: string; kind: string } | null {
  for (const [param, platform] of CLICK_ID_PARAMS) {
    if (query[param]) return { id: query[param], platform, kind: param };
  }
  return null;
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
  if (ctx.clickId) payload.g = ctx.clickId;
  if (ctx.clickPlatform) payload.gt = ctx.clickPlatform;
  if (ctx.clickKind) payload.gk = ctx.clickKind;
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
