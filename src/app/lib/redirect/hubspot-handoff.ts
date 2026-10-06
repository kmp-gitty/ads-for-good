// HubSpot cross-domain handoff — allowlisted slugs, exact-matched
// ACJ-owned destinations.
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
// Allowed destinations are matched EXACTLY — never a suffix, never a
// wildcard. The two gates (slug, host) then stay genuinely independent: a
// mis-added slug does nothing unless it also resolves to a host ACJ owns.
//
// ⚠️ A WILDCARD HERE WOULD QUIETLY BREAK THAT. An earlier version allowed
//    *.hsforms.com, which is MULTI-TENANT — every HubSpot customer's forms
//    live there. It answered "is this HubSpot?" rather than "is this ACJ's
//    HubSpot?", so a mistakenly-added slug pointing at an advertiser's own
//    HubSpot form (firstrust.share.hsforms.com) would have forwarded ACJ's
//    visitor cookies straight to that advertiser's portal. Exact matching
//    makes that impossible, and incidentally removes the suffix-matching
//    footgun entirely: no "hsforms.com.evil.com" to defend against.
//
// ⚠️ THE BRITTLENESS IS DELIBERATE AND IT FAILS SAFE. If ACJ stands up a
//    form on a different HubSpot subdomain, this list stops matching and
//    nothing is appended — the form still works, it just sees a fresh
//    visitor, which is exactly where things stood before any of this. We
//    have only ever seen ONE ACJ form, so whether that subdomain is stable
//    across their other forms is an assumption, not an observation. The
//    failure is also SILENT, so if HubSpot attribution goes quiet, check
//    this list first.
//
// When a second client needs the handoff, move the pairs to per-client
// config (jsonb on chapter_config.clients, read from the ALREADY-CACHED
// client config so it costs nothing on the pre-302 path) and scope the
// hosts per slug, so a mis-added slug inherits no hosts at all.
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

// Hosts ACJ owns. Exact match only — adding one is a deliberate, reviewable
// edit, which is the point.
const HUBSPOT_DESTINATION_HOSTS = new Set([
  "acj.today",
  "www.acj.today",
  // ACJ's own HubSpot portal. The share link lives here; a different
  // customer's portal is a different subdomain and must not match.
  "tf02j.share.hsforms.com",
]);

function isHubspotDestination(host: string): boolean {
  return HUBSPOT_DESTINATION_HOSTS.has(host.toLowerCase());
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
