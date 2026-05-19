import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAuthAttempt, hashIp, getClientIp } from "@/app/lib/audit/auth";
import { getActiveWebhookSecrets } from "@/app/lib/auth/shopify-webhook-secrets";
import { withClient } from "@/app/lib/db/per-client";

const ENDPOINT = "/api/shopify/webhooks/refunds-create";

const SHOPIFY_SHOP_DOMAIN_TO_CLIENT_KEY: Record<string, string> = {
  "emmaonesock.myshopify.com": "eos_fabrics",
  "projectagram.myshopify.com": "projectagram_reels",
};
function resolveClientKey(shopDomain: string | null): string | null {
  if (!shopDomain) return null;
  return SHOPIFY_SHOP_DOMAIN_TO_CLIENT_KEY[shopDomain] ?? null;
}

function verifyShopifyWebhook(rawBody: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  if (!hmacHeader || hmacHeader.length !== digest.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

type ShopifyTransaction = {
  kind?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
};

function sumRefundTransactions(transactions: ShopifyTransaction[] | undefined): { amount: number; currency: string | null } {
  if (!Array.isArray(transactions)) return { amount: 0, currency: null };
  let amount = 0;
  let currency: string | null = null;
  for (const t of transactions) {
    if (t?.kind !== "refund" || t?.status !== "success") continue;
    const n = Number(t.amount);
    if (Number.isFinite(n)) amount += n;
    if (!currency && typeof t.currency === "string") currency = t.currency;
  }
  return { amount, currency };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ipHash = hashIp(getClientIp(req));
  const ua = req.headers.get("user-agent");

  try {
    const shopifyHmac = (req.headers.get("x-shopify-hmac-sha256") || "").trim();
    const shopDomain = (req.headers.get("x-shopify-shop-domain") || "").trim();

    const resolvedClientKey = resolveClientKey(shopDomain);
    if (!resolvedClientKey) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: null, success: false,
        failure_reason: "unknown_shopify_shop", ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "unknown_shopify_shop" }, { status: 401 });
    }

    const shopifySecrets = await getActiveWebhookSecrets(shopDomain);
    if (shopifySecrets.length === 0) {
      await logAuthAttempt({
        endpoint: ENDPOINT, client_key: resolvedClientKey, success: false,
        failure_reason: "missing_shopify_secret", ip_hash: ipHash, user_agent_snippet: ua,
      });
      return NextResponse.json({ error: "missing_shopify_secret" }, { status: 500 });
    }

    let hmacOk = false;
    for (const secret of shopifySecrets) {
      if (verifyShopifyWebhook(rawBody, shopifyHmac, secret)) { hmacOk = true; break; }
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

    let refund: { id?: string | number; order_id?: string | number; created_at?: string; processed_at?: string; transactions?: ShopifyTransaction[] };
    try { refund = JSON.parse(rawBody); }
    catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

    if (!refund?.id || !refund?.order_id) {
      return NextResponse.json({ error: "missing_refund_or_order_id" }, { status: 400 });
    }

    const { amount, currency } = sumRefundTransactions(refund.transactions);
    if (amount <= 0) {
      // Shopify can emit refund events with $0 transactions (e.g. restock-only).
      // Acknowledge with 200 so it isn't retried.
      return NextResponse.json({ ok: true, skipped: "zero_amount" });
    }

    const refundTs = refund.processed_at || refund.created_at || new Date().toISOString();
    const refundId = `shopify_refund_${String(refund.id)}`;
    const orderId = String(refund.order_id);

    await withClient(resolvedClientKey, async (tx) => {
      await tx`
        INSERT INTO chapter_ingest.refund_events
          (refund_id, client_key, order_id, shop_domain, amount, currency, refund_ts, raw)
        VALUES
          (${refundId}, ${resolvedClientKey}, ${orderId}, ${shopDomain},
           ${amount}, ${currency}, ${refundTs}, ${tx.json(refund)}::jsonb)
        ON CONFLICT (refund_id) DO NOTHING
      `;
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("shopify refunds-create webhook unhandled error:", err);
    return NextResponse.json(
      { error: "unhandled_webhook_error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
