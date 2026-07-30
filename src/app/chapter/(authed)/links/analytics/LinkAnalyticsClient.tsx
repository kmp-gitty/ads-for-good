"use client";

import Link from "next/link";
import type { LinksOverview } from "../types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

export default function LinkAnalyticsClient({
  clientKey,
  overview,
  brandedHost,
}: {
  clientKey: string;
  overview: LinksOverview | null;
  brandedHost: string | null;
}) {
  const rows = overview?.links ?? [];
  const totals = overview?.totals;
  const hasData = rows.length > 0 && (totals?.clicks ?? 0) > 0;

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Link Analytics</h1>
        <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>How your Smart Links are performing. Click any link for the full breakdown.</p>
      </div>

      {!hasData ? (
        <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", background: PANEL }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No clicks yet</div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto 18px", maxWidth: 400, lineHeight: 1.5 }}>
            Once people start clicking your links, you&rsquo;ll see clicks, unique visitors, and where they went here.
          </p>
          <Link href={`/chapter/${clientKey}/links`} style={{ background: "white", color: INK, fontSize: 13.5, fontWeight: 600, textDecoration: "none", border: `1px solid ${LINE}`, borderRadius: 9, padding: "9px 18px", display: "inline-block" }}>
            Manage links →
          </Link>
        </div>
      ) : (
        <>
          {/* Aggregate KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 22 }}>
            <Kpi label="Clicks · 30d" value={fmt(totals!.clicks)} />
            <Kpi label="Active links" value={fmt(totals!.links)} />
            <Kpi label="Filtered (bots)" value={fmt(totals!.scanner)} sub={totals!.scanner > 0 ? "excluded" : "none"} />
          </div>

          {/* Per-link table */}
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", background: "white" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.8fr 0.8fr 2fr", gap: 10, padding: "10px 16px", background: PANEL, borderBottom: `1px solid ${LINE}`, fontSize: 11, color: FAINT, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>
              <span>Link</span>
              <span style={{ textAlign: "right" }}>Clicks 30d</span>
              <span style={{ textAlign: "right" }}>Unique</span>
              <span style={{ textAlign: "right" }}>All-time</span>
              <span>Top destination</span>
            </div>
            {rows.map((r, i) => (
              <Link
                key={r.slug}
                href={`/chapter/${clientKey}/links/${r.slug}`}
                style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.8fr 0.8fr 2fr", gap: 10, padding: "13px 16px", borderBottom: i === rows.length - 1 ? "none" : `1px solid ${LINE}`, textDecoration: "none", alignItems: "center" }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, color: INK, display: "flex", alignItems: "center", gap: 6 }}>
                  {r.slug} <span style={{ color: ORANGE, fontWeight: 600, fontSize: 12 }}>→</span>
                </span>
                <span style={{ textAlign: "right", fontSize: 13.5, fontWeight: 700, color: INK }}>{fmt(r.clicks)}</span>
                <span style={{ textAlign: "right", fontSize: 13, color: MUTED }}>{fmt(r.unique)}</span>
                <span style={{ textAlign: "right", fontSize: 13, color: MUTED }}>{fmt(r.all_time)}</span>
                <code style={{ fontSize: 11.5, color: FAINT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.top_destination ?? "—"}
                </code>
              </Link>
            ))}
          </div>

          <p style={{ fontSize: 11.5, color: FAINT, marginTop: 12 }}>
            Bot / email-scanner clicks are detected and excluded from these counts.{" "}
            <span style={{ color: MUTED }}>{brandedHost ? `Served on ${brandedHost}.` : ""}</span>
          </p>
        </>
      )}
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: "14px 16px", background: "white" }}>
      <div style={{ fontSize: 11.5, color: FAINT, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: INK, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: FAINT, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
