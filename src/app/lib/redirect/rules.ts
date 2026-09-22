// Per-(client_key, slug) rule list fetcher with 5-min in-process cache.
//
// Redirects are latency-sensitive (50ms budget per spec). Each Vercel function
// invocation has its own process, so we keep a Map cache here — cold lambdas
// pay one DB round-trip on first hit, warm lambdas serve from memory.
//
// Cache invalidation: time-based only. Operators editing rules accept up to
// 5 min of staleness; the admin save path can explicitly clear if needed.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type RedirectRule = {
  id: string;
  client_key: string;
  slug: string;
  rule_priority: number;
  condition_jsonb: Record<string, unknown>;
  destination_template: string;
  description: string | null;
  enabled: boolean;
};

type CacheEntry = { rules: RedirectRule[]; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(client_key: string, slug: string): string {
  return `${client_key}::${slug}`;
}

export async function fetchRules(
  client_key: string,
  slug: string
): Promise<RedirectRule[]> {
  const now = Date.now();
  const key = cacheKey(client_key, slug);
  const cached = cache.get(key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rules;
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .select("id, client_key, slug, rule_priority, condition_jsonb, destination_template, description, enabled")
    .eq("client_key", client_key)
    .eq("slug", slug)
    .eq("enabled", true)
    .order("rule_priority", { ascending: true });

  if (error) {
    console.error("[redirect-rules] lookup failed:", error);
    return [];
  }

  const rules = (data ?? []) as RedirectRule[];
  cache.set(key, { rules, fetchedAt: now });
  return rules;
}

export function clearRulesCache(client_key?: string, slug?: string): void {
  if (client_key && slug) {
    cache.delete(cacheKey(client_key, slug));
  } else if (client_key) {
    for (const k of Array.from(cache.keys())) {
      if (k.startsWith(`${client_key}::`)) cache.delete(k);
    }
  } else {
    cache.clear();
  }
}

// ─── Per-client config (default redirect destination, etc.) ────────────────
// Small hot fields that drive the redirect fallback chain. 5-min TTL matches
// the rules cache — operators editing client config accept the same staleness
// window. Same pattern as fetchRules.
export type ClientRedirectConfig = {
  default_redirect_destination: string | null;
  // Per-HOST override of the above, keyed by BARE hostname (no scheme), e.g.
  // { "go.bucksco.today": "https://bucksco.today" }. Only multi-property
  // tenants need it: ACJ is ONE client across five separately-branded papers,
  // so a malformed link on go.bucksco.today should land on bucksco.today, not
  // the corporate parent the per-client default points at. Null for every
  // single-property client, which keeps their chain byte-identical.
  //
  // Sibling: CLIENT_1P_HOSTS in next.config.ts holds the same host→site pairs
  // for ACJ, but governs NON-Chapter-Link paths at build time. See the comment
  // there for why the two are kept separate rather than merged.
  default_redirect_destinations: Record<string, string> | null;
  // False = do NOT append ?chid/?jid to the destination. For tenants whose
  // links point off-site (advertisers, affiliates) the params do nothing —
  // there is no Chapter pixel there to consume them — so they just ride along
  // into a third party's URL. Same-eTLD+1 links don't need them either: the
  // identity cookie already spans that hop.
  identity_handoff_enabled: boolean;
};

type ClientConfigEntry = { config: ClientRedirectConfig; fetchedAt: number };
const clientConfigCache = new Map<string, ClientConfigEntry>();

/**
 * Strip scheme / port / trailing slash / case from a host key so the lookup is
 * forgiving of how an operator typed it.
 *
 * This is NOT cosmetic. `chapter_config.clients.links_hosts` stores hosts WITH
 * the scheme ("https://go.bucksco.today"), so the obvious thing for an operator
 * to do is copy one of those in as a key here — where it would then never match
 * `req.nextUrl.hostname`, which is bare. Normalizing on read means both forms
 * resolve, and the failure mode of a typo is the per-client default (the
 * previous behavior), never a 404.
 */
function normalizeHostKey(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "") // scheme
    .replace(/\/.*$/, "")                    // path
    .replace(/:\d+$/, "");                   // port
}

function normalizeHostDefaults(
  raw: Record<string, string> | null,
): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, string> = {};
  for (const [host, dest] of Object.entries(raw)) {
    if (typeof dest !== "string" || !dest.trim()) continue;
    const key = normalizeHostKey(host);
    if (key) out[key] = dest.trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * The per-host fallback destination for the host this request arrived on, or
 * null when the client has no per-host map (the single-property case) or the
 * host is not in it.
 *
 * Reads the ALREADY-FETCHED client config — it does not touch the database, so
 * adding this tier to the fallback chain costs zero extra round trips on the
 * warm redirect path.
 */
export function resolveHostDefaultDestination(
  config: ClientRedirectConfig,
  hostname: string | null | undefined,
): string | null {
  if (!config.default_redirect_destinations || !hostname) return null;
  return config.default_redirect_destinations[normalizeHostKey(hostname)] ?? null;
}

export async function fetchClientRedirectConfig(
  client_key: string,
): Promise<ClientRedirectConfig> {
  const now = Date.now();
  const cached = clientConfigCache.get(client_key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("default_redirect_destination, default_redirect_destinations, identity_handoff_enabled")
    .eq("client_key", client_key)
    .maybeSingle();

  if (error) {
    console.error("[redirect-client-config] lookup failed:", error);
    // Fail to the historical behavior (handoff on) rather than silently
    // changing routing semantics because a config read blipped.
    return {
      default_redirect_destination: null,
      default_redirect_destinations: null,
      identity_handoff_enabled: true,
    };
  }

  const row = data as {
    default_redirect_destination: string | null;
    default_redirect_destinations: Record<string, string> | null;
    identity_handoff_enabled: boolean | null;
  } | null;
  const config: ClientRedirectConfig = {
    default_redirect_destination: row?.default_redirect_destination ?? null,
    default_redirect_destinations: normalizeHostDefaults(
      row?.default_redirect_destinations ?? null,
    ),
    identity_handoff_enabled: row?.identity_handoff_enabled ?? true,
  };
  clientConfigCache.set(client_key, { config, fetchedAt: now });
  return config;
}

export function clearClientRedirectConfigCache(client_key?: string): void {
  if (client_key) {
    clientConfigCache.delete(client_key);
  } else {
    clientConfigCache.clear();
  }
}

// ─── A/B experiments ────────────────────────────────────────────────────────
// Same caching pattern. Used by the ab_bucket condition evaluator.

export type AbExperiment = {
  experiment_id: string;
  seed: string;
  buckets: Record<string, number>; // {"A": 50, "B": 50}
  enabled: boolean;
};

type AbCacheEntry = { experiments: Map<string, AbExperiment>; fetchedAt: number };
const abCache = new Map<string, AbCacheEntry>();

export async function fetchAbExperiments(client_key: string): Promise<Map<string, AbExperiment>> {
  const now = Date.now();
  const cached = abCache.get(client_key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.experiments;
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("redirect_ab_experiments")
    .select("experiment_id, seed, buckets_jsonb, enabled")
    .eq("client_key", client_key)
    .eq("enabled", true);

  const experiments = new Map<string, AbExperiment>();
  if (error) {
    console.error("[redirect-ab-experiments] lookup failed:", error);
  } else {
    for (const row of (data ?? []) as Array<{
      experiment_id: string; seed: string; buckets_jsonb: Record<string, number>; enabled: boolean;
    }>) {
      experiments.set(row.experiment_id, {
        experiment_id: row.experiment_id,
        seed: row.seed,
        buckets: row.buckets_jsonb,
        enabled: row.enabled,
      });
    }
  }

  abCache.set(client_key, { experiments, fetchedAt: now });
  return experiments;
}

export function clearAbExperimentsCache(client_key?: string): void {
  if (client_key) abCache.delete(client_key);
  else abCache.clear();
}

// Atomic increment of hit_count + bump of last_hit_at on a matched rule.
// Called once per redirect after the click is logged. Uses a Postgres function
// call (`chapter_config.increment_redirect_rule_hit(uuid)`) so the read-modify-write
// happens server-side — avoids race conditions if two clicks land in the same ms.
// The function exists in DB; created by migration 2026-06-16-redirect-rule-hit-counter.
export async function incrementRuleHitCount(ruleId: string): Promise<void> {
  const { error } = await supabase
    .schema("chapter_config")
    .rpc("increment_redirect_rule_hit", { p_rule_id: ruleId });
  if (error) {
    console.error("[rules] hit_count increment failed:", error);
    throw error;
  }
}
