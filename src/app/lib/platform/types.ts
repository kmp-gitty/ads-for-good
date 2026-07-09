// MI v2 Phase 5 — Platform adapter abstraction.
//
// The offer + subscription systems (Phases 5 + 6) need to interact with the
// visitor's underlying commerce platform for two things: reading product
// state (name / price / inventory) and creating discount codes. Every client
// has different commerce infrastructure — Shopify, Square Appointments,
// custom builds, none-at-all — so we abstract behind a small interface.
//
// The adapter is selected per-client via `chapter_config.clients.platform`:
//   'shopify' → shopify.ts (full impl when credentials are set) / shopify-mock.ts
//   'square'  → square.ts (partial — Catalog API for services; discount codes
//                          require investigation; may return null for some ops)
//   'custom'  → custom.ts (degraded — no product API; generates code strings
//                          the operator manually honors at checkout)
//
// Design intent (locked in the July 5 Path A planning session):
// - Every adapter method must return null / boolean-false gracefully rather
//   than throw, so calling code can log-and-continue instead of failing an
//   offer submission whenever the platform API hiccups.
// - Adapter selection is env-aware: PLATFORM_ADAPTER_MODE=mock forces the
//   mock adapter for Shopify (useful for local dev + pre-signing demos)
//   even when real credentials are configured. Production defaults to
//   real when credentials present, mock otherwise.

export type PlatformFeature =
  | "discount_code"       // Can generate real store-honored discount codes
  | "cart_detection"      // Can read visitor's active cart from the platform
  | "inventory_polling"   // Can poll product inventory for back-in-stock triggers
  | "price_polling";      // Can poll product price for price-drop triggers

export type ProductInfo = {
  id: string;
  name: string;
  price: number;         // In the store's currency, decimal (e.g. 59.99)
  currency: string;      // ISO code (USD, EUR, etc.)
  in_stock: boolean;
  image_url?: string;
  handle?: string;       // URL slug when the platform uses one (Shopify handle)
};

export type DiscountCodeConfig = {
  // Exactly one of amount_off or percentage_off must be set.
  amount_off?: number;         // Dollar amount, e.g. 10 for $10 off
  percentage_off?: number;     // 0–100
  // Restrict to specific products/collections when the platform supports it.
  product_ids?: string[];
  collection_ids?: string[];
  // Usage constraints.
  max_uses?: number;           // Global cap; default 1 for one-time offer codes
  once_per_customer?: boolean; // Default true
  expires_at?: string;         // ISO timestamp
  // Presentation.
  prefix?: string;             // Injected at code-generation time (e.g. "CHAPTER-")
  minimum_order_amount?: number;
};

export type DiscountCode = {
  code: string;                // The redeemable string, e.g. "CHAPTER-AB12CD34"
  url?: string;                // Optional deeplink to cart with code applied
  provider_price_rule_id?: string; // Shopify priceRule ID / provider-native ID
  expires_at?: string;
};

export type PlatformAdapter = {
  name: string;

  // Feature availability check. Callers should probe this before invoking
  // a method to know whether to expect a real response.
  isSupported(feature: PlatformFeature): boolean;

  // Look up product state. Returns null when unavailable (unsupported feature,
  // credentials missing, product not found, network error).
  getProduct(client_key: string, product_id: string): Promise<ProductInfo | null>;

  // Create a unique discount code redeemable at checkout on the client's
  // commerce platform. Returns null when:
  //  - the platform doesn't support discount codes
  //  - the client hasn't configured credentials
  //  - the platform API rejected the request (log the error server-side)
  createDiscountCode(
    client_key: string,
    config: DiscountCodeConfig,
  ): Promise<DiscountCode | null>;
};
