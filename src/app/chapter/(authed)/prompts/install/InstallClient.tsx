"use client";

import { useState, useTransition } from "react";
import { getActivationStatus, setStorefrontDomain, type ActivationStatus } from "../_actions";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";
const GREEN = "#2E7D5B";

const PIXEL_ORIGIN = "https://www.ads4good.com";

type Platform = "generic" | "shopify" | "gtm" | "wordpress";
const PLATFORMS: { key: Platform; label: string; where: string }[] = [
  { key: "generic", label: "Any site", where: "Paste this right before the closing </head> tag on every page of your site." },
  { key: "shopify", label: "Shopify", where: "Online Store → Themes → ⋯ → Edit code → open layout/theme.liquid → paste just before </head> → Save." },
  { key: "gtm", label: "Google Tag Manager", where: "New Tag → Tag type “Custom HTML” → paste the snippet → Trigger “All Pages” → Save & Publish." },
  { key: "wordpress", label: "WordPress", where: "Use a headers plugin (WPCode or “Insert Headers and Footers”) → paste into the Header section. Or add to your theme’s header.php before </head>." },
];

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function InstallClient({
  clientKey,
  initial,
}: {
  clientKey: string;
  initial: ActivationStatus;
}) {
  const [status, setStatus] = useState<ActivationStatus>(initial);
  const [platform, setPlatform] = useState<Platform>("generic");
  const [domain, setDomain] = useState(initial.storefrontDomain || "");
  const [domainMsg, setDomainMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, startCheck] = useTransition();
  const [saving, startSave] = useTransition();

  const snippet = `<script\n  src="${PIXEL_ORIGIN}/api/chapter/pixel.js"\n  async\n  data-client-key="${clientKey}"\n  data-vertical="smart_prompts"\n></script>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const recheck = () => startCheck(async () => setStatus(await getActivationStatus()));

  const saveDomain = () => {
    setDomainMsg(null);
    startSave(async () => {
      const res = await setStorefrontDomain(domain);
      if (!res.ok) { setDomainMsg(res.error); return; }
      setDomainMsg("saved");
      setStatus((s) => ({ ...s, storefrontDomain: domain.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").toLowerCase() }));
    });
  };

  const p = PLATFORMS.find((x) => x.key === platform)!;

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Install &amp; activate</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px" }}>
        Two steps to go live: tell us your website, then add your snippet.
      </p>

      {/* Activation status banner */}
      <div
        style={{
          border: `1px solid ${status.connected ? GREEN + "44" : ORANGE + "44"}`,
          background: status.connected ? "#EEF6F1" : "#FFF4EC",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: status.connected ? GREEN : ORANGE }}>
            {status.connected ? "● Connected" : "○ Waiting for your first event"}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>
            {status.connected
              ? `Last event ${status.lastEventAt ? timeAgo(status.lastEventAt) : "—"} · ${status.recentCount} in the last 24h${status.promptFired ? " · prompts firing ✓" : " · no prompt shown yet"}`
              : "Add the snippet below, then load a page on your site. This updates within a few seconds."}
          </div>
        </div>
        <button type="button" onClick={recheck} disabled={checking} style={btn}>
          {checking ? "Checking…" : "Check again"}
        </button>
      </div>

      {/* Step 1 — domain */}
      <StepCard n={1} title="Your website">
        <p style={{ fontSize: 13, color: MUTED, margin: "0 0 4px", lineHeight: 1.5 }}>
          The domain your prompts will run on. We use it to allow your site to talk to Chapter.
        </p>
        <p style={{ fontSize: 12, color: FAINT, margin: "0 0 12px", lineHeight: 1.45 }}>
          One website per workspace — saving a different domain replaces the current one.
        </p>

        {/* Currently saved */}
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px 12px" }}>
          Currently saved:{" "}
          {status.storefrontDomain
            ? <strong style={{ color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{status.storefrontDomain}</strong>
            : <span style={{ color: FAINT }}>nothing yet</span>}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourbrand.com" style={{ ...inp, maxWidth: 280 }} />
          <button type="button" onClick={saveDomain} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
          {domainMsg === "saved" && <span style={{ fontSize: 12.5, color: GREEN, fontWeight: 600 }}>Saved ✓</span>}
          {domainMsg && domainMsg !== "saved" && <span style={{ fontSize: 12.5, color: "#B3261E" }}>{domainMsg}</span>}
        </div>
        {status.storefrontDomain && (
          <div style={{ fontSize: 12, color: FAINT, marginTop: 8 }}>
            Allow-listing can take a few minutes to propagate after you save.
          </div>
        )}
      </StepCard>

      {/* Step 2 — snippet */}
      <StepCard n={2} title="Add your snippet">
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {PLATFORMS.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setPlatform(x.key)}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
                border: `1px solid ${platform === x.key ? ORANGE : LINE}`,
                background: platform === x.key ? "#FFF4EC" : "white",
                color: platform === x.key ? ORANGE : INK,
              }}
            >
              {x.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          <pre
            style={{
              background: "#0F1722",
              color: "#E6EAF0",
              borderRadius: 10,
              padding: "16px 16px",
              fontSize: 12.5,
              lineHeight: 1.6,
              overflowX: "auto",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              margin: 0,
            }}
          >
            {snippet}
          </pre>
          <button
            type="button"
            onClick={copy}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              background: copied ? GREEN : ORANGE,
              color: "white",
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>

        <p style={{ fontSize: 13, color: MUTED, margin: "12px 0 0", lineHeight: 1.55 }}>
          <strong style={{ color: INK }}>{p.label}:</strong> {p.where}
        </p>
      </StepCard>

      <p style={{ fontSize: 12.5, color: FAINT, marginTop: 6, lineHeight: 1.5 }}>
        Once it&rsquo;s in, create a prompt on the <strong style={{ color: MUTED }}>Prompts</strong> tab (or turn one on),
        load a page on your site, then hit <strong style={{ color: MUTED }}>Check again</strong> above.
      </p>
    </div>
  );
}

const inp: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  fontSize: 14,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: "9px 11px",
};

const btn: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: "7px 14px",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 600,
  color: "white",
  background: ORANGE,
  border: "none",
  borderRadius: 8,
  padding: "9px 18px",
  cursor: "pointer",
};

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: 20, marginBottom: 16, background: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: PANEL, border: `1px solid ${LINE}`, color: INK, fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>{n}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
