// Multi-tenant CORS helper for browser-facing Chapter ingest routes
// (/api/chapter/collect, /api/identify, /api/consent).
//
// Reflects the Origin header back when it matches an allowed apex/www domain
// for a known client. Never returns "*" so cookies/credentials work.
// Origins that don't match get a deterministic fallback (the first allowed
// origin) — preflight will still complete, but the browser will then block
// the actual request because the response Origin doesn't match the request.

import type { NextRequest, NextResponse } from "next/server";

// Maintain this set when onboarding new clients (apex + www).
// Keep aligned with chapter_config.client_secrets / CLIENT_ROLE_MAP in
// src/app/lib/db/per-client.ts.
export const CHAPTER_ALLOWED_ORIGINS = new Set<string>([
  "https://eosfabrics.com",
  "https://www.eosfabrics.com",
  "https://projectagram.com",
  "https://www.projectagram.com",
]);

const FALLBACK_ORIGIN = "https://eosfabrics.com";

export function resolveAllowedOrigin(req: NextRequest): string {
  const origin = req.headers.get("origin");
  if (origin && CHAPTER_ALLOWED_ORIGINS.has(origin)) return origin;
  return FALLBACK_ORIGIN;
}

export function withCors(req: NextRequest, res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", resolveAllowedOrigin(req));
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export function corsPreflightHeaders(req: NextRequest): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(req),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
