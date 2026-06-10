// Resolve an opaque ESP per-recipient token (Mailchimp UNIQID, Klaviyo
// person.id, etc.) to a stored email_sha256 via chapter_config.email_engagement_events.
// Flavor #3 of solution 2 — privacy-strongest stitching because nothing
// identifying transits the URL.
//
// The recipient_token column must be populated by the per-ESP ingestion
// script. As of v1 only Mailchimp is wired (see backlog item "Extend
// Mailchimp sync to populate recipient_token for flavor #3"); other ESPs
// return null until their sync is built. Graceful no-op until then —
// nothing crashes, no stitch happens.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CacheEntry = { email_sha256: string | null; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(client_key: string, token: string): string {
  return `${client_key}::${token}`;
}

export async function resolveRecipientToken(
  client_key: string,
  token: string
): Promise<string | null> {
  const now = Date.now();
  const key = cacheKey(client_key, token);
  const cached = cache.get(key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.email_sha256;
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("email_engagement_events")
    .select("email_sha256")
    .eq("client_key", client_key)
    .eq("recipient_token", token)
    .not("email_sha256", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[recipient-lookup] resolve failed for ${client_key}/${token}: ${error.message}`);
    return null;
  }

  const email_sha256 = data?.email_sha256 ?? null;
  cache.set(key, { email_sha256, fetchedAt: now });
  return email_sha256;
}
