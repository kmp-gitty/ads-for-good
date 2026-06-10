import { createClient } from "@supabase/supabase-js";

// Reads per-merchant Square webhook signing secrets from
// chapter_config.square_webhook_secrets.
//
// Mirrors src/app/lib/auth/shopify-webhook-secrets.ts:
// - getActiveSquareSecrets() returns ALL non-revoked entries for a merchant_id
//   (newest first). Webhook auth tries each in turn — supports overlap window
//   during rotation (Square regen).
// - Also returns notification_url + client_key so the route doesn't need a
//   second lookup to resolve the multi-tenant key.
// - 5-min in-memory cache per Vercel function instance.

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SquareSecretRow = {
  client_key: string;
  notification_url: string;
  signature_key: string;
};

type CacheEntry = {
  rows: SquareSecretRow[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getActiveSquareSecrets(merchant_id: string): Promise<SquareSecretRow[]> {
  const now = Date.now();
  const cached = cache.get(merchant_id);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rows;
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("square_webhook_secrets")
    .select("client_key, notification_url, signature_key, created_at")
    .eq("merchant_id", merchant_id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[square-webhook-secrets] lookup failed:", error);
    return [];
  }

  const rows = ((data ?? []) as Array<SquareSecretRow & { created_at: string }>).map((r) => ({
    client_key: r.client_key,
    notification_url: r.notification_url,
    signature_key: r.signature_key,
  }));
  cache.set(merchant_id, { rows, fetchedAt: now });
  return rows;
}

export function clearSquareWebhookSecretsCache(merchant_id?: string): void {
  if (merchant_id) cache.delete(merchant_id);
  else cache.clear();
}
