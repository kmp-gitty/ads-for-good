import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  console.log("SHOPIFY WEBHOOK HIT");

  const shopifyHmac = (req.headers.get("x-shopify-hmac-sha256") || "").trim();
  const shopDomain = (req.headers.get("x-shopify-shop-domain") || "").trim();
  const topic = (req.headers.get("x-shopify-topic") || "").trim();

  console.log("shopify webhook headers", {
    hasHmac: !!shopifyHmac,
    shopDomain,
    topic,
  });

  const shopifySecret = process.env.SHOPIFY_API_SECRET;
  if (!shopifySecret) {
    return NextResponse.json({ error: "missing_shopify_secret" }, { status: 500 });
  }

  console.log("has SHOPIFY_API_SECRET:", !!shopifySecret);
  if (!verifyShopifyWebhook(rawBody, shopifyHmac, shopifySecret)) {
    return NextResponse.json({ error: "invalid_shopify_hmac" }, { status: 401 });
  }
  console.log("shopify webhook hmac verified");
  
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

  const clientKey = "eos_fabrics";

  const afgSecretsJson = process.env.AFG_CLIENT_SECRETS_JSON;

  console.log("has AFG_CLIENT_SECRETS_JSON:", !!afgSecretsJson);
  
  if (!afgSecretsJson) {
    return NextResponse.json({ error: "missing_afg_client_secrets" }, { status: 500 });
  }

  let afgSecret: string | null = null;
try {
  const parsed = JSON.parse(afgSecretsJson) as Record<string, string>;
  console.log("parsed AFG secrets JSON successfully");
  afgSecret = parsed[clientKey] ?? null;
  console.log("has EOS client secret:", !!afgSecret);
} catch {
  return NextResponse.json({ error: "invalid_afg_client_secrets_json" }, { status: 500 });
}

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
    event_ts: order?.processed_at || order?.updated_at || order?.created_at || new Date().toISOString(),
    coupon,
    shipping,
    tax,
    raw: {
      shop_domain: shopDomain,
      topic,
      order,
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
    return NextResponse.json({ error: "missing_purchase_identity" }, { status: 400 });
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
}