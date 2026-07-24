"use client";

import { useState, useTransition } from "react";
import { exportLeadsCsv } from "../_actions";
import type { Lead } from "../types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const GREEN = "#2E7D5B";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

export default function LeadsClient({ leads }: { leads: Lead[] }) {
  const [exporting, startExport] = useTransition();

  const doExport = () =>
    startExport(async () => {
      const res = await exportLeadsCsv();
      if (!res.ok) { alert(res.error); return; }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 6, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Leads</h1>
          <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.5 }}>
            The real contacts your prompts captured — with what they submitted and how they got here.
          </p>
        </div>
        <button
          type="button"
          onClick={doExport}
          disabled={exporting || leads.length === 0}
          style={{ background: ORANGE, color: "white", fontSize: 13.5, fontWeight: 600, border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", opacity: exporting || leads.length === 0 ? 0.6 : 1, whiteSpace: "nowrap" }}
        >
          {exporting ? "Preparing…" : "Export CSV"}
        </button>
      </div>

      <div style={{ fontSize: 12, color: FAINT, marginBottom: 18, lineHeight: 1.5, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 8, padding: "9px 12px" }}>
        We email you a CSV of your leads every week, then remove them from Chapter — so your customers&rsquo; contact info
        never sits here long-term. Export anytime above; the weekly email is your archive.
      </div>

      {leads.length === 0 ? (
        <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", background: PANEL }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No leads yet</div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto", maxWidth: 420, lineHeight: 1.5 }}>
            When a visitor submits their email or phone through an Email Exchange or Custom Form prompt, it shows up here.
          </p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", background: "white" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  {["When", "Contact", "Prompt", "Consent", "Page", "Country"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td style={td}>{fmt(l.captured_at)}</td>
                    <td style={td}>
                      {l.email && <div style={{ color: INK, fontWeight: 600 }}>{l.email}</div>}
                      {l.phone && <div style={{ color: MUTED }}>{l.phone}</div>}
                    </td>
                    <td style={td}><span style={{ color: MUTED }}>{l.prompt_slug || "—"}</span></td>
                    <td style={td}><Consent lead={l} /></td>
                    <td style={{ ...td, maxWidth: 240 }}>
                      <span style={{ color: FAINT, wordBreak: "break-all", fontSize: 12 }}>{shortUrl(l.page_url)}</span>
                    </td>
                    <td style={td}><span style={{ color: MUTED }}>{l.ip_country || "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Consent({ lead }: { lead: Lead }) {
  if (!lead.consent_mode) return <span style={{ color: FAINT }}>—</span>;
  if (lead.consent_declined) {
    return <span style={{ color: "#B3261E", fontWeight: 600 }}>Declined</span>;
  }
  return <span style={{ color: GREEN, fontWeight: 600 }}>Opted in</span>;
}

function shortUrl(u: string | null): string {
  if (!u) return "—";
  try {
    const url = new URL(u);
    return url.pathname + (url.search ? url.search : "");
  } catch {
    return u;
  }
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: `1px solid ${LINE}`,
  background: PANEL,
  fontSize: 11.5,
  color: MUTED,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: `1px solid ${LINE}`,
  color: INK,
  verticalAlign: "top",
};
