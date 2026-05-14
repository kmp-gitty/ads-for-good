// Movement chip (↑/↓ with semantic color).

import React from "react";

export type MoveSemantic = "up-good" | "down-good" | "up-bad" | "down-bad" | "auto";

export function Move({
  value, semantic = "auto", forceColor,
}: {
  value: number | null | undefined;
  semantic?: MoveSemantic;
  forceColor?: "good" | "bad" | "neutral";
}) {
  if (value === null || value === undefined) return null;
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "—";
  const abs = Math.abs(value);
  let cls: "good" | "bad" | "neutral" = "neutral";
  if (forceColor) cls = forceColor;
  else if (semantic === "up-good")   cls = value > 0 ? "good" : value < 0 ? "bad" : "neutral";
  else if (semantic === "down-good") cls = value < 0 ? "good" : value > 0 ? "bad" : "neutral";
  else if (semantic === "up-bad")    cls = value > 0 ? "bad"  : value < 0 ? "good" : "neutral";
  else if (semantic === "down-bad")  cls = value < 0 ? "bad"  : value > 0 ? "good" : "neutral";
  return (
    <span className={`move ${cls}`}>
      <span className="arrow">{arrow}</span>
      {abs.toFixed(Number.isInteger(abs) ? 0 : 1)}%
    </span>
  );
}

// Lifecycle hero metric tile (the big numbers in the navy panel).
export function Lcm({
  label, value, unit, move, good, foot,
}: {
  label: string; value: string; unit: string;
  move: number; good: boolean | null; foot: string;
}) {
  let cls: "good" | "bad" | "neutral" = "neutral";
  if (good === true)  cls = move > 0 ? "good" : move < 0 ? "bad" : "neutral";
  if (good === false) cls = move > 0 ? "bad"  : move < 0 ? "good" : "neutral";
  const arrow = move > 0 ? "↑" : move < 0 ? "↓" : "—";
  return (
    <div className="lcm">
      <div className="lcm-label">{label}</div>
      <div className="lcm-value">
        {value}
        {unit ? <span className="unit">{unit === "%" ? "%" : unit}</span> : null}
      </div>
      <div className={`lcm-move ${cls}`}>{arrow} {Math.abs(move).toFixed(1)}% vs. prior</div>
      <div className="lcm-foot">{foot}</div>
    </div>
  );
}
