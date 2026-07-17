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
// v2 candidates (deferred, need external inputs):
//   - Datacenter ASN detection (needs an IP-to-ASN data source: IPinfo,
//     ipapi.co, or hardcoded scanner IP ranges)
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

// Rate-limit configuration. Any hashed IP hitting more than
// RATE_LIMIT_MAX_CLICKS clicks within RATE_LIMIT_WINDOW_MS is flagged
// suspicious for the remainder of the window.
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_CLICKS = 3;
// Bounded to prevent unbounded memory growth on a long-running instance.
// At 5000 entries × ~32 bytes each ≈ 160KB — negligible.
const RATE_LIMIT_MAP_MAX_ENTRIES = 5000;

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
export function classifyForScannerRisk(req: NextRequest): ScannerRiskAssessment {
  const reasons: string[] = [];
  let ipHash: string | null = null;

  try {
    // 1. Known scanner UA
    const ua = req.headers.get("user-agent") || "";
    if (KNOWN_SCANNER_UAS.some((r) => r.test(ua))) {
      reasons.push("scanner_ua");
    }

    // 2. Rapid same-IP clicks
    const ip = getClientIp(req);
    if (ip) {
      ipHash = hashIp(ip);
      if (ipHash && checkRateLimit(ipHash)) {
        reasons.push("rate_limited");
      }
    }
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
  KNOWN_SCANNER_UA_PATTERNS: KNOWN_SCANNER_UAS.map((r) => r.source),
} as const;
