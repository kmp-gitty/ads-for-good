// Click logger — writes redirect clicks to chapter_ingest.pixel_events as
// event_name='redirect_click'. This makes the click a first-class event in
// the attribution chain:
//   - canonical_v1 session classifier sees it on next refresh
//   - identity_canon stitches it to whatever the visitor's downstream pixel
//     events resolve to
//   - the click's UTM source/medium/campaign/etc. land in pixel_events.utm
//     so the journey_entry_channel_v1 MV classifies the channel correctly
//
// We do NOT block the redirect on this insert — fire-and-forget. If the DB
// is down or slow, the visitor still gets routed to their destination.
// Failed inserts log to Vercel; the daily-digest can be extended later to
// surface persistent failures.

import { createClient } from "@supabase/supabase-js";
import { GeoContext } from "./geo";
import { DeviceContext } from "./device";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type RedirectClickRow = {
  client_key: string;
  identity_key: string;
  journey_id: string;
  slug: string;
  destination: string;
  matched_rule_id: string | null;
  query: Record<string, string>;
  referrer: string | null;
  geo: GeoContext;
  device: DeviceContext;
};

export async function logRedirectClick(row: RedirectClickRow): Promise<void> {
  const ts = new Date().toISOString();

  // Map query params → utm + partner_ids per the pixel.js convention.
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    if (row.query[k]) utm[k] = row.query[k];
  }
  const partner_ids: Record<string, string> = {};
  for (const k of ["gclid", "fbclid", "gbraid", "wbraid", "rdt_cid", "ttclid", "msclkid"]) {
    if (row.query[k]) partner_ids[k] = row.query[k];
  }

  const props = {
    redirect_slug: row.slug,
    destination: row.destination,
    matched_rule_id: row.matched_rule_id,
    geo: row.geo,
    device: row.device,
    full_query: row.query,
  };

  // Journey upsert FIRST — pixel_events has FK constraint on journey_id, and
  // the redirect mints a fresh journey id via resolveIdentity but never wrote
  // it to chapter_journey.journeys (that's normally /api/pixel's job, but the
  // redirect's click log bypasses /api/pixel). Without this insert, the FK
  // constraint rejects the pixel_events INSERT with 23503.
  //
  // ignoreDuplicates: true → equivalent to ON CONFLICT (id) DO NOTHING. We
  // don't overwrite first_seen / last_seen on a returning-visitor click here;
  // the /api/pixel collect handler updates last_seen on the next event.
  try {
    const { error: journeyError } = await supabase
      .schema("chapter_journey")
      .from("journeys")
      .upsert(
        {
          id: row.journey_id,
          client_key: row.client_key,
          first_seen: ts,
          last_seen: ts,
          last_identity_key: row.identity_key,
          // user_agent is null on initial journey row — gets backfilled by the
          // first /api/pixel event after landing (its journey UPSERT updates
          // last_seen + last_touch but doesn't touch user_agent on conflict;
          // we'd need a follow-up to wire user_agent through if it matters).
          user_agent: null,
          country: row.geo.country ?? null,
          region: row.geo.region ?? null,
          city: row.geo.city ?? null,
          last_touch: {
            source: "redirect_click",
            slug: row.slug,
            utm,
            partner_ids,
            referrer: row.referrer,
          },
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (journeyError) {
      console.error("[redirect-click-logger] journey upsert failed:", journeyError);
      return;
    }
  } catch (err) {
    console.error("[redirect-click-logger] journey upsert threw:", err);
    return;
  }

  try {
    const { error } = await supabase
      .schema("chapter_ingest")
      .from("pixel_events")
      .insert({
        ts,
        client_key: row.client_key,
        journey_id: row.journey_id,
        identity_key: row.identity_key,
        event_name: "redirect_click",
        page_url: row.destination,
        referrer: row.referrer,
        utm,
        partner_ids,
        props,
        consent_status: "implicit", // Tier 1 redirects are server-side; explicit consent state isn't available
      });
    if (error) {
      console.error("[redirect-click-logger] insert failed:", error);
    }
  } catch (err) {
    console.error("[redirect-click-logger] insert threw:", err);
  }
}
