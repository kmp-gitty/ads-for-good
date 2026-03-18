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

function sanitizeShopifyOrderForRaw(order: any) {
  if (!order || typeof order !== "object") return order;

  const clone = JSON.parse(JSON.stringify(order));

  // Top-level PII
  delete clone.email;
  delete clone.contact_email;
  delete clone.phone;
  delete clone.browser_ip;
  delete clone.billing_address;
  delete clone.shipping_address;
  delete clone.note_attributes;

  if (clone.client_details && typeof clone.client_details === "object") {
    delete clone.client_details.browser_ip;
  }

  if (clone.customer && typeof clone.customer === "object") {
    delete clone.customer.email;
    delete clone.customer.phone;
    delete clone.customer.first_name;
    delete clone.customer.last_name;
    delete clone.customer.name;
    delete clone.customer.default_address;
    delete clone.customer.note;
    delete clone.customer.multipass_identifier;
  }

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

  try {
    const shopifyHmac = (req.headers.get("x-shopify-hmac-sha256") || "").trim();
    const shopDomain = (req.headers.get("x-shopify-shop-domain") || "").trim();
    const topic = (req.headers.get("x-shopify-topic") || "").trim();

    const shopifySecret = process.env.SHOPIFY_API_SECRET;
    if (!shopifySecret) {
      return NextResponse.json({ error: "missing_shopify_secret" }, { status: 500 });
    }

    if (!verifyShopifyWebhook(rawBody, shopifyHmac, shopifySecret)) {
      return NextResponse.json({ error: "invalid_shopify_hmac" }, { status: 401 });
    }

    let order: any;
    try {
      order = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const clientKey = "eos_fabrics";

    const afgSecretsJson = process.env.AFG_CLIENT_SECRETS_JSON;
    if (!afgSecretsJson) {
      return NextResponse.json({ error: "missing_afg_client_secrets" }, { status: 500 });
    }

    let afgSecret: string | null = null;
    try {
      const parsed = JSON.parse(afgSecretsJson) as Record<string, string>;
      afgSecret = parsed[clientKey] ?? null;
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

    const cancellationPayload = {
      client_key: clientKey,
      event_name: "order_cancelled",
      source_platform: "shopify",
      event_id: order?.id ? `shopify_order_cancelled_${String(order.id)}` : null,
      lead_id: null,
      appointment_id: null,
      form_id: null,
      email,
      customer_id: order?.customer?.id ? `shopify_customer_id:${String(order.customer.id)}` : null,
      value: totalPrice,
      currency,
      event_ts:
        order?.cancelled_at ||
        order?.updated_at ||
        order?.processed_at ||
        order?.created_at ||
        new Date().toISOString(),
      page_url: order?.order_status_url || null,
      referrer: order?.referring_site || order?.landing_site || null,
      raw: {
        shop_domain: shopDomain,
        topic,
        order: sanitizeShopifyOrderForRaw(order),
      },
    };

    if (!cancellationPayload.event_id) {
      return NextResponse.json({ error: "missing_order_identifier" }, { status: 400 });
    }

    if (!cancellationPayload.source_platform) {
      return NextResponse.json({ error: "missing_source_platform" }, { status: 400 });
    }

    if (!cancellationPayload.email && !cancellationPayload.customer_id) {
      return NextResponse.json({ error: "missing_cancellation_identity" }, { status: 400 });
    }

    const normalizedBody = JSON.stringify(cancellationPayload);
    const afgSignature = hmacSha256Hex(afgSecret, normalizedBody);

    const conversionUrl = new URL("/api/conversion", req.nextUrl.origin).toString();

    const forwardRes = await fetch(conversionUrl, {
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
    console.error("shopify orders-cancelled webhook unhandled error:", err);
    return NextResponse.json(
      {
        error: "unhandled_webhook_error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}