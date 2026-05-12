import { createClient } from "@supabase/supabase-js";

// Reads per-client HMAC secrets from chapter_config.client_secrets (Fix #26 part 3).
// Replaces the legacy `AFG_CLIENT_SECRETS_JSON` env-var dict.
//
// Supports rotation: multiple non-revoked rows per client_key allowed.
// - getActiveSecrets() returns ALL non-revoked secrets (newest first). Auth code
//   tries each in turn — both new and old secrets are valid during an overlap
//   window until the old one is hard-revoked (revoked_at set).
// - getActiveSecretForOutbound() returns the SINGLE newest active secret —
//   used by Shopify webhooks when they sign their internal calls to /api/purchase.

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

export async function getActiveSecrets(client_key: string): Promise<string[]> {
  const now = Date.now();
  const cached = cache.get(client_key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.secrets;
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("client_secrets")
    .select("secret, key_version")
    .eq("client_key", client_key)
    .is("revoked_at", null)
    .order("key_version", { ascending: false });

  if (error) {
    console.error("[client-secrets] lookup failed:", error);
    return [];
  }

  const secrets = ((data ?? []) as Array<{ secret: string }>).map((r) => r.secret);
  cache.set(client_key, { secrets, fetchedAt: now });
  return secrets;
}

export async function getActiveSecretForOutbound(
  client_key: string
): Promise<string | null> {
  const secrets = await getActiveSecrets(client_key);
  return secrets[0] ?? null;
}

// Called by tests or manual rotation tooling to invalidate cache.
export function clearClientSecretsCache(client_key?: string): void {
  if (client_key) cache.delete(client_key);
  else cache.clear();
}
