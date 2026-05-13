import { createClient } from "@supabase/supabase-js";

// Reads per-shop Shopify webhook signing secrets from
// chapter_config.shopify_webhook_secrets. Replaces the legacy
// SHOPIFY_API_SECRET env var (which only supported one shop).
//
// Mirrors src/app/lib/auth/client-secrets.ts:
// - getActiveWebhookSecrets() returns ALL non-revoked secrets for a shop
//   (newest first). Webhook auth tries each in turn — supports overlap
//   window during rotation (Shopify regen).
// - 5-min in-memory cache per Vercel function instance.

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CacheEntry = {
  secrets: string[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getActiveWebhookSecrets(shop_domain: string): Promise<string[]> {
  const now = Date.now();
  const cached = cache.get(shop_domain);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.secrets;
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("shopify_webhook_secrets")
    .select("secret, created_at")
    .eq("shop_domain", shop_domain)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[shopify-webhook-secrets] lookup failed:", error);
    return [];
  }

  const secrets = ((data ?? []) as Array<{ secret: string }>).map((r) => r.secret);
  cache.set(shop_domain, { secrets, fetchedAt: now });
  return secrets;
}

export function clearShopifyWebhookSecretsCache(shop_domain?: string): void {
  if (shop_domain) cache.delete(shop_domain);
  else cache.clear();
}
