// Square Appointments webhook adapter.
//
// Receives appointment.* webhook events from Square and forwards them to the
// internal /api/purchase route as Chapter "boundary events." For a personal-
// services client whose chapter_config.clients.boundary_event_name is
// 'appointment_booked', each appointment creation lands as a purchase_events
// row, identity-stitched via customer email_sha256 → identity_canon.
//
// Mirrors src/app/api/shopify/webhooks/orders-create/route.ts:
// - HMAC verification per-merchant (vs per-shop for Shopify)
// - Multi-tenant resolved from payload `merchant_id` → chapter_config.clients
// - Forwards to /api/purchase with x-afg-signature so the purchase route
//   handles the actual DB write + identity stitch (single point of truth).
//
// Square's webhook signature (HMAC-SHA-256, base64) covers the concatenation
// of (notification_url + raw_body) — different from Shopify's body-only.
// Both new + old signing keys are tried (rotation overlap).
//
// Event types we handle:
//   appointment.created   → boundary event, lands as purchase_events row
//   appointment.updated   → IGNORED for v1 (would re-emit boundary; skip)
//   appointment.canceled  → IGNORED for v1 (cancel semantics handled later
//                            via offline_milestones if/when offline ingest
//                            extends to cancellations)
//
// What this v1 needs (TODO for tomorrow's barbershop intake):
//   - Real merchant_id ↔ client_key + signing key pair INSERTed to
//     chapter_config.square_webhook_secrets.
//   - Square's appointment payload does NOT include customer email by default.
//     The customer_id in the payload references Square's Customers API.
//     We INSERT a placeholder customer_id and either:
//       (a) tomorrow: enrich via Square Customers API in an async post-write
//           step (the typical pattern), or
//       (b) accept that identity_canon stitching happens lazily when the
//           barbershop's marketing-site pixel-tracked journey resolves via
//           email_sha256 + a separate canon update path.
//   - Sandbox testing: Square's webhook simulator → POST to a deployed
//     preview URL with the signing key from sandbox.

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecretForOutbound } from "@/app/lib/auth/client-secrets";
import { getActiveSquareSecrets } from "@/app/lib/auth/square-webhook-secrets";
import { fetchSquareCustomer } from "@/app/lib/square/customers";

const ENDPOINT = "/api/square/webhooks/appointments";

// Square signs over (notification_url + raw_body). The notification_url comes
// from the per-merchant config row (so the signature math survives if we ever
// host the route on a different domain / preview URL during testing).
function verifySquareWebhook(
  rawBody: string,
  signatureHeader: string,
  notificationUrl: string,
  signingKey: string
): boolean {
  const message = notificationUrl + rawBody;
  const digest = crypto
    .createHmac("sha256", signingKey)
    .update(message, "utf8")
    .digest("base64");
  if (!signatureHeader || signatureHeader.length !== digest.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function sanitizeSquareAppointmentForRaw(appointment: unknown): unknown {
  // Square appointment payloads do NOT generally contain raw PII (email/phone
  // live on the linked Customer record, fetched separately). Strip anything
  // suspicious if Square's payload shape evolves to embed customer details.
  if (!appointment || typeof appointment !== "object") return appointment;
  const clone = JSON.parse(JSON.stringify(appointment)) as Record<string, unknown>;
  // Defensive deletes for fields that COULD show up if Square enriches:
  delete clone.email_address;
  delete clone.phone_number;
  if (clone.customer && typeof clone.customer === "object") {
    const c = clone.customer as Record<string, unknown>;
    delete c.email_address;
    delete c.phone_number;
    delete c.given_name;
    delete c.family_name;
  }
  return clone;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ipHash = hashIp(getClientIp(req));
  const ua = req.headers.get("user-agent");

  try {
    // Square's recommended new-style signature header.
    // Older webhooks use `x-square-signature` (HMAC-SHA-1); we only support
    // the new SHA-256 variant for this v1 (barbershop is a new integration).
    const sigHeader = (req.headers.get("x-square-hmacsha256-signature") || "").trim();

    // Parse the body once to extract merchant_id + event type. Square posts
    // a JSON body whose top-level fields include merchant_id and type.
    let event: {
      merchant_id?: string;
      type?: string;
      event_id?: string;
      created_at?: string;
      data?: {
        type?: string;
        id?: string;
        object?: {
          appointment?: Record<string, unknown>;
        };
      };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const merchantId = (event?.merchant_id || "").trim();
    const eventType = (event?.type || "").trim();

    if (!merchantId) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: null, success: false,
        failure_reason: "missing_merchant_id", ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "missing_merchant_id" }, { status: 400 });
    }

    // Per-merchant secrets. Multiple non-revoked rows supported for rotation.
    const secrets = await getActiveSquareSecrets(merchantId);
    if (secrets.length === 0) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: null, success: false,
        failure_reason: "unknown_square_merchant", ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "unknown_square_merchant" }, { status: 401 });
    }

    // Try each active (client_key, notification_url, signature_key) row.
    // First match wins; all rows for a merchant should share client_key.
    let matched: typeof secrets[number] | null = null;
    for (const row of secrets) {
      if (verifySquareWebhook(rawBody, sigHeader, row.notification_url, row.signature_key)) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: secrets[0]?.client_key ?? null, success: false,
        failure_reason: sigHeader.length === 0 ? "missing_square_signature" : "invalid_square_signature",
        ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "invalid_square_signature" }, { status: 401 });
    }

    const clientKey = matched.client_key;

    await logAuthAttempt({
      endpoint: ENDPOINT, client_key: clientKey, success: true,
      ip_hash: ipHash, user_agent_snippet: ua,
    });

    // Only process appointment.created in v1. Other event types ack-and-skip
    // so Square doesn't keep retrying.
    if (eventType !== "appointment.created") {
      return NextResponse.json({ ok: true, skipped: eventType }, { status: 200 });
    }

    const appointment = event.data?.object?.appointment;
    if (!appointment || typeof appointment !== "object") {
      return NextResponse.json({ error: "missing_appointment_payload" }, { status: 400 });
    }

    const appointmentId = typeof appointment.id === "string" ? appointment.id : null;
    const customerId = typeof appointment.customer_id === "string" ? appointment.customer_id : null;

    // event_ts must reflect when the BOOKING was made (boundary event for
    // attribution), NOT when the service is scheduled to happen. Priority:
    //   1. appointment.created_at — when the appointment record was created
    //   2. event.created_at        — when Square emitted the webhook (~same moment)
    //   3. now()                   — fallback if neither present
    // We intentionally do NOT use appointment.start_at here — that's when
    // the service occurs (possibly hours or days later), which would put
    // the lifecycle chapter's boundary in the future relative to the
    // customer's actual journey.
    const apptCreatedAt = typeof (appointment as Record<string, unknown>).created_at === "string"
      ? ((appointment as Record<string, unknown>).created_at as string)
      : null;
    const eventTs = apptCreatedAt || event.created_at || new Date().toISOString();

    // Sprint 2.3 v2 alt — Square Customers API enrichment.
    // Fetch Customer record in parallel with the AFG secret read so identity
    // hints land in the SAME forward to /api/purchase, letting all canon
    // phases run in one shot (vs. a second alias-only call later). Best-effort:
    // if Square 401s / 404s / times out, we forward without enrichment and
    // identity stitching falls back to canon-via-pixel-journey later.
    const [afgSecret, sqCustomer] = await Promise.all([
      getActiveSecretForOutbound(clientKey),
      customerId ? fetchSquareCustomer(merchantId, customerId) : Promise.resolve(null),
    ]);
    if (!afgSecret) {
      return NextResponse.json({ error: "missing_afg_secret_for_client" }, { status: 500 });
    }

    const enrichedEmail = sqCustomer?.email_address?.trim() || null;
    const enrichedPhone = sqCustomer?.phone_number?.trim() || null;

    const purchasePayload = {
      client_key:      clientKey,
      source_platform: "square_appointments",
      event_id:        appointmentId ? `square_appointment_created_${appointmentId}` : null,
      event_name:      "appointment_booked",      // matches chapter_config.clients.boundary_event_name
      order_id:        appointmentId,
      payment_id:      null,
      customer_id:     customerId ? `square_customer_id:${customerId}` : null,
      email:           enrichedEmail,              // Sprint 2.3 v2 alt
      phone:           enrichedPhone,              // Sprint 2.3 v2: phone-first stitching
      value:           0,                          // appointments have no $$ amount at booking
      currency:        "USD",
      event_ts:        eventTs,
      coupon:          null,
      shipping:        null,
      tax:             null,
      user_agent:      null,
      raw: {
        merchant_id: merchantId,
        topic: eventType,
        event_id: event.event_id || null,
        appointment: sanitizeSquareAppointmentForRaw(appointment),
        // Note: enrichment metadata only — actual email/phone never go into
        // `raw` (they're hashed via /api/purchase and stored in identity_canon
        // only). Just record WHETHER we got them.
        enriched: {
          email: Boolean(enrichedEmail),
          phone: Boolean(enrichedPhone),
        },
      },
    };

    // /api/purchase requires either email OR customer_id. customer_id present
    // here (Square always provides it); if not, fail loud.
    if (!purchasePayload.customer_id && !purchasePayload.email) {
      return NextResponse.json({ error: "missing_purchase_identity" }, { status: 400 });
    }
    if (!purchasePayload.order_id && !purchasePayload.event_id) {
      return NextResponse.json({ error: "missing_appointment_identifier" }, { status: 400 });
    }

    const normalizedBody = JSON.stringify(purchasePayload);
    const afgSignature = hmacSha256Hex(afgSecret, normalizedBody);
    const purchaseUrl = new URL("/api/purchase", req.nextUrl.origin).toString();

    const forwardRes = await fetch(purchaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-afg-signature": afgSignature,
      },
      body: normalizedBody,
    });

    const forwardText = await forwardRes.text();
    return new NextResponse(forwardText, {
      status: forwardRes.status,
      headers: {
        "Content-Type": forwardRes.headers.get("Content-Type") || "application/json",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    console.error("square appointments webhook unhandled error:", err);
    return NextResponse.json(
      { error: "unhandled_webhook_error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
