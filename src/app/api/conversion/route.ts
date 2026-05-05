import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chapterSchemas } from "@/app/lib/chapter-db";

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hasIdentity(p: any): boolean {
  return Boolean(
    p.email || p.email_hash || p.customer_id || p.client_identity_key || p.anonymous_id
  );
}

function hasDedupeId(p: any): boolean {
  return Boolean(p.event_id || p.lead_id || p.appointment_id || p.form_id);
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

  // Contract validation
  if (!payload.event_name) {
    return NextResponse.json({ error: "missing_event_name" }, { status: 400 });
  }
  if (!payload.source_platform) {
    return NextResponse.json({ error: "missing_source_platform" }, { status: 400 });
  }
  if (!hasDedupeId(payload)) {
    return NextResponse.json({ error: "missing_dedupe_id" }, { status: 400 });
  }
  if (!hasIdentity(payload)) {
    return NextResponse.json({ error: "missing_identity" }, { status: 400 });
  }

  // Supabase server client
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Email hashing (no raw email storage)
  const email = payload.email ? normalizeEmail(payload.email) : null;
  const emailHash: string | null = payload.email_hash
    ? String(payload.email_hash).trim()
    : email
      ? sha256(email)
      : null;

  // Deterministic alias if we have BOTH anon/browser identity and email hash
  const fromKey =
    (payload.client_identity_key || "").trim() || (payload.anonymous_id || "").trim();

  if (emailHash && fromKey) {
    const emailKey = `email_sha256:${emailHash}`;
    if (fromKey !== emailKey) {
        const aliasTs = new Date().toISOString();
        await chapterSchemas
        .identity(supabase)
        .from("identity_aliases")
        .upsert(
          {
            client_key: clientKey,
            ts: aliasTs,
            from_identity_key: fromKey,
            to_identity_key: emailKey,
            confidence: 100,
            is_deterministic: true,
            reason: "explicit_identify_call",
          },
          { onConflict: "client_key,from_identity_key,to_identity_key" }
        );

        // Mirror /api/identify: also sync identity_canon. Trigger trg_sync_canon_from_alias
        // (Fix #20) covers this on the DB side; this is defense-in-depth. Wrapped in try
        // so a canon write failure never blocks the conversion webhook.
        try {
          await chapterSchemas.identity(supabase).from("identity_canon").upsert([
            { client_key: clientKey, identity_key: emailKey, canonical_identity_key: emailKey, updated_at: aliasTs },
            { client_key: clientKey, identity_key: fromKey,  canonical_identity_key: emailKey, updated_at: aliasTs },
          ], { onConflict: "client_key,identity_key" });
        } catch (canonErr) {
          console.error("identity_canon upsert (explicit_identify_call) failed; trigger will still sync:", canonErr);
        }
    }
  }

  // Canonical identity resolution
  const rootIdentityKey: string =
    (payload.client_identity_key || "").trim() ||
    (payload.anonymous_id || "").trim() ||
    (payload.customer_id || "").trim() ||
    (emailHash ? `email_sha256:${emailHash}` : "");

  const lookupKey = emailHash ? `email_sha256:${emailHash}` : rootIdentityKey;

  const { data: canon } = await chapterSchemas
  .identity(supabase)
  .from("identity_canon")
    .select("canonical_identity_key")
    .eq("client_key", clientKey)
    .eq("identity_key", lookupKey)
    .maybeSingle();

  const resolvedIdentityKey = canon?.canonical_identity_key ?? lookupKey;

  const identityConfidence = emailHash ? 100 : 70;
  const identityReason = emailHash ? "explicit_identify_call" : "client_previous_identity";

  const eventTs = payload.event_ts ? new Date(payload.event_ts) : new Date();

  const row = {
    client_key: clientKey,
    event_name: String(payload.event_name),
    event_ts: eventTs.toISOString(),
    source_platform: String(payload.source_platform),

    event_id: payload.event_id ?? null,
    lead_id: payload.lead_id ?? null,
    appointment_id: payload.appointment_id ?? null,
    form_id: payload.form_id ?? null,

    email_hash: emailHash ?? null,
    customer_id: payload.customer_id ?? null,
    client_identity_key: payload.client_identity_key ?? null,
    anonymous_id: payload.anonymous_id ?? null,

    resolved_identity_key: resolvedIdentityKey,
    identity_confidence: identityConfidence,
    identity_reason: identityReason,

    page_url: payload.page_url ?? null,
    referrer: payload.referrer ?? null,

    utm_source: payload.utm_source ?? null,
    utm_medium: payload.utm_medium ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    utm_term: payload.utm_term ?? null,
    utm_content: payload.utm_content ?? null,
    click_id: payload.click_id ?? null,

    value: payload.value ?? null,
    currency: payload.currency ?? null,

    raw: payload.raw ?? null,
  };

  const { data: inserted, error: insErr } = await chapterSchemas
  .ingest(supabase)
  .from("conversion_events")
  .insert(row)
  .select("id")
  .maybeSingle();

  if (insErr) {
    const isDup = (insErr as any).code === "23505";
    if (isDup) {
      return NextResponse.json({ status: "ok", deduped: true }, { status: 200 });
    }
    return NextResponse.json(
      { error: "insert_failed", detail: insErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { status: "ok", conversion_event_id: inserted?.id ?? null, deduped: false },
    { status: 200 }
  );
}