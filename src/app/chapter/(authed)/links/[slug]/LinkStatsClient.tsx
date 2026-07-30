"use client";

import Link from "next/link";
import type { LinkStats, StatBar } from "../types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";
const GREEN = "#2E7D5B";

const REDIRECT_ORIGIN = "https://www.ads4good.com";

export default function LinkStatsClient({
  clientKey,
  slug,
  stats,
  brandedHost,
  hasPrompts,
}: {
  clientKey: string;
  slug: string;
  stats: LinkStats | null;
  brandedHost: string | null;
  hasPrompts: boolean;
}) {
  const url = brandedHost ? `https://${brandedHost}/${slug}` : `${REDIRECT_ORIGIN}/r/${clientKey}/${slug}`;
  const t = stats?.totals;
  const hasClicks = !!t && t.clicks > 0;

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 900, margin: "0 auto" }}>
      <Link href={`/chapter/${clientKey}/links`} style={{ fontSize: 12.5, fontWeight: 600, color: ORANGE, textDecoration: "none" }}>
        ← All links
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, margin: "10px 0 22px" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>{slug}</h1>
          <code style={{ fontSize: 12.5, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{url}</code>
        </div>
        <Link href={`/chapter/${clientKey}/links/${slug}/edit`} style={{ background: "white", color: INK, fontSize: 13, fontWeight: 600, textDecoration: "none", border: `1px solid ${LINE}`, borderRadius: 9, padding: "8px 16px", whiteSpace: "nowrap" }}>
          Edit link
        </Link>
      </div>

      {!hasClicks ? (
        <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", background: PANEL }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No clicks yet</div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto", maxWidth: 400, lineHeight: 1.5 }}>
            Once people start clicking this link, you&rsquo;ll see clicks over time, where they went, device &amp; location, and more here.
          </p>
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            <Kpi label="Clicks · 30d" value={fmt(t!.clicks)} />
            <Kpi label="Unique visitors" value={fmt(t!.unique)} />
            <Kpi label="Filtered (bots)" value={fmt(t!.scanner)} sub={t!.scanner > 0 ? "excluded from counts" : "none"} />
            <Kpi label="Clicks · all time" value={fmt(t!.clicks_all_time)} />
          </div>

          {/* Clicks over time */}
          <Section title="Clicks over time" subtitle={`Last ${stats!.window_days} days`}>
            <Timeseries data={stats!.timeseries} days={stats!.window_days} />
          </Section>

          {/* Rule → destination — the "smart" proof */}
          <Section title="Where clicks went" subtitle="Which rule matched, and the destination it sent to">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats!.by_destination.map((d, i) => {
                const pct = t!.clicks ? Math.round((d.clicks / t!.clicks) * 100) : 0;
                return (
                  <div key={i} style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "10px 12px", background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: d.is_default ? FAINT : ORANGE, background: d.is_default ? "#F1EEE6" : "#FFF4EC", border: `1px solid ${d.is_default ? LINE : ORANGE + "33"}`, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>
                          {d.rule_label}
                        </span>
                        <code style={{ fontSize: 12, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.destination}</code>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{fmt(d.clicks)} <span style={{ color: FAINT, fontWeight: 500 }}>({pct}%)</span></span>
                    </div>
                    <Bar pct={pct} />
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Tier 2 breakdowns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Section title="Device"><BarList rows={stats!.by_device} total={t!.clicks} /></Section>
            <Section title="Operating system"><BarList rows={stats!.by_os} total={t!.clicks} /></Section>
            <Section title="Country"><BarList rows={stats!.by_country} total={t!.clicks} /></Section>
            <Section title="Source"><BarList rows={stats!.by_source} total={t!.clicks} /></Section>
          </div>

          {/* Tier 3 — prompt fulfillment (real) */}
          <Section title="Prompt fulfillment" subtitle="Visitors from this link who later submitted a Smart Prompt">
            {hasPrompts ? (
              <FulfillmentCard visitors={stats!.fulfillment.visitors} converted={stats!.fulfillment.converted} clientKey={clientKey} />
            ) : (
              <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "16px 18px", background: PANEL, fontSize: 13.5, color: MUTED, lineHeight: 1.55 }}>
                Add <strong>Smart Prompts</strong> to capture leads from the visitors these links bring in — then you&rsquo;ll see how many clicks turn into a submission right here.{" "}
                <Link href={`/chapter/${clientKey}/prompts`} style={{ color: ORANGE, fontWeight: 600, textDecoration: "none" }}>Set up Smart Prompts →</Link>
              </div>
            )}
          </Section>

          {/* Tier 3 ceiling — locked revenue/sales (Chapter Analytics upsell) */}
          <div style={{ position: "relative", border: `1px dashed ${LINE}`, borderRadius: 12, padding: "20px 22px", background: PANEL, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🔒</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>Revenue &amp; sales conversion</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: ORANGE, background: "#FFF4EC", border: `1px solid ${ORANGE}33`, borderRadius: 999, padding: "2px 9px" }}>CHAPTER ANALYTICS</span>
            </div>
            <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, margin: "0 0 10px", maxWidth: 560 }}>
              See which links drove actual <strong>purchases and revenue</strong> — not just clicks. Chapter Analytics stitches each
              click to the full customer journey and attributes sales back to the link that started them.
            </p>
            {/* Ghost preview */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, opacity: 0.45, filter: "grayscale(1)", pointerEvents: "none" }}>
              <GhostStat label="Attributed orders" />
              <GhostStat label="Attributed revenue" />
              <GhostStat label="Revenue per click" />
            </div>
            <a href="mailto:katoa@ads4good.com?subject=Chapter%20Analytics" style={{ display: "inline-block", marginTop: 14, fontSize: 13, fontWeight: 600, color: ORANGE, textDecoration: "none" }}>
              Talk to us about Chapter Analytics →
            </a>
          </div>
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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: FAINT, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 5, background: "#F1EEE6", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(2, pct)}%`, height: "100%", background: ORANGE, borderRadius: 999 }} />
    </div>
  );
}

function BarList({ rows, total }: { rows: StatBar[]; total: number }) {
  if (!rows || rows.length === 0) return <div style={{ fontSize: 12.5, color: FAINT }}>—</div>;
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", background: "white", display: "flex", flexDirection: "column", gap: 9 }}>
      {rows.map((r, i) => {
        const pct = total ? Math.round((r.clicks / total) * 100) : 0;
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 12.5, color: INK, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
              <span style={{ fontSize: 12.5, color: MUTED, whiteSpace: "nowrap" }}>{fmt(r.clicks)} · {pct}%</span>
            </div>
            <Bar pct={pct} />
          </div>
        );
      })}
    </div>
  );
}

function Timeseries({ data, days }: { data: { day: string; clicks: number }[]; days: number }) {
  // Build a continuous day axis so gaps render as empty bars.
  const byDay = new Map(data.map((d) => [d.day, d.clicks]));
  const axis: { day: string; clicks: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    axis.push({ day: key, clicks: byDay.get(key) ?? 0 });
  }
  const max = Math.max(1, ...axis.map((a) => a.clicks));
  const label = (k: string) => new Date(k + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "14px 14px 8px", background: "white" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
        {axis.map((a, i) => (
          <div key={i} title={`${label(a.day)}: ${a.clicks}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <div style={{ height: `${(a.clicks / max) * 100}%`, minHeight: a.clicks > 0 ? 2 : 0, background: a.clicks > 0 ? ORANGE : "transparent", borderRadius: 2 }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: FAINT }}>
        <span>{label(axis[0].day)}</span>
        <span>{label(axis[axis.length - 1].day)}</span>
      </div>
    </div>
  );
}

function FulfillmentCard({ visitors, converted, clientKey }: { visitors: number; converted: number; clientKey: string }) {
  const rate = visitors ? Math.round((converted / visitors) * 100) : 0;
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "16px 18px", background: "white" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: converted > 0 ? GREEN : INK, lineHeight: 1 }}>{fmt(converted)}</span>
        <span style={{ fontSize: 13.5, color: MUTED }}>
          of <strong>{fmt(visitors)}</strong> visitors who clicked later submitted one of your Smart Prompts
          {visitors > 0 && <> · <strong style={{ color: INK }}>{rate}%</strong></>}
        </span>
      </div>
      {converted === 0 && visitors > 0 && (
        <p style={{ fontSize: 12, color: FAINT, margin: "8px 0 0", lineHeight: 1.5 }}>
          None yet. This tracks visitors from this link who later filled out a{" "}
          <Link href={`/chapter/${clientKey}/prompts`} style={{ color: ORANGE, fontWeight: 600, textDecoration: "none" }}>Smart Prompt</Link>{" "}
          on your site (requires the pixel installed on the destination).
        </p>
      )}
    </div>
  );
}

function GhostStat({ label }: { label: string }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", background: "white" }}>
      <div style={{ fontSize: 11, color: FAINT, marginBottom: 8 }}>{label}</div>
      <div style={{ height: 20, width: "60%", background: "#E9E4D8", borderRadius: 5 }} />
    </div>
  );
}
