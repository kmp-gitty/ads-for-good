// MI v2 Phase 5 — Square platform adapter (stub).
//
// Square Appointments (services / bookings) doesn't map cleanly to the
// Make-an-Offer flow, which assumes cart-abandonment and product SKUs. When
// a Square client wants Remind Me (Phase 6) — e.g. "notify me when my barber
// has an opening" — that flows through Square's Bookings availability API,
// which is a different code path than product inventory polling.
//
// For now this adapter is a full stub. Real implementation lands when the
// first Square client asks for offer or subscription functionality.

import type {
  PlatformAdapter,
  PlatformFeature,
  ProductInfo,
  DiscountCodeConfig,
  DiscountCode,
} from "./types";

export const squareAdapter: PlatformAdapter = {
  name: "square",

  isSupported(_feature: PlatformFeature): boolean {
    // Nothing supported until we build the real integration.
    return false;
  },

  async getProduct(_client_key: string, _product_id: string): Promise<ProductInfo | null> {
    return null;
  },

  async createDiscountCode(
    _client_key: string,
    _config: DiscountCodeConfig,
  ): Promise<DiscountCode | null> {
    return null;
  },
};
