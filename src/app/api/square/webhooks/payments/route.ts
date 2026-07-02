// Square Payments webhook adapter.
//
// Receives payment.* webhook events from Square and forwards them to
// /api/purchase as Chapter "appointment_paid" downstream events. Pairs with
// /api/square/webhooks/appointments which emits "appointment_booked" boundary
// events on booking.created.
//
// Per-customer journey shape (separate rows in chapter_ingest.purchase_events):
//   1. appointment_booked  — boundary event, value = 0. Closes the lifecycle
//                            chapter so attribution can credit the channel that
//                            brought the booking.
//   2. appointment_paid    — downstream event, value = actual payment amount.
//                            Same order_id as the booking so dashboards can
//                            JOIN to compute booking → paid fulfillment rate.
//   3. (future) refunds via payment.updated with REFUNDED status will INSERT
//      into chapter_ingest.refund_events; Sprint 3 refund netting already
//      handles the dashboard math.
//
// Event types we handle:
//   payment.created   → emit appointment_paid (if status COMPLETED)
//   payment.updated   → REFUND handling DEFERRED (writes to refund_events)
//
// Webhook subscription URL: /api/square/webhooks/payments (separate from the
// bookings subscription so subscriptions can rotate signing keys independently).

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecretForOutbound } from "@/app/lib/auth/client-secrets";
import { getActiveSquareSecrets } from "@/app/lib/auth/square-webhook-secrets";
import { fetchSquareCustomer } from "@/app/lib/square/customers";
import { fetchSquareOrder } from "@/app/lib/square/orders";

const ENDPOINT = "/api/square/webhooks/payments";

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

// Sanitize the payment payload for `raw` column storage. Strip card details,
// receipt URLs, and any other potentially-sensitive fields. We keep amount,
// status, order_id — the load-bearing attribution data.
function sanitizePaymentForRaw(payment: unknown): unknown {
  if (!payment || typeof payment !== "object") return payment;
  const clone = JSON.parse(JSON.stringify(payment)) as Record<string, unknown>;
  delete clone.card_details;
  delete clone.receipt_url;
  delete clone.receipt_number;
  delete clone.note;
  delete clone.buyer_email_address;
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
    const sigHeader = (req.headers.get("x-square-hmacsha256-signature") || "").trim();

    let event: {
      merchant_id?: string;
      type?: string;
      event_id?: string;
      created_at?: string;
      data?: {
        type?: string;
        id?: string;
        object?: {
          payment?: Record<string, unknown>;
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

    const secrets = await getActiveSquareSecrets(merchantId);
    if (secrets.length === 0) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: null, success: false,
        failure_reason: "unknown_square_merchant", ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "unknown_square_merchant" }, { status: 401 });
    }

    // Match against any active subscription's signing key for this merchant.
    // The payments subscription may have a different signing key than bookings,
    // but both are stored against the same merchant_id in square_webhook_secrets.
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

    // For v1: only payment.created with status COMPLETED becomes a chapter
    // event. payment.updated handling (refunds, partial captures) is deferred.
    if (eventType !== "payment.created") {
      return NextResponse.json({ ok: true, skipped: eventType }, { status: 200 });
    }

    // Heavy work in after() so Square's ~10s gateway timeout doesn't get us.
    // HMAC is already verified above. Errors log server-side; Square doesn't
    // need to know about downstream outcomes (idempotency handles retries).
    after(async () => {
      try {
        const payment = event.data?.object?.payment;
        if (!payment || typeof payment !== "object") {
          console.warn(
            `[payments] missing_payment_payload merchant=${merchantId} event_id=${event.event_id || "unknown"}`
          );
          return;
        }

        const status = typeof payment.status === "string" ? payment.status : null;
        if (status !== "COMPLETED") {
          // Ack-and-skip in-flight / failed payments. payment.updated fires
          // when status transitions to COMPLETED.
          return;
        }

        const paymentId = typeof payment.id === "string" ? payment.id : null;
        const orderId = typeof payment.order_id === "string" ? payment.order_id : null;
        const customerId = typeof payment.customer_id === "string" ? payment.customer_id : null;

        const amountMoney = (payment as Record<string, unknown>).amount_money as
          | { amount?: number; currency?: string }
          | undefined;
        const valueCents = typeof amountMoney?.amount === "number" ? amountMoney.amount : 0;
        const value = valueCents / 100;
        const currency = amountMoney?.currency || "USD";

        const paymentCreatedAt = typeof (payment as Record<string, unknown>).created_at === "string"
          ? ((payment as Record<string, unknown>).created_at as string)
          : null;
        const eventTs = paymentCreatedAt || event.created_at || new Date().toISOString();

        // Fetch AFG secret + Square Customer + Square Order all in parallel.
        // Order fetch adds precision to booking↔payment matching: the Order's
        // line_items[].catalog_object_id + created_by_team_member_id can be
        // matched to a booking's appointment_segments to link a specific
        // payment to a specific booking (better than customer+time alone).
        const [afgSecret, sqCustomer, sqOrder] = await Promise.all([
          getActiveSecretForOutbound(clientKey),
          customerId ? fetchSquareCustomer(merchantId, customerId) : Promise.resolve(null),
          orderId ? fetchSquareOrder(merchantId, orderId) : Promise.resolve(null),
        ]);
        if (!afgSecret) {
          console.error(`[payments] missing_afg_secret_for_client client=${clientKey}`);
          return;
        }

        const enrichedEmail = sqCustomer?.email_address?.trim() || null;
        const enrichedPhone = sqCustomer?.phone_number?.trim() || null;

        const purchasePayload = {
          client_key:      clientKey,
          source_platform: "square_payments",
          event_id:        paymentId ? `square_payment_created_${paymentId}` : null,
          event_name:      "appointment_paid",
          order_id:        orderId,
          payment_id:      paymentId,
          customer_id:     customerId ? `square_customer_id:${customerId}` : null,
          email:           enrichedEmail,
          phone:           enrichedPhone,
          value:           value,
          currency:        currency,
          event_ts:        eventTs,
          coupon:          null,
          shipping:        null,
          tax:             null,
          user_agent:      null,
          raw: {
            merchant_id: merchantId,
            topic: eventType,
            event_id: event.event_id || null,
            payment: sanitizePaymentForRaw(payment),
            enriched: {
              email: Boolean(enrichedEmail),
              phone: Boolean(enrichedPhone),
              order: Boolean(sqOrder),
            },
            // Order summary from Square Orders API — the fields we need to
            // match payments to bookings via (service_variation_id +
            // team_member_id). Only stored if the Order fetch succeeded.
            order_summary: sqOrder
              ? {
                  order_id:                   sqOrder.id,
                  created_by_team_member_id:  sqOrder.created_by_team_member_id,
                  service_variation_ids:      sqOrder.line_items
                    .map((li) => li.catalog_object_id)
                    .filter((x): x is string => typeof x === "string"),
                  line_item_names:            sqOrder.line_items
                    .map((li) => li.name)
                    .filter((x): x is string => typeof x === "string"),
                  is_appointment_linked:      sqOrder.is_appointment_linked,
                }
              : null,
          },
        };

        if (!purchasePayload.customer_id && !purchasePayload.email) {
          console.warn(
            `[payments] missing_payment_identity client=${clientKey} payment=${paymentId}`
          );
          return;
        }
        if (!purchasePayload.payment_id && !purchasePayload.event_id) {
          console.warn(`[payments] missing_payment_identifier client=${clientKey}`);
          return;
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

        if (!forwardRes.ok) {
          const errText = await forwardRes.text().catch(() => "<no body>");
          console.error(
            `[payments] purchase forward failed client=${clientKey} payment=${paymentId} status=${forwardRes.status} body=${errText.slice(0, 200)}`
          );
        }
      } catch (err) {
        console.error(
          `[payments] background processing failed merchant=${merchantId} event_id=${event.event_id || "unknown"}:`,
          err
        );
      }
    });

    // Immediate ack to Square. All downstream processing continues in after().
    return NextResponse.json({ ok: true, queued: true }, { status: 200 });
  } catch (err) {
    console.error("square payments webhook unhandled error:", err);
    return NextResponse.json(
      { error: "unhandled_webhook_error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
