// /api/consent-sync — cross-domain consent propagation for the Tier 1
// redirect apex.
//
// Problem this solves: the redirect `chapter_consent` cookie lives on the
// redirect apex (e.g. `.ads4good.com`). When a visitor updates consent on a
// destination storefront (e.g. eosfabrics.com), the redirect apex has no
// way to know about it — different cookie scope. So the next click on
// `ads4good.com/r/eos_fabrics/...` would still respect the OLD consent
// state and either log a click that should be suppressed (or vice versa).
//
// This endpoint accepts a consent state update from a storefront's banner
// and writes the `chapter_consent` cookie on the redirect apex so future
// redirects see the latest state.
//
// Two invocation styles (storefront picks one):
//
//   1. Beacon-style GET (no JS / no fetch needed):
//        <img src="https://ads4good.com/api/consent-sync?state=opt_out&client_key=eos_fabrics" />
//      Response is a 1×1 transparent GIF; cookie is set as a side effect.
//
//   2. Fetch-with-credentials POST (modern banners):
//        await fetch("https://ads4good.com/api/consent-sync", {
//          method: "POST",
//          headers: { "content-type": "application/json" },
//          credentials: "include",
//          body: JSON.stringify({ state: "opt_out", client_key: "eos_fabrics" }),
//        });
//      Response is JSON; CORS reflects the storefront origin.
//
// Cross-site cookie note: this writes a cookie on the redirect apex from a
// request that originated on the storefront. The browser treats this as a
// third-party cookie write. We set `SameSite=None; Secure` so modern
// browsers accept it where they still allow third-party cookies. Browsers
// that block third-party cookies entirely (Safari ITP, Firefox ETP strict,
// Chrome with 3P-cookies disabled) will silently drop the write — there's
// no graceful workaround for that without a server-side redirect handoff,
// which is more disruptive than the cookie-drop failure mode.

import { NextRequest, NextResponse } from "next/server";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";

const CONSENT_COOKIE = "chapter_consent";
// 365 days — same lifetime as the identity cookie set by the redirect.
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

// 1×1 transparent GIF (43 bytes). Used as the response body for beacon GETs.
const PIXEL_GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

function normalizeState(raw: string | null | undefined): "opt_in" | "opt_out" | null {
  if (raw === "opt_in" || raw === "opt_out") return raw;
  return null;
}

// Cookie domain derives from the request host (e.g. `ads4good.com`), with a
// leading dot so subdomains share the cookie. Falls back to host-only when
// the host parses oddly (e.g. localhost in dev).
function cookieDomainFor(req: NextRequest): string | undefined {
  const host = req.nextUrl.hostname;
  if (!host || host === "localhost" || host.endsWith(".local") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return undefined;
  }
  // Strip the leftmost label so the cookie is scoped to the apex+subs.
  // Example: api.ads4good.com → .ads4good.com; ads4good.com → .ads4good.com.
  const parts = host.split(".");
  if (parts.length <= 2) return `.${host}`;
  return `.${parts.slice(-2).join(".")}`;
}

function setConsentCookie(res: NextResponse, req: NextRequest, state: "opt_in" | "opt_out") {
  res.cookies.set({
    name: CONSENT_COOKIE,
    value: state,
    path: "/",
    domain: cookieDomainFor(req),
    maxAge: COOKIE_MAX_AGE_SECONDS,
    secure: true,
    sameSite: "none",
    httpOnly: false, // banner JS on the apex may want to read this back
  });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsPreflightHeaders(req) });
}

// Beacon-style GET — used via <img src="..."> from the storefront.
export async function GET(req: NextRequest) {
  const state = normalizeState(req.nextUrl.searchParams.get("state"));
  if (!state) {
    return new NextResponse("missing or invalid state", { status: 400 });
  }
  // client_key isn't currently used for routing the write (we set a single
  // cookie on the redirect apex regardless of which storefront sent it),
  // but it's required for traceability/logging in case operators audit.
  if (!req.nextUrl.searchParams.get("client_key")) {
    return new NextResponse("missing client_key", { status: 400 });
  }

  const res = new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    },
  });
  setConsentCookie(res, req, state);
  return res;
}

// Fetch-style POST — used by modern banners. Returns JSON.
export async function POST(req: NextRequest) {
  let body: { state?: string; client_key?: string };
  try {
    body = await req.json();
  } catch {
    return withCors(req, NextResponse.json({ error: "invalid_json" }, { status: 400 }));
  }

  const state = normalizeState(body.state);
  if (!state) {
    return withCors(req, NextResponse.json({ error: "invalid_state" }, { status: 400 }));
  }
  if (!body.client_key) {
    return withCors(req, NextResponse.json({ error: "missing_client_key" }, { status: 400 }));
  }

  const res = withCors(req, NextResponse.json({ ok: true, state }));
  setConsentCookie(res, req, state);
  return res;
}
