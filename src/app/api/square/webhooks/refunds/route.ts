// Square Refunds webhook adapter.
//
// Receives refund.* webhook events and inserts into chapter_ingest.refund_events
// when a refund completes. Sprint 3's refund-netting in dashboard RPCs
// (purchase_overview, channel_performance_overview, dashboard_timeseries)
// then automatically subtracts the refunded amount from net revenue + AOV
// without any further code change — that plumbing was built platform-agnostic
// and reads from refund_events JOIN purchase_events on order_id.
//
// Why a separate route from /payments:
//   - Square emits refund.* events distinct from payment.*; each has its own
//     dedicated webhook subscription and signing key
//   - refund object has its own id, payment_id, order_id, amount_money
//   - Keeps the payments route focused on payment.created (the appointment_paid
//     emit path) — refund handling has different semantics and would muddle it
//
// Event types we handle:
//   refund.created   → IGNORED if status != COMPLETED; insert if status = COMPLETED
//   refund.updated   → insert if status transitions to COMPLETED
//
// Why both events: Square emits refund.created with status PENDING when a refund
// is initiated, then refund.updated when it settles. Idempotent INSERT via
// ON CONFLICT DO NOTHING means catching both is safe — first COMPLETED wins.
//
// Webhook subscription URL: /api/square/webhooks/refunds (separate from the
// bookings + payments subscriptions).

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSquareSecrets } from "@/app/lib/auth/square-webhook-secrets";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";

const ENDPOINT = "/api/square/webhooks/refunds";

function verifySquareWebhook(
  rawBody: string,
  signatureHeader: string,
  notificationUrl: string,
  signingKey: string,
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

// Sanitize the refund payload before stashing in `raw`. Strip processing fees
// (vendor-side) and any customer-identifying scraps Square might have embedded.
// Returns Record<string, unknown> (never the unmodified input) so callers can
// pass directly to postgres-js's tx.json() which requires a JSONValue shape.
function sanitizeRefundForRaw(refund: unknown): Record<string, unknown> {
  if (!refund || typeof refund !== "object") return {};
  const clone = JSON.parse(JSON.stringify(refund)) as Record<string, unknown>;
  // No known customer-PII fields on refunds today; defensive deletes in case
  // Square's payload shape evolves.
  delete clone.buyer_email_address;
  delete clone.team_member_id;
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
          refund?: Record<string, unknown>;
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

    // Each subscription has its own (notification_url + signing_key). The
    // refunds subscription's signature matches against ITS row in the table;
    // mismatched rows fail verifySquareWebhook naturally.
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

    if (!isKnownClient(clientKey)) {
      return NextResponse.json({ error: "no_per_client_role" }, { status: 500 });
    }

    // Only refund.created and refund.updated reach the COMPLETED path here.
    // Square emits refund.created with status PENDING when initiated, then
    // refund.updated when it transitions to COMPLETED. We catch either path.
    if (eventType !== "refund.created" && eventType !== "refund.updated") {
      return NextResponse.json({ ok: true, skipped: eventType }, { status: 200 });
    }

    const refund = event.data?.object?.refund;
    if (!refund || typeof refund !== "object") {
      return NextResponse.json({ error: "missing_refund_payload" }, { status: 400 });
    }

    const status = typeof refund.status === "string" ? refund.status : null;
    if (status !== "COMPLETED") {
      // PENDING / REJECTED / FAILED don't reduce reported revenue. Ack-and-skip;
      // refund.updated will fire when the status transitions.
      return NextResponse.json({ ok: true, skipped_status: status }, { status: 200 });
    }

    const refundId = typeof refund.id === "string" ? refund.id : null;
    const orderId = typeof refund.order_id === "string" ? refund.order_id : null;
    if (!refundId || !orderId) {
      return NextResponse.json({ error: "missing_refund_or_order_id" }, { status: 400 });
    }

    // Amount: Square sends amount_money.amount in minor units (cents).
    const amountMoney = (refund as Record<string, unknown>).amount_money as
      | { amount?: number; currency?: string }
      | undefined;
    const amountCents = typeof amountMoney?.amount === "number" ? amountMoney.amount : 0;
    if (amountCents <= 0) {
      return NextResponse.json({ ok: true, skipped: "zero_amount" }, { status: 200 });
    }
    const amount = amountCents / 100;
    const currency = amountMoney?.currency || "USD";

    // refund_ts: prefer updated_at (when it settled to COMPLETED), then
    // created_at, then event.created_at.
    const refundUpdatedAt = typeof (refund as Record<string, unknown>).updated_at === "string"
      ? ((refund as Record<string, unknown>).updated_at as string)
      : null;
    const refundCreatedAt = typeof (refund as Record<string, unknown>).created_at === "string"
      ? ((refund as Record<string, unknown>).created_at as string)
      : null;
    const refundTs = refundUpdatedAt || refundCreatedAt || event.created_at || new Date().toISOString();

    const prefixedRefundId = `square_refund_${refundId}`;

    await withClient(clientKey, async (tx) => {
      await tx`
        INSERT INTO chapter_ingest.refund_events
          (refund_id, client_key, order_id, shop_domain, amount, currency, refund_ts, raw)
        VALUES
          (${prefixedRefundId}, ${clientKey}, ${orderId}, NULL,
           ${amount}, ${currency}, ${refundTs}, ${tx.json({
             merchant_id: merchantId,
             topic: eventType,
             event_id: event.event_id || null,
             refund: sanitizeRefundForRaw(refund),
           })}::jsonb)
        ON CONFLICT (refund_id) DO NOTHING
      `;
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("square refunds webhook unhandled error:", err);
    return NextResponse.json(
      { error: "unhandled_webhook_error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
