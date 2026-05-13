import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveSecretForOutbound } from "@/app/lib/auth/client-secrets";
import { getActiveWebhookSecrets } from "@/app/lib/auth/shopify-webhook-secrets";

const ENDPOINT = "/api/shopify/webhooks/orders-create";

// Multi-tenant: resolve client_key from the x-shopify-shop-domain header.
// Add a row here when onboarding a new Shopify client.
const SHOPIFY_SHOP_DOMAIN_TO_CLIENT_KEY: Record<string, string> = {
  "emmaonesock.myshopify.com": "eos_fabrics",
  "projectagram.myshopify.com": "projectagram_reels",
};
function resolveClientKey(shopDomain: string | null): string | null {
  if (!shopDomain) return null;
  return SHOPIFY_SHOP_DOMAIN_TO_CLIENT_KEY[shopDomain] ?? null;
}

function verifyShopifyWebhook(rawBody: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  if (!hmacHeader || hmacHeader.length !== digest.length) return false;

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

function hmacSha256Hex(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeShopifyOrderForRaw(order: any) {
  if (!order || typeof order !== "object") return order;

  const clone = JSON.parse(JSON.stringify(order));

  // Top-level direct PII
  delete clone.email;
  delete clone.contact_email;
  delete clone.phone;
  delete clone.browser_ip;

  // Full address objects
  delete clone.billing_address;
  delete clone.shipping_address;

  // Client/browser details
  if (clone.client_details && typeof clone.client_details === "object") {
    delete clone.client_details.browser_ip;
  }

  // Customer object
  if (clone.customer && typeof clone.customer === "object") {
    delete clone.customer.email;
    delete clone.customer.phone;
    delete clone.customer.first_name;
    delete clone.customer.last_name;
    delete clone.customer.default_address;
    delete clone.customer.note;
    delete clone.customer.multipass_identifier;
    delete clone.customer.name;
  }

  // Shipping line phones
  if (Array.isArray(clone.shipping_lines)) {
    clone.shipping_lines = clone.shipping_lines.map((line: any) => {
      if (!line || typeof line !== "object") return line;
      const next = { ...line };
      delete next.phone;
      delete next.name;
      return next;
    });
  }

  return clone;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ipHash = hashIp(getClientIp(req));
  const ua = req.headers.get("user-agent");

  try {

    const shopifyHmac = (req.headers.get("x-shopify-hmac-sha256") || "").trim();
    const shopDomain = (req.headers.get("x-shopify-shop-domain") || "").trim();
    const topic = (req.headers.get("x-shopify-topic") || "").trim();

    // Resolve client_key from shop domain (multi-tenant). Reject if shop unknown.
    const resolvedClientKey = resolveClientKey(shopDomain);
    if (!resolvedClientKey) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: null, success: false,
        failure_reason: "unknown_shopify_shop", ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "unknown_shopify_shop" }, { status: 401 });
    }

    // Per-shop webhook secret lookup (replaces SHOPIFY_API_SECRET env var).
    const shopifySecrets = await getActiveWebhookSecrets(shopDomain);
    if (shopifySecrets.length === 0) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: resolvedClientKey, success: false,
        failure_reason: "missing_shopify_secret", ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "missing_shopify_secret" }, { status: 500 });
    }

    // Try each active secret. Supports rotation overlap window — both old + new
    // valid until old is hard-revoked.
    let hmacOk = false;
    for (const secret of shopifySecrets) {
      if (verifyShopifyWebhook(rawBody, shopifyHmac, secret)) {
        hmacOk = true;
        break;
      }
    }

    if (!hmacOk) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: resolvedClientKey, success: false,
        failure_reason: shopifyHmac.length === 0 ? "missing_shopify_hmac" : "invalid_shopify_hmac",
        ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "invalid_shopify_hmac" }, { status: 401 });
    }

    await logAuthAttempt({
      endpoint: ENDPOINT, client_key: resolvedClientKey, success: true,
      ip_hash: ipHash, user_agent_snippet: ua,
    });


    let order: any;
    try {
      order = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    // Only treat paid orders as purchases
    const financialStatus = String(order?.financial_status || "").toLowerCase();
    if (financialStatus !== "paid") {
      return NextResponse.json(
        {
          status: "ignored",
          reason: "order_not_paid",
          financial_status: financialStatus || null,
        },
        { status: 200 }
      );
    }

    const clientKey = resolvedClientKey;

    // Fix #26 part 3: read newest active secret from chapter_config.client_secrets
    // (replaces AFG_CLIENT_SECRETS_JSON env var). Outbound HMAC signing uses
    // the newest non-revoked secret only.
    const afgSecret = await getActiveSecretForOutbound(clientKey);
    if (!afgSecret) {
      return NextResponse.json({ error: "missing_afg_secret_for_client" }, { status: 500 });
    }

    const email =
      typeof order?.email === "string" && order.email.trim()
        ? normalizeEmail(order.email)
        : typeof order?.customer?.email === "string" && order.customer.email.trim()
          ? normalizeEmail(order.customer.email)
          : null;

    const currency = order?.currency || order?.presentment_currency || null;

    const totalPrice =
      order?.total_price != null && !Number.isNaN(Number(order.total_price))
        ? Number(order.total_price)
        : null;

    const shipping =
      order?.total_shipping_price_set?.shop_money?.amount != null
        ? Number(order.total_shipping_price_set.shop_money.amount)
        : order?.total_shipping_price_set?.presentment_money?.amount != null
          ? Number(order.total_shipping_price_set.presentment_money.amount)
          : null;

    const tax =
      order?.total_tax != null && !Number.isNaN(Number(order.total_tax))
        ? Number(order.total_tax)
        : null;

    const coupon =
      Array.isArray(order?.discount_codes) && order.discount_codes.length
        ? order.discount_codes.map((d: any) => d.code).filter(Boolean).join(",")
        : null;

    const userAgent =
      typeof order?.client_details?.user_agent === "string"
        ? order.client_details.user_agent
        : null;

    const purchasePayload = {
      client_key: clientKey,
      source_platform: "shopify",
      event_id: order?.id ? `shopify_orders_create_paid_${String(order.id)}` : null,
      order_id: order?.id ? String(order.id) : null,
      payment_id:
        Array.isArray(order?.payment_gateway_names) && order.payment_gateway_names.length
          ? order.payment_gateway_names.join(",")
          : null,
      customer_id: order?.customer?.id ? `shopify_customer_id:${String(order.customer.id)}` : null,
      email,
      value: totalPrice,
      currency,
      event_ts:
        order?.processed_at ||
        order?.updated_at ||
        order?.created_at ||
        new Date().toISOString(),
      coupon,
      shipping,
      tax,
      user_agent: userAgent,
      raw: {
        shop_domain: shopDomain,
        topic,
        order: sanitizeShopifyOrderForRaw(order),
      },
    };

    if (!purchasePayload.order_id && !purchasePayload.event_id) {
      return NextResponse.json({ error: "missing_order_identifier" }, { status: 400 });
    }

    if (typeof purchasePayload.value !== "number" || !isFinite(purchasePayload.value)) {
      return NextResponse.json({ error: "invalid_order_value" }, { status: 400 });
    }

    if (!purchasePayload.currency) {
      return NextResponse.json({ error: "missing_order_currency" }, { status: 400 });
    }

    if (!purchasePayload.email && !purchasePayload.customer_id) {
      // Fix #19: orders without an email or customer_id are common from
      // non-online-store sources (Shopify POS / Quick Sale walk-ins, mobile app,
      // draft order conversions). Don't drop them — synthesize a deterministic
      // anonymous identity from the source_name + order_id so they land in
      // purchase_events. Reporting can filter by raw->>order->>source_name.
      const sourceNameRaw = typeof order?.source_name === "string" ? order.source_name : "";
      const sourceName = sourceNameRaw.trim().toLowerCase().replace(/\s+/g, "_");

      if (sourceName && order?.id != null) {
        purchasePayload.customer_id = `shopify_${sourceName}_anonymous:${String(order.id)}`;
      } else {
        // No identity AND no source_name (or no order id) — malformed webhook.
        return NextResponse.json({ error: "missing_purchase_identity" }, { status: 400 });
      }
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
    console.error("shopify orders-create webhook unhandled error:", err);
    return NextResponse.json(
      {
        error: "unhandled_webhook_error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}