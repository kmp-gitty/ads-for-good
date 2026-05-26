"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Move } from "../../_components/Move";
import { Dropdown } from "../../_components/Dropdown";
import { PathRender } from "../../_components/ChannelChip";
import { useChapter } from "../../_components/ChapterContext";
import { fmtMoney, fmtNum } from "../../_components/format";
import { type ChannelKey, type Kpi } from "../../_components/mockdata";
import type { PathCombinationRow, PathMode } from "../../_lib/dashboard-rpc";

type ModeBundle = {
  current: PathCombinationRow[];
  prior:   PathCombinationRow[];
};

type Props = {
  combos: { set: ModeBundle; collapsed: ModeBundle; raw: ModeBundle };
  summary: {
    total_orders:    number | null;
    total_revenue:   number | null;
    avg_order_value: number | null;
  } | null;
  journey: {
    total_journeys:      number | null;
    identified_journeys: number | null;
    pct_identified:      number | null;
  } | null;
  priorSummary: {
    total_orders:    number | null;
    total_revenue:   number | null;
    avg_order_value: number | null;
  } | null;
  priorJourney: {
    total_journeys:      number | null;
    identified_journeys: number | null;
    pct_identified:      number | null;
  } | null;
  clientKey: string;
  range: string;
};

type ComboRow = {
  id: string;
  channels: ChannelKey[];
  gaps: number[] | null;
  chapters: number;
  revenue: number;
  aov: number;
  avg_touches: number;
  move: number;
  isNew: boolean;
};

function pctDelta(c: number, p: number): number {
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return 0;
  return ((c - p) / p) * 100;
}
function pctDeltaN(c: number | null | undefined, p: number | null | undefined): number | null {
  if (c == null || p == null) return null;
  const cN = Number(c), pN = Number(p);
  if (!Number.isFinite(cN) || !Number.isFinite(pN) || pN === 0) return null;
  return ((cN - pN) / pN) * 100;
}

// Stable mode-specific id: includes channels AND gaps so that two rows with the
// same channel pair but different middle-step counts have different ids (and
// thus separate rows + independent compare-toggle state).
const rowId = (channels: string[], gaps: number[] | null): string =>
  channels.join("|") + "::" + (gaps?.join(",") ?? "");

export default function PathsClient({
  combos, summary, journey, priorSummary, priorJourney,
  clientKey: _clientKey, range: _range,
}: Props) {
  const { client } = useChapter();
  const sp = useSearchParams();
  const showDelta = (sp.get("compare") || "prior") !== "none";

  const [mode, setMode] = useState<PathMode>("set");
  const [sortBy, setSortBy] = useState<"chapters" | "revenue" | "aov" | "movement">("chapters");

  // Pick the bundle that matches selected mode (already pre-fetched server-side).
  const bundle = combos[mode];
  const priorHasData = bundle.prior.length > 0;

  // Build prior-lookup once per mode change
  const priorByKey = useMemo(() => {
    const m = new Map<string, PathCombinationRow>();
    for (const r of bundle.prior) m.set(rowId(r.channels, r.gaps ?? null), r);
    return m;
  }, [bundle.prior]);

  const rows: ComboRow[] = useMemo(() => bundle.current.map(c => {
    const id    = rowId(c.channels, c.gaps ?? null);
    const prior = priorByKey.get(id);
    const currentChapters = Number(c.chapters ?? 0);
    const priorChapters   = prior ? Number(prior.chapters ?? 0) : 0;
    return {
      id,
      channels:    c.channels as ChannelKey[],
      gaps:        c.gaps ?? null,
      chapters:    currentChapters,
      revenue:     Number(c.revenue     ?? 0),
      aov:         Number(c.aov         ?? 0),
      avg_touches: Number(c.avg_touches ?? 0),
      move:  prior ? pctDelta(currentChapters, priorChapters) : 0,
      isNew: priorHasData && (!prior || priorChapters === 0),
    };
  }), [bundle.current, priorByKey, priorHasData]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    if (sortBy === "chapters") arr.sort((a, b) => b.chapters - a.chapters);
    if (sortBy === "revenue")  arr.sort((a, b) => b.revenue  - a.revenue);
    if (sortBy === "aov")      arr.sort((a, b) => b.aov      - a.aov);
    if (sortBy === "movement") arr.sort((a, b) => b.move     - a.move);
    return arr;
  }, [rows, sortBy]);

  // Render the chips for a row using the mode-specific channels + gaps payload.
  const renderPath = (c: ComboRow) => (
    <PathRender channels={c.channels} mode={mode} gaps={c.gaps ?? undefined} />
  );

  // KPI strip — shared header pattern.
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

  const empty = sorted.length === 0;

  return (
    <>
      <TopBar
        title="Path Patterns"
        subtitle={`The actual shapes of converting customer paths · ${client.name}`}
        kpis={kpis}
      />
      <div className="content">
        <div className="card" style={{ padding: "18px 22px" }}>
          <div className="filter-bar" style={{ justifyContent: "space-between" }}>
            <div className="filter-bar">
              <div className="toggle-group">
                <button className={mode === "set" ? "active" : ""} onClick={() => setMode("set")}>Set-based</button>
                <button className={mode === "collapsed" ? "active" : ""} onClick={() => setMode("collapsed")}>Collapsed</button>
                <button className={mode === "raw" ? "active" : ""} onClick={() => setMode("raw")}>Raw path</button>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", maxWidth: 380 }}>
                {mode === "set" && "Order-independent. Channels in any order group together."}
                {mode === "collapsed" && "First touch → N middle steps → Last touch. Same first/last/step-count groups together."}
                {mode === "raw" && "Exact full sequence as it occurred. Every unique order is its own row."}
              </div>
            </div>
            <div className="filter-bar">
              <Dropdown align="right" width={200} trigger={
                <button className="toolbar-btn">
                  <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Sort by</span>
                  <span style={{ fontWeight: 500 }}>
                    {sortBy === "chapters" ? "Chapter count"
                    : sortBy === "revenue" ? "Revenue"
                    : sortBy === "aov" ? "AOV"
                    : "Movement"}
                  </span>
                  <span className="chev"><Icon name="chev" size={12}/></span>
                </button>
              }>
                {(close) => (
                  <>
                    {([["chapters", "Chapter count"], ["revenue", "Revenue"], ["aov", "AOV"], ["movement", "Largest movers"]] as const).map(([k, l]) => (
                      <button key={k} className={`dd-item ${sortBy === k ? "active" : ""}`} onClick={() => { setSortBy(k); close(); }}>
                        <span>{l}</span>{sortBy === k && <span className="check"><Icon name="check" size={14}/></span>}
                      </button>
                    ))}
                  </>
                )}
              </Dropdown>
            </div>
          </div>
        </div>

        {empty ? (
          <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
            No converting paths in this window. Try a longer date range.
          </div>
        ) : (
          <>
            <div className="card flush">
              <table className="t">
                <thead>
                  <tr>
                    <th>{mode === "set" ? "Combination" : mode === "collapsed" ? "Collapsed path" : "Raw path"}</th>
                    <th className="num">Chapters</th>
                    <th className="num">Revenue</th>
                    <th className="num">AOV</th>
                    <th className="num">Avg touches</th>
                    {showDelta && <th className="num">Move vs. prior</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {renderPath(c)}
                          {c.isNew && <span className="obs-tag new" style={{ fontSize: 9 }}>New</span>}
                        </div>
                      </td>
                      <td className="num">{fmtNum(c.chapters)}</td>
                      <td className="num">{fmtMoney(c.revenue)}</td>
                      <td className="num">${c.aov.toFixed(2)}</td>
                      <td className="num">{c.avg_touches.toFixed(1)}</td>
                      {showDelta && <td className="num"><Move value={c.move} semantic="up-good" /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", padding: "8px 0" }}>
              Showing all {sorted.length} {mode === "set" ? "combinations" : mode === "collapsed" ? "collapsed paths" : "raw paths"}
            </div>
          </>
        )}
      </div>
    </>
  );
}
