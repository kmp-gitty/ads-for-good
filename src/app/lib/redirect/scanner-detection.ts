// Scanner + rapid-click detection for the /r/... redirect endpoint.
//
// Problem being solved: enterprise email security scanners (Proofpoint,
// Mimecast, Barracuda, Microsoft Safe Links, etc.) click every link in every
// email BEFORE the recipient opens it. If we wrap email CTAs through Chapter
// Links without filtering, each wrapped link becomes a scanner-triggered
// journey — inflating billing counts AND creating confidently-wrong identity
// resolutions (subscriber's identifier handed to the scanner's IP).
//
// v1 signals (self-contained, no external calls):
//   1. Known scanner user agents — regex-matched against a maintained list
//   2. Rapid same-IP clicks — >3 clicks in 5s from one hashed IP
//
// v1 mitigation: mark the click "suspected_scanner" and:
//   - skip identity cookie writes (don't create a durable anonymous_id)
//   - skip email-hint stitch (?rh / ?re / ?rid stitching)
//   - skip appendIdentityHandoff (don't leak identity into destination ?chid=)
//   - STILL log the click to pixel_events with the scanner tag (for observability)
//
// Downstream effect: scanner clicks show up in raw data but never contribute
// to the identity graph or attribution chain. Real human follow-up clicks
// on the same email carry a fresh browser identity (via pixel localStorage)
// and stitch cleanly.
//
// Added 2026-10-26: cloud-provider IP ranges (datacenter-ip.ts), a 60-second
// burst rule, and HTML-escaped query detection. See each below.
//
// v2 candidates (deferred):
//   - Corroborating-page_view gate (defer identity resolution until a real
//     page_view lands from the same anonymous_id within N seconds — needs
//     a pending-click state table + promotion mechanism)
//
// Serverless caveat: the rate-limit Map is per-Vercel-instance. Different
// instances have independent counters. In practice, scanner bursts hit one
// instance's warm connection pool sequentially, so per-instance visibility
// is usually enough. Upgrade to Upstash Redis for cross-instance state
// once we see scanner traffic missed by per-instance limits.

import type { NextRequest } from "next/server";
import { hashIp, getClientIp } from "@/app/lib/audit/auth";
import { datacenterProvider } from "./datacenter-ip";

// Known email-scanner user-agent patterns. Case-insensitive. Additions
// welcome — these fingerprints change over time, so treat as a live list
// (not schema).
const KNOWN_SCANNER_UAS: RegExp[] = [
  /proofpoint/i,
  /mimecast/i,
  /barracuda/i,
  /forcepoint/i,
  /symantec/i,
  /trend[\s-_]?micro/i,
  /kaspersky/i,
  /bitdefender/i,
  /messagelabs/i,
  /mimeos/i,
  /webshield/i,
  /microsoft[^)]*safe[^)]*link/i,
  // Generic "link expander" / "URL preview" strings often used by security tools
  /link-checker/i,
  /url[\s-_]?checker/i,
  /url[\s-_]?scanner/i,
  /url[\s-_]?preview/i,
];

// Social + messaging link-preview crawlers. These fetch a URL to build the
// preview card the moment a link is posted — before, and independently of,
// any human clicking it. On a wrapped social post that means one crawler
// hit per platform per post, arriving with no relationship to real traffic.
//
// Treated as scanner-class for the same reason as email scanners: they must
// not mint a durable identity, must not consume an email hint, and must not
// receive an identity handoff on the destination URL. The click is still
// logged (tagged) so we can see the crawler volume.
//
// Deliberately NOT included: search-engine crawlers (Googlebot, bingbot,
// DuckDuckBot, YandexBot, Baiduspider). Same argument applies to them and
// adding them is a one-line change — held back only because nobody has asked
// for it yet and each addition is a chance to over-match a real UA.
const SOCIAL_CRAWLER_UAS: RegExp[] = [
  /facebookexternalhit/i,
  /facebookcatalog/i,
  /\bfacebot\b/i,
  /linkedinbot/i,
  /twitterbot/i,
  /slackbot/i,                 // covers Slackbot-LinkExpanding
  /discordbot/i,
  /telegrambot/i,
  /\bwhatsapp\//i,            // UA is literally "WhatsApp/2.x"
  /pinterest(bot)?\//i,        // "Pinterest/0.2", "Pinterestbot/1.0"
  /redditbot/i,
  /applebot/i,                 // iMessage previews + Apple search
  /skypeuripreview/i,
  /vkshare/i,
  /mastodon\//i,
  /bluesky/i,
  /\bcardyb\b/i,              // Bluesky's card builder
  /embedly/i,
  /iframely/i,
];

// Datacenter-crawler fingerprints. Not email scanners and not social preview
// bots — these are generic crawlers that announce themselves through an
// implausible UA rather than a named product string.
//
// `(Lanai)` was found on ACJ (2026-10-05): two clicks from Ashburn, VA on
// identical coordinates claiming Safari 8.0.2 / OS X 10.10.1 — a 2014 browser
// — one of which carried a stray `amp` param, the fingerprint of a machine
// parsing an HTML-escaped href rather than a person clicking. Matched on the
// parenthesised form specifically so a real UA containing the word (a device
// or place name) cannot trip it.
//
// ⚠️ This list CANNOT catch the broader class. The same incident included a
//    Vietnam click claiming Chrome 153 on a Galaxy S8 — a UA indistinguishable
//    from a real one by pattern alone. That is the documented datacenter-ASN
//    blind spot: behaviourally and lexically invisible, catchable only on
//    network origin. Adding fingerprints here is worth doing and is not a
//    substitute for that signal.
const CRAWLER_UA_FINGERPRINTS: RegExp[] = [
  /\(lanai\)/i,
  // Self-identifying crawlers. "(+http..." inside a UA is the long-standing
  // convention for a well-behaved bot pointing at its own documentation —
  // Googlebot, bingbot, facebookexternalhit and most commercial crawlers all
  // do it. No real browser puts a URL in its user agent, so this is high
  // precision and, unlike a named list, it covers crawlers nobody has
  // enumerated yet. Caught `Buck/2.6.0; (+https://app.hypefactors.com/...)`
  // (Hypefactors media monitoring) on ACJ before anyone knew to look for it.
  //
  // Preceded by paren, semicolon OR space because the convention varies:
  // Hypefactors and facebookexternalhit write `(+http`, Googlebot writes
  // `; +http`. A first pass anchored on `(` alone missed Googlebot entirely —
  // caught by falsification, not by reading.
  //
  // ⚠️ THIS REVERSES A DOCUMENTED DECISION. Search crawlers were deliberately
  //    excluded from SOCIAL_CRAWLER_UAS, "held back only because nobody has
  //    asked for it yet." The evidence asked: ACJ's wrapped links are live on
  //    public pages and are being crawled globally — 14 of 18 clicks in one
  //    24h window were non-human, from 7 countries. A search crawler hitting
  //    a wrapped link mints a durable identity and receives an identity
  //    handoff on the destination, which is strictly wrong whoever the
  //    crawler belongs to.
  /[(;\s]\+https?:\/\//i,
];

// Rate-limit configuration. Any hashed IP hitting more than
// RATE_LIMIT_MAX_CLICKS clicks within RATE_LIMIT_WINDOW_MS is flagged
// suspicious for the remainder of the window.
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_CLICKS = 3;
// Bounded to prevent unbounded memory growth on a long-running instance.
// At 5000 entries × ~32 bytes each ≈ 160KB — negligible.
const RATE_LIMIT_MAP_MAX_ENTRIES = 5000;

// Burst rule (added 2026-10-26). The 3-in-5s rule above misses crawlers that
// pace themselves: on ACJ one crawler opened ~110 wrapped links in 4 minutes,
// every hour, from a fresh session each time, and kept its cookie within a
// session. Measured over 12 days of ACJ clicks: 6+ clicks inside 60 seconds
// from one browser identity or one IP flags ~7,500 crawler clicks while
// touching 19 clicks from identities with 10 or fewer clicks in total. A
// reader does not open six different sponsor links in a minute.
//
// ⚠️ It ALSO flags operator verification sessions (clicking every logo on a
//    paper to check it). That is intended: test clicks are not partner clicks.
//    They are still logged with all their fields, so a "did my test land"
//    query must not filter on suspected_scanner.
//
// Clicks before the threshold is crossed are not flagged — only the 6th onward.
const BURST_WINDOW_MS = 60_000;
const BURST_MAX_CLICKS = 5;
const burstMap = new Map<string, number[]>();

function checkBurst(key: string): boolean {
  const now = Date.now();
  const recent = (burstMap.get(key) ?? []).filter((t) => now - t < BURST_WINDOW_MS);
  recent.push(now);
  burstMap.set(key, recent);
  if (burstMap.size > RATE_LIMIT_MAP_MAX_ENTRIES) {
    for (const [k, ts] of burstMap) {
      if (!ts.length || now - ts[ts.length - 1] >= BURST_WINDOW_MS) burstMap.delete(k);
    }
    if (burstMap.size > RATE_LIMIT_MAP_MAX_ENTRIES) {
      const drop = burstMap.size - RATE_LIMIT_MAP_MAX_ENTRIES * 0.75;
      let i = 0;
      for (const k of burstMap.keys()) { if (i++ >= drop) break; burstMap.delete(k); }
    }
  }
  return recent.length > BURST_MAX_CLICKS;
}

// HTML-escaped query string: keys arrive as "amp;link", "amp;partner". A
// browser always decodes &amp; in an href before following it, so this is a
// program reading the page source and requesting the raw text. Measured on ACJ
// (Oct 15-26): 8,956 such clicks, ONE from Philadelphia, ONE whose identity
// ever clicked again, versus 714 Philadelphia clicks and 39% repeat identities
// among the clean ones. It is a crawler signature, not a broken link.
function hasEscapedQuery(req: NextRequest): boolean {
  for (const k of req.nextUrl.searchParams.keys()) {
    if (k === "amp" || k.startsWith("amp;")) return true;
  }
  return false;
}

type RateLimitEntry = { count: number; window_start: number };

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Register a click for the given IP hash and return whether this click
 * pushes the IP over the rate-limit threshold. Idempotent within its
 * effect — calling twice increments the counter twice.
 */
export function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ipHash);

  if (!entry || now - entry.window_start >= RATE_LIMIT_WINDOW_MS) {
    // Fresh window
    rateLimitMap.set(ipHash, { count: 1, window_start: now });
    maybeEvictOldEntries(now);
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_CLICKS;
}

// Evict expired + oldest entries when the map hits the cap.
function maybeEvictOldEntries(now: number): void {
  if (rateLimitMap.size < RATE_LIMIT_MAP_MAX_ENTRIES) return;

  // First pass: drop expired entries
  for (const [k, v] of rateLimitMap) {
    if (now - v.window_start >= RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(k);
    }
  }
  // If still over cap, drop oldest by window_start (arbitrary tiebreaker)
  if (rateLimitMap.size >= RATE_LIMIT_MAP_MAX_ENTRIES) {
    const entries = Array.from(rateLimitMap.entries()).sort(
      (a, b) => a[1].window_start - b[1].window_start,
    );
    const toDrop = entries.slice(0, Math.floor(RATE_LIMIT_MAP_MAX_ENTRIES / 4));
    for (const [k] of toDrop) rateLimitMap.delete(k);
  }
}

export type ScannerRiskAssessment = {
  suspicious: boolean;
  reasons: string[];
  ip_hash: string | null;
};

/**
 * Classify a click for scanner-like behavior. Returns a small object the
 * caller uses to gate identity-graph writes. Always safe — returns
 * suspicious=false on any error path.
 */
export function classifyForScannerRisk(
  req: NextRequest,
  opts: { identityKey?: string | null } = {},
): ScannerRiskAssessment {
  const reasons: string[] = [];
  let ipHash: string | null = null;

  try {
    // 1. Known scanner UA
    const ua = req.headers.get("user-agent") || "";
    if (KNOWN_SCANNER_UAS.some((r) => r.test(ua))) {
      reasons.push("scanner_ua");
    }

    // 1b. Social / messaging link-preview crawler
    if (SOCIAL_CRAWLER_UAS.some((r) => r.test(ua))) {
      reasons.push("social_crawler_ua");
    }

    // 1c. Datacenter crawler fingerprint — kept as its own reason so crawler
    // volume stays distinguishable from email-scanner volume in the audit log.
    if (CRAWLER_UA_FINGERPRINTS.some((r) => r.test(ua))) {
      reasons.push("crawler_ua");
    }

    // 1d. Query string arrived HTML-escaped (see hasEscapedQuery).
    if (hasEscapedQuery(req)) {
      reasons.push("escaped_href");
    }

    // 2. Rapid same-IP clicks
    const ip = getClientIp(req);
    if (ip) {
      ipHash = hashIp(ip);
      if (ipHash && checkRateLimit(ipHash)) {
        reasons.push("rate_limited");
      }

      // 3. Cloud provider address. Only the provider name is recorded.
      const provider = datacenterProvider(ip);
      if (provider) reasons.push(`datacenter_ip:${provider}`);
    }

    // 4. Burst: same IP or same browser identity, 6+ clicks in 60s. Both are
    //    counted every time, so either key alone can trip it.
    const ipBurst = ipHash ? checkBurst(`ip:${ipHash}`) : false;
    const idBurst = opts.identityKey ? checkBurst(`id:${opts.identityKey}`) : false;
    if (ipBurst || idBurst) reasons.push("burst");
  } catch (err) {
    // Never let classification errors break the redirect path
    console.warn("[scanner-detection] classification threw:", err);
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
    ip_hash: ipHash,
  };
}

// Exported so tests / diagnostic pages can inspect config values.
export const SCANNER_DETECTION_CONFIG = {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_CLICKS,
  BURST_WINDOW_MS,
  BURST_MAX_CLICKS,
  KNOWN_SCANNER_UA_PATTERNS: KNOWN_SCANNER_UAS.map((r) => r.source),
  SOCIAL_CRAWLER_UA_PATTERNS: SOCIAL_CRAWLER_UAS.map((r) => r.source),
} as const;
