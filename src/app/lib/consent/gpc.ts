import { NextRequest } from "next/server";

// Global Privacy Control (https://globalprivacycontrol.org/) — a browser-level
// "do not sell / share" opt-out. Brave / Firefox / DuckDuckGo (and Chrome via
// extension) send the `Sec-GPC: 1` request header and expose
// `navigator.globalPrivacyControl === true` to JS when the user has it on.
// CCPA / CPRA treat it as a valid opt-out signal.
//
// POLICY (locked): GPC is treated as opt_out UNLESS the visitor has an explicit
// opt_in (`chapter_consent=opt_in` cookie), which overrides it. Everything else
// (no signal / unknown) keeps the existing collect-when-unknown default — GPC is
// purely an ADDITIVE opt_out trigger; it does not change baseline behavior for
// non-GPC traffic.
//
// GPC is a BROWSER signal, so it only reaches browser-facing paths (the pixel
// collect, /api/identify, and the /r redirect). Server-to-server ingest
// (/api/purchase webhooks, /api/offline, CRM seeds) never carries it and is
// unaffected — purchases + explicitly-provided offline data still flow.

export function hasGpcHeader(req: NextRequest): boolean {
  return req.headers.get("sec-gpc") === "1";
}

// True when GPC is signalled AND the visitor has NOT explicitly opted in.
// Callers that already have the resolved consent state (e.g. /api/pixel folds
// payload + journey history into `effective_consent`) should instead check
// `hasGpcHeader(req) && resolvedConsent !== "opt_in"` so an opt_in from any
// source overrides GPC.
export function gpcSignalsOptOut(req: NextRequest): boolean {
  if (!hasGpcHeader(req)) return false;
  return req.cookies.get("chapter_consent")?.value !== "opt_in";
}
