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
  // ── VISIT-based (works for ANONYMOUS visitors — no stitching required) ────
  // "Have we seen this browser before this session?" Derived from pixel_events
  // on the RAW identity_key, so an unstitched anon can satisfy it. These two are
  // exact inverses of each other.
  is_new_visitor: boolean;
  is_returning_visitor: boolean;
  days_since_previous_visit: number | null;

  // ── PURCHASE-based (requires a stitched, known canonical) ─────────────────
  // previous_purchase was called is_returning_visitor until Sep 17 2026, which
  // was badly misleading: it reads canonical_v1, which contains only PURCHASE
  // chapters, so it always meant "has bought before" — never "has visited
  // before." An anonymous visitor who browsed ten times still read as new.
  previous_purchase: boolean;
  has_converted_ever: boolean;
  days_since_last_conversion: number | null;

  audience_tags: string[];        // cohort names this identity belongs to
};

// Purchase/cohort defaults for an identity we cannot resolve to a known person.
// NOTE: the visit-based fields are deliberately NOT part of this — they are
// always computed, including for anonymous visitors, and merged in by the caller.
const NULL_PURCHASE_CTX = {
  previous_purchase: false,
  has_converted_ever: false,
  days_since_last_conversion: null,
  audience_tags: [] as string[],
};

/**
 * What the redirect route passes when it DELIBERATELY SKIPPED the lookup
 * because no enabled rule on the slug reads a segment condition.
 *
 * NOT the same as "we looked and found nothing" — it is never evaluated
 * against, because requiredContext() in conditions.ts guarantees no segment
 * evaluator runs when this is used. Kept explicit (rather than a cast) so a
 * future condition added without a `needs` declaration fails the build instead
 * of silently reading these defaults.
 */
export const SKIPPED_SEGMENTS: SegmentContext = {
  is_new_visitor: false,
  is_returning_visitor: false,
  days_since_previous_visit: null,
  previous_purchase: false,
  has_converted_ever: false,
  days_since_last_conversion: null,
  audience_tags: [],
};

// Chapter treats a >1h gap as a new session everywhere else (canonical_v1's
// sessionizer), so "seen before" means seen more than an hour ago. Without this
// a visitor who lands on the site and immediately clicks a Chapter Link in the
// SAME visit would read as "returning" off their own page_view.
const SESSION_GAP_MS = 60 * 60 * 1000;

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

  // ── Visit history ────────────────────────────────────────────────────────
  // MUST run BEFORE the anonymous short-circuit below. This is the only identity
  // signal that works for an unstitched anonymous visitor, and they are the
  // majority of clicks (measured Sep 2026: only 26.9% of NSC click identities
  // resolve to a known canonical). Returning early first would make the
  // condition dead for exactly the people it exists to serve.
  //
  // Queried on the RAW identity_key, not the canonical, because pixel_events
  // stores the anon: a stitched visitor's events are filed under their anon id,
  // so looking up by email_sha256 would find nothing. Consequence: this is
  // per-BROWSER history — a known customer on a brand-new device reads as new.
  let previousVisitAt: string | null = null;
  try {
    const { data: prior } = await supabase
      .schema("chapter_ingest")
      .from("pixel_events")
      .select("ts")
      .eq("client_key", client_key)
      .eq("identity_key", identityKey)
      .lt("ts", new Date(now - SESSION_GAP_MS).toISOString())
      .order("ts", { ascending: false })
      .limit(1)
      .maybeSingle();
    previousVisitAt = (prior as { ts?: string } | null)?.ts ?? null;
  } catch (err) {
    console.error("[redirect-segments] visit lookup failed:", err);
  }

  const visitCtx = {
    is_returning_visitor: previousVisitAt !== null,
    is_new_visitor: previousVisitAt === null,
    days_since_previous_visit: previousVisitAt
      ? (Date.now() - new Date(previousVisitAt).getTime()) / 86_400_000
      : null,
  };

  // Anonymous-only identities (no canon stitching) → no purchase/cohort data,
  // but visit history above still applies.
  if (canonicalKey.startsWith("anonymous_id:")) {
    const anonCtx: SegmentContext = { ...NULL_PURCHASE_CTX, ...visitCtx };
    cache.set(k, { ctx: anonCtx, fetchedAt: now });
    return anonCtx;
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
      // Tenant scoping MUST target the embedded resource: connections_cohort_members
      // has no client_key column of its own (only cohort_id / identifier_hash /
      // canonical_identity_key). Filtering a bare `client_key` here returns
      // PostgREST 42703 "column does not exist" — and because supabase-js resolves
      // to { data: null, error } rather than throwing, the caller's `?? []` turned
      // that into "this visitor belongs to no cohorts". Every audience_tag rule
      // silently never matched. Verified: this form returns the right cohorts and
      // returns [] for a mismatched client_key, so isolation still holds.
      .eq("connections_cohorts.client_key", client_key)
      .eq("canonical_identity_key", canonicalKey),
  ]);

  const lastBoundaryTs = chapters && chapters.length > 0
    ? (chapters[0].boundary_ts as string)
    : null;

  const ctx: SegmentContext = {
    ...visitCtx,
    previous_purchase: lastBoundaryTs !== null,
    has_converted_ever: lastBoundaryTs !== null,
    days_since_last_conversion: lastBoundaryTs
      ? (Date.now() - new Date(lastBoundaryTs).getTime()) / 86_400_000
      : null,
    // PostgREST returns this embedded to-one join as a single OBJECT, not an
    // array (verified against live REST). flatMap tolerates both shapes, so it
    // stays correct either way — but don't "simplify" it to an array-only
    // assumption without re-checking the wire format.
    audience_tags: ((cohorts ?? []) as Array<{ connections_cohorts: Array<{ name: string; kind: string }> }>)
      .flatMap((r) => r.connections_cohorts ?? [])
      .map((c) => c.name)
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
