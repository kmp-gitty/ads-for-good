import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecrets } from "@/app/lib/auth/client-secrets";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";

const ENDPOINT = "/api/conversion";

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
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
  const ipHash = hashIp(getClientIp(req));
  const ua = req.headers.get("user-agent");

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clientKey = String(payload?.client_key ?? "").trim();
  if (!clientKey) {
    await logAuthAttempt({
      endpoint: ENDPOINT, client_key: null, success: false,
      failure_reason: "missing_client_key", ip_hash: ipHash, user_agent_snippet: ua,
    });
    return NextResponse.json({ error: "missing_client_key" }, { status: 400 });
  }

  const secrets = await getActiveSecrets(clientKey);
  if (secrets.length === 0) {
    await logAuthAttempt({
      endpoint: ENDPOINT, client_key: clientKey, success: false,
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
      endpoint: ENDPOINT, client_key: clientKey, success: false,
      failure_reason: sig.length === 0 ? "missing_signature" : "invalid_signature",
      ip_hash: ipHash, user_agent_snippet: ua,
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // Defense in depth: client_key passed HMAC but might not have a per-client
  // Postgres role mapped yet (onboarding misalignment). Reject loudly.
  if (!isKnownClient(clientKey)) {
    await logAuthAttempt({
      endpoint: ENDPOINT, client_key: clientKey, success: false,
      failure_reason: "no_per_client_role", ip_hash: ipHash, user_agent_snippet: ua,
    });
    return NextResponse.json({ error: "no_per_client_role" }, { status: 500 });
  }

  await logAuthAttempt({
    endpoint: ENDPOINT, client_key: clientKey, success: true,
    ip_hash: ipHash, user_agent_snippet: ua,
  });

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

  const email = payload.email ? normalizeEmail(payload.email) : null;
  const emailHash: string | null = payload.email_hash
    ? String(payload.email_hash).trim()
    : email
      ? sha256(email)
      : null;

  const fromKey =
    (payload.client_identity_key || "").trim() || (payload.anonymous_id || "").trim();

  const rootIdentityKey: string =
    (payload.client_identity_key || "").trim() ||
    (payload.anonymous_id || "").trim() ||
    (payload.customer_id || "").trim() ||
    (emailHash ? `email_sha256:${emailHash}` : "");

  const lookupKey = emailHash ? `email_sha256:${emailHash}` : rootIdentityKey;
  const identityConfidence = emailHash ? 100 : 70;
  const identityReason = emailHash ? "explicit_identify_call" : "client_previous_identity";
  const eventTs = payload.event_ts ? new Date(payload.event_ts) : new Date();
  const eventTsIso = eventTs.toISOString();

  // All writes/reads against RLS-protected tables happen inside withClient(),
  // which opens a transaction, SET LOCAL ROLE client_<key>, SET LOCAL app.client_key.
  // RLS enforces that every row touched matches this client_key.
  try {
    const result = await withClient(clientKey, async (tx) => {
      // 1. Deterministic alias when both anon/browser identity AND email_hash present.
      if (emailHash && fromKey) {
        const emailKey = `email_sha256:${emailHash}`;
        if (fromKey !== emailKey) {
          const aliasTs = new Date().toISOString();
          await tx`
            INSERT INTO chapter_identity.identity_aliases
              (client_key, ts, from_identity_key, to_identity_key, confidence, is_deterministic, reason)
            VALUES
              (${clientKey}, ${aliasTs}, ${fromKey}, ${emailKey}, 100, true, 'explicit_identify_call')
            ON CONFLICT (client_key, from_identity_key, to_identity_key)
            DO UPDATE SET
              ts = EXCLUDED.ts,
              confidence = EXCLUDED.confidence,
              is_deterministic = EXCLUDED.is_deterministic,
              reason = EXCLUDED.reason
          `;

          // Mirror /api/identify: explicit canon upsert as defense-in-depth.
          // Fix #20's trigger trg_sync_canon_from_alias also fires; we don't rely on it.
          try {
            await tx`
              INSERT INTO chapter_identity.identity_canon (client_key, identity_key, canonical_identity_key, updated_at)
              VALUES
                (${clientKey}, ${emailKey}, ${emailKey}, ${aliasTs}),
                (${clientKey}, ${fromKey},  ${emailKey}, ${aliasTs})
              ON CONFLICT (client_key, identity_key)
              DO UPDATE SET
                canonical_identity_key = EXCLUDED.canonical_identity_key,
                updated_at = EXCLUDED.updated_at
            `;
          } catch (canonErr) {
            console.error("identity_canon upsert (explicit_identify_call) failed; trigger will still sync:", canonErr);
          }
        }
      }

      // 2. Canonical resolution.
      const canonRows = await tx<{ canonical_identity_key: string | null }[]>`
        SELECT canonical_identity_key
        FROM chapter_identity.identity_canon
        WHERE client_key = ${clientKey} AND identity_key = ${lookupKey}
        LIMIT 1
      `;
      const resolvedIdentityKey = canonRows[0]?.canonical_identity_key ?? lookupKey;

      // 3. Insert conversion event.
      const inserted = await tx<{ id: string }[]>`
        INSERT INTO chapter_ingest.conversion_events (
          client_key, event_name, event_ts, source_platform,
          event_id, lead_id, appointment_id, form_id,
          email_hash, customer_id, client_identity_key, anonymous_id,
          resolved_identity_key, identity_confidence, identity_reason,
          page_url, referrer,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content, click_id,
          value, currency, raw
        ) VALUES (
          ${clientKey}, ${String(payload.event_name)}, ${eventTsIso}, ${String(payload.source_platform)},
          ${payload.event_id ?? null}, ${payload.lead_id ?? null}, ${payload.appointment_id ?? null}, ${payload.form_id ?? null},
          ${emailHash}, ${payload.customer_id ?? null}, ${payload.client_identity_key ?? null}, ${payload.anonymous_id ?? null},
          ${resolvedIdentityKey}, ${identityConfidence}, ${identityReason},
          ${payload.page_url ?? null}, ${payload.referrer ?? null},
          ${payload.utm_source ?? null}, ${payload.utm_medium ?? null}, ${payload.utm_campaign ?? null}, ${payload.utm_term ?? null}, ${payload.utm_content ?? null}, ${payload.click_id ?? null},
          ${payload.value ?? null}, ${payload.currency ?? null}, ${payload.raw ?? null}
        )
        RETURNING id
      `;
      return { id: inserted[0]?.id ?? null, deduped: false };
    });

    return NextResponse.json(
      { status: "ok", conversion_event_id: result.id, deduped: result.deduped },
      { status: 200 }
    );
  } catch (err: any) {
    // postgres-js surfaces unique-violation with err.code = '23505' (same as supabase-js previously).
    if (err?.code === "23505") {
      return NextResponse.json({ status: "ok", deduped: true }, { status: 200 });
    }
    console.error("conversion insert failed:", err);
    return NextResponse.json(
      { error: "insert_failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

