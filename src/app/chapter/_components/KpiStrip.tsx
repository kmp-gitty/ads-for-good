import React from "react";
import { KPI } from "./mockdata";

export function KpiStrip() {
  return (
    <div className="kpi-strip">
      {KPI.map((k, i) => {
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
              <span className={`move ${cls}`} style={{ fontSize: 11 }}>
                {arrow}{Math.abs(k.move).toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
