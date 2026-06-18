"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createRule, updateRule, type RuleFormInput } from "../_actions";

export type RuleFormProps = {
  client_key: string;
  initial?: {
    id: string;
    slug: string;
    rule_priority: number;
    condition_jsonb: Record<string, unknown>;
    destination_template: string;
    description: string | null;
    enabled: boolean;
  };
};

// Common destination-template patterns. Click to populate the field.
const DESTINATION_PRESETS: { label: string; description: string; template: string }[] = [
  {
    label: "Pass-through with UTM tracking",
    description: "Land them at the URL passed in `?to=`, preserving UTM params. Used by outreach + Google Ads tracking template.",
    template:
      "{q:to}?utm_source={q:utm_source}&utm_medium={q:utm_medium}&utm_campaign={q:utm_campaign}&utm_content={q:utm_content}&utm_term={q:utm_term}",
  },
  {
    label: "Fixed URL",
    description: "Always redirect to a single hardcoded URL. No params propagated.",
    template: "https://ads4good.com/contact",
  },
  {
    label: "Personalized by identity",
    description: "Add the visitor's identity hash to the URL so the destination page can recognize them.",
    template: "https://ads4good.com/welcome?id={identity_key}",
  },
  {
    label: "Geo-targeted (country)",
    description: "Append visitor's country code. Useful for routing inside a multi-region landing page.",
    template: "https://ads4good.com/lp?region={country}&utm_source={q:utm_source}",
  },
  {
    label: "Mobile vs desktop",
    description: "Use {device_type} to vary which destination the visitor sees. Often paired with two priority-stacked rules.",
    template: "https://ads4good.com/mobile-landing?utm_source={q:utm_source}",
  },
];

// Token glossary for the live explainer.
const TOKEN_DOCS: { token: string; meaning: string }[] = [
  { token: "{q:NAME}", meaning: "Value of `?NAME=…` in the inbound URL (URL-encoded). Common: {q:to}, {q:utm_source}, {q:gclid}." },
  { token: "{identity_key}", meaning: "The visitor's chapter identity key (their anonymous_id or canonical resolved key)." },
  { token: "{country}", meaning: "Visitor's country code (US, GB, ...) from Vercel's geo headers." },
  { token: "{region}", meaning: "Visitor's region/state code." },
  { token: "{device_type}", meaning: "mobile / tablet / desktop / bot / unknown — from User-Agent parsing." },
  { token: "{os}", meaning: "ios / android / macos / windows / linux / unknown." },
];

export default function RuleForm({ client_key, initial }: RuleFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [priority, setPriority] = useState(String(initial?.rule_priority ?? 100));
  const [conditions, setConditions] = useState(
    initial?.condition_jsonb ? JSON.stringify(initial.condition_jsonb, null, 2) : "{}"
  );
  const [destination, setDestination] = useState(initial?.destination_template ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  // URL tester state
  const [testUrl, setTestUrl] = useState("");

  const tokensInDestination = useMemo(() => {
    const set = new Set<string>();
    const re = /\{[^}]+\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(destination))) set.add(m[0]);
    return Array.from(set);
  }, [destination]);

  const previewUrl = useMemo(() => {
    if (!destination || !testUrl) return null;
    try {
      const url = new URL(testUrl);
      let result = destination;
      // {q:NAME} → URL-encoded value of inbound query
      result = result.replace(/\{q:([^}]+)\}/g, (_match, name) => {
        const v = url.searchParams.get(name) ?? "";
        // URL-encode values that aren't themselves URLs (mirrors template.ts logic)
        return /^https?:\/\//i.test(v) ? v : encodeURIComponent(v);
      });
      // Reserved vars — show placeholders (we can't simulate them without a real visitor)
      result = result.replace(/\{identity_key\}/g, "anon-…");
      result = result.replace(/\{journey_id\}/g, "journey-…");
      result = result.replace(/\{country\}/g, "US");
      result = result.replace(/\{region\}/g, "PA");
      result = result.replace(/\{city\}/g, "Philadelphia");
      result = result.replace(/\{device_type\}/g, "desktop");
      result = result.replace(/\{os\}/g, "macos");
      result = result.replace(/\{client_key\}/g, client_key);
      return result;
    } catch {
      return "(invalid test URL)";
    }
  }, [destination, testUrl, client_key]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: RuleFormInput = {
      client_key,
      slug: slug.trim(),
      rule_priority: parseInt(priority, 10) || 0,
      condition_jsonb: conditions,
      destination_template: destination.trim(),
      description: description.trim(),
      enabled,
    };

    startTransition(async () => {
      const res = initial
        ? await updateRule(initial.id, input)
        : await createRule(input);
      if (!res.ok) {
        setError(res.error ?? "save failed");
        return;
      }
      router.push(`/internal/redirect-rules/${client_key}`);
    });
  }

  return (
    <div className="space-y-5">
      {/* Primer — shown only on the new-rule form to avoid clutter on edits */}
      {!initial && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5 text-sm text-neutral-700">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-800">
            How a rule works
          </h2>
          <p className="mt-2 leading-relaxed">
            When a visitor hits <code className="rounded bg-white px-1 py-0.5 text-xs">/r/{client_key}/SLUG</code>,
            we walk all enabled rules in priority order (lower first). The first rule whose conditions match
            gets used. Its <strong>destination template</strong> builds the final URL we 302 to.
          </p>
          <ul className="mt-2 list-disc pl-5 leading-relaxed">
            <li><strong>Slug</strong> — appears in the URL. Group related rules with the same slug.</li>
            <li><strong>Priority</strong> — lower wins. Use this when you have a specific rule + a fallback catch-all.</li>
            <li><strong>Conditions</strong> — leave empty <code className="rounded bg-white px-1 py-0.5 text-xs">{"{}"}</code> for catch-all.</li>
            <li><strong>Destination</strong> — use <code className="rounded bg-white px-1 py-0.5 text-xs">{"{q:NAME}"}</code> to pull from the inbound URL.</li>
          </ul>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-4">
          <label className="col-span-2 text-sm">
            <span className="block font-semibold text-neutral-800">Slug</span>
            <span className="block text-xs text-neutral-500">
              URL component: /r/{client_key}/<strong>{slug || "<slug>"}</strong>
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="booknow"
              required
              className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Priority</span>
            <span className="block text-xs text-neutral-500">Lower wins. 100 = default.</span>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              min={0}
              required
              className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Conditions (JSON object)</span>
          <span className="block text-xs text-neutral-500">
            Empty <code>{"{}"}</code> = catch-all (always matches). Otherwise an object whose keys are
            condition types, AND-ed together. Example: <code className="rounded bg-neutral-100 px-1 py-0.5">{`{"country_in": ["US", "CA"], "device_type": "mobile"}`}</code>
          </span>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
            placeholder='{}'
          />
        </label>

        {/* Destination preset chips */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Destination template</div>
          <div className="text-xs text-neutral-500">
            Click a preset to fill the field, or write your own. Tokens like <code className="rounded bg-neutral-100 px-1 py-0.5">{"{q:utm_source}"}</code> are replaced when a visitor clicks.
          </div>
          <div className="flex flex-wrap gap-2">
            {DESTINATION_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setDestination(p.template)}
                title={p.description}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-orange-400 hover:bg-orange-50"
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="https://ads4good.com/landing?utm_source={q:utm_source}"
            required
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
          />

          {/* Live token explainer — shows ONLY the tokens currently in the field */}
          {tokensInDestination.length > 0 && (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs">
              <div className="font-semibold text-neutral-700">Tokens in this template:</div>
              <ul className="mt-1 space-y-1">
                {tokensInDestination.map((t) => {
                  const meaning =
                    t.startsWith("{q:")
                      ? `Pulled from the inbound URL's \`?${t.slice(3, -1)}=…\` param`
                      : TOKEN_DOCS.find((d) => d.token === t)?.meaning ?? "Unknown token — will render empty.";
                  return (
                    <li key={t}>
                      <code className="rounded bg-white px-1.5 py-0.5 text-[11px] font-mono">{t}</code>
                      <span className="ml-2 text-neutral-600">{meaning}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* URL tester */}
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-xs">
          <div className="text-sm font-semibold text-neutral-800">Test the rule</div>
          <div className="mt-1 text-neutral-500">
            Type a sample inbound URL (like what an ad click or outreach link would produce). We&rsquo;ll show what destination the rule would 302 to.
          </div>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder={`https://ads4good.com/r/${client_key}/${slug || "slug"}?to=https://ads4good.com/about&utm_source=cold_email`}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
          />
          {previewUrl && (
            <div className="mt-2 rounded border border-orange-200 bg-orange-50 p-2 font-mono text-[11px] text-neutral-800 break-all">
              → {previewUrl}
            </div>
          )}
        </div>

        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Description (optional)</span>
          <span className="block text-xs text-neutral-500">For operator clarity only — not shown to visitors.</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Returning customers with an open cart → cart page with discount banner"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded"
          />
          <span className="font-semibold text-neutral-800">Enabled</span>
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {pending ? "Saving…" : initial ? "Save changes" : "Create rule"}
          </button>
          <Link
            href={`/internal/redirect-rules/${client_key}`}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
