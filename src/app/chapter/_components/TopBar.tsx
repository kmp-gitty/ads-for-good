"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "./Icon";
import { Dropdown } from "./Dropdown";
import { useChapter } from "./ChapterContext";
import { KpiStrip } from "./KpiStrip";
import {
  DATE_RANGES, COMPARISONS,
  ATTRIBUTION_MODELS, ATTRIBUTION_MODEL_LABELS, AttributionModel,
} from "./mockdata";
import { fmtRangeSubtitle, rangeToWindow, compareWindow, fmtDateRange } from "./format";

export function TopBar({
  title, subtitle, showModel = false, showCompare = true,
}: {
  title: string;
  subtitle: React.ReactNode;
  showModel?: boolean;
  showCompare?: boolean;
}) {
  const { dateRange, setDateRange, compare, setCompare, model, setModel, setSidebarOpen } = useChapter();

  // Read the URL codes directly to compute date subtitles (avoids re-mapping
  // labels back to codes). These hooks update on every URL change → subtitles
  // re-render alongside the pill values.
  const sp = useSearchParams();
  const rangeCode = sp.get("range") || "30d";
  const compareCode = sp.get("compare") || "prior";
  const rangeSubtitle = fmtRangeSubtitle(rangeCode);
  const compareSub = (() => {
    const w = compareWindow(rangeCode, compareCode);
    return w ? fmtDateRange(w) : null;
  })();
  void rangeToWindow; // imported for downstream tile consumers; quiet the linter

  return (
    <div className="topbar">
      <div className="topbar-row">
        {/* Hamburger — mobile only (CSS-hidden on desktop). */}
        <button
          type="button"
          className="topbar-hamburger"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
        >
          <span /><span /><span />
        </button>
        <div className="topbar-title">
          <h1>{title}</h1>
          <div className="sub">{subtitle}</div>
        </div>
        <div className="spacer"></div>

        {showModel && (
          <Dropdown align="right" width={260} trigger={
            <button className="toolbar-btn">
              <span style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Model</span>
              <span style={{ fontWeight: 600 }}>{ATTRIBUTION_MODEL_LABELS[model]}</span>
              <span className="chev"><Icon name="chev" size={12}/></span>
            </button>
          }>
            {(close) => (
              <>
                <div className="dd-label">Attribution model</div>
                {ATTRIBUTION_MODELS.map((m: AttributionModel) => (
                  <button key={m} className={`dd-item ${m === model ? "active" : ""}`} onClick={() => { setModel(m); close(); }}>
                    <span>{ATTRIBUTION_MODEL_LABELS[m]}</span>
                    {m === model && <span className="check"><Icon name="check" size={14}/></span>}
                  </button>
                ))}
                <div className="dd-divider"></div>
                <div className="dd-label">Custom</div>
                <button className={`dd-item ${model === "custom" ? "active" : ""}`} onClick={() => { setModel("custom"); close(); }}>
                  <span>
                    J-Shape (40/20/40)
                    <span className="dim" style={{ marginLeft: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em" }}>custom</span>
                  </span>
                  {model === "custom" && <span className="check"><Icon name="check" size={14}/></span>}
                </button>
              </>
            )}
          </Dropdown>
        )}

        <div className="topbar-dd-with-sub">
          <Dropdown align="right" width={220} trigger={
            <button className="toolbar-btn">
              <Icon name="calendar" size={13}/>
              <span>{dateRange}</span>
              <span className="chev"><Icon name="chev" size={12}/></span>
            </button>
          }>
            {(close) => (
              <>
                <div className="dd-label">Date range</div>
                {DATE_RANGES.map(r => (
                  <button key={r} className={`dd-item ${r === dateRange ? "active" : ""}`} onClick={() => { setDateRange(r); close(); }}>
                    <span>{r}</span>
                    {r === dateRange && <span className="check"><Icon name="check" size={14}/></span>}
                  </button>
                ))}
              </>
            )}
          </Dropdown>
          <div className="topbar-dd-sub">{rangeSubtitle}</div>
        </div>

        {showCompare && (
          <div className="topbar-dd-with-sub">
            <Dropdown align="right" width={260} trigger={
              <button className="toolbar-btn" title="Comparison">
                <Icon name="compare" size={13}/>
                <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {compare === "Compare to prior period" ? "vs. prior period"
                  : compare === "Compare to same period last year" ? "vs. last year"
                  : "No comparison"}
                </span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  <div className="dd-label">Compare</div>
                  {COMPARISONS.map(c => (
                    <button key={c} className={`dd-item ${c === compare ? "active" : ""}`} onClick={() => { setCompare(c); close(); }}>
                      <span>{c}</span>
                      {c === compare && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                  {compareSub && (
                    <>
                      <div className="dd-divider"></div>
                      <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--ink-3)" }}>
                        Compared to: {compareSub}
                      </div>
                    </>
                  )}
                </>
              )}
            </Dropdown>
            <div className="topbar-dd-sub">{compareSub ?? "—"}</div>
          </div>
        )}
      </div>

      <KpiStrip />
    </div>
  );
}
