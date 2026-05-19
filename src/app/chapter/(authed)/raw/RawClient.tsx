"use client";

import React from "react";
import { TopBar } from "../../_components/TopBar";
import { useChapter } from "../../_components/ChapterContext";
import { fmtNum, fmtMoney } from "../../_components/format";
import { CHANNELS, type ChannelKey } from "../../_components/mockdata";

// Fallback for any RPC channel string not yet mapped in CHANNELS (e.g., a new
// channel taxonomy entry the dashboard hasn't been updated for yet).
const CHANNEL_FALLBACK = { name: "Unknown", color: "#9CA0A8", short: "—" };

type RawClientProps = {
  /** chapter_reporting.purchase_overview() — orders/revenue/AOV (Total Sales definition). */
  summary: {
    total_orders: number | null;
    total_revenue: number | null;
    avg_order_value: number | null;
  } | null;
  /** chapter_reporting.journey_overview() — total non-bot journeys + stitched-identity counts. */
  journey: {
    total_journeys: number | null;
    identified_journeys: number | null;
    pct_identified: number | null;
    identify_events: number | null;
    sessions_per_identification: number | null;
  } | null;
  /** chapter_reporting.engagement_quality() — engagement rate (% with time_on_page). */
  engagement: {
    engagement_rate: number | null;
    bounce_rate: number | null;
  } | null;
  /** chapter_reporting.funnel_overview() — one row per step. */
  funnel: Array<{
    step_ord: number;
    step_name: string;
    journeys: number | null;
    share_pct: number | null;
    drop_pct: number | null;
  }>;
  /** chapter_reporting.channel_performance_overview() — per-channel scoreboard. */
  channels: Array<{
    channel: string;
    journeys: number | null;
    orders: number | null;
    revenue: number | null;
    cr: number | null;
  }>;
  /** Server-resolved URL params (echoed for display + future updates). */
  clientKey: string;
  range: string;
};

function Sparkline({ data, color = "var(--accent)" }: { data: number[]; color?: string }) {
  const w = 120, h = 36, pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const xs = (i: number) => pad + (i * (w - pad * 2)) / (data.length - 1);
  const ys = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
  const d = data.map((v, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(v)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={xs(data.length - 1)} cy={ys(data[data.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}

export default function RawClient({ summary, journey, engagement, funnel, channels, clientKey: _clientKey, range: _range }: RawClientProps) {
  const { client } = useChapter();

  // Sparkline trends remain mock until we wire a per-week time series RPC.
  // Headline values (orders / revenue / AOV) come from real data; movement
  // deltas remain mock until we compute prior-period values too.
  const trends = {
    orders:    [128, 142, 138, 155, 168, 172, 195, 188, 210, 224, 235, 247].map(x => x * 7),
    revenue:   [28, 32, 30, 36, 38, 41, 46, 44, 50, 53, 56, 58].map(x => x * 1000),
    aov:       [218, 224, 226, 228, 226, 230, 234, 232, 240, 244, 250, 226],
    journeys:  [5200, 5800, 6100, 6300, 6800, 7100, 7400, 7800, 8200, 8400, 8600, 8800],
    identified:[22, 24, 25, 26, 26, 28, 28, 29, 30, 30, 31, 31],
    engagement:[42, 44, 43, 45, 44, 46, 45, 47, 46, 48, 47, 48],
  };

  // Format all 6 metrics from live data. NULL → "—" so callers can tell
  // an empty range from a real zero.
  const ordersDisplay  = summary?.total_orders != null
    ? fmtNum(Number(summary.total_orders))
    : "—";
  const revenueDisplay = summary?.total_revenue != null
    ? fmtMoney(Number(summary.total_revenue))
    : "—";
  const aovDisplay     = summary?.avg_order_value != null
    ? "$" + Number(summary.avg_order_value).toFixed(2)
    : "—";

  const journeysDisplay = journey?.total_journeys != null
    ? fmtNum(Number(journey.total_journeys))
    : "—";

  // "Identified journeys" composite value: "N / X%" matching the mock format,
  // with a sub-line below showing identify events + sessions-per-identification.
  // The sub-line is rendered separately in the card JSX (see below).
  const identifiedCount = journey?.identified_journeys != null
    ? fmtNum(Number(journey.identified_journeys))
    : "—";
  const identifiedPct = journey?.pct_identified != null
    ? (Number(journey.pct_identified) * 100).toFixed(1) + "%"
    : null;
  const identifiedDisplay = identifiedPct
    ? `${identifiedCount} / ${identifiedPct}`
    : identifiedCount;
  const identifyEvents = journey?.identify_events != null ? Number(journey.identify_events) : null;
  const sessionsPerId  = journey?.sessions_per_identification != null
    ? Number(journey.sessions_per_identification)
    : null;
  const identifiedFoot = identifyEvents != null
    ? `${fmtNum(identifyEvents)} identify events${sessionsPerId != null ? ` · ${sessionsPerId.toFixed(2)} sessions per identification` : ""}`
    : null;

  const engagementDisplay = engagement?.engagement_rate != null
    ? (Number(engagement.engagement_rate) * 100).toFixed(1) + "%"
    : "—";

  const cards = [
    { label: "Total orders",        value: ordersDisplay,    move: -2.4,  good: false, data: trends.orders,     live: true,  foot: null },
    { label: "Total revenue",       value: revenueDisplay,   move: +8.6,  good: true,  data: trends.revenue,    live: true,  foot: null },
    { label: "AOV",                 value: aovDisplay,       move: +11.3, good: true,  data: trends.aov,        live: true,  foot: null },
    { label: "Total journeys",      value: journeysDisplay,  move: +14.2, good: null,  data: trends.journeys,   live: true,  foot: "non-bot only" },
    { label: "Identified journeys", value: identifiedDisplay, move: +1.8, good: true,  data: trends.identified, live: true,  foot: identifiedFoot },
    { label: "Engagement rate",     value: engagementDisplay, move: +0.6, good: true,  data: trends.engagement, live: true,  foot: "of non-bot journeys with time_on_page" },
  ];

  // Funnel rows arrive as { step_ord, step_name, journeys, share_pct, drop_pct }
  // with numeric fields possibly serialized as strings by supabase-js. Normalize.
  const funnelSteps = funnel.map(f => ({
    step:  f.step_name,
    count: Number(f.journeys ?? 0),
    share: f.share_pct == null ? 0   : Number(f.share_pct),
    drop:  f.drop_pct  == null ? null : Number(f.drop_pct),
  }));
  const total   = funnelSteps[0]?.count ?? 0;
  const drops   = funnelSteps.filter(x => x.drop !== null).map(x => x.drop as number);
  const maxDrop = drops.length ? Math.max(...drops) : 0;
  // Find which transition has the largest drop for the callout text.
  const largestDropIdx = funnelSteps.findIndex(x => x.drop === maxDrop);
  const largestDropFrom = largestDropIdx > 0 ? funnelSteps[largestDropIdx - 1].step : null;
  const largestDropTo   = largestDropIdx > 0 ? funnelSteps[largestDropIdx].step     : null;

  return (
    <>
      <TopBar
        title="Raw Performance"
        subtitle={`Volume metrics and traditional analytics · ${client.name}`}
      />
      <div className="content">
        <div className="callout" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <span className="em">Raw marketing and performance metrics.</span> Use this page to gauge what Chapter is ingesting and assessing — volume, funnel shape, and channel scoreboard from the resolved data.
          </div>
          <button className="toolbar-btn">Export CSV</button>
        </div>

        <div className="grid-3">
          {cards.map((c, i) => {
            const arrow = c.move > 0 ? "↑" : c.move < 0 ? "↓" : "—";
            let cls: "good" | "bad" | "neutral" = "neutral";
            if (c.good === true)  cls = c.move > 0 ? "good" : "bad";
            if (c.good === false) cls = c.move > 0 ? "bad"  : "good";
            return (
              <div key={i} className="card" style={{ padding: 18, position: "relative" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--ink-3)", fontWeight: 600 }}>
                  {c.label}
                  {!c.live && (
                    <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", background: "var(--bg-2)", borderRadius: 999, letterSpacing: ".06em" }} title="Mock — not yet wired to live data">
                      mock
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em" }}>{c.value}</div>
                    <span className={`move ${cls}`} style={{ marginTop: 4 }}>{arrow}{Math.abs(c.move).toFixed(1)}% vs. prior</span>
                  </div>
                  <Sparkline data={c.data} color={c.good === false ? "var(--bad)" : "var(--accent)"} />
                </div>
                {c.foot && (
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.35 }}>{c.foot}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Funnel · page view → purchase</h3>
                <div className="card-sub">Configured for ecommerce. Largest drop highlighted.</div>
              </div>
              <button className="toolbar-btn compact">Configure</button>
            </div>
            <div className="funnel">
              {funnelSteps.map((f, i) => {
                const widthPct = total > 0 ? (f.count / total) * 100 : 0;
                const isLargestDrop = f.drop !== null && f.drop === maxDrop;
                return (
                  <div key={i} className="funnel-step">
                    <div className="funnel-label">{f.step}</div>
                    <div className="funnel-bar-wrap">
                      <div className="funnel-bar" style={{ width: widthPct + "%" }}>
                        {fmtNum(f.count)}
                      </div>
                    </div>
                    <div className="funnel-num">{f.share.toFixed(2)}%</div>
                    <div className={`funnel-drop ${f.drop === null ? "ok" : isLargestDrop ? "" : "ok"}`}>
                      {f.drop === null ? "—" : `−${f.drop.toFixed(1)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
            {largestDropFrom && largestDropTo && (
              <div className="callout" style={{ marginTop: 16 }}>
                <span className="em">Largest drop:</span> {largestDropFrom} → {largestDropTo} (−{maxDrop.toFixed(1)}%). Compare across traffic sources, devices, or time of day to isolate whether it&apos;s structural or audience-driven.
              </div>
            )}
          </div>

          <div className="card flush">
            <div style={{ padding: "20px 22px 16px" }}>
              <h3 className="card-title">Channel performance</h3>
              <div className="card-sub" style={{ marginTop: 3 }}>Using Chapter&apos;s resolved channel taxonomy</div>
            </div>
            <table className="t">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th className="num">Journeys</th>
                  <th className="num">Orders</th>
                  <th className="num">Revenue</th>
                  <th className="num">CR</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(r => {
                  const ch = CHANNELS[r.channel as ChannelKey] ?? CHANNEL_FALLBACK;
                  const journeys = Number(r.journeys ?? 0);
                  const orders   = Number(r.orders   ?? 0);
                  const revenue  = Number(r.revenue  ?? 0);
                  return (
                    <tr key={r.channel}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 18, height: 18, background: ch.color, borderRadius: 4 }}></span>
                          <span style={{ fontWeight: 500 }}>{ch.name}</span>
                        </div>
                      </td>
                      <td className="num">{journeys > 0 ? fmtNum(journeys) : "—"}</td>
                      <td className="num">{fmtNum(Math.round(orders))}</td>
                      <td className="num">{fmtMoney(revenue)}</td>
                      <td className="num">{r.cr != null ? Number(r.cr).toFixed(2) + "%" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
