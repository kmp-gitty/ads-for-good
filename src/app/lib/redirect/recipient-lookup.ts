// Resolve an opaque ESP per-recipient token (Mailchimp UNIQID, Klaviyo
// person.id, etc.) to a stored email_sha256 via chapter_config.email_engagement_events.
// Flavor #3 of solution 2 — privacy-strongest stitching because nothing
// identifying transits the URL.
//
// The recipient_token column must be populated by the per-ESP ingestion
// script. Mailchimp wired (June 15, 2026 — recipient_token is the Mailchimp
// email_id = MD5(email)). Other ESPs return null until their sync is built.
//
// Sprint 9 follow-up (June 19, 2026): also resolve CRM prospect_keys for
// the adsforgood_prod tenant — when ?rid=<prospect_key> is on an outreach
// link, look it up in crm.prospects and hash the email server-side. Lets
// the agency's manual outreach + Mailchimp + future ESPs all share one
// privacy-preserving URL convention.

import { createClient } from "@supabase/supabase-js";
import { hashEmail } from "@/app/lib/identity/hash";

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

  // Pass 1: ESP recipient_token (Mailchimp / future Klaviyo etc.)
  const espRes = await supabase
    .schema("chapter_config")
    .from("email_engagement_events")
    .select("email_sha256")
    .eq("client_key", client_key)
    .eq("recipient_token", token)
    .not("email_sha256", "is", null)
    .limit(1)
    .maybeSingle();

  if (espRes.error) {
    console.warn(`[recipient-lookup] ESP resolve failed for ${client_key}/${token}: ${espRes.error.message}`);
  } else if (espRes.data?.email_sha256) {
    cache.set(key, { email_sha256: espRes.data.email_sha256, fetchedAt: now });
    return espRes.data.email_sha256;
  }

  // Pass 2: CRM prospect_key (adsforgood_prod tenant only — it's the only
  // tenant with crm.prospects today; check before the lookup to keep other
  // tenants' lookups branch-free).
  if (client_key === "adsforgood_prod") {
    const crmRes = await supabase
      .schema("crm")
      .from("prospects")
      .select("email")
      .eq("prospect_key", token)
      .not("email", "is", null)
      .limit(1)
      .maybeSingle();
    if (crmRes.error) {
      console.warn(`[recipient-lookup] CRM resolve failed for ${client_key}/${token}: ${crmRes.error.message}`);
    } else if (crmRes.data?.email) {
      const email_sha256 = hashEmail(crmRes.data.email);
      cache.set(key, { email_sha256, fetchedAt: now });
      return email_sha256;
    }
  }

  // Cache the miss too so we don't re-query on every click for invalid tokens.
  cache.set(key, { email_sha256: null, fetchedAt: now });
  return null;
}
