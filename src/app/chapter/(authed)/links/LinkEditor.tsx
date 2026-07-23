"use client";

// Self-serve Smart Link editor (Phase 4a). A link is a slug + a required
// default destination + an ordered list of smart rules (context conditions →
// destination). Saving replaces the whole rule set for the slug.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLink } from "./_actions";
import SmartLinkConditions from "./SmartLinkConditions";
import type { LinkDetail, SmartRule } from "./types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

const REDIRECT_ORIGIN = "https://www.ads4good.com";

let ruleSeq = 0;
const newRuleKey = () => `nr_${ruleSeq++}`;

export default function LinkEditor({ clientKey, link, brandedHost }: { clientKey: string; link?: LinkDetail; brandedHost?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const editing = !!link;

  const [slug, setSlug] = useState(link?.slug || "");
  const [description, setDescription] = useState(link?.description || "");
  const [defaultDestination, setDefaultDestination] = useState(link?.default_destination || "");
  const [enabled, setEnabled] = useState(link?.enabled ?? true);
  const [rules, setRules] = useState<SmartRule[]>(link?.smart_rules?.map((r) => ({ ...r, key: newRuleKey() })) || []);

  const setRule = (key: string, next: Partial<SmartRule>) =>
    setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...next } : r)));
  const addRule = () => setRules((rs) => [...rs, { key: newRuleKey(), conditions: {}, destination: "" }]);
  const removeRule = (key: string) => setRules((rs) => rs.filter((r) => r.key !== key));
  const moveRule = (key: string, dir: -1 | 1) =>
    setRules((rs) => {
      const i = rs.findIndex((r) => r.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveLink(
        {
          slug: slug.trim().toLowerCase(),
          description,
          default_destination: defaultDestination,
          smart_rules: rules.map((r) => ({ conditions: r.conditions, destination: r.destination })),
          enabled,
        },
        !editing,
      );
      if (!res.ok) { setError(res.error); return; }
      router.push(`/chapter/${clientKey}/links`);
      router.refresh();
    });
  };

  const slugForUrl = slug.trim().toLowerCase() || "your-link";
  const publicUrl = brandedHost
    ? `https://${brandedHost}/${slugForUrl}`
    : `${REDIRECT_ORIGIN}/r/${clientKey}/${slugForUrl}`;
  const domainReady = !!brandedHost;

  return (
    <div style={{ padding: "24px 30px 60px", maxWidth: 680, margin: "0 auto" }}>
      <button type="button" onClick={() => router.push(`/chapter/${clientKey}/links`)} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", padding: 0 }}>
        ← Back to links
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "10px 0 18px" }}>{editing ? "Edit link" : "New link"}</h1>

      {!domainReady && (
        <div style={{ border: `1px solid ${ORANGE}44`, background: "#FFF4EC", borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: 13.5, color: INK, lineHeight: 1.5 }}>
          Smart Links go live on your own domain. Connect a branded domain to save this link —{" "}
          <button type="button" onClick={() => router.push(`/chapter/${clientKey}/links/domain`)} style={{ background: "none", border: "none", color: ORANGE, fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 13.5 }}>
            set up your domain →
          </button>
        </div>
      )}

      {/* Name / URL */}
      <Section label="Link name" hint="Lowercase letters, digits, hyphens. This becomes the end of your link URL.">
        <input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={editing} placeholder="summer-sale" style={{ ...inp, opacity: editing ? 0.6 : 1 }} />
        <div style={{ fontSize: 12, color: FAINT, marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{publicUrl}</div>
        {editing && <div style={{ fontSize: 11.5, color: FAINT, marginTop: 4 }}>The name can’t change after creation.</div>}
      </Section>

      {/* Default destination */}
      <Section label="Default destination" hint="Where visitors go when no rule below matches. Required.">
        <input value={defaultDestination} onChange={(e) => setDefaultDestination(e.target.value)} placeholder="https://yourbrand.com" style={inp} />
      </Section>

      {/* Smart rules */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>Smart rules</div>
          <button type="button" onClick={addRule} style={{ fontSize: 12.5, fontWeight: 600, color: ORANGE, background: "none", border: "none", cursor: "pointer" }}>+ Add rule</button>
        </div>
        <div style={{ fontSize: 11.5, color: FAINT, marginBottom: 10, lineHeight: 1.4 }}>
          Checked top to bottom — the first rule whose conditions match wins. If none match, the default destination is used.
        </div>

        {rules.length === 0 ? (
          <div style={{ border: `1px dashed ${LINE}`, borderRadius: 10, padding: "16px", textAlign: "center", fontSize: 12.5, color: FAINT, background: PANEL }}>
            No rules — every visitor goes to the default destination. Add a rule to route by device, location, time, or campaign.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rules.map((r, i) => (
              <div key={r.key} style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, background: "white" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>Rule {i + 1}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => moveRule(r.key, -1)} disabled={i === 0} style={miniBtn} aria-label="Move up">↑</button>
                    <button type="button" onClick={() => moveRule(r.key, 1)} disabled={i === rules.length - 1} style={miniBtn} aria-label="Move down">↓</button>
                    <button type="button" onClick={() => removeRule(r.key)} style={{ ...miniBtn, color: "#B3261E" }}>×</button>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, marginBottom: 6 }}>If…</div>
                <SmartLinkConditions value={r.conditions} onChange={(c) => setRule(r.key, { conditions: c })} />
                <div style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, margin: "12px 0 6px" }}>Send to</div>
                <input value={r.destination} onChange={(e) => setRule(r.key, { destination: e.target.value })} placeholder="https://yourbrand.com/sale" style={inp} />
              </div>
            ))}
          </div>
        )}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 14, color: INK, cursor: "pointer" }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Live (this link is active)
      </label>

      {error && <div style={{ marginTop: 16, background: "#FDECEA", border: "1px solid #E7C9C6", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button type="button" disabled={pending || !domainReady} onClick={submit} style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 10, padding: "11px 22px", cursor: domainReady ? "pointer" : "not-allowed", opacity: pending || !domainReady ? 0.6 : 1 }}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create link"}
        </button>
        <button type="button" onClick={() => router.push(`/chapter/${clientKey}/links`)} style={{ background: "white", color: INK, fontSize: 14, fontWeight: 600, border: `1px solid ${LINE}`, borderRadius: 10, padding: "11px 22px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontSize: 14,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: "9px 11px",
};

const miniBtn: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  width: 26,
  height: 26,
  cursor: "pointer",
  lineHeight: 1,
};

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: hint ? 2 : 6 }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: FAINT, marginBottom: 6, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </div>
  );
}
