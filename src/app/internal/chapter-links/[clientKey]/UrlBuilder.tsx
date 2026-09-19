"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  searchProspectsForOutreach,
  type ProspectOption,
} from "./_prospect-actions";

export type ClientOption = {
  client_key: string;
  storefront_domain: string | null;
  // Per-client 1P redirect host. NULL falls back to the global redirectOrigin
  // (NEXT_PUBLIC_APP_URL / ads4good.com). Set when a client has 1P pixel
  // installed at a dedicated subdomain (e.g. NSC at chapter.notsocavalier.com).
  // links_host is the new canonical column (e.g. go.eosfabrics.com); it wins
  // over redirect_host when both are set so mid-migration clients render URLs
  // against the new hostname first.
  redirect_host: string | null;
  links_host: string | null;
  // Multi-property tenants (e.g. acj_today across five .today papers) serve the
  // SAME client_key from several 1P link hosts. links_host holds the flagship;
  // this holds the full set so the operator can pick which property's host a
  // link is built on. Cookies land on the host's own eTLD+1, so picking the
  // wrong one silently breaks identity continuity for that paper's readers.
  links_hosts: string[] | null;
};

// Destination normalisation + validation.
//
// A destination with no scheme (`ads4good.com?x=1`) is rejected by the
// redirect's isValidDestination(), falls through the chain to the client
// default, and the reader lands somewhere unrelated — while the click STILL
// logs and STILL increments hit_count. Reporting looks perfectly healthy.
// Caught live on ACJ (Sep 18); a partner campaign could run a full flight
// that way and you'd only hear about it from the partner.
//
// Rules, in order — each avoids a specific wrong behaviour:
//   protocol-relative "//x.com"  -> https:
//   ANY existing scheme          -> LEAVE ALONE. Never upgrade http:->https:;
//                                   that silently rewrites the partner's URL.
//   otherwise                    -> prepend https://
// Scheme detection is general (not startsWith("https://")) so "HTTPS://X.COM"
// isn't mangled into "https://HTTPS://X.COM".
export function normalizeDestination(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^\/\//.test(v)) return `https:${v}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  return `https://${v}`;
}

type DestState = "empty" | "ok" | "invalid";

// A non-http(s) scheme (ftp:, mailto:, javascript:) is INVALID, not a prefix
// candidate — prefixing would produce "https://javascript:..." and hide the
// problem behind a plausible-looking URL.
function destinationState(raw: string): DestState {
  const v = normalizeDestination(raw);
  if (!v) return "empty";
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? "ok" : "invalid";
  } catch {
    return "invalid";
  }
}

const UTM_SOURCES = [
  { value: "email", label: "Email" },
  { value: "cold_email", label: "Cold email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "in_person", label: "In-person / event" },
  { value: "podcast", label: "Podcast" },
  { value: "webinar", label: "Webinar" },
  { value: "referral", label: "Referral" },
  { value: "sms", label: "SMS / text" },
  { value: "phone_followup", label: "Phone follow-up" },
  { value: "newsletter", label: "Newsletter" },
  { value: "creator_social", label: "Creator — social" },
  { value: "creator_email", label: "Creator — email" },
  { value: "programmatic", label: "Programmatic display" },
  { value: "youtube", label: "YouTube" },
  { value: "retail_media", label: "Retail media network" },
  { value: "other", label: "Other" },
];

const UTM_MEDIUMS = ["email", "cpc", "social", "display", "referral", "affiliate", "video", "qr", "print"];

// Quick destinations are ads4good.com's own pages, so they only make sense for
// the agency tenant. Other clients type their own storefront URL — showing them
// ads4good links was a leftover from when this tool was adsforgood-only.
const AGENCY_CLIENT_KEY = "adsforgood_prod";
const QUICK_DESTINATIONS = [
  { value: "https://ads4good.com/", label: "Homepage" },
  { value: "https://ads4good.com/about", label: "About" },
  { value: "https://ads4good.com/for-businesses", label: "For Businesses" },
  { value: "https://ads4good.com/for-clients", label: "For Clients" },
  { value: "https://ads4good.com/for-good", label: "For Good" },
  { value: "https://ads4good.com/for-people", label: "For People" },
  { value: "https://ads4good.com/network", label: "Network" },
  { value: "https://ads4good.com/contact", label: "Contact" },
];

// Slug used when the operator wants a generic 1P link without a configured
// redirect rule. The redirect handler falls back to ?to= when no rule matches
// this slug, so identity stitching + click logging still work without rule setup.
const GENERIC_SLUG = "go";

// How the click gets tied to a person. Precedence at the redirect is rh > rid > re,
// and every hint param is stripped before the destination is reached.
type IdentityMode = "none" | "rh" | "re" | "rid";

const IDENTITY_MODES: { value: IdentityMode; label: string; hint: string }[] = [
  { value: "none", label: "None", hint: "Anonymous wrapped link — still logs clicks + sets cookies" },
  { value: "rh", label: "Hashed email (rh)", hint: "Hashed in your browser — the raw address never leaves this page" },
  { value: "re", label: "Plaintext email (re)", hint: "Simplest, but the address is visible in the link itself" },
  { value: "rid", label: "ESP / CRM token (rid)", hint: "Mailchimp UNIQID, or a CRM prospect_key" },
];

// What varies row-to-row in a bulk run. Recipients vary identity; placements
// vary utm_source/content against one destination.
type BulkMode = "recipient" | "placement";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseLines(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export default function UrlBuilder({
  clients,
  slugsByClient,
  defaultClientKey,
  defaultSlug,
  redirectOrigin,
  lockClient = false,
  knownPartners = [],
}: {
  clients: ClientOption[];
  slugsByClient: Record<string, { slug: string; description: string | null; needs_to?: boolean }[]>;
  defaultClientKey: string;
  defaultSlug?: string;
  redirectOrigin: string;
  // Set when the builder is embedded in a client-scoped page (the Chapter Links
  // workbench). The client is already established by the route, so the picker
  // renders as a static readout instead of a dropdown that can desync the URL.
  lockClient?: boolean;
  // Partner values already seen in this client's click history. Free entry
  // still allowed — this exists so `firstrust` / `Firstrust` / `firstrust-bank`
  // don't fragment into three partners in reporting.
  knownPartners?: string[];
}) {
  const [clientKey, setClientKey] = useState(defaultClientKey);
  const availableSlugs = slugsByClient[clientKey] ?? [];
  const currentClient = clients.find(c => c.client_key === clientKey);
  // Use the per-client host when set (e.g. NSC's chapter.notsocavalier.com or
  // EOS's go.eosfabrics.com — required for cookies to land on the right eTLD+1).
  const hostOptions = useMemo(() => {
    const out: string[] = [];
    const add = (h: string | null | undefined) => {
      if (!h) return;
      const v = String(h).trim().replace(/\/+$/, "");
      if (v && !out.includes(v)) out.push(v);
    };
    add(currentClient?.links_host);
    for (const h of currentClient?.links_hosts ?? []) add(h);
    add(currentClient?.redirect_host);
    if (out.length === 0) out.push(redirectOrigin);
    return out;
  }, [currentClient, redirectOrigin]);

  const [hostOverride, setHostOverride] = useState<string>("");
  // Reset the override whenever the client changes, otherwise switching clients
  // leaves the previous tenant's host selected and builds a cross-tenant URL.
  useEffect(() => { setHostOverride(""); }, [clientKey]);

  const effectiveOrigin =
    (hostOverride && hostOptions.includes(hostOverride) ? hostOverride : hostOptions[0]);

  const [slug, setSlug] = useState<string>(defaultSlug ?? "");
  const [partner, setPartner] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProspectOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [prospect, setProspect] = useState<ProspectOption | null>(null);
  const isAgency = clientKey === AGENCY_CLIENT_KEY;
  const [destination, setDestination] = useState(isAgency ? QUICK_DESTINATIONS[0].value : "");
  const [utmSource, setUtmSource] = useState("email");
  const [utmMedium, setUtmMedium] = useState("email");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [extraParams, setExtraParams] = useState("");
  const [identityMode, setIdentityMode] = useState<IdentityMode>("none");
  const [identityValue, setIdentityValue] = useState("");
  // rh must travel as the DIGEST, never the address. Hashing is async, so the
  // result is held in state and the URL builds from it — not from identityValue.
  const [identityHash, setIdentityHash] = useState("");
  const [bulk, setBulk] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode>("recipient");
  const [bulkInput, setBulkInput] = useState("");
  const [bulkRows, setBulkRows] = useState<{ key: string; url: string }[]>([]);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A configured rule owns its destination server-side, so ?to= is both
  // redundant and a trap: if the rule is ever disabled, the redirect falls back
  // to whatever stale ?to= was baked into already-sent links.
  // A slug normally supplies its own destination server-side, so we omit ?to=.
  // EXCEPTION: a pass-through rule whose template is {q:to} forwards whatever
  // ?to= carries — suppressing it there produces a link that resolves to
  // nothing. needs_to is computed from the rule's destination_template.
  const currentSlugOption = availableSlugs.find(s => s.slug === slug);
  const slugIsPassThrough = Boolean(currentSlugOption?.needs_to);
  const ruleSuppliesDestination = slug.trim().length > 0 && !slugIsPassThrough;

  useEffect(() => {
    setSlug(defaultSlug ?? "");
    setProspect(null);
    setDestination(clientKey === AGENCY_CLIENT_KEY ? QUICK_DESTINATIONS[0].value : "");
  }, [clientKey, defaultSlug]);

  useEffect(() => {
    if (identityMode !== "rh" || !identityValue.trim()) {
      setIdentityHash("");
      return;
    }
    let alive = true;
    sha256Hex(identityValue).then(h => { if (alive) setIdentityHash(h); });
    return () => { alive = false; };
  }, [identityMode, identityValue]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (identityMode !== "rid" || !query.trim() || prospect) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchProspectsForOutreach(query);
      setSearching(false);
      if (res.ok) setResults(res.data ?? []);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, prospect, identityMode]);

  function buildParams(over?: { identity?: { mode: IdentityMode; value: string }; source?: string; content?: string }) {
    const params = new URLSearchParams();
    if (!ruleSuppliesDestination && destination) params.set("to", normalizeDestination(destination));
    // Partner first so a deliberate extraParams override still wins below.
    if (partner.trim()) params.set("partner", partner.trim());

    const idMode = over?.identity?.mode ?? identityMode;
    const idVal =
      over?.identity?.value ??
      (idMode === "rid" && prospect ? prospect.prospect_key
        : idMode === "rh" ? identityHash
        : identityValue);
    if (idMode !== "none" && idVal) params.set(idMode, idVal);

    const src = over?.source ?? utmSource;
    if (src) params.set("utm_source", src);
    if (utmMedium.trim()) params.set("utm_medium", utmMedium.trim());
    if (utmCampaign.trim()) params.set("utm_campaign", utmCampaign.trim());
    if (utmTerm.trim()) params.set("utm_term", utmTerm.trim());
    const content = over?.content ?? utmContent;
    if (content.trim()) params.set("utm_content", content.trim());

    // Free-form routing params, e.g. r=fin to hit a query_param rule condition.
    for (const pair of parseLines(extraParams)) {
      const [k, ...rest] = pair.split("=");
      if (k && rest.length) params.set(k.trim(), rest.join("=").trim());
    }
    return params;
  }

  function urlFrom(params: URLSearchParams) {
    const effectiveSlug = slug.trim() || GENERIC_SLUG;
    const qs = params.toString();
    return `${effectiveOrigin}/r/${clientKey}/${effectiveSlug}${qs ? `?${qs}` : ""}`;
  }

  const finalUrl = useMemo(
    () => urlFrom(buildParams()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, destination, prospect, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, extraParams,
     identityMode, identityValue, identityHash, clientKey, effectiveOrigin, ruleSuppliesDestination],
  );

  async function buildBulk() {
    const lines = parseLines(bulkInput);
    if (!lines.length) { setBulkRows([]); return; }
    setBuilding(true);
    const rows: { key: string; url: string }[] = [];
    for (const line of lines) {
      if (bulkMode === "placement") {
        rows.push({ key: line, url: urlFrom(buildParams({ source: line, content: line })) });
      } else if (identityMode === "rh") {
        // Hashed in-browser on purpose: the raw list never reaches the server.
        rows.push({ key: line, url: urlFrom(buildParams({ identity: { mode: "rh", value: await sha256Hex(line) } })) });
      } else if (identityMode === "none") {
        rows.push({ key: line, url: urlFrom(buildParams()) });
      } else {
        rows.push({ key: line, url: urlFrom(buildParams({ identity: { mode: identityMode, value: line } })) });
      }
    }
    setBulkRows(rows);
    setBuilding(false);
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  }

  function downloadCsv() {
    const header = bulkMode === "placement" ? "placement,url" : "recipient,url";
    const body = bulkRows.map(r => `"${r.key.replace(/"/g, '""')}","${r.url}"`).join("\n");
    const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chapter-links-${clientKey}-${slug || GENERIC_SLUG}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const destinationRequired = !ruleSuppliesDestination;
  const destState = destinationState(destination);
  // What the reader actually lands on. Only knowable client-side for a
  // pass-through link; a rule-supplied destination resolves server-side.
  const resolvedDestination = ruleSuppliesDestination ? null : normalizeDestination(destination);
  const canBuild = ruleSuppliesDestination || destState === "ok";

  return (
    <div className="mt-6 grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Client" required hint="Which client's 1P redirect domain to use">
          {lockClient ? (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-800">
              {currentClient?.client_key ?? clientKey}
              {currentClient?.storefront_domain ? (
                <span className="ml-2 font-sans text-xs text-neutral-500">{currentClient.storefront_domain}</span>
              ) : null}
            </div>
          ) : (
            <select className={inputCls} value={clientKey} onChange={e => setClientKey(e.target.value)}>
              {clients.map(c => (
                <option key={c.client_key} value={c.client_key}>
                  {c.client_key}{c.storefront_domain ? ` — ${c.storefront_domain}` : ""}
                </option>
              ))}
            </select>
          )}
        </Field>

        {hostOptions.length > 1 ? (
          <Field
            label="Property / link host"
            required
            hint="Cookies land on this host's domain — pick the paper the reader is coming from"
          >
            <select className={inputCls} value={effectiveOrigin} onChange={e => setHostOverride(e.target.value)}>
              {hostOptions.map(h => (
                <option key={h} value={h}>{h.replace(/^https?:\/\//, "")}</option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field label="Link" hint="Pick a configured rule, or Generic for an ad-hoc ?to= link">
          <select className={inputCls} value={slug} onChange={e => setSlug(e.target.value)}>
            <option value="">— Generic ad-hoc link (slug: {GENERIC_SLUG}) —</option>
            {availableSlugs.map(s => (
              <option key={s.slug} value={s.slug}>
                {s.slug}{s.description ? ` — ${s.description}` : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {ruleSuppliesDestination ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <span className="font-semibold">Destination comes from the rule.</span>{" "}
          <code className="rounded bg-white px-1">{slug}</code> resolves server-side, so no{" "}
          <code className="rounded bg-white px-1">?to=</code> is added. Edit the destination on the rule itself.
        </div>
      ) : (
        <>
        {slugIsPassThrough && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <span className="font-semibold">This link is a pass-through.</span>{" "}
            <code className="rounded bg-white px-1">{slug}</code> forwards to whatever{" "}
            <code className="rounded bg-white px-1">?to=</code> carries, so a destination is still required below.
          </div>
        )}
        <Field label="Destination" required={destinationRequired} hint="Where the visitor lands after the redirect">
          <>
            {isAgency && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_DESTINATIONS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDestination(d.value)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition ${
                      destination === d.value
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
            <input
              className={inputCls}
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onBlur={() => setDestination(d => normalizeDestination(d))}
              placeholder={currentClient?.storefront_domain ? `https://${currentClient.storefront_domain}/...` : "https://..."}
            />
            {destState === "invalid" ? (
              <p className="mt-1 text-xs font-medium text-red-600">
                Not a usable web address. A link built on this would still redirect and still be
                counted — but the reader lands on the fallback, not the advertiser.
              </p>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">
                Paste the full URL including its own query string — it gets encoded automatically.{" "}
                <span className="text-neutral-400">https:// is added if you leave it off.</span>
              </p>
            )}
          </>
        </Field>
        </>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Identity</h3>
        <p className="mt-1 text-xs text-neutral-500">
          How the click ties to a person. Precedence at the redirect is rh &gt; rid &gt; re; every hint is
          stripped before the destination is reached, so it never leaks downstream.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {IDENTITY_MODES.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => { setIdentityMode(m.value); setProspect(null); setIdentityValue(""); }}
              className={`rounded-md border px-2.5 py-1 text-xs transition ${
                identityMode === m.value
                  ? "border-orange-400 bg-orange-50 text-orange-700"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {IDENTITY_MODES.find(m => m.value === identityMode)?.hint}
        </p>

        {identityMode === "rid" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Token" hint="Paste a Mailchimp UNIQID or CRM prospect_key">
              <input
                className={inputCls}
                value={prospect ? prospect.prospect_key : identityValue}
                onChange={e => { setProspect(null); setIdentityValue(e.target.value); }}
                placeholder="e.g. 4f2a9c1b3e"
              />
            </Field>
            <Field label="Or search CRM" hint="adsforgood_prod prospects only">
              <>
                <input
                  className={inputCls}
                  value={prospect ? prospect.business_name : query}
                  onChange={e => { setProspect(null); setQuery(e.target.value); }}
                  placeholder="Type to search…"
                />
                {searching && <p className="mt-1 text-xs text-neutral-400">Searching…</p>}
                {results.length > 0 && (
                  <ul className="mt-1 max-h-40 overflow-auto rounded-md border border-neutral-200 bg-white text-sm shadow-sm">
                    {results.map(r => (
                      <li key={r.prospect_key}>
                        <button
                          type="button"
                          onClick={() => { setProspect(r); setQuery(""); setResults([]); }}
                          className="block w-full px-3 py-1.5 text-left hover:bg-orange-50"
                        >
                          {r.business_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            </Field>
          </div>
        )}

        {(identityMode === "rh" || identityMode === "re") && !bulk && (
          <div className="mt-3">
            <Field label="Email" hint={identityMode === "rh" ? "Hashed in your browser before it goes in the URL" : "Goes in the URL as typed"}>
              <input
                className={inputCls}
                value={identityValue}
                onChange={e => setIdentityValue(e.target.value)}
                placeholder="person@example.com"
              />
            </Field>
            {identityMode === "rh" && identityHash && (
              <p className="mt-1 break-all font-mono text-[11px] text-neutral-500">
                rh = {identityHash}
              </p>
            )}
          </div>
        )}
      </div>

      <Field label="Partner" hint="Who the placement is for — reporting groups on this exact text">
        <>
          <input
            className={inputCls}
            list="known-partners"
            value={partner}
            onChange={e => setPartner(e.target.value)}
            placeholder="firstrust"
          />
          <datalist id="known-partners">
            {knownPartners.map(p => <option key={p} value={p} />)}
          </datalist>
          <p className="mt-1 text-xs text-neutral-500">
            {knownPartners.length > 0
              ? `Pick from ${knownPartners.length} already in use, or type a new one. `
              : "No partners recorded yet — the first one you use seeds the list. "}
            <span className="text-neutral-400">
              firstrust and Firstrust report as two different partners.
            </span>
          </p>
        </>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="UTM source" hint="Feeds Chapter's channel classification">
          <input className={inputCls} list="utm-sources" value={utmSource} onChange={e => setUtmSource(e.target.value)} />
          <datalist id="utm-sources">
            {UTM_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </datalist>
        </Field>
        <Field label="UTM medium" hint="e.g. email, cpc, social">
          <input className={inputCls} list="utm-mediums" value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="email" />
          <datalist id="utm-mediums">
            {UTM_MEDIUMS.map(m => <option key={m} value={m} />)}
          </datalist>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="UTM campaign" hint="Optional">
          <input className={inputCls} value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="cart_recovery_sep" />
        </Field>
        <Field label="UTM content" hint="Optional">
          <input className={inputCls} value={utmContent} onChange={e => setUtmContent(e.target.value)} placeholder="variant_a" />
        </Field>
        <Field label="UTM term" hint="Optional">
          <input className={inputCls} value={utmTerm} onChange={e => setUtmTerm(e.target.value)} placeholder="keyword" />
        </Field>
      </div>

      <Field label="Extra routing params" hint="One per line, key=value — e.g. r=fin to match a query_param rule condition">
        <textarea className={`${inputCls} font-mono`} rows={2} value={extraParams} onChange={e => setExtraParams(e.target.value)} placeholder="r=fin" />
      </Field>

      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
          <input type="checkbox" checked={bulk} onChange={e => { setBulk(e.target.checked); setBulkRows([]); }} />
          Generate many links at once
        </label>

        {bulk && (
          <div className="mt-4 grid gap-4">
            <div className="flex flex-wrap gap-1.5">
              {(["recipient", "placement"] as BulkMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setBulkMode(m); setBulkRows([]); }}
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    bulkMode === m
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  {m === "recipient" ? "One per recipient" : "One per placement"}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              {bulkMode === "recipient"
                ? identityMode === "none"
                  ? "Pick an identity mode above, or every row will be the same anonymous link."
                  : `One line per recipient — each becomes ?${identityMode}=…`
                : "One line per placement — each becomes its own utm_source + utm_content, against the same destination."}
            </p>
            <Field label={bulkMode === "recipient" ? "Recipients" : "Placements"} hint="One per line (or comma-separated)">
              <textarea
                className={`${inputCls} font-mono`}
                rows={6}
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
                placeholder={bulkMode === "recipient" ? "person@example.com\nanother@example.com" : "creator_social\ncreator_email\nprogrammatic\nyoutube\nretail_media"}
              />
            </Field>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={buildBulk}
                disabled={!canBuild || building}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-900 disabled:opacity-50"
              >
                {building ? "Building…" : `Build ${parseLines(bulkInput).length || ""} links`}
              </button>
              {bulkRows.length > 0 && (
                <>
                  <button type="button" onClick={() => copyText(bulkRows.map(r => r.url).join("\n"))}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400">
                    {copied ? "Copied!" : "Copy all"}
                  </button>
                  <button type="button" onClick={downloadCsv}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400">
                    Download CSV
                  </button>
                </>
              )}
            </div>
            {bulkRows.length > 0 && (
              <div className="max-h-72 overflow-auto rounded border border-neutral-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{bulkMode === "recipient" ? "Recipient" : "Placement"}</th>
                      <th className="px-3 py-2 font-semibold">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((r, i) => (
                      <tr key={i} className="border-t border-neutral-100">
                        <td className="px-3 py-1.5 font-mono text-neutral-600">{r.key}</td>
                        <td className="px-3 py-1.5 break-all font-mono text-neutral-800">{r.url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {!bulk && (
        <div className="rounded-lg border border-orange-300 bg-orange-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-800">Your URL</h3>
            <button
              type="button"
              onClick={() => copyText(finalUrl)}
              disabled={!canBuild}
              className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="mt-3 break-all rounded border border-neutral-200 bg-white px-3 py-2 font-mono text-xs text-neutral-800">
            {finalUrl}
          </div>
          {resolvedDestination && (
            <p className="mt-2 text-xs text-orange-900">
              <span className="font-semibold">Reader lands on:</span>{" "}
              <span className="break-all font-mono">{resolvedDestination}</span>
            </p>
          )}
          {ruleSuppliesDestination && (
            <p className="mt-2 text-xs text-orange-900">
              <span className="font-semibold">Reader lands on:</span> the destination configured on the{" "}
              <code className="rounded bg-white px-1">{slug}</code> rule.
            </p>
          )}
          <p className="mt-2 text-xs text-orange-700">
            {identityMode === "none"
              ? "Anonymous 1P wrapped link — click logs + cookies set, no identity stitch (resolves later if they identify on-site)."
              : `Click stitches via ?${identityMode}. The hint is stripped before the destination is reached.`}
          </p>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
        {label}
        {required && <span className="ml-1 text-orange-500">*</span>}
        {hint && <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">{hint}</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
