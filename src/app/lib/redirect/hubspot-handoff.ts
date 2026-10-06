// HubSpot cross-domain handoff — allowlisted slugs, ACJ-owned HubSpot
// destinations only (acj.today and HubSpot's own *.hsforms.com).
//
// WHY: HubSpot sets __hstc / __hssc on the APEX (.bucksco.today), so they are
// sent to go.bucksco.today on the wrapped click. But acj.today is a different
// registrable domain with its own cookie jar, so HubSpot there would see a
// brand-new visitor. Forwarding the values as query params is HubSpot's own
// documented cross-domain pattern and lets it stitch the session.
//
// SCOPE IS DELIBERATELY NARROW. Only the slugs that point at ACJ's own
// HubSpot-tracked properties — partner, internal_lead, internal_spotlite —
// and only when the destination is one of those properties. These are
// tracking identifiers, so forwarding them to an advertiser's domain would
// hand a third party a visitor identifier they have no business receiving.
//
// Two allowed destination shapes:
//   acj.today / www.acj.today   ACJ's corporate site, HubSpot-tracked
//   *.hsforms.com              HubSpot's own form hosting. A share link like
//                              tf02j.share.hsforms.com/<id> is where an
//                              embedded ACJ form actually lives, so the
//                              session has to stitch there or the form sees
//                              a brand-new visitor and the click that
//                              produced the lead is lost.
//
// ⚠️ THE TWO GATES ARE NOT EQUALLY STRONG, and the difference is worth
//    knowing. acj.today is ACJ's alone, so the host check was a genuinely
//    independent backstop — a mis-added slug did nothing unless it also
//    resolved to ACJ's domain. hsforms.com is MULTI-TENANT: every HubSpot
//    customer's forms live there. So for that branch the host check only
//    proves "this is HubSpot", not "this is ACJ's HubSpot", and the slug
//    allowlist above carries the real weight. Add a slug here only when its
//    destination is a property the client owns.
//
// ⚠️ NEVER LOGGED. Call this to build the 302 target ONLY, leaving the
//    `destination` variable the click logger sees untouched. Same posture as
//    the inbound identity hints (?rh / ?re / ?rid), which are stripped before
//    anything is written.
//
// COST: a cookie read and string concat. No DB, no network, no await — the
// cookies are already parsed from the request headers in memory. Adds nothing
// to the pre-302 path, which Stage 0 cleared of blocking work and the iad1
// region pin depends on staying clear.

// Slugs whose destination is ACJ's own HubSpot-tracked corporate site.
const HUBSPOT_SLUGS = new Set(["partner", "internal_lead", "internal_spotlite"]);
const HUBSPOT_COOKIES = ["__hstc", "__hssc"] as const;

/**
 * ACJ's corporate site, or HubSpot's own form hosting.
 *
 * acj.today is matched exactly — never a subdomain, so a compromised or
 * mistyped `foo.acj.today` gets nothing. hsforms.com is matched as the
 * registrable domain plus any subdomain, because HubSpot share links are
 * served from per-portal subdomains (tf02j.share.hsforms.com).
 *
 * The leading dot in the suffix test is load-bearing: a bare `endsWith`
 * on "hsforms.com" would also match "hsforms.com.evil.com", handing the
 * cookies to an attacker-controlled host.
 */
function isHubspotDestination(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "acj.today" || h === "www.acj.today") return true;
  return h === "hsforms.com" || h.endsWith(".hsforms.com");
}

export function appendHubspotCrossDomain(
  destination: string,
  slug: string,
  readCookie: (name: string) => string | undefined,
): string {
  if (!HUBSPOT_SLUGS.has(slug)) return destination;

  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return destination;             // not parseable -> leave it exactly as-is
  }
  if (!isHubspotDestination(url.hostname)) return destination;

  let changed = false;
  for (const name of HUBSPOT_COOKIES) {
    // A value already on the destination wins — same convention as the
    // ?chid= handoff, which does not overwrite a template-supplied value.
    if (url.searchParams.has(name)) continue;
    const value = readCookie(name);
    if (!value) continue;           // absent cookie -> append nothing
    url.searchParams.set(name, value);
    changed = true;
  }

  return changed ? url.toString() : destination;
}
