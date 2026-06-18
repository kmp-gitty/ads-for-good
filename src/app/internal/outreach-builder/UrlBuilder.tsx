"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  searchProspectsForOutreach,
  type ProspectOption,
} from "./_actions";

const UTM_SOURCES = [
  { value: "cold_email", label: "Cold email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "in_person", label: "In-person / event" },
  { value: "podcast", label: "Podcast" },
  { value: "webinar", label: "Webinar" },
  { value: "referral", label: "Referral" },
  { value: "sms", label: "SMS / text" },
  { value: "phone_followup", label: "Phone follow-up" },
  { value: "newsletter", label: "Newsletter" },
  { value: "other", label: "Other" },
];

// Curated quick-destinations for ads4good.com pages — saves typing the full URL.
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

export default function UrlBuilder({
  slugs,
  clientKey,
  redirectOrigin,
}: {
  slugs: { slug: string; description: string | null }[];
  clientKey: string;
  redirectOrigin: string;
}) {
  const [slug, setSlug] = useState(slugs[0]?.slug || "outreach");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProspectOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [prospect, setProspect] = useState<ProspectOption | null>(null);
  const [destination, setDestination] = useState(QUICK_DESTINATIONS[0].value);
  const [utmSource, setUtmSource] = useState("cold_email");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || prospect) {
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
  }, [query, prospect]);

  // Build the final URL. Encoding the `to` param keeps query strings inside
  // the destination URL from breaking the redirect's own parser.
  const finalUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (destination) params.set("to", destination);
    if (prospect?.prospect_key) params.set("rid", prospect.prospect_key);
    if (utmSource) params.set("utm_source", utmSource);
    if (utmCampaign.trim()) params.set("utm_campaign", utmCampaign.trim());
    if (utmContent.trim()) params.set("utm_content", utmContent.trim());
    const qs = params.toString();
    return `${redirectOrigin}/r/${clientKey}/${slug}${qs ? `?${qs}` : ""}`;
  }, [slug, destination, prospect, utmSource, utmCampaign, utmContent, clientKey, redirectOrigin]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Build an outreach URL</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Wrap a destination link with prospect identity + UTM tracking. Paste the resulting URL
          anywhere — cold email, LinkedIn DM, in-person QR code. Clicks log to{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5">chapter_ingest.pixel_events</code>{" "}
          and stitch identity automatically.
        </p>

        <div className="mt-6 grid gap-5">
          <Field label="Slug" hint="Which redirect rule to fire">
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={inputCls}
            >
              {slugs.length === 0 ? (
                <option value="outreach">outreach (no rules configured)</option>
              ) : (
                slugs.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.slug}
                    {s.description ? ` — ${s.description.slice(0, 60)}` : ""}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="Prospect" required hint="Search by business name, contact, email, or prospect_key">
            {prospect ? (
              <div className="flex items-center justify-between rounded-md border border-orange-300 bg-orange-50 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-neutral-900">
                    {prospect.business_name}
                    {prospect.contact_name && (
                      <span className="text-neutral-600"> · {prospect.contact_name}</span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {prospect.email ?? "no email"} · key:{" "}
                    <code className="rounded bg-white px-1 py-0.5">{prospect.prospect_key}</code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProspect(null);
                    setQuery("");
                  }}
                  className="text-xs font-medium text-orange-700 hover:text-orange-900"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={inputCls}
                  placeholder="Type to search…"
                />
                {(searching || results.length > 0) && query.trim() && (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg">
                    {searching ? (
                      <li className="px-3 py-2 text-sm text-neutral-500">Searching…</li>
                    ) : results.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-neutral-500">No matches</li>
                    ) : (
                      results.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setProspect(r);
                              setResults([]);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                          >
                            <div className="font-medium">{r.business_name}</div>
                            <div className="text-xs text-neutral-500">
                              {r.contact_name ?? "—"} · {r.email ?? "no email"}
                            </div>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
          </Field>

          <Field label="Destination" required hint="Where the prospect lands after the redirect">
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_DESTINATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDestination(d.value)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    destination === d.value
                      ? "border-orange-500 bg-orange-50 text-orange-800"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <input
              type="url"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="UTM source" required>
              <select
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                className={inputCls}
              >
                {UTM_SOURCES.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </Field>

            <Field label="UTM campaign" hint="Optional · e.g. q2_outreach">
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                className={inputCls}
                placeholder="q2_outreach"
              />
            </Field>
          </div>

          <Field label="UTM content" hint="Optional · variant tag (subject_a, button_top, etc.)">
            <input
              type="text"
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
              className={inputCls}
              placeholder="subject_a"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-orange-300 bg-orange-50/50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-orange-800">
            Your URL
          </h3>
          <button
            type="button"
            onClick={copyUrl}
            disabled={!prospect}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="mt-3 break-all rounded border border-neutral-200 bg-white px-3 py-2 font-mono text-xs text-neutral-800">
          {finalUrl}
        </div>
        {!prospect && (
          <p className="mt-2 text-xs text-orange-700">
            Pick a prospect to enable identity stitching on the click.
          </p>
        )}
      </div>
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
        {hint && <span className="ml-2 text-neutral-400 normal-case font-normal tracking-normal">{hint}</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
