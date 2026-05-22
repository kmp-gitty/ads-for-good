"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { KPI as MOCK_KPI, type Kpi } from "./mockdata";

// Renders the strip directly under the topbar (Orders / Revenue / AOV /
// Journeys / % Identified). Wired pages pass live `kpis`; unwired pages omit
// the prop and fall through to the mock so the strip never blanks out.
// Hides the movement-delta badge when the user has selected "No comparison"
// from the top-bar Compare dropdown (?compare=none).
export function KpiStrip({ kpis }: { kpis?: Kpi[] }) {
  const sp = useSearchParams();
  const showDelta = (sp.get("compare") || "prior") !== "none";
  const data = kpis ?? MOCK_KPI;
  return (
    <div className="kpi-strip">
      {data.map((k, i) => {
        const arrow = k.move > 0 ? "↑" : k.move < 0 ? "↓" : "—";
        let cls: "good" | "bad" | "neutral" = "neutral";
        if (k.semantic === "up-good")   cls = k.move > 0 ? "good" : k.move < 0 ? "bad" : "neutral";
        if (k.semantic === "down-good") cls = k.move < 0 ? "good" : k.move > 0 ? "bad" : "neutral";
        if (k.semantic === "down-bad")  cls = k.move < 0 ? "bad"  : k.move > 0 ? "good" : "neutral";
        if (k.semantic === "neutral")   cls = "neutral";
        return (
          <div className="kpi-cell" key={i}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">
              {k.value}
              {showDelta && (
                <span className={`move ${cls}`} style={{ fontSize: 11 }}>
                  {arrow}{Math.abs(k.move).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
