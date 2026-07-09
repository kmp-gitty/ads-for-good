// MI v2 Phase 5 — Adapter selector.
//
// Picks the platform adapter for a given client based on:
//   - client.platform column ('shopify' | 'square' | 'custom')
//   - client.esp_credentials_jsonb (real Shopify requires valid creds)
//   - PLATFORM_ADAPTER_MODE env var ('mock' forces mocks for Shopify)
//
// Selection matrix:
//                              | mode=mock       | mode=real (default)      |
//   platform=shopify (creds)   | shopifyMock     | shopifyReal              |
//   platform=shopify (no creds)| shopifyMock     | shopifyMock (fallback)   |
//   platform=square            | squareAdapter   | squareAdapter            |
//   platform=custom            | customAdapter   | customAdapter            |
//
// Callers should invoke `selectAdapter(client)` once per request and reuse
// the returned instance. Adapters are stateless singletons.

import { createClient } from "@supabase/supabase-js";
import type { PlatformAdapter } from "./types";
import { shopifyAdapter } from "./shopify";
import { shopifyMockAdapter } from "./shopify-mock";
import { readShopifyCreds } from "./shopify";
import { squareAdapter } from "./square";
import { customAdapter } from "./custom";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ClientPlatformConfig = {
  platform: "shopify" | "square" | "custom";
  esp_credentials_jsonb: Record<string, unknown> | null;
};

type CacheEntry = { config: ClientPlatformConfig; fetchedAt: number };
const configCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadClientConfig(client_key: string): Promise<ClientPlatformConfig | null> {
  const now = Date.now();
  const cached = configCache.get(client_key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.config;

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("platform, esp_credentials_jsonb")
    .eq("client_key", client_key)
    .maybeSingle();

  if (error || !data) return null;

  const platform = (data.platform as string | null) === "shopify"
    ? "shopify"
    : (data.platform as string | null) === "square"
      ? "square"
      : "custom";

  const config: ClientPlatformConfig = {
    platform,
    esp_credentials_jsonb: (data.esp_credentials_jsonb as Record<string, unknown> | null) ?? null,
  };
  configCache.set(client_key, { config, fetchedAt: now });
  return config;
}

export function clearAdapterCache(client_key?: string): void {
  if (client_key) configCache.delete(client_key);
  else configCache.clear();
}

export async function selectAdapter(client_key: string): Promise<PlatformAdapter> {
  const config = await loadClientConfig(client_key);
  if (!config) return customAdapter; // Unknown client → safest degraded path.

  const mode = process.env.PLATFORM_ADAPTER_MODE || "real";

  switch (config.platform) {
    case "shopify": {
      if (mode === "mock") return shopifyMockAdapter;
      // Real mode: use real adapter only if creds are valid, else fall back
      // to mock so demos + development work without production credentials.
      return readShopifyCreds(config.esp_credentials_jsonb)
        ? shopifyAdapter
        : shopifyMockAdapter;
    }
    case "square":
      return squareAdapter;
    case "custom":
    default:
      return customAdapter;
  }
}
