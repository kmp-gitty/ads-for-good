"use client";

import React from "react";
import Link from "next/link";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Move, Lcm } from "../../_components/Move";
import { PathRender } from "../../_components/ChannelChip";
import { useChapter } from "../../_components/ChapterContext";
import { fmtNum, fmtMoneyK } from "../../_components/format";
import {
  LIFECYCLE_METRICS, PATH_LENGTH_TREND,
  OBSERVATIONS, TOP_COMBINATIONS, CHANNEL_ROLES, CHANNELS,
} from "../../_components/mockdata";

function PathLengthChart() {
  const data = PATH_LENGTH_TREND;
  const w = 720, h = 200, pad = { l: 32, r: 16, t: 14, b: 28 };
  const xs = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (data.length - 1);
  const yMax = 24, yMin = 4;
  const ys = (v: number) => pad.t + ((yMax - v) / (yMax - yMin)) * (h - pad.t - pad.b);
  const lineD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(d.median)}`).join(" ");
  const areaD = `${lineD} L ${xs(data.length - 1)} ${ys(yMin)} L ${xs(0)} ${ys(yMin)} Z`;
  const p90D = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(d.p90)}`).join(" ");
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {[8, 12, 16, 20].map(g => (
        <g key={g}>
          <line className="grid" x1={pad.l} x2={w - pad.r} y1={ys(g)} y2={ys(g)} />
          <text className="ticks" x={pad.l - 6} y={ys(g) + 3} textAnchor="end">{g}</text>
        </g>
      ))}
      <path className="area" d={areaD} />
      <path className="line" d={lineD} />
      <path d={p90D} stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="3 3" fill="none" />
      {data.map((d, i) => (
        <circle key={i} className="dot" cx={xs(i)} cy={ys(d.median)} r="3" />
      ))}
      {data.map((d, i) => (
        i % 2 === 0 ? <text key={"x" + i} className="ticks" x={xs(i)} y={h - pad.b + 16} textAnchor="middle">{d.wk}</text> : null
      ))}
    </svg>
  );
}

export default function OverviewPage() {
  const { client } = useChapter();
  return (
    <>
      <TopBar
        title="Lifecycle Overview"
        subtitle={`How customers are closing right now · ${client.name}`}
      />
      <div className="content">
        <div className="lifecycle-hero">
          <div className="lifecycle-hero-eyebrow">Lifecycle Health · Last 30 days</div>
          <h2>
            Customers close in a <span className="num">median of 7.4 touches over 12 days</span>, with <span className="num">78%</span> of conversions involving more than one channel.
          </h2>
          <div className="lifecycle-metrics">
            {LIFECYCLE_METRICS.map((m, i) => <Lcm key={i} {...m} />)}
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">
                  Path length is trending up
                  <span className="what" title="Median touches to close per chapter, by ISO week. Dashed line = 90th percentile.">?</span>
                </h3>
                <div className="card-sub">Median touches to close, last 12 weeks · p90 shown dashed</div>
              </div>
              <button className="btn-ghost compact">Touches</button>
            </div>
            <PathLengthChart />
            <div className="callout" style={{ marginTop: 14 }}>
              <span className="em">Median grew from 5.8 → 7.4 touches</span> over 12 weeks — a 27.6% increase. Worth investigating: are new audience sources producing longer paths, or has consideration cycle lengthened broadly?
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Chapter observations this week</h3>
                <div className="card-sub">Highest-severity findings</div>
              </div>
              <Link className="card-link" href="/chapter/observations">View all 8 <Icon name="chevR" size={12}/></Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {OBSERVATIONS.slice(0, 3).map(o => {
                const railColor = o.severity === "high" ? "var(--sev-high)" : o.severity === "med" ? "var(--sev-med)" : "var(--sev-low)";
                return (
                  <div key={o.id} style={{ display: "flex", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--line-2)" }}>
                    <div style={{ width: 3, borderRadius: 3, flexShrink: 0, background: railColor }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="obs-meta" style={{ marginBottom: 6 }}>
                        <span className={`obs-tag sev-${o.severity}`}>{o.severity === "high" ? "High" : o.severity === "med" ? "Medium" : "Low"} severity</span>
                        {o.state === "new" && <span className="obs-tag new">New this week</span>}
                        {o.state === "changed" && <span className="obs-tag">Changed</span>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45, color: "var(--ink)" }}>{o.headline}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid-2-flip">
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Channel roles at a glance</h3>
                <div className="card-sub">What each channel is doing in your converting paths</div>
              </div>
              <Link className="card-link" href="/chapter/channels">View all channel roles <Icon name="chevR" size={12}/></Link>
            </div>
            <div className="row-list">
              {CHANNEL_ROLES.slice(0, 5).map(r => {
                const c = CHANNELS[r.key];
                return (
                  <div key={r.key} className="lrow" style={{ gridTemplateColumns: "180px 1fr auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ background: c.color, width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", color: "white", fontSize: 10, fontWeight: 600 }}>{c.short}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
                      Primarily a <span style={{ fontWeight: 600, color: "var(--ink)" }}>{r.dominant}</span> — closes {r.role.close}% of appearances, opens {r.role.open}%.
                    </div>
                    <Move value={r.revenue.move} semantic="up-good" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Top converting combinations</h3>
                <div className="card-sub">Set-based · ranked by chapter count</div>
              </div>
              <Link className="card-link" href="/chapter/paths">View all path patterns <Icon name="chevR" size={12}/></Link>
            </div>
            <div className="row-list">
              <div className="lrow head" style={{ gridTemplateColumns: "1fr 70px 90px 60px" }}>
                <div>Combination</div>
                <div style={{ textAlign: "right" }}>Chapters</div>
                <div style={{ textAlign: "right" }}>Revenue</div>
                <div style={{ textAlign: "right" }}>Move</div>
              </div>
              {TOP_COMBINATIONS.slice(0, 5).map(c => (
                <Link href="/chapter/paths" key={c.id} className="lrow click" style={{ gridTemplateColumns: "1fr 70px 90px 60px", textDecoration: "none", color: "inherit" }}>
                  <div>
                    <PathRender channels={c.channels} mode="set" />
                    {c.isNew && <span className="obs-tag new" style={{ marginLeft: 8, fontSize: 9 }}>New</span>}
                  </div>
                  <div className="lrow-num" style={{ textAlign: "right" }}>{fmtNum(c.chapters)}</div>
                  <div className="lrow-num" style={{ textAlign: "right" }}>{fmtMoneyK(c.revenue)}</div>
                  <div style={{ textAlign: "right" }}><Move value={c.move} semantic="up-good" /></div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
