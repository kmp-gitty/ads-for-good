"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { useChapter } from "../../_components/ChapterContext";
import { fmtMoney, fmtNum } from "../../_components/format";
import {
  CHANNELS, ATTRIBUTION_MODEL_LABELS, type AttributionModel,
  type ChannelKey, type Kpi,
} from "../../_components/mockdata";
import type { AttributionOverviewRow } from "../../_lib/dashboard-rpc";

const CHANNEL_FALLBACK = { name: "Unknown", color: "#9CA0A8", short: "—" };

type Props = {
  attribution: AttributionOverviewRow[];
  summary: {
    total_orders: number | null;
    total_revenue: number | null;
    avg_order_value: number | null;
  } | null;
  journey: {
    total_journeys: number | null;
    identified_journeys: number | null;
    pct_identified: number | null;
  } | null;
  engagement: { engagement_rate: number | null } | null;
  priorSummary: {
    total_orders: number | null;
    total_revenue: number | null;
    avg_order_value: number | null;
  } | null;
  priorJourney: {
    total_journeys: number | null;
    identified_journeys: number | null;
    pct_identified: number | null;
  } | null;
  priorEngagement: { engagement_rate: number | null } | null;
  clientKey: string;
  range: string;
};

// Per-channel percentage under each attribution model. "custom" is held back
// as a placeholder (J-shape isn't computed server-side yet).
type ChannelPct = {
  channel: string;
  first: number;
  last: number;
  linear: number;
  custom: number;
  first_revenue: number;
  last_revenue: number;
  linear_revenue: number;
};

function pctDelta(c: number | null | undefined, p: number | null | undefined): number | null {
  if (c == null || p == null) return null;
  const cN = Number(c), pN = Number(p);
  if (!Number.isFinite(cN) || !Number.isFinite(pN) || pN === 0) return null;
  return ((cN - pN) / pN) * 100;
}

// Convert RPC rows to the per-channel-percentage shape the UI needs.
// Sum-of-revenues = denominator per model; each channel's share is its
// percentage. Returns [] if the window has no attributable revenue.
function rowsToPct(rows: AttributionOverviewRow[]): ChannelPct[] {
  const firstTotal  = rows.reduce((s, r) => s + Number(r.first_revenue  ?? 0), 0);
  const lastTotal   = rows.reduce((s, r) => s + Number(r.last_revenue   ?? 0), 0);
  const linearTotal = rows.reduce((s, r) => s + Number(r.linear_revenue ?? 0), 0);
  return rows.map(r => {
    const fr  = Number(r.first_revenue  ?? 0);
    const lr  = Number(r.last_revenue   ?? 0);
    const lir = Number(r.linear_revenue ?? 0);
    return {
      channel: r.channel,
      first:  firstTotal  > 0 ? (fr  / firstTotal)  * 100 : 0,
      last:   lastTotal   > 0 ? (lr  / lastTotal)   * 100 : 0,
      linear: linearTotal > 0 ? (lir / linearTotal) * 100 : 0,
      // J-shape custom (40/20/40): 40% first + 20% linear + 40% last
      custom: firstTotal > 0 && lastTotal > 0 && linearTotal > 0
        ? 0.4 * (fr  / firstTotal)  * 100
        + 0.2 * (lir / linearTotal) * 100
        + 0.4 * (lr  / lastTotal)   * 100
        : 0,
      first_revenue: fr,
      last_revenue: lr,
      linear_revenue: lir,
    };
  });
}

function BumpChart({ models, data }: { models: AttributionModel[]; data: ChannelPct[] }) {
  const ranks: Record<string, Record<AttributionModel, number>> = {};
  models.forEach(m => {
    const sorted = [...data].sort((a, b) => (b[m] as number) - (a[m] as number));
    sorted.forEach((c, i) => {
      if (!ranks[c.channel]) ranks[c.channel] = {} as Record<AttributionModel, number>;
      ranks[c.channel][m] = i + 1;
    });
  });

  const w = 720, h = Math.max(160, 30 * data.length + 40);
  const rowH = 30, padTop = 20;
  const xs = (mi: number) => 80 + mi * ((w - 80 - 80) / Math.max(models.length - 1, 1));
  const ys = (rank: number) => padTop + (rank - 1) * rowH;
  const maxRank = data.length;

  return (
    <div className="bump-wrap">
      <div className="bump-row" style={{ gridTemplateColumns: `repeat(${models.length}, 1fr)`, paddingLeft: 80, paddingRight: 80 }}>
        {models.map(m => <div key={m}>{ATTRIBUTION_MODEL_LABELS[m]}</div>)}
      </div>
      <svg className="bump-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {models.map((m, mi) => (
          <line key={m} x1={xs(mi)} x2={xs(mi)} y1={padTop - 8} y2={padTop + rowH * (maxRank - 1) + 8}
                stroke="var(--line-2)" strokeWidth="1" />
        ))}
        {data.map(c => {
          const ch = CHANNELS[c.channel as ChannelKey] ?? CHANNEL_FALLBACK;
          const pts = models.map((m, mi) => [xs(mi), ys(ranks[c.channel][m])] as [number, number]);
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
          const rArr = models.map(m => ranks[c.channel][m]);
          const swing = Math.max(...rArr) - Math.min(...rArr);
          const hot = swing >= 3;
          const lastModel = models[models.length - 1];
          return (
            <g key={c.channel}>
              <path d={d} stroke={ch.color} strokeWidth={hot ? 2.5 : 1.5} fill="none" opacity={hot ? 1 : 0.55} />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={hot ? 6 : 4.5} fill={ch.color} stroke="white" strokeWidth="1.5" />
              ))}
              <text x={xs(0) - 12} y={ys(ranks[c.channel][models[0]]) + 4} textAnchor="end"
                    style={{ fontSize: 11, fill: hot ? "var(--ink)" : "var(--ink-2)", fontWeight: hot ? 600 : 500 }}>
                {ch.name}
              </text>
              <text x={xs(models.length - 1) + 12} y={ys(ranks[c.channel][lastModel]) + 4}
                    style={{ fontSize: 11, fill: hot ? "var(--ink)" : "var(--ink-2)", fontWeight: hot ? 600 : 500 }}>
                #{ranks[c.channel][lastModel]} · {(c[lastModel] as number).toFixed(1)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AllocTable({ models, data }: { models: AttributionModel[]; data: ChannelPct[] }) {
  // Find max model value across all rows for the bar-width scale denominator
  const maxPct = Math.max(1, ...data.flatMap(c => models.map(m => c[m] as number)));
  return (
    <table className="t">
      <thead>
        <tr>
          <th>Channel</th>
          {models.map(m => <th key={m} className="num">{ATTRIBUTION_MODEL_LABELS[m]}</th>)}
          <th className="num">Spread</th>
        </tr>
      </thead>
      <tbody>
        {data.map(c => {
          const ch = CHANNELS[c.channel as ChannelKey] ?? CHANNEL_FALLBACK;
          const vals = models.map(m => c[m] as number);
          const spread = Math.max(...vals) - Math.min(...vals);
          const isWide = spread >= 10;
          const maxVal = Math.max(...vals);
          return (
            <tr key={c.channel}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 18, height: 18, background: ch.color, borderRadius: 4 }}></span>
                  <span style={{ fontWeight: 500 }}>{ch.name}</span>
                </div>
              </td>
              {models.map(m => {
                const v = c[m] as number;
                const isMax = v === maxVal && vals.filter(x => x === maxVal).length === 1;
                return (
                  <td key={m} className="num">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <div style={{ width: 60, height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: (v / maxPct) * 100 + "%", height: "100%", background: ch.color, opacity: 0.7 }}></div>
                      </div>
                      <span style={{ fontWeight: isMax ? 700 : 500, minWidth: 44 }}>{v.toFixed(1)}%</span>
                    </div>
                  </td>
                );
              })}
              <td className="num">
                <span className={`shift-badge ${isWide ? "up" : ""}`}>{spread.toFixed(1)}pt</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SingleModelView({ data }: { data: ChannelPct[] }) {
  const { model } = useChapter();
  const totalRevenue = data.reduce(
    (s, r) =>
      s
      + (model === "first"  ? r.first_revenue
       : model === "last"   ? r.last_revenue
       : model === "linear" ? r.linear_revenue
       : (0.4 * r.first_revenue + 0.2 * r.linear_revenue + 0.4 * r.last_revenue)),
    0
  );
  const sorted = [...data].sort((a, b) => (b[model] as number) - (a[model] as number));
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Channel allocation under {ATTRIBUTION_MODEL_LABELS[model]}</h3>
          <div className="card-sub">Share of attributed revenue · {fmtMoney(totalRevenue)} attributed across {data.length} channels</div>
        </div>
        {model === "custom" && <span className="role-pill closer">Custom model · J-shape (40/20/40)</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map(c => {
          const ch = CHANNELS[c.channel as ChannelKey] ?? CHANNEL_FALLBACK;
          const pct = c[model] as number;
          const maxPct = Math.max(1, ...data.map(d => d[model] as number));
          return (
            <div key={c.channel} style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px 80px", gap: 14, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 18, height: 18, background: ch.color, borderRadius: 4 }}></span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{ch.name}</span>
              </div>
              <div style={{ background: "var(--bg-2)", borderRadius: 8, height: 24, overflow: "hidden" }}>
                <div style={{ width: (pct / maxPct) * 100 + "%", height: "100%", background: ch.color, opacity: 0.85 }}></div>
              </div>
              <div className="lrow-num" style={{ textAlign: "right", fontWeight: 600 }}>{pct.toFixed(1)}%</div>
              <div className="lrow-num muted" style={{ textAlign: "right" }}>{fmtMoney(totalRevenue * pct / 100)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AttributionClient({
  attribution, summary, journey, engagement,
  priorSummary, priorJourney, priorEngagement,
  clientKey: _clientKey, range: _range,
}: Props) {
  const { client, model, setModel } = useChapter();
  const sp = useSearchParams();
  const [selectedModels, setSelectedModels] = useState<AttributionModel[]>(["first", "linear", "last"]);

  // Convert live RPC rows → per-channel percentages. Empty window → use the
  // mock attribution channels so the page still renders something.
  const liveData = rowsToPct(attribution);
  const data: ChannelPct[] = liveData.length > 0 ? liveData : [];
  const empty = data.length === 0;

  const toggleModel = (m: AttributionModel) => {
    setSelectedModels(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const allModels: AttributionModel[] = ["first", "last", "linear", "custom"];
  const bumpModels = (selectedModels.length >= 2
    ? selectedModels.filter(m => m !== "custom")
    : ["first", "linear", "last"]) as AttributionModel[];
  const tableModels = (selectedModels.length >= 2 ? selectedModels : ["first", "linear", "last"]) as AttributionModel[];

  // KPI strip — shared header pattern.
  const showDelta = (sp.get("compare") || "prior") !== "none";
  const ordersDisplay  = summary?.total_orders    != null ? fmtNum(Number(summary.total_orders))            : "—";
  const revenueDisplay = summary?.total_revenue   != null ? fmtMoney(Number(summary.total_revenue))          : "—";
  const aovDisplay     = summary?.avg_order_value != null ? "$" + Number(summary.avg_order_value).toFixed(2) : "—";
  const journeysDisplay = journey?.total_journeys != null ? fmtNum(Number(journey.total_journeys))           : "—";
  const identifiedPct   = journey?.pct_identified != null ? (Number(journey.pct_identified) * 100).toFixed(1) + "%" : "—";
  const moveOrders     = pctDelta(summary?.total_orders,     priorSummary?.total_orders);
  const moveRevenue    = pctDelta(summary?.total_revenue,    priorSummary?.total_revenue);
  const moveAov        = pctDelta(summary?.avg_order_value,  priorSummary?.avg_order_value);
  const moveJourneys   = pctDelta(journey?.total_journeys,   priorJourney?.total_journeys);
  const moveIdentified = pctDelta(journey?.pct_identified,   priorJourney?.pct_identified);
  void engagement; void priorEngagement; void showDelta;
  const kpis: Kpi[] = [
    { label: "Orders",       value: ordersDisplay,    move: moveOrders     ?? 0, good: moveOrders     != null && moveOrders     >= 0, semantic: "up-good" },
    { label: "Revenue",      value: revenueDisplay,   move: moveRevenue    ?? 0, good: moveRevenue    != null && moveRevenue    >= 0, semantic: "up-good" },
    { label: "AOV",          value: aovDisplay,       move: moveAov        ?? 0, good: moveAov        != null && moveAov        >= 0, semantic: "up-good" },
    { label: "Journeys",     value: journeysDisplay,  move: moveJourneys   ?? 0, good: null, semantic: "neutral" },
    { label: "% Identified", value: identifiedPct,    move: moveIdentified ?? 0, good: moveIdentified != null && moveIdentified >= 0, semantic: "up-good" },
  ];

  return (
    <>
      <TopBar
        title="Attribution Models"
        subtitle={`How channel credit shifts across modeling choices · ${client.name}`}
        kpis={kpis}
      />
      <div className="content">
        {empty ? (
          <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
            No attributable revenue in this window. Try a longer date range.
          </div>
        ) : (
          <>
            {/* ───── Single model ─────────────────────────────────────────── */}
            <div className="card" style={{ padding: "18px 22px" }}>
              <div className="filter-bar" style={{ justifyContent: "space-between" }}>
                <div className="filter-bar">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Single model</span>
                  <Dropdown align="left" width={240} trigger={
                    <button className="toolbar-btn">
                      <span style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Model</span>
                      <span style={{ fontWeight: 600 }}>{ATTRIBUTION_MODEL_LABELS[model]}</span>
                      <span className="chev"><Icon name="chev" size={12}/></span>
                    </button>
                  }>
                    {(close) => (
                      <>
                        {allModels.map(m => (
                          <button key={m} className={`dd-item ${model === m ? "active" : ""}`} onClick={() => { setModel(m); close(); }}>
                            <span>{ATTRIBUTION_MODEL_LABELS[m]}</span>
                            {model === m && <span className="check"><Icon name="check" size={14}/></span>}
                          </button>
                        ))}
                      </>
                    )}
                  </Dropdown>
                </div>
              </div>
            </div>

            <SingleModelView data={data} />

            {/* ───── Compare models ───────────────────────────────────────── */}
            <div className="card" style={{ padding: "18px 22px" }}>
              <div className="filter-bar" style={{ justifyContent: "space-between" }}>
                <div className="filter-bar">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Compare models</span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".1em", marginLeft: 4 }}>Showing</span>
                  {allModels.map(m => (
                    <button key={m} className={`btn-ghost ${selectedModels.includes(m) ? "active" : ""}`} onClick={() => toggleModel(m)}>
                      {ATTRIBUTION_MODEL_LABELS[m]}
                      {m === "custom" && <span className="dim" style={{ marginLeft: 6, fontSize: 9, textTransform: "uppercase", letterSpacing: ".1em" }}>custom</span>}
                    </button>
                  ))}
                </div>
                <div className="filter-bar">
                  <button className="toolbar-btn"><Icon name="plus" size={12}/> New custom model</button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Channel rank shifts across attribution models</h3>
                  <div className="card-sub">Biggest swings highlighted — channels with rank change ≥ 3 across selected models.</div>
                </div>
              </div>
              <BumpChart models={bumpModels} data={data} />
            </div>

            <div className="card flush">
              <AllocTable models={tableModels} data={data} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
