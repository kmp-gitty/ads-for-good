"use client";

import React from "react";
import { TopBar } from "../../_components/TopBar";
import { useChapter } from "../../_components/ChapterContext";
import { fmtNum, fmtMoney } from "../../_components/format";
import { CHANNELS, FUNNEL, CHANNEL_PERF } from "../../_components/mockdata";

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

export default function RawPage() {
  const { client } = useChapter();

  const trends = {
    orders:    [128, 142, 138, 155, 168, 172, 195, 188, 210, 224, 235, 247].map(x => x * 7),
    revenue:   [28, 32, 30, 36, 38, 41, 46, 44, 50, 53, 56, 58].map(x => x * 1000),
    aov:       [218, 224, 226, 228, 226, 230, 234, 232, 240, 244, 250, 226],
    journeys:  [5200, 5800, 6100, 6300, 6800, 7100, 7400, 7800, 8200, 8400, 8600, 8800],
    identified:[22, 24, 25, 26, 26, 28, 28, 29, 30, 30, 31, 31],
    engagement:[42, 44, 43, 45, 44, 46, 45, 47, 46, 48, 47, 48],
  };
  const cards = [
    { label: "Total orders",        value: "1,847",     move: -2.4,  good: false, data: trends.orders },
    { label: "Total revenue",       value: "$418,290",  move: +8.6,  good: true,  data: trends.revenue },
    { label: "AOV",                 value: "$226.49",   move: +11.3, good: true,  data: trends.aov },
    { label: "Total journeys",      value: "84,612",    move: +14.2, good: null,  data: trends.journeys },
    { label: "Identified journeys", value: "26,568 / 31.4%", move: +1.8, good: true, data: trends.identified },
    { label: "Engagement rate",     value: "48.2%",     move: +0.6,  good: true,  data: trends.engagement },
  ];

  const total = FUNNEL[0].count;
  const maxDrop = Math.max(...FUNNEL.filter(x => x.drop !== null).map(x => x.drop as number));

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
              <div key={i} className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--ink-3)", fontWeight: 600 }}>{c.label}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em" }}>{c.value}</div>
                    <span className={`move ${cls}`} style={{ marginTop: 4 }}>{arrow}{Math.abs(c.move).toFixed(1)}% vs. prior</span>
                  </div>
                  <Sparkline data={c.data} color={c.good === false ? "var(--bad)" : "var(--accent)"} />
                </div>
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
              {FUNNEL.map((f, i) => {
                const widthPct = (f.count / total) * 100;
                const isLargestDrop = f.drop !== null && f.drop === maxDrop;
                return (
                  <div key={i} className="funnel-step">
                    <div className="funnel-label">{f.step}</div>
                    <div className="funnel-bar-wrap">
                      <div className="funnel-bar" style={{ width: widthPct + "%" }}>
                        {fmtNum(f.count)}
                      </div>
                    </div>
                    <div className="funnel-num">{f.share}%</div>
                    <div className={`funnel-drop ${f.drop === null ? "ok" : isLargestDrop ? "" : "ok"}`}>
                      {f.drop === null ? "—" : `−${f.drop.toFixed(1)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="callout" style={{ marginTop: 16 }}>
              <span className="em">Largest drop:</span> Product view → Add to cart (−84.4%). Compare across traffic sources, devices, or time of day to isolate whether it&apos;s structural or audience-driven.
            </div>
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
                {CHANNEL_PERF.map(r => {
                  const ch = CHANNELS[r.key];
                  return (
                    <tr key={r.key}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 18, height: 18, background: ch.color, borderRadius: 4 }}></span>
                          <span style={{ fontWeight: 500 }}>{ch.name}</span>
                        </div>
                      </td>
                      <td className="num">{fmtNum(r.journeys)}</td>
                      <td className="num">{fmtNum(r.orders)}</td>
                      <td className="num">{fmtMoney(r.revenue)}</td>
                      <td className="num">{r.cr.toFixed(2)}%</td>
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
