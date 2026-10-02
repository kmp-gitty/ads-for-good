// HubSpot cross-domain handoff — partner slug only, acj.today only.
//
// WHY: HubSpot sets __hstc / __hssc on the APEX (.bucksco.today), so they are
// sent to go.bucksco.today on the wrapped click. But acj.today is a different
// registrable domain with its own cookie jar, so HubSpot there would see a
// brand-new visitor. Forwarding the values as query params is HubSpot's own
// documented cross-domain pattern and lets it stitch the session.
//
// SCOPE IS DELIBERATELY NARROW. Only the slugs that point at ACJ's own
// corporate site — partner, internal_lead, internal_spotlite — and only when
// the destination really is acj.today. These are tracking identifiers, so
// forwarding them anywhere else (another slug, or an advertiser's domain)
// would hand a third party a visitor identifier they have no business
// receiving. The host gate is the backstop: adding a slug here does nothing
// unless that slug actually resolves to acj.today.
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

/** acj.today and www.acj.today only — never a subdomain, never another host. */
function isAcjCorporate(host: string): boolean {
  const h = host.toLowerCase();
  return h === "acj.today" || h === "www.acj.today";
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
  if (!isAcjCorporate(url.hostname)) return destination;

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
