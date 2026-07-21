// Multi-tenant CORS helper for browser-facing Chapter ingest routes
// (/api/chapter/collect, /api/identify, /api/consent, and the identity-prompt
// endpoints).
//
// Reflects the Origin header back when it matches an allowed apex/www domain
// for a known client. Never returns "*" so cookies/credentials work.
// Origins that don't match get a deterministic fallback (the first allowed
// origin) — preflight will still complete, but the browser will then block
// the actual request because the response Origin doesn't match the request.

import type { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Static seed. Existing operator clients ALWAYS pass via this set — it is
// checked first and never touches the DB, so live pixel CORS is guaranteed
// even if the database is unreachable. Only ever ADD to the allowlist from the
// DB below; a seed origin can never be removed by the dynamic layer.
export const CHAPTER_ALLOWED_ORIGINS = new Set<string>([
  "https://eosfabrics.com",
  "https://www.eosfabrics.com",
  "https://projectagram.com",
  "https://www.projectagram.com",
  "https://notsocavalier.com",
  "https://www.notsocavalier.com",
]);

const FALLBACK_ORIGIN = "https://eosfabrics.com";

// --- DB-driven origins (Phase 0C) ---
// Self-serve tenants register their storefront_domain in chapter_config.clients.
// We fold those origins into the allowlist so a new tenant's pixel works without
// a code deploy. The cache is refreshed lazily and NEVER blocks or throws into
// the request path — any failure degrades to exactly the static-seed behavior.
let _dynamicOrigins = new Set<string>();
let _lastLoad = 0;
let _loading: Promise<void> | null = null;
const DYNAMIC_TTL_MS = 5 * 60 * 1000; // 5 minutes

function domainToOrigins(domain: string): string[] {
  const d = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  if (!d) return [];
  const bare = d.replace(/^www\./, "");
  return [`https://${bare}`, `https://www.${bare}`];
}

async function refreshDynamicOrigins(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return; // no creds -> seed only

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("storefront_domain, redirect_host");
  // On error, leave the existing cache in place — the seed still covers everyone.
  if (error || !data) return;

  const next = new Set<string>();
  for (const row of data as Array<{ storefront_domain: string | null; redirect_host: string | null }>) {
    if (row.storefront_domain) {
      for (const o of domainToOrigins(row.storefront_domain)) next.add(o);
    }
    if (row.redirect_host) {
      const rh = String(row.redirect_host).trim().replace(/\/+$/, "");
      if (/^https?:\/\//i.test(rh)) next.add(rh.replace(/^http:\/\//i, "https://"));
      else if (rh) next.add(`https://${rh.toLowerCase()}`);
    }
  }
  _dynamicOrigins = next;
  _lastLoad = Date.now();
}

// Non-blocking, fire-and-forget refresh. Cannot throw into the request path.
function maybeRefresh(): void {
  if (Date.now() - _lastLoad < DYNAMIC_TTL_MS) return;
  if (_loading) return;
  _loading = refreshDynamicOrigins()
    .catch((e) => {
      console.warn("[cors] dynamic origin refresh failed:", (e as Error)?.message);
    })
    .finally(() => {
      _loading = null;
    });
}

export function resolveAllowedOrigin(req: NextRequest): string {
  const origin = req.headers.get("origin");
  if (!origin) return FALLBACK_ORIGIN;

  // Seed first — never touches the DB, guarantees existing clients keep working.
  if (CHAPTER_ALLOWED_ORIGINS.has(origin)) return origin;

  // Non-seed origin (e.g. a self-serve tenant): consult the DB-backed cache,
  // kicking off a lazy refresh if stale. Never blocks this request.
  maybeRefresh();
  if (_dynamicOrigins.has(origin)) return origin;

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
