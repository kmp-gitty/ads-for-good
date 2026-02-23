import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function getClientSecret(clientKey: string): string | null {
  const json = process.env.AFG_CLIENT_SECRETS_JSON;
  if (!json) return null;
  try {
    const map = JSON.parse(json) as Record<string, string>;
    return map[clientKey] ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clientKey = String(payload?.client_key ?? "").trim();
  if (!clientKey) {
    return NextResponse.json({ error: "missing_client_key" }, { status: 400 });
  }

  const secret = getClientSecret(clientKey);
  if (!secret) {
    return NextResponse.json({ error: "unknown_client" }, { status: 401 });
  }

  const sig = (req.headers.get("x-afg-signature") || "").trim();
  const expected = hmacSha256Hex(secret, rawBody);

  const ok =
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

  if (!ok) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  return NextResponse.json({ status: "ok", verified: true }, { status: 200 });
}