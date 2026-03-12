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

export async function POST(req: NextRequest) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const client_key = safeClientKey(body?.client_key);
  if (!client_key) {
    return NextResponse.json({ error: "missing_client_key" }, { status: 400 });
  }

  const ip = getIp(req);

  // simple request shape guard
  if (!body?.event_name || typeof body.event_name !== "string") {
    return NextResponse.json({ error: "missing_event_name" }, { status: 400 });
  }
  
  // lightweight abuse guard placeholder signal
  const ua = req.headers.get("user-agent") || "";
  if (!ua) {
    return NextResponse.json({ error: "missing_user_agent" }, { status: 400 });
  }
  
  // optional debug header for future edge rate limiting
  const headers = new Headers(req.headers);
  headers.set("x-chapter-client-key", client_key);
  headers.set("x-chapter-ip", ip);

  const forwarded = new NextRequest(req.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return pixelPost(forwarded);
}