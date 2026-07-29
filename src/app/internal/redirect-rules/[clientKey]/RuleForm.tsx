"use client";

// Internal (operator) redirect-rule builder — restyled June 2026 to match the
// visual language of the self-serve link editor. Two-column layout with the
// rule form on the left + live URL preview + token explainer + resolved-URL
// tester on the right (sticky so operators can eyeball the effect as they
// tweak).
//
// All business logic — 17-condition support (via ConditionBuilder), preset
// destination templates, token dictionary, token-in-template diff, URL tester
// simulator, create/update server-action wiring — preserved from the prior
// Tailwind implementation.

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createRule, updateRule, type RuleFormInput } from "../_actions";
import ConditionBuilder from "./ConditionBuilder";
import {
  INK,
  MUTED,
  FAINT,
  ORANGE,
  LINE,
  PANEL,
  SUBTLE,
  inp,
  inpMono,
  Section,
  PrimaryButton,
  ErrorBanner,
} from "@/app/lib/ui/builder-primitives";

export type ExistingRuleSummary = {
  id: string;
  slug: string;
  rule_priority: number;
  condition_jsonb: Record<string, unknown>;
  destination_template: string;
  enabled: boolean;
};

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
  // All rules that exist today for this client. Used to (a) offer a picker
  // of existing slugs next to the Slug field, (b) show the sibling rules
  // for whichever slug is currently typed so the operator can see the rule
  // chain they're extending while they build.
  existingRules?: ExistingRuleSummary[];
  // Optional pre-fills for the new-rule form. Used by the missing-catch-all
  // redirect flow: operator saves a specific rule → we route them to
  // ?slug=X&catch_all=1 → this form opens with slug + priority + description
  // hint pre-set, empty conditions, operator only fills destination.
  initialSlug?: string;
  isCatchAllPreFill?: boolean;
  // Client-level default_redirect_destination (chapter_config.clients).
  // When set, "missing catch-all" is a soft warning ("falls back to X")
  // instead of a 404 warning. NULL = no client default → 404 on miss.
  clientDefaultDestination?: string | null;
};

// Common destination-template patterns. Click a chip to populate the field.
const DESTINATION_PRESETS: { label: string; description: string; template: string }[] = [
  {
    label: "Pass-through with UTM",
    description: "Land at the URL passed in `?to=`, preserving UTM params. Used by outreach + Google Ads tracking template.",
    template:
      "{q:to}?utm_source={q:utm_source}&utm_medium={q:utm_medium}&utm_campaign={q:utm_campaign}&utm_content={q:utm_content}&utm_term={q:utm_term}",
  },
  {
    label: "Fixed URL + UTM passthrough",
    description: "Always land at a specific URL but preserve the marketing UTM params. Good for rules overriding a catch-all while keeping attribution.",
    template:
      "https://ads4good.com/landing?utm_source={q:utm_source}&utm_medium={q:utm_medium}&utm_campaign={q:utm_campaign}&utm_content={q:utm_content}&utm_term={q:utm_term}",
  },
  {
    label: "Fixed URL",
    description: "Always redirect to a single hardcoded URL. No params propagated.",
    template: "https://ads4good.com/contact",
  },
  {
    label: "Personalized by identity",
    description: "Add the visitor's identity hash so the destination page can recognize them.",
    template: "https://ads4good.com/welcome?id={identity_key}",
  },
  {
    label: "Geo-targeted (country)",
    description: "Append visitor's country code. Useful for multi-region landing pages.",
    template: "https://ads4good.com/lp?region={country}&utm_source={q:utm_source}",
  },
  {
    label: "Mobile vs desktop",
    description: "Use {device_type} to vary destination. Often paired with priority-stacked rules.",
    template: "https://ads4good.com/mobile-landing?utm_source={q:utm_source}",
  },
];

// Token glossary for the live explainer.
const TOKEN_DOCS: { token: string; meaning: string }[] = [
  { token: "{q:NAME}", meaning: "Value of `?NAME=…` in the inbound URL (URL-encoded). Common: {q:to}, {q:utm_source}, {q:gclid}." },
  { token: "{identity_key}", meaning: "Visitor's Chapter identity key (anonymous_id or canonical resolved key)." },
  { token: "{country}", meaning: "Visitor's country code (US, GB, …) from Vercel's geo headers." },
  { token: "{region}", meaning: "Visitor's region/state code." },
  { token: "{device_type}", meaning: "mobile / tablet / desktop / bot / unknown — from User-Agent parsing." },
  { token: "{os}", meaning: "ios / android / macos / windows / linux / unknown." },
];

// Human-readable one-liner for a rule's conditions. Empty/{} → "(catch-all)".
function summarizeConditions(cond: Record<string, unknown>): string {
  const keys = Object.keys(cond ?? {});
  if (keys.length === 0) return "(catch-all — always matches)";
  return keys
    .map((k) => {
      const v = cond[k];
      if (typeof v === "boolean") return `${k} = ${v ? "yes" : "no"}`;
      if (typeof v === "string" || typeof v === "number") return `${k} = ${v}`;
      if (Array.isArray(v)) return `${k} ∈ [${v.slice(0, 3).join(", ")}${v.length > 3 ? "…" : ""}]`;
      return k;
    })
    .join(" · ");
}

export default function RuleForm({
  client_key,
  initial,
  existingRules = [],
  initialSlug,
  isCatchAllPreFill = false,
  clientDefaultDestination = null,
}: RuleFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial?.slug ?? initialSlug ?? "");
  // Catch-all pre-fill defaults: priority 200 (checked after the specific rule),
  // description hinting operator purpose. Editable — operator can override.
  const [priority, setPriority] = useState(
    String(initial?.rule_priority ?? (isCatchAllPreFill ? 200 : 100)),
  );
  const [conditions, setConditions] = useState(
    initial?.condition_jsonb ? JSON.stringify(initial.condition_jsonb, null, 2) : "{}",
  );
  const [destination, setDestination] = useState(initial?.destination_template ?? "");
  const [description, setDescription] = useState(
    initial?.description ?? (isCatchAllPreFill ? "Catch-all fallback for /r/" + client_key + "/" + (initialSlug ?? "") : ""),
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  // URL tester
  const [testUrl, setTestUrl] = useState("");

  // Distinct slugs from existing rules (excluding the one being edited so the
  // operator can't "pick" the slug they're already editing). Sorted alpha.
  const existingSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const r of existingRules) {
      if (initial && r.id === initial.id) continue;
      set.add(r.slug);
    }
    return Array.from(set).sort();
  }, [existingRules, initial]);

  // Rules that share the currently-typed slug (excluding this rule if editing).
  // Powers the "existing rules for this slug" panel.
  const siblingRules = useMemo(() => {
    const s = slug.trim();
    if (!s) return [];
    return existingRules
      .filter((r) => r.slug === s && (!initial || r.id !== initial.id))
      .sort((a, b) => a.rule_priority - b.rule_priority);
  }, [existingRules, slug, initial]);

  // Catch-all detection — warns the operator when saving a rule with conditions
  // would leave the slug without any fallback. Prevents the 404 footgun where
  // a visitor doesn't match the specific rule + there's no catch-all + no ?to=
  // param on the inbound URL → visitor gets a 404.
  //
  // Three conditions to warn:
  // 1. Slug is typed
  // 2. Current form conditions are NON-empty (this rule isn't itself a catch-all)
  // 3. No OTHER enabled rule on this slug is a catch-all (empty conditions_jsonb)
  const currentConditionsAreCatchAll = useMemo(() => {
    try {
      const parsed = JSON.parse(conditions);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length === 0;
    } catch {
      return false;
    }
  }, [conditions]);

  const slugHasEnabledCatchAll = useMemo(() => {
    const s = slug.trim();
    if (!s) return false;
    return existingRules.some(
      (r) =>
        r.slug === s &&
        r.enabled &&
        (!initial || r.id !== initial.id) &&
        Object.keys(r.condition_jsonb).length === 0,
    );
  }, [existingRules, slug, initial]);

  const willLackCatchAll = useMemo(() => {
    if (!slug.trim()) return false;
    if (currentConditionsAreCatchAll) return false;
    return !slugHasEnabledCatchAll;
  }, [slug, currentConditionsAreCatchAll, slugHasEnabledCatchAll]);

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
      // {q:NAME} → URL-encoded value of inbound query (mirrors template.ts).
      result = result.replace(/\{q:([^}]+)\}/g, (_match, name) => {
        const v = url.searchParams.get(name) ?? "";
        return /^https?:\/\//i.test(v) ? v : encodeURIComponent(v);
      });
      // Reserved vars — placeholders since we can't simulate real visitors.
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

    // Snapshot the missing-catch-all state at save time (state may not update
    // between transition kick-off + resolve). If missing, redirect to a
    // pre-filled new-rule form so operator immediately fills the catch-all.
    const shouldOfferCatchAll = willLackCatchAll;
    const savedSlug = input.slug;

    startTransition(async () => {
      const res = initial
        ? await updateRule(initial.id, input)
        : await createRule(input);
      if (!res.ok) {
        setError(res.error ?? "save failed");
        return;
      }
      if (shouldOfferCatchAll) {
        router.push(`/internal/redirect-rules/${client_key}/new?slug=${encodeURIComponent(savedSlug)}&catch_all=1`);
      } else {
        router.push(`/internal/redirect-rules/${client_key}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ padding: 0 }}>
      {/* Primer — new-rule form only, to avoid clutter on edits */}
      {!initial && (
        <div
          style={{
            border: `1px solid ${ORANGE}44`,
            background: SUBTLE,
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
            fontSize: 13,
            color: INK,
            lineHeight: 1.55,
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 700, color: ORANGE, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>
            How a rule works
          </div>
          <p style={{ margin: "0 0 8px" }}>
            When a visitor hits{" "}
            <code style={{ background: "white", padding: "1px 5px", borderRadius: 4, border: `1px solid ${LINE}`, fontSize: 12 }}>
              /r/{client_key}/SLUG
            </code>
            , we walk all enabled rules in priority order (lower first). The first rule whose
            conditions match gets used. Its <strong>destination template</strong> builds the final
            URL we 302 to.
          </p>
          <ul style={{ margin: "0 0 0 20px", padding: 0, listStyle: "disc", color: MUTED, fontSize: 12.5, lineHeight: 1.6 }}>
            <li><strong>Slug</strong> — appears in the URL. Group related rules by slug.</li>
            <li><strong>Priority</strong> — lower wins. Use for a specific rule + fallback catch-all.</li>
            <li><strong>Conditions</strong> — leave empty for catch-all.</li>
            <li><strong>Destination</strong> — use <code style={{ background: "white", padding: "0 4px", borderRadius: 3, border: `1px solid ${LINE}` }}>{"{q:NAME}"}</code> to pull from the inbound URL.</li>
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
        {/* Left — form */}
        <div style={{ flex: "1 1 480px", minWidth: 0, maxWidth: 640 }}>
          {/* Slug + priority row */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <Section
              label="Slug"
              hint={
                slug ? `URL: /r/${client_key}/${slug}` : `URL: /r/${client_key}/<slug>`
              }
              right={
                existingSlugs.length > 0 ? (
                  <select
                    value={existingSlugs.includes(slug) ? slug : ""}
                    onChange={(e) => {
                      if (e.target.value) setSlug(e.target.value);
                    }}
                    style={{
                      fontSize: 11.5,
                      color: MUTED,
                      background: "white",
                      border: `1px solid ${LINE}`,
                      borderRadius: 6,
                      padding: "3px 6px",
                      cursor: "pointer",
                      maxWidth: 180,
                    }}
                    title="Pick an existing slug to add another rule to that chain"
                  >
                    <option value="">Pick existing…</option>
                    {existingSlugs.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : null
              }
            >
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="booknow"
                required
                style={inpMono}
              />
            </Section>
            <Section label="Priority" hint="Lower wins. 100 = default.">
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min={0}
                required
                style={inpMono}
              />
            </Section>
          </div>

          {/* Conditions (structured) */}
          <Section
            label="Conditions"
            hint="Pick the visitor / time / context filters that must ALL match. No conditions = catch-all (always matches)."
          >
            <ConditionBuilder jsonValue={conditions} onChange={setConditions} />
          </Section>

          {/* Destination */}
          <Section
            label="Destination template"
            hint="Click a preset to fill the field, or write your own. Tokens like {q:utm_source} are replaced when a visitor clicks."
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {DESTINATION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDestination(p.template)}
                  title={p.description}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: INK,
                    background: "white",
                    border: `1px solid ${LINE}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
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
              style={inpMono}
            />
            {/* Live token explainer */}
            {tokensInDestination.length > 0 && (
              <div style={{ marginTop: 10, border: `1px solid ${LINE}`, background: PANEL, borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
                  Tokens in this template
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {tokensInDestination.map((t) => {
                    const meaning = t.startsWith("{q:")
                      ? `Pulled from the inbound URL's ?${t.slice(3, -1)}=… param`
                      : TOKEN_DOCS.find((d) => d.token === t)?.meaning ??
                        "Unknown token — will render empty.";
                    return (
                      <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <code
                          style={{
                            background: "white",
                            padding: "1px 5px",
                            borderRadius: 4,
                            border: `1px solid ${LINE}`,
                            fontSize: 11.5,
                            flexShrink: 0,
                          }}
                        >
                          {t}
                        </code>
                        <span style={{ color: MUTED }}>{meaning}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Section>

          {/* Description */}
          <Section label="Description (optional)" hint="For operator clarity — not shown to visitors.">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Returning customers with an open cart → cart page with discount banner"
              style={inp}
            />
          </Section>

          {/* Enabled */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 14, color: INK, cursor: "pointer" }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled
          </label>

          <ErrorBanner message={error} />

          {/* Missing catch-all warning — fires when the slug has a specific
              rule (this one) but no fallback. Copy varies based on whether a
              client-level default_redirect_destination is set:
              - No client default → visitors 404 on miss (loud warning)
              - Client default set → visitors fall back to it (soft note)
              Post-save routing to pre-filled catch-all form runs either way. */}
          {willLackCatchAll && (
            <div
              style={{
                marginTop: 16,
                border: `1px solid ${clientDefaultDestination ? LINE : ORANGE + "66"}`,
                background: clientDefaultDestination ? PANEL : SUBTLE,
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 13,
                color: INK,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: clientDefaultDestination ? MUTED : ORANGE,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  {clientDefaultDestination ? "FYI · no per-slug catch-all" : "Heads up · no catch-all"}
                </span>
              </div>
              <div style={{ color: MUTED }}>
                <code style={{ background: "white", padding: "1px 5px", borderRadius: 4, border: `1px solid ${LINE}`, fontSize: 12, color: INK }}>
                  /r/{client_key}/{slug}
                </code>{" "}
                doesn&apos;t have a per-slug catch-all yet.{" "}
                {clientDefaultDestination ? (
                  <>
                    Visitors who don&apos;t match this rule&apos;s conditions will fall back to the client-level default (
                    <code style={{ background: "white", padding: "1px 5px", borderRadius: 4, border: `1px solid ${LINE}`, fontSize: 12, color: INK }}>
                      {clientDefaultDestination}
                    </code>
                    ). Add a per-slug catch-all if you want a slug-specific fallback instead — we&apos;ll take you there after save.
                  </>
                ) : (
                  <>Visitors who don&apos;t match this rule&apos;s conditions will hit a 404. We&apos;ll take you to add one right after you save.</>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22, alignItems: "center" }}>
            <PrimaryButton type="submit" disabled={pending}>
              {pending ? "Saving…" : initial ? "Save changes" : "Create rule"}
            </PrimaryButton>
            <Link
              href={`/internal/redirect-rules/${client_key}`}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: MUTED,
                textDecoration: "none",
                padding: "11px 10px",
              }}
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Right — sticky URL tester + resolved-URL preview */}
        <div style={{ flex: "1 1 300px", minWidth: 280, maxWidth: 420 }}>
          <div style={{ position: "sticky", top: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: FAINT,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 8,
              }}
            >
              Test the rule
            </div>
            <div
              style={{
                border: `1px solid ${LINE}`,
                borderRadius: 12,
                overflow: "hidden",
                background: "white",
                boxShadow: "0 1px 3px rgba(31,45,67,.06)",
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, lineHeight: 1.5 }}>
                Type a sample inbound URL. We&rsquo;ll show what destination the rule would 302 to.
              </div>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder={`https://ads4good.com/r/${client_key}/${slug || "slug"}?to=https://ads4good.com/about&utm_source=cold_email`}
                style={{ ...inpMono, fontSize: 11.5 }}
              />
              {previewUrl && (
                <div
                  style={{
                    marginTop: 10,
                    background: SUBTLE,
                    border: `1px solid ${ORANGE}44`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 11.5,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    color: INK,
                    wordBreak: "break-all",
                    lineHeight: 1.45,
                  }}
                >
                  → {previewUrl}
                </div>
              )}
              {!testUrl && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: FAINT, lineHeight: 1.4 }}>
                  Live preview appears once you enter a sample URL above.
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: FAINT, lineHeight: 1.4 }}>
              Identity + geo tokens use placeholder values (real values come from the visitor).
            </div>

            {/* Sibling rules panel — appears once slug matches an existing set.
                Shows the priority-ordered chain so operator sees what they're
                extending / where their new rule slots in. */}
            {siblingRules.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: FAINT,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    marginBottom: 8,
                  }}
                >
                  Existing rules for {" "}
                  <code style={{ background: "white", padding: "1px 5px", borderRadius: 4, border: `1px solid ${LINE}`, fontSize: 11, color: INK }}>
                    /r/{client_key}/{slug}
                  </code>
                </div>
                <div
                  style={{
                    border: `1px solid ${LINE}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "white",
                    boxShadow: "0 1px 3px rgba(31,45,67,.06)",
                  }}
                >
                  {siblingRules.map((r, i) => (
                    <div
                      key={r.id}
                      style={{
                        padding: "12px 14px",
                        borderTop: i === 0 ? "none" : `1px solid ${LINE}`,
                        fontSize: 12,
                        color: INK,
                        lineHeight: 1.5,
                        opacity: r.enabled ? 1 : 0.55,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: ORANGE,
                            background: SUBTLE,
                            border: `1px solid ${ORANGE}44`,
                            borderRadius: 4,
                            padding: "1px 6px",
                            letterSpacing: ".05em",
                          }}
                        >
                          P{r.rule_priority}
                        </span>
                        {!r.enabled && (
                          <span style={{ fontSize: 10.5, color: MUTED, fontStyle: "italic" }}>
                            disabled
                          </span>
                        )}
                        <span style={{ fontSize: 11.5, color: MUTED }}>
                          {summarizeConditions(r.condition_jsonb)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: 11,
                          color: MUTED,
                          wordBreak: "break-all",
                        }}
                      >
                        → {r.destination_template}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: FAINT, lineHeight: 1.4 }}>
                  Your new rule will slot in at priority <strong style={{ color: INK }}>{priority}</strong>{" "}
                  — lower wins. Empty conditions = catch-all (put it last).
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
