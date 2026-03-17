import { NextRequest, NextResponse } from "next/server";
import { POST as pixelPost } from "@/app/api/pixel/route";

function safeClientKey(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
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
    const headers = new Headers(res.headers);
    headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  
    return new NextResponse(res.body, {
      status: res.status,
      headers,
    });
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
  
    const client_key = safeClientKey(body?.client_key);
    if (!client_key) {
      return withCors(
        NextResponse.json({ error: "missing_client_key" }, { status: 400 })
      );
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