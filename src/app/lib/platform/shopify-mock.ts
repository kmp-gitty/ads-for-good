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
import { createClient } from "@supabase/supabase-js";
import type {
  PlatformAdapter,
  PlatformFeature,
  ProductInfo,
  DiscountCodeConfig,
  DiscountCode,
} from "./types";

// DB-backed mock state (chapter_config.mock_products). Written 2026-07-28 as
// Phase 6a foundation. Lets operators flip inventory/price via SQL during
// dev/testing so the Remind Me cron detects state transitions and fires
// notifications end-to-end without a live Shopify store. Falls back to the
// hardcoded MOCK_PRODUCTS below when no DB row exists for a product_id
// (backward-compat for the existing Make an Offer demo prompts).
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function fetchMockProductFromDb(
  client_key: string,
  product_id: string,
): Promise<ProductInfo | null> {
  try {
    const { data } = await supabase
      .schema("chapter_config")
      .from("mock_products")
      .select("product_id, name, price, currency, in_stock, inventory_count, image_url, handle")
      .eq("client_key", client_key)
      .eq("product_id", product_id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: (data as { product_id: string }).product_id,
      name: (data as { name: string }).name,
      price: Number((data as { price: number | string }).price),
      currency: (data as { currency: string }).currency,
      in_stock: (data as { in_stock: boolean }).in_stock,
      inventory_count: (data as { inventory_count: number | null }).inventory_count ?? undefined,
      image_url: (data as { image_url: string | null }).image_url ?? undefined,
      handle: (data as { handle: string | null }).handle ?? undefined,
    };
  } catch {
    // Never let a mock-adapter DB lookup break the caller. Fall through to
    // the hardcoded MOCK_PRODUCTS pathway.
    return null;
  }
}

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

  async getProduct(client_key: string, product_id: string): Promise<ProductInfo | null> {
    // 1) DB-backed mock state (chapter_config.mock_products) — flippable via SQL
    //    so the Remind Me cron can detect state transitions during dev/testing.
    const dbRow = await fetchMockProductFromDb(client_key, product_id);
    if (dbRow) return dbRow;
    // 2) Hardcoded MOCK_PRODUCTS fallback — preserves the pre-Phase-6a
    //    Make an Offer demo behavior. No DB round-trip needed for these ids.
    const known = MOCK_PRODUCTS[product_id];
    if (known) return { id: product_id, ...known };
    // 3) Any unknown ID gets a synthesized product so demos aren't blocked on
    //    catalog fixtures. Price varies with the id string so different products
    //    don't all look identical.
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
