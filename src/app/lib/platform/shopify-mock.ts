// MI v2 Phase 5 — Shopify mock adapter.
//
// Returns realistic-looking fake data so the offer flow can be demoed end-to-
// end without a live Shopify store connected. The visitor sees a modal, enters
// a bid, the evaluator decides accept/counter/decline, the email delivery
// system sends a real email with a realistic-format code like `CHAPTER-AB12CD34`,
// and the admin review queue shows real state transitions. Only the outbound
// Shopify API call is faked.
//
// Post-signing, once a client's real Shopify credentials are stored in
// chapter_config.clients.esp_credentials_jsonb, the adapter selector swaps
// this out for `shopify.ts` — no code changes elsewhere.

import { randomBytes } from "crypto";
import type {
  PlatformAdapter,
  PlatformFeature,
  ProductInfo,
  DiscountCodeConfig,
  DiscountCode,
} from "./types";

const MOCK_PRODUCTS: Record<string, Omit<ProductInfo, "id">> = {
  // Realistic prices/names so demo output feels natural.
  "shopify-mock-hoodie": {
    name: "Chapter Classic Hoodie",
    price: 79.0,
    currency: "USD",
    in_stock: true,
    image_url: "https://placehold.co/240x240?text=Hoodie",
    handle: "chapter-classic-hoodie",
  },
  "shopify-mock-tee": {
    name: "Everyday Tee",
    price: 32.0,
    currency: "USD",
    in_stock: true,
    image_url: "https://placehold.co/240x240?text=Tee",
    handle: "everyday-tee",
  },
  "shopify-mock-jacket": {
    name: "Winter Jacket",
    price: 189.0,
    currency: "USD",
    in_stock: false,
    image_url: "https://placehold.co/240x240?text=Jacket",
    handle: "winter-jacket",
  },
};

// Generate a Shopify-style discount code: prefix + 8 uppercase alphanumerics.
// Real Shopify codes look similar (e.g. "CHAPTER-9F3XK2QR").
function generateCode(prefix: string): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // No confusable chars (0/O, 1/I/L)
  let suffix = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    suffix += alphabet[bytes[i]! % alphabet.length];
  }
  return `${prefix}${suffix}`;
}

export const shopifyMockAdapter: PlatformAdapter = {
  name: "shopify-mock",

  isSupported(feature: PlatformFeature): boolean {
    // Mock adapter reports full Shopify capabilities so the demo shows the
    // fully-featured flow. Real adapter with missing creds falls back to
    // this same mock — so isSupported always returns true here.
    return feature === "discount_code" ||
      feature === "inventory_polling" ||
      feature === "price_polling";
    // cart_detection stays false — Chapter uses its own pixel-based cart
    // tracking. Adapter would only claim this for platform-native detection.
  },

  async getProduct(_client_key: string, product_id: string): Promise<ProductInfo | null> {
    const known = MOCK_PRODUCTS[product_id];
    if (known) return { id: product_id, ...known };
    // Any unknown ID gets a synthesized product so demos aren't blocked on
    // catalog fixtures. Price varies with the id string so different products
    // don't all look identical.
    const hash = Array.from(product_id).reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      id: product_id,
      name: `Product ${product_id.slice(-6).toUpperCase()}`,
      price: 39 + (hash % 60),
      currency: "USD",
      in_stock: hash % 10 !== 0,  // ~10% out-of-stock for realism
      image_url: "https://placehold.co/240x240?text=Product",
      handle: product_id.toLowerCase(),
    };
  },

  async createDiscountCode(
    _client_key: string,
    config: DiscountCodeConfig,
  ): Promise<DiscountCode | null> {
    const prefix = config.prefix || "CHAPTER-";
    const code = generateCode(prefix);
    // Small artificial latency so demos don't feel suspiciously instant.
    await new Promise((r) => setTimeout(r, 250));
    return {
      code,
      // The `url` deeplink mimics Shopify's `/discount/CODE` cart-preload
      // pattern; without a real store domain we point to a placeholder.
      url: `https://example.myshopify.com/discount/${code}`,
      provider_price_rule_id: `mock_pr_${Date.now()}`,
      expires_at: config.expires_at,
    };
  },
};
