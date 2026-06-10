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
