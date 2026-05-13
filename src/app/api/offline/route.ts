import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecrets } from "@/app/lib/auth/client-secrets";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";

const ENDPOINT = "/api/offline";

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function safeString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

type Kind = "outside" | "inside" | "conversion";

/**
 * Identity normalization supporting both shapes:
 *  - { identity: { type, value, is_hashed? } }
 *  - { identity_key: "type:value" }  (back-compat)
 * Email/phone must be hashed.
 */
function normalizeIdentity(payload: any): {
  identity_key: string | null;
  identity_type: string | null;
  is_hashed: boolean | null;
} {
  const rawKey = safeString(payload?.identity_key);
  const ident =
    payload?.identity && typeof payload.identity === "object" ? payload.identity : null;

  const typeFromObj = safeString(ident?.type);
  const valueFromObj = safeString(ident?.value);
  const isHashedFromObj =
    ident?.is_hashed === true ? true : ident?.is_hashed === false ? false : null;

  if (typeFromObj && valueFromObj) {
    const t = typeFromObj;
    if (t === "email_sha256" || t === "phone_sha256") {
      if (isHashedFromObj === false) {
        return { identity_key: null, identity_type: null, is_hashed: null };
      }
      const is_hashed = isHashedFromObj ?? true;
      return { identity_key: `${t}:${valueFromObj}`, identity_type: t, is_hashed };
    }
    const is_hashed = isHashedFromObj ?? false;
    return { identity_key: `${t}:${valueFromObj}`, identity_type: t, is_hashed };
  }

  if (rawKey) {
    const idx = rawKey.indexOf(":");
    const identity_type = idx > 0 ? rawKey.slice(0, idx) : null;
    const identity_value = idx > 0 ? rawKey.slice(idx + 1) : null;

    if (identity_type === "email_sha256") {
      if (identity_value && identity_value.includes("@")) {
        return { identity_key: null, identity_type: null, is_hashed: null };
      }
      return { identity_key: rawKey, identity_type, is_hashed: true };
    }
    if (identity_type === "phone_sha256") {
      if (identity_value && (identity_value.includes("+") || identity_value.length < 20)) {
        return { identity_key: null, identity_type: null, is_hashed: null };
      }
      return { identity_key: rawKey, identity_type, is_hashed: true };
    }
    return { identity_key: rawKey, identity_type, is_hashed: null };
  }

  return { identity_key: null, identity_type: null, is_hashed: null };
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

  const kindRaw = safeString(payload?.kind) || "outside";
  const kind: Kind =
    kindRaw === "outside" || kindRaw === "inside" || kindRaw === "conversion"
      ? kindRaw
      : "outside";

  const source_type = safeString(payload?.source_type);
  const source_id = safeString(payload?.source_id);
  if (!source_type) return NextResponse.json({ error: "Missing source_type" }, { status: 400 });
  if (!source_id) return NextResponse.json({ error: "Missing source_id" }, { status: 400 });

  const { identity_key, identity_type, is_hashed } = normalizeIdentity(payload);
  if (!identity_key) {
    return NextResponse.json(
      { error: "Missing/invalid identity. Provide identity_key or identity:{type,value,is_hashed} (email/phone must be hashed)." },
      { status: 400 }
    );
  }

  const metadata =
    payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : null;

  const milestone_name = safeString(payload?.milestone_name);
  const isMilestone = Boolean(milestone_name);

  // Consent hard-stop for milestones.
  if (isMilestone) {
    const consent_status = safeString(payload?.consent_status) || "unknown";
    if (consent_status !== "opt_in") {
      return new NextResponse(null, { status: 204 });
    }
  }

  const metaWithKind = metadata ? { ...metadata, kind } : { kind };

  try {
    if (!isMilestone) {
      const seed_ts = safeString(payload?.seed_ts) || new Date().toISOString();
      await withClient(client_key, async (tx) => {
        const metaParam = tx.json(metaWithKind);
        try {
          await tx`
            INSERT INTO chapter_ingest.offline_identity_seeds (
              client_key, source_type, source_id, identity_key, seed_ts,
              metadata, identity_type, is_hashed
            ) VALUES (
              ${client_key}, ${source_type}, ${source_id}, ${identity_key}, ${seed_ts},
              ${metaParam}::jsonb, ${identity_type}, ${is_hashed}
            )
          `;
        } catch (err: any) {
          // Idempotent duplicates fall through.
          if (err?.code !== "23505") throw err;
        }
      });
      return NextResponse.json({ ok: true, kind, action: "seed" }, { status: 200 });
    }

    // Milestone path.
    const milestone_ts = safeString(payload?.milestone_ts) || new Date().toISOString();
    const value =
      payload?.value === null || payload?.value === undefined ? null : Number(payload.value);
    const currency = safeString(payload?.currency);

    await withClient(client_key, async (tx) => {
      const metaParam = tx.json(metaWithKind);
      try {
        await tx`
          INSERT INTO chapter_ingest.offline_milestones (
            client_key, identity_key, milestone_name, milestone_ts,
            value, currency, source_type, source_id, metadata,
            identity_type, is_hashed
          ) VALUES (
            ${client_key}, ${identity_key}, ${milestone_name}, ${milestone_ts},
            ${Number.isFinite(value as any) ? value : null}, ${currency},
            ${source_type}, ${source_id}, ${metaParam}::jsonb,
            ${identity_type}, ${is_hashed}
          )
        `;
      } catch (err: any) {
        if (err?.code !== "23505") throw err;
      }
    });
    return NextResponse.json({ ok: true, kind, action: "milestone" }, { status: 200 });
  } catch (err: any) {
    console.error("offline insert failed:", err);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }
}
