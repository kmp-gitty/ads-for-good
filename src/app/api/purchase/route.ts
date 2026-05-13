import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecrets } from "@/app/lib/auth/client-secrets";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";

const ENDPOINT = "/api/purchase";

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function hasIdentity(p: any): boolean {
  return Boolean(
    p.email || p.email_hash || p.customer_id || p.client_identity_key || p.anonymous_id
  );
}

function hasDedupeId(p: any): boolean {
  return Boolean(p.event_id || p.order_id || p.payment_id);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeCartToken(token: unknown): string | null {
  if (!token) return null;
  return String(token).trim().split("?")[0] || null;
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

  if (!hasDedupeId(payload)) {
    return NextResponse.json({ error: "missing_dedupe_id" }, { status: 400 });
  }
  if (typeof payload.value !== "number" || !isFinite(payload.value)) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }
  if (!payload.currency) {
    return NextResponse.json({ error: "missing_currency" }, { status: 400 });
  }
  if (!payload.source_platform) {
    return NextResponse.json({ error: "missing_source_platform" }, { status: 400 });
  }
  if (!hasIdentity(payload)) {
    return NextResponse.json({ error: "missing_identity" }, { status: 400 });
  }

  const email = payload.email ? normalizeEmail(payload.email) : null;
  const emailHash =
    payload.email_hash
      ? String(payload.email_hash).trim()
      : email
        ? sha256(email)
        : null;

  const eventTs = payload.event_ts ? new Date(payload.event_ts) : new Date();
  const eventTsIso = eventTs.toISOString();

  const rootIdentityKey: string =
    (payload.client_identity_key || "").trim() ||
    (payload.anonymous_id || "").trim() ||
    (payload.customer_id || "").trim() ||
    (emailHash ? `email_sha256:${emailHash}` : "");

  const lookupKey = emailHash ? `email_sha256:${emailHash}` : rootIdentityKey;
  const purchaseCartToken = normalizeCartToken(payload?.raw?.order?.cart_token);
  let bridgedFromIdentityKey: string | null = null;

  // Each phase below is its own withClient transaction. Per-phase isolation
  // preserves the original semantics: a failed canon upsert in the identity-graph
  // phases does NOT block the main purchase insert, and a failed identify-audit
  // pixel_events insert does NOT roll back the purchase.

  // Phase 1: explicit-identify alias + canon (if we have both an anon/browser
  // identity AND an email_hash).
  if (emailHash) {
    const emailKey = `email_sha256:${emailHash}`;
    const fromKey = (payload.client_identity_key || "").trim() || (payload.anonymous_id || "").trim();
    if (fromKey && fromKey !== emailKey) {
      const aliasTs = new Date().toISOString();
      try {
        await withClient(clientKey, async (tx) => {
          await tx`
            INSERT INTO chapter_identity.identity_aliases
              (client_key, ts, from_identity_key, to_identity_key, confidence, is_deterministic, reason)
            VALUES
              (${clientKey}, ${aliasTs}, ${fromKey}, ${emailKey}, 100, true, 'purchase_identify_call')
            ON CONFLICT (client_key, from_identity_key, to_identity_key)
            DO UPDATE SET
              ts = EXCLUDED.ts,
              confidence = EXCLUDED.confidence,
              is_deterministic = EXCLUDED.is_deterministic,
              reason = EXCLUDED.reason
          `;
          // Defense in depth: trigger trg_sync_canon_from_alias also fires.
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
            console.error("identity_canon upsert (purchase_identify_call) failed; trigger will still sync:", canonErr);
          }
        });
      } catch (aliasErr) {
        console.error("identity_aliases upsert (purchase_identify_call) failed:", aliasErr);
      }
    }
  }

  // Phase 2: cart-token bridge. If we have email identity + purchase cart token,
  // try to stitch the prior browser identity by matching cart_token on recent
  // view_cart / add_to_cart events.
  if (emailHash && purchaseCartToken) {
    const emailKey = `email_sha256:${emailHash}`;
    try {
      bridgedFromIdentityKey = await withClient(clientKey, async (tx) => {
        const cartMatches = await tx<{ identity_key: string | null; props: any }[]>`
          SELECT identity_key, props
          FROM chapter_ingest.pixel_events
          WHERE client_key = ${clientKey}
            AND event_name IN ('view_cart', 'add_to_cart')
            AND identity_key IS NOT NULL
            AND ts <= ${eventTsIso}
          ORDER BY ts DESC
          LIMIT 250
        `;

        const normalizedMatch = cartMatches.find((row) => {
          const rowCartToken = normalizeCartToken(row?.props?.cart_token);
          return rowCartToken === purchaseCartToken;
        });

        const fromKey = normalizedMatch?.identity_key?.trim();
        if (!fromKey || fromKey === emailKey) {
          return fromKey ?? null;
        }

        const aliasTs = new Date().toISOString();
        await tx`
          INSERT INTO chapter_identity.identity_aliases
            (client_key, ts, from_identity_key, to_identity_key, confidence, is_deterministic, reason)
          VALUES
            (${clientKey}, ${aliasTs}, ${fromKey}, ${emailKey}, 100, true, 'purchase_cart_token_bridge')
          ON CONFLICT (client_key, from_identity_key, to_identity_key)
          DO UPDATE SET
            ts = EXCLUDED.ts,
            confidence = EXCLUDED.confidence,
            is_deterministic = EXCLUDED.is_deterministic,
            reason = EXCLUDED.reason
        `;
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
          console.error("identity_canon upsert (purchase_cart_token_bridge) failed; trigger will still sync:", canonErr);
        }
        return fromKey;
      });
    } catch (bridgeErr) {
      console.error("cart-token bridge phase failed:", bridgeErr);
    }
  }

  // Phase 3: self-canonical fallback (May 12 2026 fix for the 44-row attribution gap).
  // Guest checkouts with only email_hash hit neither phase 1 nor 2 — without this,
  // email_hash never lands in canon → purchase orphans out of attribution.
  if (emailHash || payload.customer_id) {
    const detKey = emailHash
      ? `email_sha256:${emailHash}`
      : `shopify_customer_id:${String(payload.customer_id).trim()}`;
    try {
      await withClient(clientKey, async (tx) => {
        await tx`
          INSERT INTO chapter_identity.identity_canon (client_key, identity_key, canonical_identity_key, updated_at)
          VALUES (${clientKey}, ${detKey}, ${detKey}, ${new Date().toISOString()})
          ON CONFLICT (client_key, identity_key)
          DO UPDATE SET
            canonical_identity_key = EXCLUDED.canonical_identity_key,
            updated_at = EXCLUDED.updated_at
        `;
      });
    } catch (canonErr) {
      console.error("identity_canon self-canonical upsert (purchase fallback) failed:", canonErr);
    }
  }

  // Phase 4 + 5: canon resolution lookup + purchase_events INSERT in one
  // transaction. These must succeed together — if the purchase insert fails,
  // we don't need the canon lookup result anymore.
  const canonLookupKey = bridgedFromIdentityKey || lookupKey;
  const identityConfidence = email ? 100 : 70;
  const identityReason = email ? "purchase_identify_call" : "client_previous_identity";

  let purchaseEventId: string | null = null;
  let deduped = false;
  let resolvedIdentityKey: string = lookupKey;

  try {
    const result = await withClient(clientKey, async (tx) => {
      const canon = await tx<{ canonical_identity_key: string | null }[]>`
        SELECT canonical_identity_key
        FROM chapter_identity.identity_canon
        WHERE client_key = ${clientKey} AND identity_key = ${canonLookupKey}
        LIMIT 1
      `;
      const resolved = canon[0]?.canonical_identity_key ?? lookupKey;

      try {
        const inserted = await tx<{ id: string }[]>`
          INSERT INTO chapter_ingest.purchase_events (
            client_key, event_name, event_ts, source_platform,
            order_id, payment_id, event_id,
            value, currency,
            email_hash, customer_id, client_identity_key, anonymous_id,
            resolved_identity_key, identity_confidence, identity_reason,
            coupon, shipping, tax,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content,
            click_id, page_url, referrer,
            user_agent, raw
          ) VALUES (
            ${clientKey}, 'purchase', ${eventTsIso}, ${payload.source_platform},
            ${payload.order_id ?? null}, ${payload.payment_id ?? null}, ${payload.event_id ?? null},
            ${payload.value}, ${payload.currency},
            ${emailHash}, ${payload.customer_id ?? null}, ${payload.client_identity_key ?? null}, ${payload.anonymous_id ?? null},
            ${resolved}, ${identityConfidence}, ${identityReason},
            ${payload.coupon ?? null}, ${payload.shipping ?? null}, ${payload.tax ?? null},
            ${payload.utm_source ?? null}, ${payload.utm_medium ?? null}, ${payload.utm_campaign ?? null}, ${payload.utm_term ?? null}, ${payload.utm_content ?? null},
            ${payload.click_id ?? null}, ${payload.page_url ?? null}, ${payload.referrer ?? null},
            ${typeof payload.user_agent === "string" ? payload.user_agent : null},
            ${payload.raw ?? null}
          )
          RETURNING id
        `;
        return { id: inserted[0]?.id ?? null, deduped: false, resolved };
      } catch (err: any) {
        if (err?.code === "23505") {
          return { id: null, deduped: true, resolved };
        }
        throw err;
      }
    });
    purchaseEventId = result.id;
    deduped = result.deduped;
    resolvedIdentityKey = result.resolved;
  } catch (err: any) {
    console.error("purchase insert failed:", err);
    return NextResponse.json(
      { error: "insert_failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }

  if (deduped) {
    return NextResponse.json({ status: "ok", deduped: true }, { status: 200 });
  }

  // Phase 6: identify audit event. Independent of the purchase write — if this
  // fails the purchase still committed.
  if (resolvedIdentityKey) {
    try {
      await withClient(clientKey, async (tx) => {
        await tx`
          INSERT INTO chapter_ingest.pixel_events (
            ts, client_key, journey_id, identity_key, event_name, props
          ) VALUES (
            ${eventTsIso}, ${clientKey}, ${null}, ${resolvedIdentityKey}, 'identify',
            ${tx.json({
              source: "purchase",
              confidence: identityConfidence,
              identity_reason: identityReason,
              order_id: payload.order_id ?? null,
              source_platform: payload.source_platform ?? null,
            })}::jsonb
          )
        `;
      });
    } catch (auditErr) {
      console.error("identify audit insert failed:", auditErr);
    }
  }

  return NextResponse.json(
    { status: "ok", purchase_event_id: purchaseEventId, deduped: false },
    { status: 200 }
  );
}
