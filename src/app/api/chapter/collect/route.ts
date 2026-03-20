import { NextRequest, NextResponse } from "next/server";
import { POST as pixelPost } from "@/app/api/pixel/route";

function safeClientKey(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function isBot(payload: any, req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") || "";

  // 1. Known bot user agents
  if (/bot|crawl|spider|headless|curl|wget/i.test(ua)) return true;

  // 2. Missing browser basics
  const hasUA = !!ua;
  const hasLang = !!req.headers.get("accept-language");

  if (!hasUA || !hasLang) return true;

  // 3. Suspicious event patterns
  if (!payload?.event_name) return true;

  // 4. No page context (bots often skip this)
  if (!payload?.page_url && !payload?.page_path) return true;

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

  const ALLOWED_ORIGIN = "https://eosfabrics.com";

  function withCors(res: NextResponse) {
    res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return res;
  }
  
  export async function OPTIONS() {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  
  export async function POST(req: NextRequest) {
    let body: any = null;

    try {
      body = await req.json();
    } catch {
      return withCors(
        NextResponse.json({ error: "invalid_json" }, { status: 400 })
      );
    }

    if (isBot(body, req)) {
      return NextResponse.json({ ok: true, ignored: "bot" });
    }

    const isInternal =
    body?.email?.includes("@ads4good.com") ||
    body?.utm?.utm_source === "internal" ||
    body?.props?.is_internal === true;

  if (isInternal) {
    return NextResponse.json({ ok: true, ignored: "internal" });
  }
  
    const client_key = safeClientKey(body?.client_key);
    if (!client_key) {
      return withCors(
        NextResponse.json({ error: "missing_client_key" }, { status: 400 })
      );
    }

    if (isRateLimited(req)) {
      return NextResponse.json({ ok: true, ignored: "rate_limited" });
    }
  
    const ip = getIp(req);
  
    if (!body?.event_name || typeof body.event_name !== "string") {
      return withCors(
        NextResponse.json({ error: "missing_event_name" }, { status: 400 })
      );
    }
  
    const ua = req.headers.get("user-agent") || "";
    if (!ua) {
      return withCors(
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
    return withCors(res);
    
  }