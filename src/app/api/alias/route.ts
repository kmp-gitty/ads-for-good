import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecrets } from "@/app/lib/auth/client-secrets";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";

const ENDPOINT = "/api/alias";

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function safeString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ipHash = hashIp(getClientIp(req));
  const ua = req.headers.get("user-agent");

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_key = safeString(payload?.client_key);
  if (!client_key) {
    await logAuthAttempt({
      endpoint: ENDPOINT, client_key: null, success: false,
      failure_reason: "missing_client_key", ip_hash: ipHash, user_agent_snippet: ua,
    });
    return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  }

  const secrets = await getActiveSecrets(client_key);
  if (secrets.length === 0) {
    await logAuthAttempt({
      endpoint: ENDPOINT, client_key, success: false,
      failure_reason: "unknown_client", ip_hash: ipHash, user_agent_snippet: ua,
    });
    return NextResponse.json({ error: "unknown_client" }, { status: 401 });
  }

  const sig = (req.headers.get("x-afg-signature") || "").trim();
  let ok = false;
  for (const secret of secrets) {
    const expected = hmacSha256Hex(secret, rawBody);
    if (
      sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      ok = true;
      break;
    }
  }
  if (!ok) {
    await logAuthAttempt({
      endpoint: ENDPOINT, client_key, success: false,
      failure_reason: sig.length === 0 ? "missing_signature" : "invalid_signature",
      ip_hash: ipHash, user_agent_snippet: ua,
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (!isKnownClient(client_key)) {
    await logAuthAttempt({
      endpoint: ENDPOINT, client_key, success: false,
      failure_reason: "no_per_client_role", ip_hash: ipHash, user_agent_snippet: ua,
    });
    return NextResponse.json({ error: "no_per_client_role" }, { status: 500 });
  }

  await logAuthAttempt({
    endpoint: ENDPOINT, client_key, success: true, ip_hash: ipHash, user_agent_snippet: ua,
  });

  const from_identity_key = safeString(payload?.from_identity_key);
  const to_identity_key = safeString(payload?.to_identity_key);
  const method = safeString(payload?.method) || "upgrade";
  // identity_aliases.reason is NOT NULL — the original route omitted it, which is why
  // /api/alias had 0 successful inserts in the past 30 days. Default to a stable value
  // describing the route as the source; caller may override with payload.reason.
  const reason = safeString(payload?.reason) || "manual_alias_api";
  if (!from_identity_key) return NextResponse.json({ error: "Missing from_identity_key" }, { status: 400 });
  if (!to_identity_key) return NextResponse.json({ error: "Missing to_identity_key" }, { status: 400 });

  const metadata =
    payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : null;
  const now = new Date().toISOString();

  try {
    await withClient(client_key, async (tx) => {
      const metadataParam = metadata ? tx.json(metadata) : null;
      // Use ON CONFLICT DO NOTHING to match the original's "ignore dupes" semantic
      // (the row-by-PK uniqueness here is on (client_key, from_identity_key, to_identity_key)).
      await tx`
        INSERT INTO chapter_identity.identity_aliases (
          ts, client_key, from_identity_key, to_identity_key, method, reason, metadata
        ) VALUES (
          ${now}, ${client_key}, ${from_identity_key}, ${to_identity_key}, ${method}, ${reason}, ${metadataParam}::jsonb
        )
        ON CONFLICT (client_key, from_identity_key, to_identity_key) DO NOTHING
      `;
    });
  } catch (err: any) {
    console.error("identity_aliases insert failed:", err);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
