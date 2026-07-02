// Square Bookings webhook adapter.
//
// Receives booking.* webhook events from Square and forwards them to the
// internal /api/purchase route as Chapter "boundary events." For a personal-
// services client whose chapter_config.clients.boundary_event_name is
// 'appointment_booked', each booking creation lands as a purchase_events
// row, identity-stitched via customer email_sha256 → identity_canon.
//
// URL path note: the route still lives at /api/square/webhooks/appointments
// for backwards compatibility with the webhook subscription URL (Square's
// developer dashboard requires re-saving a subscription to change the URL).
// Square renamed the API surface from "appointments" to "bookings" — the
// modern event types are booking.created and booking.updated (covers both
// changes AND cancellations in one event).
//
// Mirrors src/app/api/shopify/webhooks/orders-create/route.ts:
// - HMAC verification per-merchant (vs per-shop for Shopify)
// - Multi-tenant resolved from payload `merchant_id` → chapter_config.clients
// - Forwards to /api/purchase with x-afg-signature so the purchase route
//   handles the actual DB write + identity stitch (single point of truth).
//
// Square's webhook signature (HMAC-SHA-256, base64) covers the concatenation
// of (notification_url + raw_body) — different from Shopify's body-only.
// Multiple non-revoked signing keys are tried (rotation overlap).
//
// Event types we handle:
//   booking.created   → boundary event, lands as purchase_events row
//   booking.updated   → IGNORED for v1 (covers reschedule + cancellation in
//                        one event; re-emitting would double-count boundaries
//                        and cancel semantics need a separate refund-style
//                        path that we haven't built yet)

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecretForOutbound } from "@/app/lib/auth/client-secrets";
import { getActiveSquareSecrets } from "@/app/lib/auth/square-webhook-secrets";
import { fetchSquareCustomer } from "@/app/lib/square/customers";
import { attemptProbabilisticStitch } from "@/app/lib/square/probabilistic-stitch";

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
          booking?: Record<string, unknown>;
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

    // Only process booking.created in v1. Other event types (booking.updated
    // covers reschedule + cancellation) ack-and-skip so Square doesn't keep
    // retrying. Cancellation/refund semantics will land in a separate path
    // when we wire payment.updated REFUNDED handling.
    if (eventType !== "booking.created") {
      return NextResponse.json({ ok: true, skipped: eventType }, { status: 200 });
    }

    const booking = event.data?.object?.booking;
    if (!booking || typeof booking !== "object") {
      return NextResponse.json({ error: "missing_booking_payload" }, { status: 400 });
    }

    const bookingId = typeof booking.id === "string" ? booking.id : null;
    const customerId = typeof booking.customer_id === "string" ? booking.customer_id : null;

    // event_ts must reflect when the BOOKING was made (boundary event for
    // attribution), NOT when the service is scheduled to happen. Priority:
    //   1. booking.created_at — when the booking record was created
    //   2. event.created_at   — when Square emitted the webhook (~same moment)
    //   3. now()              — fallback if neither present
    // We intentionally do NOT use booking.start_at here — that's when the
    // service occurs (possibly hours or days later), which would put the
    // lifecycle chapter's boundary in the future relative to the customer's
    // actual journey.
    const bookingCreatedAt = typeof (booking as Record<string, unknown>).created_at === "string"
      ? ((booking as Record<string, unknown>).created_at as string)
      : null;
    const eventTs = bookingCreatedAt || event.created_at || new Date().toISOString();

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
      source_platform: "square_bookings",
      event_id:        bookingId ? `square_booking_created_${bookingId}` : null,
      event_name:      "appointment_booked",      // matches chapter_config.clients.boundary_event_name
      // order_id = bookingId so the downstream payment webhook can JOIN on
      // the same key when it emits appointment_paid.
      order_id:        bookingId,
      payment_id:      null,
      customer_id:     customerId ? `square_customer_id:${customerId}` : null,
      email:           enrichedEmail,              // Sprint 2.3 v2 alt
      phone:           enrichedPhone,              // Sprint 2.3 v2: phone-first stitching
      value:           0,                          // bookings have no $$ amount at booking; payment.created fills in
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
        booking: sanitizeSquareAppointmentForRaw(booking),
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
      return NextResponse.json({ error: "missing_booking_identifier" }, { status: 400 });
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

    // Fire-and-forget probabilistic time-window stitch: only when /api/purchase
    // succeeded AND we have a target identity (customer_id) AND a booking_id.
    // Runs after the response is queued but before we return.
    if (forwardRes.ok && bookingId && purchasePayload.customer_id) {
      const stitchInput = {
        client_key: clientKey,
        booking_id: bookingId,
        booking_created_at: eventTs,
        target_identity_key: purchasePayload.customer_id,
      };
      // Not awaited — errors log internally and don't block response.
      void attemptProbabilisticStitch(stitchInput).then((result) => {
        if (result.matched) {
          console.log(
            `[stitch] client=${clientKey} booking=${bookingId} matched anonymous=${result.from_identity_key} confidence=${result.confidence} candidates=${result.candidates_count}`
          );
        }
      });
    }

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
