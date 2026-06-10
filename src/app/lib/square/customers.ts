// Square Customers API client. Fetches a Customer record by ID to extract
// email + phone so the booking webhook can stitch identity into identity_canon.
//
// Sprint 2.3 v2 alt — webhook payload only includes customer_id; we fetch the
// rest here. Mirrors the per-merchant secrets pattern: per-merchant access
// token lookup with a small in-memory cache, environment-aware base URL.
//
// Defaults (sandbox vs production) picked from the row's `environment` column
// in chapter_config.square_oauth_tokens. No env vars; everything per-merchant.

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
  if (cached && now - cached.fetchedAt < TOKEN_CACHE_TTL_MS) {
    return cached.row;
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("square_oauth_tokens")
    .select("access_token, environment, expires_at, created_at")
    .eq("merchant_id", merchant_id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[square-customers] token lookup failed:", error);
    return null;
  }

  const row: TokenRow = {
    access_token: data.access_token as string,
    environment: data.environment as "sandbox" | "production",
  };
  tokenCache.set(merchant_id, { row, fetchedAt: now });
  return row;
}

export function clearSquareTokenCache(merchant_id?: string): void {
  if (merchant_id) tokenCache.delete(merchant_id);
  else tokenCache.clear();
}

export type SquareCustomer = {
  id: string;
  email_address: string | null;
  phone_number: string | null;
  given_name: string | null;
  family_name: string | null;
};

/**
 * Fetch a Square Customer record by ID. Returns null if the merchant has no
 * active token (caller can ship the boundary event without enrichment), if
 * Square 404s the customer, or on any network/API error (caller logs).
 *
 * The function is best-effort by design: a Square API hiccup must NOT block
 * the boundary event from landing in purchase_events.
 */
export async function fetchSquareCustomer(
  merchant_id: string,
  customer_id: string
): Promise<SquareCustomer | null> {
  const token = await getActiveToken(merchant_id);
  if (!token) {
    console.warn(`[square-customers] no active token for merchant ${merchant_id}`);
    return null;
  }

  const url = `${SQUARE_API_BASE[token.environment]}/v2/customers/${encodeURIComponent(customer_id)}`;

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
    console.error("[square-customers] fetch failed:", err);
    return null;
  }

  if (res.status === 401) {
    // Token expired or revoked; invalidate the cache so the next call re-reads
    // from DB (after the operator rotates).
    clearSquareTokenCache(merchant_id);
    console.warn(`[square-customers] 401 for merchant ${merchant_id} — token likely expired`);
    return null;
  }

  if (!res.ok) {
    console.error(`[square-customers] non-OK ${res.status} fetching ${customer_id}`);
    return null;
  }

  let body: { customer?: Partial<SquareCustomer> };
  try {
    body = await res.json();
  } catch {
    return null;
  }

  const c = body.customer;
  if (!c || !c.id) return null;
  return {
    id: c.id,
    email_address: c.email_address ?? null,
    phone_number: c.phone_number ?? null,
    given_name: c.given_name ?? null,
    family_name: c.family_name ?? null,
  };
}
