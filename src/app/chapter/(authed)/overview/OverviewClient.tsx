"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Move, Lcm } from "../../_components/Move";
import { RoleBar } from "../../_components/RoleBar";
import { Dropdown } from "../../_components/Dropdown";
import { PathRender } from "../../_components/ChannelChip";
import { useChapter } from "../../_components/ChapterContext";
import { fmtMoney, fmtMoneyK, fmtNum } from "../../_components/format";
import {
  CHANNELS, OBSERVATIONS, type ChannelKey, type Kpi,
} from "../../_components/mockdata";
import type {
  LifecycleOverviewRow, PathLengthTrendRow,
  ChannelRoleRow, PathCombinationRow, PathMode,
} from "../../_lib/dashboard-rpc";
import type { TrendWindow } from "./page";

const CHANNEL_FALLBACK = { name: "Unknown", color: "#9CA0A8", short: "—" };

type Props = {
  lifecycle:      LifecycleOverviewRow | null;
  lifecyclePrior: LifecycleOverviewRow | null;
  trends:         Record<TrendWindow, PathLengthTrendRow[]>;
  channels:       ChannelRoleRow[];
  combos:         { set: PathCombinationRow[]; collapsed: PathCombinationRow[]; raw: PathCombinationRow[] };
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

function pctDeltaN(c: number | null | undefined, p: number | null | undefined): number | null {
  if (c == null || p == null) return null;
  const cN = Number(c), pN = Number(p);
  if (!Number.isFinite(cN) || !Number.isFinite(pN) || pN === 0) return null;
  return ((cN - pN) / pN) * 100;
}

// Absolute percentage-point delta (for %-typed metrics like multi_touch_pct).
function ppDelta(c: number | null | undefined, p: number | null | undefined): number | null {
  if (c == null || p == null) return null;
  const cN = Number(c), pN = Number(p);
  if (!Number.isFinite(cN) || !Number.isFinite(pN)) return null;
  return cN - pN;
}

// Short date label for a bucket. Uses "MMM D" (e.g. "May 6") for windows up
// to a year. en-US is intentional to keep label width predictable.
function fmtBucketLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PathLengthChart({ data }: { data: PathLengthTrendRow[] }) {
  if (data.length === 0) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-3)" }}>No trend data in window.</div>;
  }
  const w = 720, h = 200, pad = { l: 32, r: 16, t: 14, b: 28 };
  const points = data.map((d, i) => ({
    i,
    bucket_start: d.bucket_start,
    median: Number(d.median_touches ?? NaN),
    avg:    Number(d.avg_touches    ?? NaN),
    p90:    Number(d.p90_touches    ?? NaN),
  }));
  const validMedian = points.filter(p => Number.isFinite(p.median));
  const validAvg    = points.filter(p => Number.isFinite(p.avg));
  const validP90    = points.filter(p => Number.isFinite(p.p90));
  if (validMedian.length === 0) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-3)" }}>No buckets with chapter data — try a different range.</div>;
  }
  const allVals = [
    ...validMedian.map(p => p.median),
    ...validAvg.map(p => p.avg),
    ...validP90.map(p => p.p90),
  ];
  const yMaxRaw = Math.max(...allVals);
  const yMinRaw = Math.min(...allVals);
  const yMax = Math.ceil((yMaxRaw + 2) / 5) * 5;
  const yMin = Math.max(0, Math.floor(yMinRaw / 5) * 5);
  const xs = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(points.length - 1, 1);
  const ys = (v: number) => pad.t + ((yMax - v) / (yMax - yMin || 1)) * (h - pad.t - pad.b);

  const medianD = validMedian.map((p, i) => `${i === 0 ? "M" : "L"} ${xs(p.i)} ${ys(p.median)}`).join(" ");
  const avgD    = validAvg.map((p, i)    => `${i === 0 ? "M" : "L"} ${xs(p.i)} ${ys(p.avg)}`).join(" ");
  const p90D    = validP90.map((p, i)    => `${i === 0 ? "M" : "L"} ${xs(p.i)} ${ys(p.p90)}`).join(" ");

  const firstX = xs(validMedian[0].i);
  const lastX  = xs(validMedian[validMedian.length - 1].i);
  const areaD  = `${medianD} L ${lastX} ${ys(yMin)} L ${firstX} ${ys(yMin)} Z`;

  const tickStep = Math.max(2, Math.ceil((yMax - yMin) / 5));
  const ticks: number[] = [];
  for (let t = yMin; t <= yMax; t += tickStep) ticks.push(t);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {ticks.map(g => (
        <g key={g}>
          <line className="grid" x1={pad.l} x2={w - pad.r} y1={ys(g)} y2={ys(g)} />
          <text className="ticks" x={pad.l - 6} y={ys(g) + 3} textAnchor="end">{g}</text>
        </g>
      ))}
      <path className="area" d={areaD} />
      {/* Median = solid accent orange */}
      <path className="line" d={medianD} />
      {/* Average = dashed steel blue — clearly different hue from median */}
      <path d={avgD} stroke="#2D7AC9" strokeWidth="1.75" strokeDasharray="6 3" fill="none" />
      {/* 90% Max = dotted violet — third distinct hue */}
      <path d={p90D} stroke="#8E5DA8" strokeWidth="1.5" strokeDasharray="2 3" fill="none" />
      {validMedian.map(p => (
        <circle key={"d" + p.i} className="dot" cx={xs(p.i)} cy={ys(p.median)} r="3" />
      ))}
      {/* Real bucket start dates instead of "W1, W3, ..." labels. Show every
          other bucket to keep room (12 buckets → 6 labels). Anchor the first
          and last to the edges so the window's true bounds are always visible. */}
      {points.map((p, i) => {
        const isFirst = i === 0;
        const isLast  = i === points.length - 1;
        const showEveryOther = i % 2 === 0;
        if (!isFirst && !isLast && !showEveryOther) return null;
        const anchor: "start" | "middle" | "end" = isFirst ? "start" : isLast ? "end" : "middle";
        return (
          <text key={"x" + i} className="ticks" x={xs(p.i)} y={h - pad.b + 16} textAnchor={anchor}>
            {fmtBucketLabel(p.bucket_start)}
          </text>
        );
      })}
    </svg>
  );
}

function ChartLegend() {
  return (
    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--ink-3)", padding: "8px 4px 0", flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 18, height: 2, background: "var(--accent)", display: "inline-block" }} />
        <strong style={{ color: "var(--accent)" }}>Median</strong><span style={{ color: "var(--ink-3)" }}>: typical length</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 18, height: 0, borderTop: "1.75px dashed #2D7AC9", display: "inline-block" }} />
        <strong style={{ color: "#2D7AC9" }}>Average</strong><span style={{ color: "var(--ink-3)" }}>: includes outliers</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 18, height: 0, borderTop: "1.5px dotted #8E5DA8", display: "inline-block" }} />
        <strong style={{ color: "#8E5DA8" }}>90% Max</strong><span style={{ color: "var(--ink-3)" }}>: 90% fall below</span>
      </span>
    </div>
  );
}

// One vertical Lcm-style stat block. Used inside the Returning Purchasers
// card to stack all-time + in-window stats with the same visual cadence as
// the other Lcm cards in the row.
function LcmStat({
  label, value, unit, move, foot,
}: { label: string; value: string; unit: string; move: number; foot: string }) {
  const cls: "good" | "bad" | "neutral" = "neutral"; // returning has no inherent up=good direction
  const arrow = move > 0 ? "↑" : move < 0 ? "↓" : "—";
  return (
    <>
      <div className="lcm-label">{label}</div>
      <div className="lcm-value">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      <div className={`lcm-move ${cls}`}>{arrow} {Math.abs(move).toFixed(1)}% vs. prior</div>
      <div className="lcm-foot">{foot}</div>
    </>
  );
}

export default function OverviewClient({
  lifecycle, lifecyclePrior, trends,
  channels, combos,
  summary, journey, engagement,
  priorSummary, priorJourney, priorEngagement,
  clientKey: _clientKey, range,
}: Props) {
  const { client } = useChapter();
  const sp = useSearchParams();
  const showDelta = (sp.get("compare") || "prior") !== "none";
  void priorEngagement; void engagement;

  // Mode picker for the "Top converting channel combinations" tile.
  // Default to set-based (most digestible); user can switch to collapsed (first
  // + N steps + last) or raw (exact sequence) to drill deeper. Same data shape
  // as the Paths page's matching toggle.
  const [comboMode, setComboMode] = useState<PathMode>("set");
  const comboModeLabel: Record<PathMode, string> = { set: "Set-based", collapsed: "Collapsed", raw: "Raw path" };

  // Per-tile time-range picker for the Path length trend tile. Defaults to
  // 12w (matches the prior fixed window). All 4 windows are pre-fetched
  // server-side, so toggling is instant with no network.
  const [trendWindow, setTrendWindow] = useState<TrendWindow>("12w");
  const trendWindowLabel: Record<TrendWindow, string> = {
    "4w":  "4 weeks",
    "12w": "12 weeks",
    "26w": "26 weeks",
    "52w": "52 weeks",
  };
  const trend = trends[trendWindow];

  // ── Lifecycle hero data
  const medianTouches  = lifecycle?.median_touches       != null ? Number(lifecycle.median_touches).toFixed(1) : "—";
  const medianDays     = lifecycle?.median_days_to_close != null ? Number(lifecycle.median_days_to_close).toFixed(1) : "—";
  const p90Days        = lifecycle?.p90_days_to_close    != null ? Number(lifecycle.p90_days_to_close).toFixed(0)    : "—";
  const multiTouchPct  = lifecycle?.multi_touch_pct      != null ? Number(lifecycle.multi_touch_pct).toFixed(0) + "%" : "—";

  // Movements for the LIFECYCLE_METRICS row
  const moveTouches            = pctDeltaN(lifecycle?.median_touches,             lifecyclePrior?.median_touches);
  const moveDays               = pctDeltaN(lifecycle?.median_days_to_close,       lifecyclePrior?.median_days_to_close);
  const moveMultiTouch         =  ppDelta(lifecycle?.multi_touch_pct,              lifecyclePrior?.multi_touch_pct);
  const moveReturningAllTime   =  ppDelta(lifecycle?.returning_pct,                lifecyclePrior?.returning_pct);
  const moveReturningInWindow  =  ppDelta(lifecycle?.in_window_returning_pct,      lifecyclePrior?.in_window_returning_pct);
  const moveIdRate             =   ppDelta(
    journey?.pct_identified != null ? Number(journey.pct_identified) * 100 : null,
    priorJourney?.pct_identified != null ? Number(priorJourney.pct_identified) * 100 : null,
  );

  const lcmMetrics = [
    {
      label: "Median touches to close",
      value: lifecycle?.median_touches != null ? Number(lifecycle.median_touches).toFixed(1) : "—",
      unit: " touches",
      move: moveTouches ?? 0,
      good: false, // shorter paths = better
      foot: `across ${lifecycle?.total_chapters ?? 0} closed chapters`,
    },
    {
      label: "Median time to close",
      value: lifecycle?.median_days_to_close != null ? Number(lifecycle.median_days_to_close).toFixed(1) : "—",
      unit: " days",
      move: moveDays ?? 0,
      good: false, // shorter = better
      foot: `90% Max = ${p90Days} days`,
    },
    {
      label: "Multi-touch share",
      value: lifecycle?.multi_touch_pct != null ? Number(lifecycle.multi_touch_pct).toFixed(0) : "—",
      unit: "%",
      move: moveMultiTouch ?? 0,
      good: true,
      foot: "of converting chapters",
    },
    {
      label: "Identification rate",
      value: journey?.pct_identified != null ? (Number(journey.pct_identified) * 100).toFixed(1) : "—",
      unit: "%",
      move: moveIdRate ?? 0,
      good: true,
      foot: "of non-bot journeys",
    },
  ];

  // Dual-stat block for the Returning Purchasers card — all-time stacked on
  // top of in-window. Same Lcm visual layout for each sub-stat with a divider
  // between them. Two genuinely different retention signals (see RPC comments).
  const returningAllTimeValue   = lifecycle?.returning_pct           != null ? Number(lifecycle.returning_pct).toFixed(0)           : "—";
  const returningInWindowValue  = lifecycle?.in_window_returning_pct != null ? Number(lifecycle.in_window_returning_pct).toFixed(1) : "—";
  const firstTimePct            = lifecycle?.returning_pct           != null ? (100 - Number(lifecycle.returning_pct)).toFixed(0)   : null;
  const inWindowOnceOnly        = lifecycle?.in_window_returning_pct != null ? (100 - Number(lifecycle.in_window_returning_pct)).toFixed(0) : null;

  // ── KPI strip (shared)
  const ordersDisplay   = summary?.total_orders    != null ? fmtNum(Number(summary.total_orders))            : "—";
  const revenueDisplay  = summary?.total_revenue   != null ? fmtMoney(Number(summary.total_revenue))          : "—";
  const aovDisplay      = summary?.avg_order_value != null ? "$" + Number(summary.avg_order_value).toFixed(2) : "—";
  const journeysDisplay = journey?.total_journeys  != null ? fmtNum(Number(journey.total_journeys))           : "—";
  const identifiedPct   = journey?.pct_identified  != null ? (Number(journey.pct_identified) * 100).toFixed(1) + "%" : "—";
  const moveOrders     = pctDeltaN(summary?.total_orders,    priorSummary?.total_orders);
  const moveRevenue    = pctDeltaN(summary?.total_revenue,   priorSummary?.total_revenue);
  const moveAov        = pctDeltaN(summary?.avg_order_value, priorSummary?.avg_order_value);
  const moveJourneys   = pctDeltaN(journey?.total_journeys,  priorJourney?.total_journeys);
  const moveIdentified = pctDeltaN(journey?.pct_identified,  priorJourney?.pct_identified);
  const kpis: Kpi[] = [
    { label: "Orders",       value: ordersDisplay,    move: moveOrders     ?? 0, good: moveOrders     != null && moveOrders     >= 0, semantic: "up-good" },
    { label: "Revenue",      value: revenueDisplay,   move: moveRevenue    ?? 0, good: moveRevenue    != null && moveRevenue    >= 0, semantic: "up-good" },
    { label: "AOV",          value: aovDisplay,       move: moveAov        ?? 0, good: moveAov        != null && moveAov        >= 0, semantic: "up-good" },
    { label: "Journeys",     value: journeysDisplay,  move: moveJourneys   ?? 0, good: null, semantic: "neutral" },
    { label: "% Identified", value: identifiedPct,    move: moveIdentified ?? 0, good: moveIdentified != null && moveIdentified >= 0, semantic: "up-good" },
  ];

  // ── Top-5 channel roles preview
  const topChannels = [...channels]
    .sort((a, b) => Number(b.chapters ?? 0) - Number(a.chapters ?? 0))
    .slice(0, 5);

  // ── Top-5 combinations preview, ranked by revenue
  // Switches data source based on the comboMode picker (set / collapsed / raw)
  // Future: per-client customizable ranking — chapter count, AOV, etc.
  const topCombos = [...combos[comboMode]]
    .sort((a, b) => Number(b.revenue ?? 0) - Number(a.revenue ?? 0))
    .slice(0, 5);

  // Trend headline subtitle: compare first vs last bucket with data
  const validTrend = trend.filter(t => t.median_touches != null);
  const trendDelta = validTrend.length >= 2
    ? Number(validTrend[validTrend.length - 1].median_touches) - Number(validTrend[0].median_touches)
    : 0;
  const trendStartVal = validTrend.length >= 1 ? Number(validTrend[0].median_touches).toFixed(1) : null;
  const trendEndVal   = validTrend.length >= 1 ? Number(validTrend[validTrend.length - 1].median_touches).toFixed(1) : null;

  const isOverviewEmpty = lifecycle == null || lifecycle.total_chapters == null || Number(lifecycle.total_chapters) === 0;

  return (
    <>
      <TopBar
        title="Lifecycle Overview"
        subtitle={`How customers are closing right now · ${client.name}`}
        kpis={kpis}
      />
      <div className="content">
        <div className="lifecycle-hero">
          <div className="lifecycle-hero-eyebrow">Lifecycle Health · {range === "30d" ? "Last 30 days" : range}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32, position: "relative", flexWrap: "wrap", paddingBottom: 20 }}>
            <h2 style={{ marginBottom: 22, flex: "1 1 480px", minWidth: 0 }}>
              {isOverviewEmpty
                ? <>No closed chapters in this window. Try a longer date range.</>
                : <>Customers close in a <span className="num">median of {medianTouches} touches over {medianDays} days</span>, with <span className="num">{multiTouchPct}</span> of conversions involving more than one channel.</>}
            </h2>
            {/* All-time returning purchaser stat — promoted into the hero header
                area so the bottom metrics tile doesn't get vertically crowded. */}
            <div style={{ flex: "0 0 auto", minWidth: 200, padding: "2px 0 0 0" }}>
              <LcmStat
                label="All-time returning purchasers"
                value={returningAllTimeValue}
                unit="%"
                move={moveReturningAllTime ?? 0}
                foot={firstTimePct ? `vs. ${firstTimePct}% first-time` : ""}
              />
            </div>
          </div>
          <div className="lifecycle-metrics">
            {lcmMetrics.map((m, i) => <Lcm key={i} {...m} />)}
            <div className="lcm">
              <LcmStat
                label="Returning this window"
                value={returningInWindowValue}
                unit="%"
                move={moveReturningInWindow ?? 0}
                foot={inWindowOnceOnly ? `vs. ${inWindowOnceOnly}% bought once this window` : ""}
              />
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">
                  Path length trend
                  <span className="what" title="Touches to close per chapter, bucketed across the selected window. Median = typical chapter, Average = sum/count (pulled by outliers), 90% Max = 90% of chapters fall below this threshold.">?</span>
                </h3>
                <div className="card-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Dropdown align="left" width={160} trigger={
                    <button className="toolbar-btn compact" style={{ padding: "2px 8px", fontSize: 11 }}>
                      <span style={{ fontWeight: 600 }}>{trendWindowLabel[trendWindow]}</span>
                      <span className="chev"><Icon name="chev" size={10}/></span>
                    </button>
                  }>
                    {(close) => (
                      <>
                        <div className="dd-label">Window</div>
                        {(["4w", "12w", "26w", "52w"] as const).map(w => (
                          <button key={w} className={`dd-item ${trendWindow === w ? "active" : ""}`} onClick={() => { setTrendWindow(w); close(); }}>
                            <span>{trendWindowLabel[w]}</span>
                            {trendWindow === w && <span className="check"><Icon name="check" size={14}/></span>}
                          </button>
                        ))}
                      </>
                    )}
                  </Dropdown>
                  <span>· touches to close</span>
                </div>
              </div>
            </div>
            <PathLengthChart data={trend} />
            <ChartLegend />
            {trendStartVal && trendEndVal && (
              <div className="callout" style={{ marginTop: 14 }}>
                <span className="em">Median moved from {trendStartVal} → {trendEndVal} touches</span> over {trendWindowLabel[trendWindow]}{" "}
                {trendDelta > 0 ? "— a lengthening trend." : trendDelta < 0 ? "— a shortening trend." : "— roughly flat."}{" "}
                Worth investigating: are new audience sources producing longer paths, or has consideration cycle shifted?
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Chapter observations this week</h3>
                <div className="card-sub" style={{ color: "var(--ink-4)" }}>Mock preview — question-library engine not built yet</div>
              </div>
              <Link className="card-link" href="/chapter/observations">View all <Icon name="chevR" size={12}/></Link>
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
                <div className="card-sub">
                  Per-channel{" "}
                  <span style={{ color: "#1F2D43", fontWeight: 600 }}>solo</span>
                  {" / "}
                  <span style={{ color: "#6F86A8", fontWeight: 600 }}>opener</span>
                  {" / "}
                  <span style={{ color: "#BFAE85", fontWeight: 600 }}>mid</span>
                  {" / "}
                  <span style={{ color: "#E36410", fontWeight: 600 }}>closer</span>
                  {" distribution"}
                </div>
              </div>
              <Link className="card-link" href="/chapter/channels">View all channel roles <Icon name="chevR" size={12}/></Link>
            </div>
            <div className="row-list">
              {topChannels.map(r => {
                const ch = CHANNELS[r.channel as ChannelKey] ?? { ...CHANNEL_FALLBACK, name: r.channel };
                const dist = {
                  only:  Math.round(Number(r.only_pct   ?? 0)),
                  open:  Math.round(Number(r.opener_pct ?? 0)),
                  mid:   Math.round(Number(r.mid_pct    ?? 0)),
                  close: Math.round(Number(r.closer_pct ?? 0)),
                };
                const triad = [dist.open, dist.mid, dist.close];
                const max = Math.max(...triad), min = Math.min(...triad);
                const dom = dist.only >= 60 ? "Solo"
                          : (max - min <= 12) ? "Generalist"
                          : dist.close === max ? "Closer"
                          : dist.open === max ? "Opener" : "Middle";
                return (
                  <div key={r.channel} className="lrow" style={{ gridTemplateColumns: "200px 1fr auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ background: ch.color, width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", color: "white", fontSize: 10, fontWeight: 600 }}>{ch.short}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{ch.name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{dom}</div>
                      </div>
                    </div>
                    <div style={{ minWidth: 140 }}><RoleBar dist={dist} /></div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.presence_pct != null ? Number(r.presence_pct).toFixed(1) + "%" : "—"}</div>
                      <div className="muted" style={{ fontSize: 11 }}>presence</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Top converting channel combinations</h3>
                <div className="card-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Dropdown align="left" width={200} trigger={
                    <button className="toolbar-btn compact" style={{ padding: "2px 8px", fontSize: 11 }}>
                      <span style={{ fontWeight: 600 }}>{comboModeLabel[comboMode]}</span>
                      <span className="chev"><Icon name="chev" size={10}/></span>
                    </button>
                  }>
                    {(close) => (
                      <>
                        <div className="dd-label">Group by</div>
                        {(["set", "collapsed", "raw"] as const).map(m => (
                          <button key={m} className={`dd-item ${comboMode === m ? "active" : ""}`} onClick={() => { setComboMode(m); close(); }}>
                            <span>{comboModeLabel[m]}</span>
                            {comboMode === m && <span className="check"><Icon name="check" size={14}/></span>}
                          </button>
                        ))}
                      </>
                    )}
                  </Dropdown>
                  <span>· ranked by revenue</span>
                </div>
              </div>
              <Link className="card-link" href="/chapter/paths">View all path patterns <Icon name="chevR" size={12}/></Link>
            </div>
            <div className="row-list">
              <div className="lrow head" style={{ gridTemplateColumns: "1fr 70px 90px" }}>
                <div>Combination</div>
                <div style={{ textAlign: "right" }}>Chapters</div>
                <div style={{ textAlign: "right" }}>Revenue</div>
              </div>
              {topCombos.map((c, i) => (
                <Link href="/chapter/paths" key={i} className="lrow click" style={{ gridTemplateColumns: "1fr 70px 90px", textDecoration: "none", color: "inherit" }}>
                  <div>
                    <PathRender channels={c.channels as ChannelKey[]} mode={comboMode} gaps={c.gaps ?? undefined} />
                  </div>
                  <div className="lrow-num" style={{ textAlign: "right" }}>{fmtNum(Number(c.chapters ?? 0))}</div>
                  <div className="lrow-num" style={{ textAlign: "right" }}>{fmtMoneyK(Number(c.revenue ?? 0))}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {showDelta && lifecyclePrior == null && (
          <div className="callout" style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Prior-period comparison unavailable — the window before this one has no closed chapters.
          </div>
        )}
      </div>
    </>
  );
}
