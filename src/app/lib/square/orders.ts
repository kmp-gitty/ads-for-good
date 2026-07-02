// Square Orders API client. Fetches an Order record by ID to extract the
// service line items + team member — used to improve booking↔payment matching
// on the split-flow (Appointments + POS) clients.
//
// NSC pattern: booking creates a booking record with appointment_segments
// listing (service_variation_id, team_member_id). At service time staff runs
// a POS charge; the resulting Payment.order_id references an Order whose
// line_items[].catalog_object_id === the booking's service_variation_id
// (and created_by_team_member_id === team_member_id). The pair gives us a
// much tighter "which booking is this payment for" match than customer_id
// alone.
//
// Best-effort: never throws. Returns null on 401/404/network error/JSON parse
// failure. Caller sees null and continues without the enrichment.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TokenRow = {
  access_token: string;
  environment: "sandbox" | "production";
};

type CacheEntry = { row: TokenRow; fetchedAt: number };
const tokenCache = new Map<string, CacheEntry>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

const SQUARE_API_BASE: Record<TokenRow["environment"], string> = {
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com",
};

async function getActiveToken(merchant_id: string): Promise<TokenRow | null> {
  const now = Date.now();
  const cached = tokenCache.get(merchant_id);
  if (cached && now - cached.fetchedAt < TOKEN_CACHE_TTL_MS) return cached.row;

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("square_oauth_tokens")
    .select("access_token, environment, created_at")
    .eq("merchant_id", merchant_id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[square-orders] token lookup failed:", error);
    return null;
  }

  const row: TokenRow = {
    access_token: data.access_token as string,
    environment: data.environment as "sandbox" | "production",
  };
  tokenCache.set(merchant_id, { row, fetchedAt: now });
  return row;
}

export type SquareOrderLineItem = {
  catalog_object_id: string | null;
  name: string | null;
  variation_name: string | null;
  quantity: string | null;
};

export type SquareOrderSummary = {
  id: string;
  customer_id: string | null;
  created_by_team_member_id: string | null;
  line_items: SquareOrderLineItem[];
  // True if any line item is Square's "Late Cancellation/No Show Fee"
  // placeholder — indicates this Order was tied to an appointment for
  // card-on-file no-show protection (vs. pure POS walk-in).
  is_appointment_linked: boolean;
};

const NO_SHOW_FEE_MARKERS = [
  "late cancellation",
  "no show",
  "no-show",
  "cancellation fee",
];

/**
 * Fetch a Square Order by ID. Returns null on any failure. Extracted fields
 * are the minimum needed for booking↔payment matching; the raw Order lives
 * in Square's API response and is not stored beyond what we return here.
 */
export async function fetchSquareOrder(
  merchant_id: string,
  order_id: string
): Promise<SquareOrderSummary | null> {
  const token = await getActiveToken(merchant_id);
  if (!token) {
    console.warn(`[square-orders] no active token for merchant ${merchant_id}`);
    return null;
  }

  const url = `${SQUARE_API_BASE[token.environment]}/v2/orders/${encodeURIComponent(order_id)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token.access_token}`,
        "Square-Version": "2024-12-18",
        "Accept": "application/json",
      },
    });
  } catch (err) {
    console.error("[square-orders] fetch failed:", err);
    return null;
  }

  if (res.status === 401) {
    tokenCache.delete(merchant_id);
    console.warn(`[square-orders] 401 for merchant ${merchant_id} — token likely expired`);
    return null;
  }
  if (!res.ok) {
    console.error(`[square-orders] non-OK ${res.status} fetching ${order_id}`);
    return null;
  }

  let body: { order?: Record<string, unknown> };
  try {
    body = await res.json();
  } catch {
    return null;
  }

  const order = body.order;
  if (!order || typeof order !== "object") return null;

  const rawLineItems = Array.isArray((order as Record<string, unknown>).line_items)
    ? ((order as Record<string, unknown>).line_items as Array<Record<string, unknown>>)
    : [];

  const line_items: SquareOrderLineItem[] = rawLineItems.map((li) => ({
    catalog_object_id: typeof li.catalog_object_id === "string" ? li.catalog_object_id : null,
    name: typeof li.name === "string" ? li.name : null,
    variation_name: typeof li.variation_name === "string" ? li.variation_name : null,
    quantity: typeof li.quantity === "string" ? li.quantity : null,
  }));

  const is_appointment_linked = line_items.some((li) => {
    const nameLower = (li.name || "").toLowerCase();
    return NO_SHOW_FEE_MARKERS.some((m) => nameLower.includes(m));
  });

  return {
    id: typeof order.id === "string" ? order.id : order_id,
    customer_id: typeof order.customer_id === "string" ? order.customer_id : null,
    created_by_team_member_id:
      typeof order.created_by_team_member_id === "string" ? order.created_by_team_member_id : null,
    line_items,
    is_appointment_linked,
  };
}
