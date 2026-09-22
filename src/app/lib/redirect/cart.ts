// Cart-state lookup for Shopify clients.
//
// The redirect endpoint can route based on whether the visitor has an open
// cart (and how old / how large). Two data sources, in priority order:
//
//   1. chapter_ingest.pixel_events — most recent add_to_cart / view_cart event
//      for this identity within a window (default 24h). Already in our DB,
//      zero external calls, sub-ms lookup. This is the fast path.
//
//   2. (Future) Shopify Storefront API direct lookup with the cart_token
//      cookie. Only fires when (1) returns no recent activity but the
//      visitor's browser has a Shopify cart_token cookie. Adds ~50-100ms
//      latency, so we keep it behind a feature flag per client.
//
// For v1 we ship just path (1) — covers >95% of cases at the latency budget.
// Path (2) is added when a client demonstrably needs cart info from a fresh
// browser with no Chapter pixel history.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type CartContext = {
  has_open_cart: boolean;
  hours_since_cart: number | null;  // null when no cart found
  cart_event_count: number;          // add_to_cart + view_cart events in window
};

/**
 * Passed when the redirect route DELIBERATELY SKIPPED the cart lookup because
 * no enabled rule on the slug reads a cart condition. See SKIPPED_SEGMENTS in
 * segments.ts for the full reasoning — same contract.
 */
export const SKIPPED_CART: CartContext = {
  has_open_cart: false,
  hours_since_cart: null,
  cart_event_count: 0,
};

// 14 days, matching Shopify's cart cookie lifetime (which rolls forward from
// LAST ACTIVITY, not creation — measured on EOS: 377 of 6,309 carts spanned
// >14d, max 114d). Beyond that the cart is genuinely gone, so this is a
// principled ceiling rather than an arbitrary one.
//
// WAS 24h, which made the headline use case impossible: hours_since_cart is
// derived only from events INSIDE this window, so it could never exceed 24 and
// `cart_older_than_hours: 72` (3-day abandonment) was structurally unsatisfiable
// — it silently evaluated false forever. Cost was real: of 800 EOS anonymous
// identities that added to cart, 499 (62%) were still active on the SAME anon_id
// 3+ days later (max span 70d). The durable 1P cookie was working; the window
// was throwing the population away.
//
// NOTE: cart conditions do NOT require identity stitching — this queries the raw
// identity_key, so an anonymous visitor's own cart is visible to them.
const CART_LOOKBACK_HOURS = 24 * 14;

export async function resolveCart(
  client_key: string,
  identityKey: string
): Promise<CartContext> {
  // Recent cart-signal events for this identity. We trust the identity_key
  // verbatim — if it's an anonymous_id, we only see THIS browser's events;
  // if it's an email_sha256 or other canonical, we see all stitched activity.
  const since = new Date(Date.now() - CART_LOOKBACK_HOURS * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .schema("chapter_ingest")
    .from("pixel_events")
    .select("ts, event_name")
    .eq("client_key", client_key)
    .eq("identity_key", identityKey)
    .in("event_name", ["add_to_cart", "view_cart"])
    .gte("ts", since)
    .order("ts", { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    return { has_open_cart: false, hours_since_cart: null, cart_event_count: 0 };
  }

  const mostRecent = data[0].ts as string;
  const hoursSince = (Date.now() - new Date(mostRecent).getTime()) / 3_600_000;
  return {
    has_open_cart: true,
    hours_since_cart: hoursSince,
    // Capped by the .limit(50) above — treat as "at least this many" rather than
    // exact, especially now the window is 14 days. No condition reads it today;
    // has_open_cart and hours_since_cart use only data[0] (the most recent), so
    // the cap cannot affect either of them.
    cart_event_count: data.length,
  };
}
