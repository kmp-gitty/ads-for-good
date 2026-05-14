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
  dist, showTooltip = false,
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
  const tipColor = (cls: Seg["cls"]) =>
    cls === "only" ? "var(--navy)"
    : cls === "open" ? "#6F86A8"
    : cls === "mid"  ? "#BFAE85"
    : "var(--accent)";
  return (
    <div className="role-bar-wrap" style={{ position: "relative" }}>
      <div className="role-bar">
        {segs.map(s => s.val > 0 ? (
          <div key={s.key}
               className={`seg ${s.cls}`}
               style={{ width: s.val + "%" }}
               onMouseEnter={() => showTooltip && setHover(s)}
               onMouseLeave={() => showTooltip && setHover(null)}
               title={`${s.label}: ${s.val}%`}>
          </div>
        ) : null)}
      </div>
      {showTooltip && hover && (
        <div className="role-tip" style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }}>
          <div className="role-tip-row">
            <span className="sw" style={{ background: tipColor(hover.cls) }}></span>
            <strong>{hover.label}</strong>
            <span className="role-tip-val">{hover.val}%</span>
          </div>
          <div className="role-tip-desc">{hover.desc}</div>
        </div>
      )}
    </div>
  );
}
