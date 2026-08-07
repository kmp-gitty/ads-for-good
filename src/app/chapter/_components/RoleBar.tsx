"use client";

// Role distribution bar with hover tooltip (ported from primitives.jsx).

import React, { useState } from "react";

type Seg = {
  key: "only" | "open" | "mid" | "close";
  label: string;
  val: number;
  cls: "only" | "open" | "mid" | "close";
  desc: string;
};

export function RoleBar({
  dist, showTooltip = true,
}: {
  dist: { only: number; open: number; mid: number; close: number };
  showTooltip?: boolean;
}) {
  const [hover, setHover] = useState<Seg | null>(null);
  const segs: Seg[] = [
    { key: "only",  label: "Only-touch", val: dist.only,  cls: "only",  desc: "Sole channel in the converting chapter" },
    { key: "open",  label: "Opener",     val: dist.open,  cls: "open",  desc: "First touch in the converting chapter" },
    { key: "mid",   label: "Mid",        val: dist.mid,   cls: "mid",   desc: "Assisting touch between first and close" },
    { key: "close", label: "Closer",     val: dist.close, cls: "close", desc: "Last touch before conversion" },
  ];
  // No native `title` — its ~1s browser delay is what made the tooltip feel slow.
  // The custom .role-tip renders instantly on mouseenter (React state), styled as a
  // Chapter callout (orange fill, white text).
  //
  // Position the tooltip over the CENTER of the hovered segment (not the bar
  // center) so the callout points at the part you're actually on. Segment vals
  // sum to 100, so each center = (sum of prior widths) + val/2. Clamp so the
  // nowrap callout doesn't spill off the bar ends at extreme segments.
  const centerByKey: Record<string, number> = {};
  {
    let acc = 0;
    for (const s of segs) { if (s.val > 0) { centerByKey[s.key] = acc + s.val / 2; acc += s.val; } }
  }
  const centerPct = hover ? Math.max(12, Math.min(88, centerByKey[hover.key] ?? 50)) : 50;
  return (
    <div className="role-bar-wrap" style={{ position: "relative" }}>
      <div className="role-bar">
        {segs.map(s => s.val > 0 ? (
          <div key={s.key}
               className={`seg ${s.cls}`}
               style={{ width: s.val + "%" }}
               onMouseEnter={() => showTooltip && setHover(s)}
               onMouseLeave={() => showTooltip && setHover(null)}>
          </div>
        ) : null)}
      </div>
      {showTooltip && hover && (
        <div className="role-tip" style={{ position: "absolute", bottom: "calc(100% + 8px)", left: `${centerPct}%`, transform: "translateX(-50%)" }}>
          <div className="role-tip-row">
            <strong>{hover.label}</strong>
            <span className="role-tip-val">{hover.val}%</span>
          </div>
          <div className="role-tip-desc">{hover.desc}</div>
        </div>
      )}
    </div>
  );
}
