// Identity-segment + audience-tag lookups for redirect rules.
//
// Cached aggressively (5-min per identity_key) since most clicks are from
// known identities and the same identity hitting /r multiple times in 5 min
// shouldn't pound the DB.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SegmentContext = {
  is_new_visitor: boolean;       // never had a chapter_v1 row
  is_returning_visitor: boolean; // has ≥1 chapter_v1 row, regardless of conversion
  has_converted_ever: boolean;
  days_since_last_conversion: number | null;
  audience_tags: string[];        // cohort names this identity belongs to
};

const NULL_CTX: SegmentContext = {
  is_new_visitor: true,
  is_returning_visitor: false,
  has_converted_ever: false,
  days_since_last_conversion: null,
  audience_tags: [],
};

type CacheEntry = { ctx: SegmentContext; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(client_key: string, identityKey: string): string {
  return `${client_key}::${identityKey}`;
}

export async function resolveSegments(
  client_key: string,
  identityKey: string
): Promise<SegmentContext> {
  const now = Date.now();
  const k = cacheKey(client_key, identityKey);
  const cached = cache.get(k);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.ctx;
  }

  // Resolve canonical identity first — most rules want behavior across all
  // stitched identifiers (email + phone + customer_id all roll up to one canonical).
  let canonicalKey = identityKey;
  try {
    const { data: canonRow } = await supabase
      .schema("chapter_identity")
      .from("identity_canon")
      .select("canonical_identity_key")
      .eq("client_key", client_key)
      .eq("identity_key", identityKey)
      .maybeSingle();
    if (canonRow?.canonical_identity_key) {
      canonicalKey = canonRow.canonical_identity_key;
    }
  } catch (err) {
    console.error("[redirect-segments] canon lookup failed:", err);
  }

  // Anonymous-only identities (no canon stitching) → treat as new visitor.
  if (canonicalKey.startsWith("anonymous_id:")) {
    cache.set(k, { ctx: NULL_CTX, fetchedAt: now });
    return NULL_CTX;
  }

  // Conversion history + audience tags in parallel.
  const [{ data: chapters }, { data: cohorts }] = await Promise.all([
    supabase
      .schema("chapter_attribution")
      .from("chapter_channel_paths_canonical_v1_snapshot")
      .select("boundary_ts")
      .eq("client_key", client_key)
      .eq("canonical_identity_key", canonicalKey)
      .order("boundary_ts", { ascending: false })
      .limit(1),
    supabase
      .schema("chapter_config")
      .from("connections_cohort_members")
      .select("connections_cohorts!inner(name, kind)")
      .eq("client_key", client_key)
      .eq("canonical_identity_key", canonicalKey),
  ]);

  const lastBoundaryTs = chapters && chapters.length > 0
    ? (chapters[0].boundary_ts as string)
    : null;

  const ctx: SegmentContext = {
    is_new_visitor: lastBoundaryTs === null,
    is_returning_visitor: lastBoundaryTs !== null,
    has_converted_ever: lastBoundaryTs !== null,
    days_since_last_conversion: lastBoundaryTs
      ? (Date.now() - new Date(lastBoundaryTs).getTime()) / 86_400_000
      : null,
    audience_tags: ((cohorts ?? []) as Array<{ connections_cohorts: { name: string; kind: string } | null }>)
      .map((r) => r.connections_cohorts?.name)
      .filter((n): n is string => Boolean(n)),
  };

  cache.set(k, { ctx, fetchedAt: now });
  return ctx;
}

export function clearSegmentsCache(client_key?: string, identityKey?: string): void {
  if (client_key && identityKey) {
    cache.delete(cacheKey(client_key, identityKey));
  } else if (client_key) {
    for (const k of Array.from(cache.keys())) {
      if (k.startsWith(`${client_key}::`)) cache.delete(k);
    }
  } else {
    cache.clear();
  }
}
