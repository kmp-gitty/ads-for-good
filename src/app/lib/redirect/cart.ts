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

const CART_LOOKBACK_HOURS = 24;

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
    cart_event_count: data.length,
  };
}
