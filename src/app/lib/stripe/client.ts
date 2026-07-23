// Stripe SDK singleton. Server-only — reads STRIPE_SECRET_KEY (a restricted
// rk_ key; test rk_test_… now, live rk_live_… later). apiVersion is left at the
// SDK's pinned default so types stay consistent.

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  _stripe = new Stripe(key);
  return _stripe;
}

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
