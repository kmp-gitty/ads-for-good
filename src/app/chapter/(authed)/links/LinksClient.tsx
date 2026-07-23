"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setLinkEnabled, deleteLink } from "./_actions";
import type { LinkSummary } from "./types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";
const GREEN = "#2E7D5B";

const REDIRECT_ORIGIN = "https://www.ads4good.com";

export default function LinksClient({ clientKey, links, brandedHost }: { clientKey: string; links: LinkSummary[]; brandedHost?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const domainReady = !!brandedHost;
  const linkUrl = (slug: string) =>
    brandedHost ? `https://${brandedHost}/${slug}` : `${REDIRECT_ORIGIN}/r/${clientKey}/${slug}`;

  const act = (slug: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(slug);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) alert(res.error || "Something went wrong.");
      else router.refresh();
    });
  };

  const copy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(linkUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Smart Links</h1>
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>One link, many destinations — route each visitor to the right place.</p>
        </div>
        <Link href={domainReady ? `/chapter/${clientKey}/links/new` : `/chapter/${clientKey}/links/domain`} style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 18px", borderRadius: 10, whiteSpace: "nowrap" }}>
          {domainReady ? "+ New link" : "Set up your domain →"}
        </Link>
      </div>

      {!domainReady && (
        <div style={{ border: `1px solid ${ORANGE}44`, background: "#FFF4EC", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.5 }}>
            Smart Links go live on <strong>your own domain</strong>. Connect a branded domain to start creating links.
          </div>
          <Link href={`/chapter/${clientKey}/links/domain`} style={{ background: ORANGE, color: "white", fontSize: 13.5, fontWeight: 600, textDecoration: "none", padding: "8px 16px", borderRadius: 8, whiteSpace: "nowrap" }}>
            Set up your domain →
          </Link>
        </div>
      )}

      {links.length === 0 ? (
        <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", background: PANEL }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No links yet</div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto 18px", maxWidth: 380, lineHeight: 1.5 }}>
            {domainReady
              ? "Create a smart link with a default destination, then add rules to route visitors by device, location, time, or campaign."
              : "First connect your branded domain — then create a smart link with a default destination and rules to route visitors by device, location, time, or campaign."}
          </p>
          <Link href={domainReady ? `/chapter/${clientKey}/links/new` : `/chapter/${clientKey}/links/domain`} style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 20px", borderRadius: 10, display: "inline-block" }}>
            {domainReady ? "Create your first link" : "Set up your domain →"}
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {links.map((l) => {
            const url = linkUrl(l.slug);
            const isBusy = busy === l.slug && pending;
            return (
              <div key={l.slug} style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: 16, background: "white", opacity: isBusy ? 0.6 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{l.slug}</span>
                      <span style={{ fontSize: 11, color: l.enabled ? GREEN : FAINT, fontWeight: 600 }}>{l.enabled ? "● Live" : "○ Off"}</span>
                      {l.smart_rule_count > 0 && (
                        <span style={{ fontSize: 10.5, color: ORANGE, background: "#FFF4EC", border: `1px solid ${ORANGE}33`, borderRadius: 999, padding: "2px 8px" }}>
                          {l.smart_rule_count} rule{l.smart_rule_count === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code style={{ fontSize: 12, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</code>
                      <button type="button" onClick={() => copy(l.slug)} style={{ fontSize: 11, fontWeight: 600, color: copied === l.slug ? GREEN : ORANGE, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        {copied === l.slug ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <div style={{ fontSize: 12.5, color: FAINT, marginTop: 5 }}>
                      Default → {l.default_destination.length > 48 ? l.default_destination.slice(0, 48) + "…" : l.default_destination}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: FAINT, whiteSpace: "nowrap" }}>{l.total_hits} clicks</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
                  <Link href={`/chapter/${clientKey}/links/${l.slug}/edit`} style={btn(false)}>Edit</Link>
                  <button type="button" disabled={isBusy} onClick={() => act(l.slug, () => setLinkEnabled(l.slug, !l.enabled))} style={btn(false)}>
                    {l.enabled ? "Turn off" : "Turn on"}
                  </button>
                  <button type="button" disabled={isBusy} onClick={() => { if (confirm(`Delete link “${l.slug}”? This can’t be undone.`)) act(l.slug, () => deleteLink(l.slug)); }} style={{ ...btn(true), marginLeft: "auto" }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function btn(danger: boolean): React.CSSProperties {
  return {
    fontSize: 12.5,
    fontWeight: 600,
    color: danger ? "#B3261E" : INK,
    background: "white",
    border: `1px solid ${danger ? "#E7C9C6" : LINE}`,
    borderRadius: 8,
    padding: "6px 12px",
    textDecoration: "none",
    cursor: "pointer",
  };
}
