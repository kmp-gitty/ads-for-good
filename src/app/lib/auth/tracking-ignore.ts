// Tracking ignore-list lookups.
//
// One source of truth for "should we drop this event?" decisions across:
//   - /api/identify (drop identify event if email is on the list)
//   - /api/purchase (ack the webhook but don't write the row)
//   - Tier 1 redirect click logger (skip the pixel_event insert + journey upsert)
//   - Mailchimp engagement sync (skip rows whose recipient resolves to an ignored email)
//
// Pre-computed sets cached for 5 minutes in-memory per lambda. Stale by at most
// 5 min after an operator adds/removes a row — acceptable trade-off vs hitting
// the DB on every single ingest event. For testing/QA: bounce the function (or
// just wait 5 min).

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CACHE_TTL_MS = 5 * 60 * 1000;

type IgnoreEntry = {
  client_key: string | null; // null = global
  ignore_value: string;
};

type CachedSet = {
  fetched_at: number;
  global: Set<string>; // values where client_key IS NULL
  per_client: Map<string, Set<string>>; // client_key → values
};

const cacheByType: Map<string, CachedSet> = new Map();

async function loadType(ignore_type: "email_sha256" | "ua_substring"): Promise<CachedSet> {
  const cached = cacheByType.get(ignore_type);
  const now = Date.now();
  if (cached && now - cached.fetched_at < CACHE_TTL_MS) return cached;

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("tracking_ignore_list")
    .select("client_key, ignore_value")
    .eq("ignore_type", ignore_type)
    .is("revoked_at", null);

  if (error) {
    console.error("[tracking-ignore] load failed:", error);
    // Fail-open: if we can't read the table, don't suppress events (better to
    // collect data we shouldn't than to silently drop everything in a config bug).
    return { fetched_at: now, global: new Set(), per_client: new Map() };
  }

  const result: CachedSet = { fetched_at: now, global: new Set(), per_client: new Map() };
  for (const row of (data ?? []) as IgnoreEntry[]) {
    if (row.client_key === null) {
      result.global.add(row.ignore_value);
    } else {
      const set = result.per_client.get(row.client_key) ?? new Set<string>();
      set.add(row.ignore_value);
      result.per_client.set(row.client_key, set);
    }
  }
  cacheByType.set(ignore_type, result);
  return result;
}

/**
 * True if `email_sha256` should be suppressed for `client_key`. Checks both the
 * global list (NULL client_key rows) and the per-client list.
 */
export async function isEmailIgnored(
  client_key: string,
  email_sha256: string | null | undefined,
): Promise<boolean> {
  if (!email_sha256) return false;
  const cache = await loadType("email_sha256");
  if (cache.global.has(email_sha256)) return true;
  const perClient = cache.per_client.get(client_key);
  return perClient ? perClient.has(email_sha256) : false;
}

/**
 * True if the user-agent matches any case-insensitive substring on the ignore list.
 * Used by the redirect handler to short-circuit Google Hypersonic-style bot scans
 * if/when operators want to mute them at the source.
 */
export async function isUaIgnored(
  client_key: string,
  user_agent: string | null | undefined,
): Promise<boolean> {
  if (!user_agent) return false;
  const ua = user_agent.toLowerCase();
  const cache = await loadType("ua_substring");
  for (const needle of cache.global) {
    if (ua.includes(needle.toLowerCase())) return true;
  }
  const perClient = cache.per_client.get(client_key);
  if (perClient) {
    for (const needle of perClient) {
      if (ua.includes(needle.toLowerCase())) return true;
    }
  }
  return false;
}

/**
 * Force-clear the cache (for admin UI use after a write — operator changes
 * propagate within the same lambda invocation instead of waiting 5 min).
 */
export function clearTrackingIgnoreCache(): void {
  cacheByType.clear();
}
