"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Move } from "../../_components/Move";
import { Dropdown } from "../../_components/Dropdown";
import { PathRender } from "../../_components/ChannelChip";
import { useChapter } from "../../_components/ChapterContext";
import { chapterUrl } from "../../_lib/urls";
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
  chaptersWithRevenue: number; // 5.3 — 0 means revenue not captured (render "—", not $0.00)
  revenue: number;
  aov: number;
  avg_touches: number;
  move: number | null;    // % vs prior; null when NEW or no usable comparison
  moveAbs: number | null; // absolute chapter delta vs prior (for tiny-base combos)
  smallBase: boolean;     // prior existed but too small for a % to be meaningful
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
  // 5.4 — a prior window that's empty OR near-empty (few combos / few chapters,
  // e.g. NSC's 485-of-487 (direct)) can't support a "NEW vs prior" claim: every
  // other combination looks new by accident. Only trust the prior for NEW/move
  // when it has real breadth.
  const priorTotalChapters = bundle.prior.reduce((s, r) => s + Number(r.chapters ?? 0), 0);
  const priorUsable = bundle.prior.length >= 3 && priorTotalChapters >= 30;

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
    const inPrior = !!prior && priorChapters > 0;
    // NEW only when the prior is usable AND this combo genuinely wasn't in it —
    // never NEW + a numeric move at the same time.
    const isNew = priorUsable && !inPrior;
    // Tiny prior base → a percentage is misleading ("2 → 50" is +2400%); show
    // the absolute chapter delta instead.
    const smallBase = inPrior && priorChapters < 10;
    return {
      id,
      channels:    c.channels as ChannelKey[],
      gaps:        c.gaps ?? null,
      chapters:    currentChapters,
      chaptersWithRevenue: Number(c.chapters_with_revenue ?? 0),
      revenue:     Number(c.revenue     ?? 0),
      aov:         Number(c.aov         ?? 0),
      avg_touches: Number(c.avg_touches ?? 0),
      move:     isNew || !inPrior || smallBase ? null : pctDelta(currentChapters, priorChapters),
      moveAbs:  inPrior ? currentChapters - priorChapters : null,
      smallBase,
      isNew,
    };
  }), [bundle.current, priorByKey, priorUsable]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    if (sortBy === "chapters") arr.sort((a, b) => b.chapters - a.chapters);
    if (sortBy === "revenue")  arr.sort((a, b) => b.revenue  - a.revenue);
    if (sortBy === "aov")      arr.sort((a, b) => b.aov      - a.aov);
    if (sortBy === "movement") arr.sort((a, b) => (b.move ?? -Infinity) - (a.move ?? -Infinity));
    return arr;
  }, [rows, sortBy]);

  // C3 — arriving from a Correlation card's "Its converting paths" deep-link
  // (?channel=<x>) narrows the table to combinations that contain that channel.
  // Pure client-side filter over data already loaded; the clear link drops the
  // param (preserving compare mode). channel vocab matches canonical_v1 paths so
  // an exact membership test is correct.
  const channelFilter = sp.get("channel");
  const compare = sp.get("compare") ?? undefined;
  const clearHref = chapterUrl(client.id, "paths", compare ? { compare } : undefined);
  const filtered = useMemo(
    () => channelFilter ? sorted.filter(r => (r.channels as string[]).includes(channelFilter)) : sorted,
    [sorted, channelFilter],
  );

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

  const empty = filtered.length === 0;

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
                {mode === "set" && "Order-independent. Channels in any order group together. Ex: Direct → Email & Email → Direct is the same."}
                {mode === "collapsed" && "First touch → N middle steps → Last touch. Same first/last/step-count groups together."}
                {mode === "raw" && "Exact full sequence as it occurred. Every unique order is its own row."}
              </div>
            </div>
            <div className="filter-bar">
              {channelFilter && (
                <Link href={clearHref} className="toolbar-btn" title="Clear channel filter"
                      style={{ textDecoration: "none", color: "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Containing</span>
                  <span style={{ fontWeight: 600 }}>{channelFilter.replace(/[()]/g, "")}</span>
                  <span style={{ fontSize: 13, lineHeight: 1 }}>&times;</span>
                </Link>
              )}
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
            {channelFilter
              ? <>No converting paths contain <strong>{channelFilter.replace(/[()]/g, "")}</strong> in this window. <Link href={clearHref} style={{ color: "var(--accent)" }}>Clear filter</Link></>
              : "No converting paths in this window. Try a longer date range."}
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
                    <th className="num">Avg visits</th>
                    {showDelta && <th className="num">Move vs. prior</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {renderPath(c)}
                          {c.isNew && <span className="obs-tag new" style={{ fontSize: 9 }}>New</span>}
                          {c.chapters < 5 && (
                            <span title={`Only ${c.chapters} chapter${c.chapters === 1 ? "" : "s"} — read with caution`}
                                  style={{ fontSize: 9, color: "var(--ink-3)", border: "1px solid var(--line-2)", borderRadius: 4, padding: "0 5px", whiteSpace: "nowrap" }}>
                              low sample
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num">{fmtNum(c.chapters)}</td>
                      {/* 5.3 — revenue not captured (e.g. bookings not yet paid) renders "—",
                          never $0.00; partial coverage flags valued-chapter share. */}
                      <td className="num">
                        {c.chaptersWithRevenue === 0
                          ? <span className="dim" title="Revenue not captured for these chapters (e.g. bookings not yet paid)">—</span>
                          : (
                            <>
                              {fmtMoney(c.revenue)}
                              {c.chaptersWithRevenue < c.chapters && (
                                <span title={`${c.chaptersWithRevenue} of ${c.chapters} chapters have captured revenue`}
                                      style={{ marginLeft: 5, fontSize: 9, color: "var(--ink-3)" }}>
                                  {c.chaptersWithRevenue}/{c.chapters}
                                </span>
                              )}
                            </>
                          )}
                      </td>
                      <td className="num">{c.chaptersWithRevenue === 0 ? <span className="dim">—</span> : `$${c.aov.toFixed(2)}`}</td>
                      <td className="num">{c.avg_touches.toFixed(1)}</td>
                      {showDelta && (
                        <td className="num">
                          {c.chapters < 5
                            ? <span className="dim">—</span>              /* low-sample: make no movement claim */
                            : c.smallBase && c.moveAbs != null && c.moveAbs !== 0
                              ? <span title="Small prior base — showing absolute chapter change" style={{ fontWeight: 600, color: "var(--ink-2)" }}>{c.moveAbs > 0 ? "+" : ""}{c.moveAbs}</span>
                              : c.move != null
                                ? <Move value={c.move} semantic="up-good" />
                                : <span className="dim">—</span>}
                        </td>
                      )}
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
