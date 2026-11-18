// Approved destinations for ?to= (pure; safe for client and server).
//
// Deliberately NO "use client" / "use server" directive: a plain value exported
// from a "use client" module becomes a client-reference proxy in server code.
//
// Why this exists: a pass-through link (/r/<client>/<slug>?to=<anything>) is an
// open redirect. Anyone could build go.<paper>.today/r/...?to=https://evil and
// borrow the paper's name. Clients in allowlist mode only forward ?to= to
// approved destinations.
//
// Two kinds of approval:
//   host  the whole site: trumarkcu.org (and www.trumarkcu.org) approves every
//         page on it. Subdomains are NOT included: only the exact site name.
//   url   one page: for sites where anyone can publish (link shorteners,
//         link-in-bio, social, forms, events). Approving bit.ly as a host would
//         let a spammer make their own bit.ly link to any page, so on these
//         platforms only the exact page that was generated is approved.
//
// Matching always parses the address (new URL) and compares the real hostname,
// never a substring, so evil.com/?trumarkcu.org, trumarkcu.org.evil.com and
// trumarkcu.org@evil.com are all rejected. Lookalike letters become a different
// (punycode) hostname when parsed, so they do not match either.

// Sites where anyone can publish content or links. A match is the host itself
// or any subdomain of it (blackbirdhealth.jotform.com is under jotform.com).
export const OPEN_PLATFORM_HOSTS: readonly string[] = [
  // link shorteners
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "ow.ly", "buff.ly", "rebrand.ly",
  "lnkd.in", "goo.gl", "is.gd", "cutt.ly", "shorturl.at", "rb.gy", "t.ly", "tiny.cc",
  // link in bio
  "linktr.ee", "linktree.com", "echobox.bio", "beacons.ai", "lnk.bio", "campsite.bio",
  "bio.link", "solo.to", "taplink.cc",
  // social
  "facebook.com", "fb.com", "fb.me", "instagram.com", "linkedin.com", "x.com",
  "twitter.com", "youtube.com", "youtu.be", "tiktok.com", "threads.net", "pinterest.com",
  "reddit.com", "medium.com", "substack.com", "nextdoor.com",
  // forms, events, scheduling, email pages
  "forms.office.com", "forms.gle", "docs.google.com", "sites.google.com", "drive.google.com",
  "jotform.com", "typeform.com", "surveymonkey.com", "hsforms.com", "lglforms.com",
  "donorperfect.io", "eventbrite.com", "calendly.com", "events.teams.microsoft.com",
  "mailchi.mp", "constantcontactpages.com", "givesmart.com", "givebutter.com",
  "gofundme.com", "squareup.com", "square.site", "wixsite.com", "wordpress.com",
  "blogspot.com", "carrd.co", "notion.site", "canva.site", "github.io", "vercel.app",
  "netlify.app", "dropbox.com", "box.com",
];

export type DestinationKind = "host" | "url";

export type DestinationKey = {
  host: string;      // lowercase hostname, without a leading "www."
  open: boolean;     // on an open platform: only an exact url approval counts
  kind: DestinationKind;
  value: string;     // what gets stored and matched
};

/** Lowercase hostname without a leading "www.". */
export function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

export function isOpenPlatform(host: string): boolean {
  const h = bareHost(host);
  return OPEN_PLATFORM_HOSTS.some(p => h === p || h.endsWith(`.${p}`));
}

/**
 * The key a destination is approved and matched under, or null if it is not a
 * usable http(s) address. For an open platform the key is host + path (query
 * and fragment ignored: they do not change who owns the page); for any other
 * site it is the host.
 */
export function destinationKey(raw: string | null | undefined): DestinationKey | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(String(raw).trim()); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;   // user@host tricks: never approved
  const host = bareHost(u.hostname);
  if (!host || !host.includes(".")) return null;
  const open = isOpenPlatform(host);
  if (!open) return { host, open, kind: "host", value: host };
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return { host, open, kind: "url", value: `${host}${path}` };
}
