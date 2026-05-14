"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Move } from "../../_components/Move";
import { Dropdown } from "../../_components/Dropdown";
import { PathRender, PathMode } from "../../_components/ChannelChip";
import { useChapter } from "../../_components/ChapterContext";
import { fmtNum, fmtMoney } from "../../_components/format";
import { TOP_COMBINATIONS, TopCombo } from "../../_components/mockdata";

export default function PathsPage() {
  const { client } = useChapter();
  const [mode, setMode] = useState<PathMode>("set");
  const [sortBy, setSortBy] = useState<"chapters" | "revenue" | "aov" | "movement">("chapters");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const sorted = useMemo(() => {
    const arr = [...TOP_COMBINATIONS];
    if (sortBy === "chapters") arr.sort((a, b) => b.chapters - a.chapters);
    if (sortBy === "revenue")  arr.sort((a, b) => b.revenue - a.revenue);
    if (sortBy === "aov")      arr.sort((a, b) => b.aov - a.aov);
    if (sortBy === "movement") arr.sort((a, b) => b.move - a.move);
    return arr;
  }, [sortBy]);

  const toggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const renderPath = (c: TopCombo) => {
    if (mode === "set") return <PathRender channels={c.channels} mode="set" />;
    if (mode === "collapsed") {
      const gaps = c.channels.map((_, i) =>
        i < c.channels.length - 1 ? Math.max(0, Math.floor(c.avgTouches / c.channels.length) - 1) : 0
      );
      return <PathRender channels={c.channels} mode="collapsed" gaps={gaps} />;
    }
    const raw: TopCombo["channels"] = [];
    c.channels.forEach((ch, i) => { raw.push(ch); if (i < c.channels.length - 1) raw.push(ch); });
    return <PathRender channels={raw} mode="raw" />;
  };

  return (
    <>
      <TopBar
        title="Path Patterns"
        subtitle={`The actual shapes of converting customer paths · ${client.name}`}
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
              <div style={{ fontSize: 12, color: "var(--ink-3)", maxWidth: 340 }}>
                {mode === "set" && "Order-independent combinations. Easiest to digest."}
                {mode === "collapsed" && "Sequence preserved, gaps shown as step counts."}
                {mode === "raw" && "Full event sequence as it occurred."}
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
                    {[["chapters", "Chapter count"], ["revenue", "Revenue"], ["aov", "AOV"], ["movement", "Largest movers"]].map(([k, l]) => (
                      <button key={k} className={`dd-item ${sortBy === k ? "active" : ""}`} onClick={() => { setSortBy(k as any); close(); }}>
                        <span>{l}</span>{sortBy === k && <span className="check"><Icon name="check" size={14}/></span>}
                      </button>
                    ))}
                  </>
                )}
              </Dropdown>
              <button
                className={`toolbar-btn ${compareIds.length >= 2 ? "primary" : ""}`}
                disabled={compareIds.length < 2}
                style={{ opacity: compareIds.length < 2 ? 0.5 : 1, cursor: compareIds.length < 2 ? "not-allowed" : "pointer" }}
              >
                <Icon name="compare" size={13}/> Compare {compareIds.length ? `(${compareIds.length})` : ""}
              </button>
              {compareIds.length > 0 && (
                <button className="toolbar-btn compact" onClick={() => setCompareIds([])} title="Clear selection"><Icon name="x" size={11}/></button>
              )}
            </div>
          </div>
        </div>

        <div className="card flush">
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>{mode === "set" ? "Combination" : mode === "collapsed" ? "Collapsed path" : "Raw path"}</th>
                <th className="num">Chapters</th>
                <th className="num">Revenue</th>
                <th className="num">AOV</th>
                <th className="num">Avg touches</th>
                <th className="num">Move vs. prior</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.id}>
                  <td onClick={(e) => { e.stopPropagation(); toggleCompare(c.id); }}>
                    <input type="checkbox" checked={compareIds.includes(c.id)} onChange={() => {}} style={{ accentColor: "var(--accent)" }} />
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {renderPath(c)}
                      {c.isNew && <span className="obs-tag new" style={{ fontSize: 9 }}>New</span>}
                    </div>
                  </td>
                  <td className="num">{fmtNum(c.chapters)}</td>
                  <td className="num">{fmtMoney(c.revenue)}</td>
                  <td className="num">${c.aov.toFixed(2)}</td>
                  <td className="num">{c.avgTouches.toFixed(1)}</td>
                  <td className="num"><Move value={c.move} semantic="up-good" /></td>
                  <td><Icon name="chevR" size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", padding: "8px 0" }}>
          Showing top 12 of 84 combinations · <a href="#" style={{ color: "var(--accent)" }}>View all combinations</a>
        </div>
      </div>
    </>
  );
}
