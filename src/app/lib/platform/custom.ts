// MI v2 Phase 5 — Custom platform adapter (degraded).
//
// For clients with no supported commerce platform integration (or standalone
// storefronts where Chapter is only used for identity capture + attribution),
// this adapter provides a bare-minimum path:
//   - createDiscountCode returns a code STRING only (no store validation).
//     The operator distributes this code to the customer and manually honors
//     it at their checkout — Chapter has no visibility into redemption.
//   - getProduct returns null (no product data available).
//
// This makes Make-an-Offer usable in a "manual coupon" mode: visitor bids,
// Chapter emails them a code, operator credits the discount at checkout.

import { randomBytes } from "crypto";
import type {
  PlatformAdapter,
  PlatformFeature,
  ProductInfo,
  DiscountCodeConfig,
  DiscountCode,
} from "./types";

function generateManualCode(prefix: string): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) suffix += alphabet[bytes[i]! % alphabet.length];
  return `${prefix}${suffix}`;
}

export const customAdapter: PlatformAdapter = {
  name: "custom",

  isSupported(feature: PlatformFeature): boolean {
    // Manual codes only. No inventory / price polling because there's no
    // catalog API to poll.
    return feature === "discount_code";
  },

  async getProduct(_client_key: string, _product_id: string): Promise<ProductInfo | null> {
    return null;
  },

  async createDiscountCode(
    _client_key: string,
    config: DiscountCodeConfig,
  ): Promise<DiscountCode | null> {
    const prefix = config.prefix || "CHAPTER-";
    // No store validation, no deeplink URL — operator handles redemption
    // manually. The code is still stored in chapter_engagement.offers.
    return {
      code: generateManualCode(prefix),
      expires_at: config.expires_at,
    };
  },
};
