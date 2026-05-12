import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chapterSchemas } from "@/app/lib/chapter-db";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecrets } from "@/app/lib/auth/client-secrets";

const ENDPOINT = "/api/purchase";

function sha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

// getClientSecret removed in Fix #26 part 3 — replaced by getActiveSecrets()
// from @/app/lib/auth/client-secrets which reads from chapter_config.client_secrets.

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

  // Try each active secret. Allows both old and new keys to work during the
  // overlap window of a rotation.
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

  await logAuthAttempt({
    endpoint: ENDPOINT, client_key: clientKey, success: true,
    ip_hash: ipHash, user_agent_snippet: ua,
  });

  // Contract validation
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

  // Supabase server client
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const email = payload.email ? normalizeEmail(payload.email) : null;
  const emailHash =
    payload.email_hash
      ? String(payload.email_hash).trim()
      : email
        ? sha256(email)
        : null;

const eventTs = payload.event_ts ? new Date(payload.event_ts) : new Date();      

const rootIdentityKey: string =
  (payload.client_identity_key || "").trim() ||
  (payload.anonymous_id || "").trim() ||
  (payload.customer_id || "").trim() ||
  (emailHash ? `email_sha256:${emailHash}` : "");

  const lookupKey = emailHash ? `email_sha256:${emailHash}` : rootIdentityKey;
  const purchaseCartToken = normalizeCartToken(payload?.raw?.order?.cart_token);
  let bridgedFromIdentityKey: string | null = null;

// If we have BOTH an anon/browser identity and an email, create deterministic alias edge
if (emailHash) {
    const emailKey = `email_sha256:${emailHash}`;
    const fromKey = (payload.client_identity_key || "").trim() || (payload.anonymous_id || "").trim();
  
    if (fromKey && fromKey !== emailKey) {
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
            reason: "purchase_identify_call",
          },
          { onConflict: "client_key,from_identity_key,to_identity_key" }
        );

        // Mirror /api/identify: also sync identity_canon. Trigger trg_sync_canon_from_alias
        // (Fix #20) covers this on the DB side; this is defense-in-depth. Wrapped in try
        // so a canon write failure never blocks the purchase webhook.
        try {
          await chapterSchemas.identity(supabase).from("identity_canon").upsert([
            { client_key: clientKey, identity_key: emailKey, canonical_identity_key: emailKey, updated_at: aliasTs },
            { client_key: clientKey, identity_key: fromKey,  canonical_identity_key: emailKey, updated_at: aliasTs },
          ], { onConflict: "client_key,identity_key" });
        } catch (canonErr) {
          console.error("identity_canon upsert (purchase_identify_call) failed; trigger will still sync:", canonErr);
        }
    }
  }

  // If we have email identity + purchase cart token, try to stitch prior browser identity
// by matching cart_token on view_cart / add_to_cart events.
if (emailHash && purchaseCartToken) {
    const emailKey = `email_sha256:${emailHash}`;
  
    const { data: cartMatches, error: cartMatchErr } = await chapterSchemas
      .ingest(supabase)
      .from("pixel_events")
      .select("identity_key,event_name,ts,props")
      .eq("client_key", clientKey)
      .in("event_name", ["view_cart", "add_to_cart"])
      .not("identity_key", "is", null)
      .lte("ts", eventTs.toISOString())
      .order("ts", { ascending: false })
      .limit(250);
  
    if (cartMatchErr) {
      console.error("cart token match lookup failed", cartMatchErr);
    } else if (cartMatches?.length) {
      const normalizedMatch = cartMatches.find((row: any) => {
        const rowCartToken = normalizeCartToken(row?.props?.cart_token);
        return rowCartToken === purchaseCartToken;
      });
  
      const fromKey = normalizedMatch?.identity_key?.trim();
  
      if (fromKey) {
        bridgedFromIdentityKey = fromKey;
      }

      if (fromKey && fromKey !== emailKey) {
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
              reason: "purchase_cart_token_bridge",
            },
            { onConflict: "client_key,from_identity_key,to_identity_key" }
          );

        // Mirror /api/identify: also sync identity_canon. Trigger trg_sync_canon_from_alias
        // (Fix #20) covers this on the DB side; this is defense-in-depth. Wrapped in try
        // so a canon write failure never blocks the purchase webhook.
        try {
          await chapterSchemas.identity(supabase).from("identity_canon").upsert([
            { client_key: clientKey, identity_key: emailKey, canonical_identity_key: emailKey, updated_at: aliasTs },
            { client_key: clientKey, identity_key: fromKey,  canonical_identity_key: emailKey, updated_at: aliasTs },
          ], { onConflict: "client_key,identity_key" });
        } catch (canonErr) {
          console.error("identity_canon upsert (purchase_cart_token_bridge) failed; trigger will still sync:", canonErr);
        }
      }
    }
  }

// Self-canonical fallback (May 12 2026 fix for the 44-row attribution gap).
// The two alias paths above (explicit-identify, cart-token-bridge) only fire
// when there's a browser identity to alias FROM. Guest checkouts with only
// email_hash (typical Shopify-direct order, no anonymous_id, no cart_token
// match in pixel_events) hit neither path → the email_hash never gets a
// canon entry → the purchase silently orphans out of attribution.
// This unconditional upsert ensures every purchase identity at least exists
// in canon as self-canonical. Idempotent — no-op if the row already exists.
if (emailHash || payload.customer_id) {
  const detKey = emailHash
    ? `email_sha256:${emailHash}`
    : `shopify_customer_id:${String(payload.customer_id).trim()}`;
  try {
    await chapterSchemas.identity(supabase).from("identity_canon").upsert(
      {
        client_key: clientKey,
        identity_key: detKey,
        canonical_identity_key: detKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_key,identity_key" }
    );
  } catch (canonErr) {
    console.error(
      "identity_canon self-canonical upsert (purchase fallback) failed:",
      canonErr
    );
  }
}

// Ask the DB for canonical identity (falls back to lookupKey if none)
const canonLookupKey = bridgedFromIdentityKey || lookupKey;

const { data: canon } = await chapterSchemas
  .identity(supabase)
  .from("identity_canon")
  .select("canonical_identity_key")
  .eq("client_key", clientKey)
  .eq("identity_key", canonLookupKey)
  .maybeSingle();

const resolvedIdentityKey = canon?.canonical_identity_key ?? lookupKey;

const identityConfidence = email ? 100 : 70;
const identityReason = email ? "purchase_identify_call" : "client_previous_identity";

  const purchaseRow = {
    client_key: clientKey,
    event_name: "purchase",
    event_ts: eventTs.toISOString(),
    source_platform: payload.source_platform,

    order_id: payload.order_id ?? null,
    payment_id: payload.payment_id ?? null,
    event_id: payload.event_id ?? null,

    value: payload.value,
    currency: payload.currency,

    email_hash: emailHash ?? null,
    customer_id: payload.customer_id ?? null,
    client_identity_key: payload.client_identity_key ?? null,
    anonymous_id: payload.anonymous_id ?? null,

    resolved_identity_key: resolvedIdentityKey,
    identity_confidence: identityConfidence,
    identity_reason: identityReason,

    coupon: payload.coupon ?? null,
    shipping: payload.shipping ?? null,
    tax: payload.tax ?? null,

    utm_source: payload.utm_source ?? null,
    utm_medium: payload.utm_medium ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    utm_term: payload.utm_term ?? null,
    utm_content: payload.utm_content ?? null,

    click_id: payload.click_id ?? null,
    page_url: payload.page_url ?? null,
    referrer: payload.referrer ?? null,

    user_agent: typeof payload.user_agent === "string" ? payload.user_agent : null,

    raw: payload.raw ?? null,
  };

  // Insert (DB enforces dedupe via unique index)
  const { data: inserted, error: insErr } = await chapterSchemas
  .ingest(supabase)
  .from("purchase_events")
  .insert(purchaseRow)
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

    // Write identify audit event after successful purchase insert
    if (resolvedIdentityKey) {
        try {
          await chapterSchemas
            .ingest(supabase)
            .from("pixel_events")
            .insert({
              ts: eventTs.toISOString(),
              client_key: clientKey,
              journey_id: null,
              identity_key: resolvedIdentityKey,
              event_name: "identify",
              props: {
                source: "purchase",
                confidence: identityConfidence,
                identity_reason: identityReason,
                order_id: payload.order_id ?? null,
                source_platform: payload.source_platform ?? null,
              },
            });
        } catch (err) {
          console.error("identify audit insert failed", err);
        }
      }

  return NextResponse.json(
    { status: "ok", purchase_event_id: inserted?.id ?? null, deduped: false },
    { status: 200 }
  );
}