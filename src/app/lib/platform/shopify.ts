// MI v2 Phase 5 — Real Shopify adapter (post-signing wire-up).
//
// This file is the seam where real Shopify Admin API calls will live. The
// selector picks this adapter when:
//   - client.platform = 'shopify'
//   - client.esp_credentials_jsonb has a valid shopify_access_token + shop_domain
//   - PLATFORM_ADAPTER_MODE !== 'mock'
//
// For the July Shopify sales conversation, the mock adapter (shopify-mock.ts)
// handles all demos — real wiring is deferred until a signed client is ready
// to hand over their Admin API credentials. When that happens:
//   1. Store credentials in chapter_config.clients.esp_credentials_jsonb:
//      { "shopify_access_token": "shpat_xxx", "shop_domain": "xxx.myshopify.com" }
//   2. Set PLATFORM_ADAPTER_MODE=real in Vercel env (or omit — default is real
//      when credentials are present)
//   3. Adapter selector routes to this file — the flows above (offer submit,
//      subscription evaluation, email delivery) don't change.
//
// The stubs below throw with a clear "not implemented" message. They will
// never actually be reached in production until we've validated the code path
// with a live store — which requires client + engineering coordination.
//
// Reference for future implementation:
//   Discount codes: Shopify Admin GraphQL — priceRuleCreate + discountCodeCreate
//                   (both wrapped in a single mutation for atomicity).
//   Product info:    Shopify Admin GraphQL — product(id: ID!) with inventoryPolicy
//                    + variants { price, inventoryQuantity }.

import type {
  PlatformAdapter,
  PlatformFeature,
  ProductInfo,
  DiscountCodeConfig,
  DiscountCode,
} from "./types";

type ShopifyCreds = {
  shopify_access_token: string;
  shop_domain: string;  // e.g. "notsocavalier.myshopify.com"
};

// Extract Shopify credentials from a client config's esp_credentials_jsonb.
// Returns null if the shape is invalid — caller falls through to mock.
export function readShopifyCreds(
  esp_credentials_jsonb: Record<string, unknown> | null | undefined,
): ShopifyCreds | null {
  if (!esp_credentials_jsonb) return null;
  const token = esp_credentials_jsonb["shopify_access_token"];
  const domain = esp_credentials_jsonb["shop_domain"];
  if (typeof token !== "string" || !token.startsWith("shpat_")) return null;
  if (typeof domain !== "string" || !domain.endsWith(".myshopify.com")) return null;
  return { shopify_access_token: token, shop_domain: domain };
}

export const shopifyAdapter: PlatformAdapter = {
  name: "shopify",

  isSupported(feature: PlatformFeature): boolean {
    return feature === "discount_code" ||
      feature === "inventory_polling" ||
      feature === "price_polling";
  },

  async getProduct(_client_key: string, _product_id: string): Promise<ProductInfo | null> {
    // TODO(post-signing): implement using Shopify Admin GraphQL.
    // - Load creds from chapter_config.clients.esp_credentials_jsonb
    // - POST to https://<shop_domain>/admin/api/2025-04/graphql.json
    // - Query: product(id: "gid://shopify/Product/${product_id}") {
    //     title, handle, featuredImage { url },
    //     variants(first: 1) { edges { node { price, inventoryQuantity } } }
    //   }
    // - Best-effort: return null on any failure so caller can fall through.
    console.warn("[shopify-adapter] getProduct not implemented — returning null");
    return null;
  },

  async createDiscountCode(
    _client_key: string,
    _config: DiscountCodeConfig,
  ): Promise<DiscountCode | null> {
    // TODO(post-signing): implement using Shopify Admin GraphQL.
    // Combined mutation for atomicity (priceRule + code both created or neither):
    //   mutation {
    //     priceRuleCreate(priceRule: {
    //       title: "Chapter Offer",
    //       target: LINE_ITEM,
    //       allocationMethod: ACROSS,
    //       valueType: FIXED_AMOUNT,
    //       value: -${amount_off},
    //       customerSelection: { forAllCustomers: true },
    //       usageLimit: ${max_uses ?? 1},
    //       startsAt: now(),
    //       endsAt: ${expires_at}
    //     }) { priceRule { id }, userErrors { message } }
    //   }
    // Then priceRuleDiscountCodeCreate to attach the code string.
    console.warn("[shopify-adapter] createDiscountCode not implemented — returning null");
    return null;
  },
};
