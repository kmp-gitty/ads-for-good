// Server-only: fetch the live monthly amount for each tool straight from Stripe
// so the Billing UI can never drift from what Stripe actually charges. Cached
// per-isolate for an hour (prices change rarely). Falls back to sane defaults if
// Stripe is unreachable / not configured (e.g. preview without a key).

import { getStripe, stripeConfigured } from "./client";
import { BILLABLE_TOOLS, PRICE_ID, type BillableTool } from "./config";

const FALLBACK: Record<BillableTool, number> = { smart_prompts: 19.99, smart_links: 9.99 };
const TTL_MS = 60 * 60 * 1000;

let cache: { at: number; prices: Record<BillableTool, number> } | null = null;

export async function getToolPrices(): Promise<Record<BillableTool, number>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.prices;
  if (!stripeConfigured()) return { ...FALLBACK };

  const stripe = getStripe();
  const prices = { ...FALLBACK };
  await Promise.all(
    BILLABLE_TOOLS.map(async (t) => {
      try {
        const p = await stripe.prices.retrieve(PRICE_ID[t]);
        if (typeof p.unit_amount === "number") prices[t] = p.unit_amount / 100;
      } catch {
        /* keep fallback */
      }
    }),
  );
  cache = { at: Date.now(), prices };
  return prices;
}
