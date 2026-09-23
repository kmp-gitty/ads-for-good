import { NextRequest, NextResponse } from "next/server";
import { POST as pixelPost } from "@/app/api/pixel/route";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";

function safeClientKey(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

// W1: the pixel may POST either today's single-event body or a batch
// ({ client_key, ..., events: [...] }). Every per-event heuristic below has to
// look at an EVENT, not the envelope — a batch envelope carries no event_name
// and no page_url, so reading the envelope directly would classify 100% of
// batches as bots and silently discard them with a 200 { ok: true }. Returning
// the first event keeps the existing single-event behaviour byte-identical.
function representativeEvent(payload: any): any {
  if (payload && Array.isArray(payload.events) && payload.events.length) {
    return payload.events[0];
  }
  return payload;
}

function isBot(payload: any, req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") || "";

  // 1. Known bot user agents
  if (/bot|crawl|spider|headless|curl|wget/i.test(ua)) return true;

  // 2. Missing browser basics
  const hasUA = !!ua;
  const hasLang = !!req.headers.get("accept-language");

  if (!hasUA || !hasLang) return true;

  const ev = representativeEvent(payload);

  // 3. Suspicious event patterns
  if (!ev?.event_name) return true;

  // 4. No page context (bots often skip this)
  if (!ev?.page_url && !ev?.page_path) return true;

  return false;
}

const ipHits = new Map<string, number[]>();

function isRateLimited(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";

  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxHits = 60;

  const existing = ipHits.get(ip) || [];
  const recent = existing.filter((t) => now - t < windowMs);

  recent.push(now);
  ipHits.set(ip, recent);

  return recent.length > maxHits;
}

function getIp(req: NextRequest): string {
    return (
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"
    );
  }

  // CORS: shared helper at @/app/lib/auth/cors — onboard new clients by editing
  // CHAPTER_ALLOWED_ORIGINS there, applies to all browser-facing routes.

  export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, { status: 200, headers: corsPreflightHeaders(req) });
  }
  
  export async function POST(req: NextRequest) {
    let body: any = null;

    try {
      body = await req.json();
    } catch {
      return withCors(req,
        NextResponse.json({ error: "invalid_json" }, { status: 400 })
      );
    }

    if (isBot(body, req)) {
      return withCors(req,NextResponse.json({ ok: true, ignored: "bot" }));
    }

    // Scan EVERY event in a batch — `utm` / `props` are per-event, so reading
    // only the envelope would let internal traffic through in batched mode.
    const internalCandidates: any[] =
      body && Array.isArray(body.events) && body.events.length ? body.events : [body];
    const isInternal =
      body?.email?.includes("@ads4good.com") ||
      internalCandidates.some(
        (e: any) =>
          e?.email?.includes("@ads4good.com") ||
          e?.utm?.utm_source === "internal" ||
          e?.props?.is_internal === true,
      );

  if (isInternal) {
    return withCors(req,NextResponse.json({ ok: true, ignored: "internal" }));
  }
  
    const client_key = safeClientKey(body?.client_key);
    if (!client_key) {
      return withCors(req,
        NextResponse.json({ error: "missing_client_key" }, { status: 400 })
      );
    }

    if (isRateLimited(req)) {
      return withCors(req,NextResponse.json({ ok: true, ignored: "rate_limited" }));
    }
  
    const ip = getIp(req);
  
    // Batch-aware: a batch envelope has no top-level event_name. Require a
    // usable event_name on the representative event instead, so the
    // single-event contract is unchanged and a batch is not 400'd outright.
    const gateEvent = representativeEvent(body);
    if (!gateEvent?.event_name || typeof gateEvent.event_name !== "string") {
      return withCors(req,
        NextResponse.json({ error: "missing_event_name" }, { status: 400 })
      );
    }
  
    const ua = req.headers.get("user-agent") || "";
    if (!ua) {
      return withCors(req,
        NextResponse.json({ error: "missing_user_agent" }, { status: 400 })
      );
    }
  
    const headers = new Headers(req.headers);
    headers.set("x-chapter-client-key", client_key);
    headers.set("x-chapter-ip", ip);
  
    const forwarded = new NextRequest(req.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  
    const res = await pixelPost(forwarded);
    return withCors(req,res);
    
  }