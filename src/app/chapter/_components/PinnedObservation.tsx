"use client";

import React, { useState } from "react";
import { Icon } from "./Icon";
import { useChapter } from "./ChapterContext";

export function PinnedObservation() {
  const { pinnedObs, pinObservation } = useChapter();
  const [min, setMin] = useState(false);
  if (!pinnedObs) return null;

  const sevColor =
    pinnedObs.severity === "high" ? "var(--sev-high)"
    : pinnedObs.severity === "med" ? "var(--sev-med)" : "var(--sev-low)";

  return (
    <div className={`pinned-obs ${min ? "min" : ""}`}>
      <div className="pinned-head">
        <div className="pinned-kicker">
          <span className="pinned-dot" style={{ background: sevColor }}></span>
          From observation · {pinnedObs.category}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="pinned-btn" onClick={() => setMin(m => !m)} title={min ? "Expand" : "Minimize"}>
            <Icon name="chev" size={12} />
          </button>
          <button className="pinned-btn" onClick={() => pinObservation(null)} title="Dismiss"><Icon name="x" size={12}/></button>
        </div>
      </div>
      {!min && (
        <>
          <div className="pinned-headline">{pinnedObs.headline}</div>
          {pinnedObs.data && (
            <div className="pinned-data">
              {pinnedObs.data.slice(0, 3).map((d, i) => (
                <div key={i}>
                  <div className="pinned-d-label">{d.label}</div>
                  <div className="pinned-d-val">{d.value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="pinned-action">
            <div className="pinned-action-kicker">
              {pinnedObs.actionType === "mechanical" ? "Suggested next step"
              : pinnedObs.actionType === "analytical" ? "Worth investigating"
              : "Suggested investigation"}
            </div>
            {pinnedObs.action}
          </div>
        </>
      )}
    </div>
  );
}
