"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { useChapter } from "../../_components/ChapterContext";
import { fmtMoney, fmtNum } from "../../_components/format";
import {
  CHANNELS, ATTRIBUTION_MODEL_LABELS, type AttributionModel,
  type ChannelKey, type Kpi,
} from "../../_components/mockdata";
import type { AttributionOverviewRow, AttributionModelIndicatorRow, AttributionFirstTouchCoverageRow } from "../../_lib/dashboard-rpc";

const CHANNEL_FALLBACK = { name: "Unknown", color: "#9CA0A8", short: "—" };

// 6.5 blind-spot indicators — suppress channels below this many qualifying
// chapters (matches the Channel Roles / Path Patterns sample floor). A channel
// under the floor is listed as low-sample rather than given a headline number.
const INDICATOR_SAMPLE_FLOOR = 20;

// 6.2 — each model states its allocation rule on-page (visible without hovering).
// Linear's wording explicitly covers the repeat-touch case, matching the SQL
// (attribution_overview splits per touch, not per distinct channel).
const MODEL_DEFINITIONS: Record<AttributionModel, string> = {
  first:  "All credit to the first channel in the chapter.",
  last:   "All credit to the last channel in the chapter.",
  linear: "Credit split evenly across every touch in the chapter — a channel appearing more than once is credited for each appearance.",
  custom: "J-shape: 40% first touch, 20% spread across the middle, 40% last touch.",
};

// 6.4 — attribution lookback: how far back before EACH boundary to count touches.
// "unlimited" is the default (reproduces today's numbers exactly). Options are
// per-boundary day windows; totals are invariant to the choice, only allocation
// moves. Persisted in ?lookback= so a view is shareable.
const LOOKBACK_OPTIONS: { v: string; label: string }[] = [
  { v: "unlimited", label: "Unlimited" },
  { v: "7",   label: "7 days" },
  { v: "14",  label: "14 days" },
  { v: "28",  label: "28 days" },
  { v: "30",  label: "30 days" },
  { v: "60",  label: "60 days" },
  { v: "90",  label: "90 days" },
  { v: "365", label: "365 days" },
];
function lookbackLabel(v: string): string {
  return LOOKBACK_OPTIONS.find((o) => o.v === v)?.label ?? "Unlimited";
}

// 6.3 — revenue vs conversion count. Both are already in the RPC payload
// (first_orders/first_revenue etc.); the toggle just picks which to allocate.
type Metric = "revenue" | "count";

// Label the count metric from the client's boundary event — "Orders" for a
// purchase, "Bookings" for an appointment. Never a generic word.
function countLabelFor(boundaryEvent: string): string {
  const map: Record<string, string> = { purchase: "Orders", appointment_booked: "Bookings" };
  return (
    map[boundaryEvent] ??
    boundaryEvent
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

type Props = {
  attribution: AttributionOverviewRow[];
  indicators: AttributionModelIndicatorRow[];
  coverage: AttributionFirstTouchCoverageRow[];
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
  lookback: string;
  boundaryEvent: string;
};

// Per-channel share (%) + absolute value under each model, for the selected
// metric. "custom" is scaffolding (J-shape not computed server-side yet).
type ChannelPct = {
  channel: string;
  first: number;
  last: number;
  linear: number;
  custom: number;
  firstVal: number;
  lastVal: number;
  linearVal: number;
};

function pctDelta(c: number | null | undefined, p: number | null | undefined): number | null {
  if (c == null || p == null) return null;
  const cN = Number(c), pN = Number(p);
  if (!Number.isFinite(cN) || !Number.isFinite(pN) || pN === 0) return null;
  return ((cN - pN) / pN) * 100;
}

// Convert RPC rows to per-channel shares for the selected metric. Sum over the
// metric = denominator per model; each channel's share is its percentage.
// Revenue and count shares differ (a channel with many low-value orders has a
// higher order-share than revenue-share). Returns [] if the window is empty.
function rowsToPct(rows: AttributionOverviewRow[], metric: Metric): ChannelPct[] {
  const pick = (r: AttributionOverviewRow, model: "first" | "last" | "linear"): number => {
    const v =
      metric === "count"
        ? (model === "first" ? r.first_orders : model === "last" ? r.last_orders : r.linear_orders)
        : (model === "first" ? r.first_revenue : model === "last" ? r.last_revenue : r.linear_revenue);
    return Number(v ?? 0);
  };
  const firstTotal  = rows.reduce((s, r) => s + pick(r, "first"), 0);
  const lastTotal   = rows.reduce((s, r) => s + pick(r, "last"), 0);
  const linearTotal = rows.reduce((s, r) => s + pick(r, "linear"), 0);
  return rows.map(r => {
    const fv  = pick(r, "first");
    const lv  = pick(r, "last");
    const liv = pick(r, "linear");
    return {
      channel: r.channel,
      first:  firstTotal  > 0 ? (fv  / firstTotal)  * 100 : 0,
      last:   lastTotal   > 0 ? (lv  / lastTotal)   * 100 : 0,
      linear: linearTotal > 0 ? (liv / linearTotal) * 100 : 0,
      // J-shape custom (40/20/40): 40% first + 20% linear + 40% last
      custom: firstTotal > 0 && lastTotal > 0 && linearTotal > 0
        ? 0.4 * (fv  / firstTotal)  * 100
        + 0.2 * (liv / linearTotal) * 100
        + 0.4 * (lv  / lastTotal)   * 100
        : 0,
      firstVal: fv,
      lastVal: lv,
      linearVal: liv,
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

// 6.5 — per-model blind-spot slot. One consistent line stating what the model
// hides, with the supporting per-channel numbers. Copy states facts, no advice.
//   last   → 6.5(b) % assisted (closing chapters that had an earlier, different channel)
//   linear → 6.5(c) share of path a channel actually occupies when present
//   first  → 6.5(a) coverage readout needs the attribution-lookback control (not shipped);
//            we state the blind spot without fabricating the number
function ModelBlindSpot({ model, indicators, coverage, lookback }: {
  model: AttributionModel; indicators: AttributionModelIndicatorRow[];
  coverage: AttributionFirstTouchCoverageRow[]; lookback: string;
}) {
  if (model === "first") {
    // 6.5(a) — under a lookback, show the coverage gap: of the chapters where a
    // channel is first-touch (within the window), what share actually had an
    // earlier touch that got cut off. Only meaningful when a lookback is set.
    if (lookback === "unlimited") {
      return (
        <div className="card-sub" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-2)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--ink-2)" }}>What first-touch hides:</strong> everything after the first click. Set an <strong>attribution lookback</strong> above to see, per channel, what share of these “first touches” actually had an earlier touch outside the window.
        </div>
      );
    }
    const rows = coverage
      .map((r) => ({ channel: r.channel, chapters: Number(r.chapters ?? 0), pct: r.pct_beyond == null ? null : Number(r.pct_beyond) }))
      .filter((r) => r.pct != null && r.chapters >= INDICATOR_SAMPLE_FLOOR)
      .sort((a, b) => (b.pct! - a.pct!));
    const lowSample = coverage
      .map((r) => ({ channel: r.channel, chapters: Number(r.chapters ?? 0) }))
      .filter((r) => r.chapters > 0 && r.chapters < INDICATOR_SAMPLE_FLOOR)
      .map((r) => r.channel);
    return (
      <div className="card-sub" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-2)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--ink-2)" }}>What first-touch hides:</strong> share of each channel’s first-touch chapters whose <em>true</em> first touch was earlier than your {lookbackLabel(lookback)} window (so the shown first touch is not the real one):
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 6 }}>
          {rows.map((r) => {
            const ch = CHANNELS[r.channel as ChannelKey] ?? CHANNEL_FALLBACK;
            return (
              <span key={r.channel} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, background: ch.color, borderRadius: 3 }}></span>
                <span style={{ color: "var(--ink-2)" }}>{ch.name}</span>
                <span style={{ fontWeight: 600 }}>{r.pct!.toFixed(0)}%</span>
              </span>
            );
          })}
        </div>
        {lowSample.length > 0 && (
          <div style={{ marginTop: 6, color: "var(--ink-3)" }}>
            Low sample (under {INDICATOR_SAMPLE_FLOOR} chapters), not shown: {lowSample.map((c) => (CHANNELS[c as ChannelKey] ?? CHANNEL_FALLBACK).name).join(", ")}.
          </div>
        )}
      </div>
    );
  }

  const isLast = model === "last";
  const label = isLast ? "What last-touch hides" : "What an even split hides";
  const lead = isLast
    ? "share of each channel’s closing chapters that were assisted — had an earlier, different channel:"
    : "share of the path each channel actually occupies when it appears (a channel repeated across touches is not an even split):";

  // Pick the model-appropriate metric + sample column, gate on the floor, rank desc.
  const rows = indicators
    .map((r) => {
      const n = isLast ? Number(r.last_touch_chapters ?? 0) : Number(r.present_chapters ?? 0);
      const val = isLast ? r.pct_assisted : r.avg_share_of_path;
      return { channel: r.channel, n, val: val == null ? null : Number(val) };
    })
    .filter((r) => r.val != null);
  const shown = rows.filter((r) => r.n >= INDICATOR_SAMPLE_FLOOR).sort((a, b) => (b.val! - a.val!));
  const lowSample = rows.filter((r) => r.n < INDICATOR_SAMPLE_FLOOR).map((r) => r.channel);

  if (shown.length === 0 && lowSample.length === 0) return null;

  return (
    <div className="card-sub" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-2)", lineHeight: 1.6 }}>
      <strong style={{ color: "var(--ink-2)" }}>{label}:</strong> {lead}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 6 }}>
        {shown.map((r) => {
          const ch = CHANNELS[r.channel as ChannelKey] ?? CHANNEL_FALLBACK;
          return (
            <span key={r.channel} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: ch.color, borderRadius: 3 }}></span>
              <span style={{ color: "var(--ink-2)" }}>{ch.name}</span>
              <span style={{ fontWeight: 600 }}>{r.val!.toFixed(0)}%</span>
            </span>
          );
        })}
      </div>
      {lowSample.length > 0 && (
        <div style={{ marginTop: 6, color: "var(--ink-3)" }}>
          Low sample (under {INDICATOR_SAMPLE_FLOOR} chapters), not shown: {lowSample.map((c) => (CHANNELS[c as ChannelKey] ?? CHANNEL_FALLBACK).name).join(", ")}.
        </div>
      )}
    </div>
  );
}

function SingleModelView({ data, metric, countLabel, netRevenue, netOrders, indicators, coverage, lookback }: {
  data: ChannelPct[]; metric: Metric; countLabel: string;
  netRevenue: number | null; netOrders: number | null;
  indicators: AttributionModelIndicatorRow[];
  coverage: AttributionFirstTouchCoverageRow[]; lookback: string;
}) {
  const { model } = useChapter();
  const modelVal = (c: ChannelPct): number =>
    model === "first"  ? c.firstVal
    : model === "last"   ? c.lastVal
    : model === "linear" ? c.linearVal
    : (0.4 * c.firstVal + 0.2 * c.linearVal + 0.4 * c.lastVal);
  const total = data.reduce((s, c) => s + modelVal(c), 0);
  const sorted = [...data].sort((a, b) => (b[model] as number) - (a[model] as number));

  const isCount = metric === "count";
  // Only Linear produces fractional counts (each touch takes a share of one
  // conversion). First/Last counts are whole numbers.
  const fractional = isCount && model === "linear";
  const fmtVal = (n: number): string =>
    isCount ? (fractional ? n.toFixed(1) : Math.round(n).toLocaleString()) : fmtMoney(n);
  const unitLabel = isCount ? countLabel.toLowerCase() : "revenue";

  // Unattributed = headline total with no channel path — the "(unknown)" bucket
  // (chapters with no captured session entry). attribution_overview filters
  // channel_path IS NOT NULL, so without this the allocation silently fails to
  // reconcile to the headline (operator-spotted Jul 30).
  const netRaw = isCount ? netOrders : netRevenue;
  const net = netRaw != null ? Number(netRaw) : null;
  const unattributed = net != null ? Math.max(0, net - total) : 0;
  const unattributedPct = net && net > 0 ? (unattributed / net) * 100 : 0;
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Channel allocation under {ATTRIBUTION_MODEL_LABELS[model]}</h3>
          <div className="card-sub">Share of attributed {unitLabel} · {fmtVal(total)} across {data.length} channels</div>
          {/* 6.2 — allocation rule stated on-page, no hover needed */}
          <div className="card-sub" style={{ marginTop: 4 }}>
            {MODEL_DEFINITIONS[model]}
            {fractional && " Counts are fractional under Linear because each touch takes a share of one conversion."}
          </div>
        </div>
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
              <div className="lrow-num muted" style={{ textAlign: "right" }}>{fmtVal(modelVal(c))}</div>
            </div>
          );
        })}
      </div>
      {unattributed > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line-2)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--ink-2)" }}>{fmtVal(unattributed)}</strong> ({unattributedPct.toFixed(1)}%) of the {fmtVal(net ?? 0)} headline {unitLabel} is not attributed to any channel path — chapters with no captured session entry (shown as “(unknown)” elsewhere). The bars above allocate the {fmtVal(total)} that does.
        </div>
      )}
      <ModelBlindSpot model={model} indicators={indicators} coverage={coverage} lookback={lookback} />
    </div>
  );
}

export default function AttributionClient({
  attribution, indicators, coverage, summary, journey, engagement,
  priorSummary, priorJourney, priorEngagement,
  clientKey: _clientKey, range: _range, lookback, boundaryEvent,
}: Props) {
  const { client, model, setModel } = useChapter();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // 6.4 — update ?lookback= in place, preserving every other param.
  const setLookback = (v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v === "unlimited") next.delete("lookback"); else next.set("lookback", v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const [selectedModels, setSelectedModels] = useState<AttributionModel[]>(["first", "linear", "last"]);
  // 6.3 — allocate by revenue or by conversion count. Both are in the payload.
  const [metric, setMetric] = useState<Metric>("revenue");
  const countLabel = countLabelFor(boundaryEvent);

  // Convert live RPC rows → per-channel shares for the selected metric.
  const data: ChannelPct[] = rowsToPct(attribution, metric);
  const empty = data.length === 0;

  const toggleModel = (m: AttributionModel) => {
    setSelectedModels(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  // 6.1 — three models only (first / last / linear). Custom J-shape is not
  // computed server-side; the client-side scaffolding (rowsToPct `custom`,
  // MODEL_DEFINITIONS.custom, the `AttributionModel` union) is preserved for a
  // future reimplementation, but the pill + "new custom model" entry point are
  // removed so the tab doesn't advertise a capability that doesn't exist.
  const allModels: AttributionModel[] = ["first", "last", "linear"];
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
                  {/* 6.4 — attribution lookback, independent of the date picker */}
                  <Dropdown align="left" width={200} trigger={
                    <button className="toolbar-btn">
                      <span style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Lookback</span>
                      <span style={{ fontWeight: 600 }}>{lookbackLabel(lookback)}</span>
                      <span className="chev"><Icon name="chev" size={12}/></span>
                    </button>
                  }>
                    {(close) => (
                      <>
                        {LOOKBACK_OPTIONS.map(o => (
                          <button key={o.v} className={`dd-item ${lookback === o.v ? "active" : ""}`} onClick={() => { setLookback(o.v); close(); }}>
                            <span>{o.label}</span>
                            {lookback === o.v && <span className="check"><Icon name="check" size={14}/></span>}
                          </button>
                        ))}
                      </>
                    )}
                  </Dropdown>
                </div>
                {/* 6.3 — allocate by revenue or by conversion count */}
                <div className="filter-bar">
                  <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".1em" }}>Metric</span>
                  <button className={`btn-ghost ${metric === "revenue" ? "active" : ""}`} onClick={() => setMetric("revenue")}>Revenue</button>
                  <button className={`btn-ghost ${metric === "count" ? "active" : ""}`} onClick={() => setMetric("count")}>{countLabel}</button>
                </div>
              </div>
              {/* 6.4 — honest framing: what the lookback does + does not do */}
              <div className="card-sub" style={{ marginTop: 10, lineHeight: 1.5 }}>
                {lookback === "unlimited"
                  ? <>The <strong>date picker</strong> chooses which conversions to include; the <strong>lookback</strong> counts touches back from each conversion. Unlimited counts a conversion’s full history back to its previous purchase. Totals never change with the lookback — only how credit is split across channels.</>
                  : <>Each conversion counts only touches in the <strong>{lookbackLabel(lookback)}</strong> before it (measured per conversion, not as a calendar cutoff). A conversion with no touch in that window is credited to <strong>(direct)</strong>, so the total is unchanged — tightening the window shifts credit toward direct, it never drops revenue. “First touch within {lookbackLabel(lookback)}” is not necessarily the true first touch (see the coverage note under First Touch).</>}
              </div>
            </div>

            <SingleModelView
              data={data}
              metric={metric}
              countLabel={countLabel}
              netRevenue={summary?.total_revenue ?? null}
              netOrders={summary?.total_orders ?? null}
              indicators={indicators}
              coverage={coverage}
              lookback={lookback}
            />

            {/* ───── Compare models ───────────────────────────────────────── */}
            <div className="card" style={{ padding: "18px 22px" }}>
              <div className="filter-bar" style={{ justifyContent: "space-between" }}>
                <div className="filter-bar">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Compare models</span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".1em", marginLeft: 4 }}>Showing</span>
                  {allModels.map(m => (
                    <button key={m} className={`btn-ghost ${selectedModels.includes(m) ? "active" : ""}`} onClick={() => toggleModel(m)}>
                      {ATTRIBUTION_MODEL_LABELS[m]}
                    </button>
                  ))}
                </div>
                {/* 6.1 — "New custom model" entry point removed (custom models not built). */}
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
