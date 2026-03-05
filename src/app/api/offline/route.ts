import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safeString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

type Kind = "outside" | "inside" | "conversion";

/**
 * Flexible identity scheme:
 * - Prefer payload.identity if provided:
 *    { type: "email_sha256" | "phone_sha256" | "customer_id" | "crm_id" | "loyalty_id" | "external_id",
 *      value: string,
 *      is_hashed?: boolean }
 *
 * - Backward compat: payload.identity_key "type:value"
 *
 * We do NOT hash raw PII in this endpoint. If it’s email/phone, require hashed.
 */
function normalizeIdentity(payload: any): {
  identity_key: string | null;
  identity_type: string | null;
  is_hashed: boolean | null;
} {
    const rawKey = safeString(payload?.identity_key);

    const ident =
      payload?.identity && typeof payload.identity === "object"
        ? payload.identity
        : null;
  
    const typeFromObj = safeString(ident?.type);
    const valueFromObj = safeString(ident?.value);
    const isHashedFromObj =
      ident?.is_hashed === true ? true : ident?.is_hashed === false ? false : null;
  
    // Preferred path: identity object
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
  
    // Back-compat: identity_key already provided
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
        if (
          identity_value &&
          (identity_value.includes("+") || identity_value.length < 20)
        ) {
          return { identity_key: null, identity_type: null, is_hashed: null };
        }
        return { identity_key: rawKey, identity_type, is_hashed: true };
      }
  
      return { identity_key: rawKey, identity_type, is_hashed: null };
    }
  
    return { identity_key: null, identity_type: null, is_hashed: null };
  }

/**
 * POST /api/offline
 *
 * Seed example (outside/inside/conversion list membership):
 * {
 *   "client_key":"adsforgood_local",
 *   "kind":"outside",
 *   "source_type":"event_attendee",
 *   "source_id":"EventX_2026",
 *   "seed_ts":"2026-03-01T12:00:00Z",
 *   "identity": { "type":"email_sha256", "value":"...", "is_hashed": true },
 *   "metadata":{ "booth":"A12" }
 * }
 *
 * Milestone example (POS purchase, CRM stage, etc.)
 * {
 *   "client_key":"adsforgood_local",
 *   "kind":"conversion",
 *   "milestone_name":"pos_purchase",
 *   "milestone_ts":"2026-03-01T12:00:00Z",
 *   "value":199.99,
 *   "currency":"USD",
 *   "source_type":"pos",
 *   "source_id":"store_12",
 *   "identity": { "type":"email_sha256", "value":"...", "is_hashed": true },
 *   "metadata":{ "order_id":"12345" },
 *   "consent_status":"opt_in"
 * }
 */
export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_key = safeString(payload?.client_key);
  const kindRaw = safeString(payload?.kind) || "outside";
  const kind: Kind =
    kindRaw === "outside" || kindRaw === "inside" || kindRaw === "conversion"
      ? kindRaw
      : "outside";

  const source_type = safeString(payload?.source_type);
  const source_id = safeString(payload?.source_id);

  if (!client_key) return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
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

  // Infer action: milestone if milestone_name exists, else seed
  const milestone_name = safeString(payload?.milestone_name);
  const isMilestone = Boolean(milestone_name);

  // Consent hard-stop for milestones
  if (isMilestone) {
    const consent_status = safeString(payload?.consent_status) || "unknown";
    if (consent_status !== "opt_in") {
      return new NextResponse(null, { status: 204 });
    }
  }

  // Always include kind in metadata so we don’t need schema changes
  const metaWithKind =
    metadata && typeof metadata === "object"
      ? { ...metadata, kind }
      : { kind };

  if (!isMilestone) {
    const seed_ts = safeString(payload?.seed_ts) || new Date().toISOString();

    const { error } = await supabase.from("offline_identity_seeds").insert({
      client_key,
      source_type,
      source_id,
      identity_key,
      seed_ts,
      metadata: metaWithKind,
      identity_type,
      is_hashed,
    });

    // unique constraint handles duplicates; if it fails, treat as OK
    if (error && !String(error.code || "").includes("23505")) {
      console.error("offline_identity_seeds insert error:", error);
      return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, kind, action: "seed" }, { status: 200 });
  }

  // milestone path
  const milestone_ts = safeString(payload?.milestone_ts) || new Date().toISOString();
  const value =
    payload?.value === null || payload?.value === undefined ? null : Number(payload.value);
  const currency = safeString(payload?.currency);

  const { error } = await supabase.from("offline_milestones").insert({
    client_key,
    identity_key,
    milestone_name,
    milestone_ts,
    value: Number.isFinite(value as any) ? value : null,
    currency,
    source_type,
    source_id,
    metadata: metaWithKind,
    identity_type,
    is_hashed,
  });

  // idempotent duplicates are fine
  if (error && !String(error.code || "").includes("23505")) {
    console.error("offline_milestones insert error:", error);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, kind, action: "milestone" }, { status: 200 });
}