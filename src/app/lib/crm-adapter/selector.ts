// CRM adapter selector (2026-07-27).
//
// Reads chapter_config.clients.crm_provider for the given client_key and
// returns the matching adapter. Null provider → null return (caller no-ops).
// 5-min in-memory cache to avoid a DB round-trip per submission.

import { createClient } from "@supabase/supabase-js";
import type { CrmAdapter, CrmProvider } from "./types";
import { internalAdapter } from "./internal";
import { klaviyoAdapter } from "./klaviyo";
import { mailchimpAdapter } from "./mailchimp";
import { hubspotAdapter } from "./hubspot";
import { salesforceAdapter } from "./salesforce";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const CACHE_TTL_MS = 5 * 60 * 1000;
type ClientCrmConfig = {
  provider: CrmProvider | null;
  fetched_at: number;
};
const cache = new Map<string, ClientCrmConfig>();

async function loadClientCrmConfig(client_key: string): Promise<ClientCrmConfig> {
  const cached = cache.get(client_key);
  if (cached && Date.now() - cached.fetched_at < CACHE_TTL_MS) {
    return cached;
  }
  const { data } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("crm_provider")
    .eq("client_key", client_key)
    .maybeSingle();
  const provider = ((data as { crm_provider: string | null } | null)?.crm_provider ?? null) as
    | CrmProvider
    | null;
  const fresh: ClientCrmConfig = { provider, fetched_at: Date.now() };
  cache.set(client_key, fresh);
  return fresh;
}

const ADAPTERS: Record<CrmProvider, CrmAdapter> = {
  chapter_internal: internalAdapter,
  klaviyo: klaviyoAdapter,
  mailchimp: mailchimpAdapter,
  hubspot: hubspotAdapter,
  salesforce: salesforceAdapter,
  custom: {
    provider: "custom",
    async upsertLead() {
      return {
        action: "not_implemented",
        provider: "custom",
        reason: "Custom-webhook adapter not yet wired — fill in when first client asks",
      };
    },
  },
};

/** Returns the CRM adapter for this client, or null if none is configured. */
export async function selectCrmAdapter(client_key: string): Promise<CrmAdapter | null> {
  const { provider } = await loadClientCrmConfig(client_key);
  if (!provider) return null;
  const adapter = ADAPTERS[provider];
  return adapter ?? null;
}

/** Test-only. Bust the cache for a client_key (e.g. after operator flips crm_provider). */
export function clearCrmAdapterCache(client_key?: string): void {
  if (client_key) cache.delete(client_key);
  else cache.clear();
}
