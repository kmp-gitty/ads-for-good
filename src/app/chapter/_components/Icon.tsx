// Inline SVG icon set (ported from primitives.jsx).

import React from "react";

export type IconName =
  | "overview" | "channels" | "paths" | "attribution" | "observations"
  | "journeys" | "raw" | "calendar" | "compare" | "chev" | "chevR" | "chevL"
  | "check" | "x" | "search" | "arrowUp" | "arrowDown" | "filter" | "plus"
  | "receipt" | "settings" | "info" | "sparkle" | "history" | "target"
  | "chart" | "cohort" | "lock" | "lift" | "influence" | "lagged";

const PATHS: Record<IconName, React.ReactNode> = {
  overview:   (<><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></>),
  channels:   (<><rect x="3" y="9" width="4" height="12" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/><rect x="17" y="13" width="4" height="8" rx="1"/></>),
  paths:      (<><circle cx="5" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h3M14 12l3-4M14 12l3 4"/></>),
  attribution:(<><path d="M3 21h18"/><path d="M6 21V10M12 21V4M18 21v-7"/></>),
  observations:(<><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/><circle cx="12" cy="12" r="4"/></>),
  journeys:   (<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>),
  raw:        (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>),
  calendar:   (<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>),
  compare:    (<><path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M12 4v16"/></>),
  chev:       <path d="m6 9 6 6 6-6"/>,
  chevR:      <path d="m9 18 6-6-6-6"/>,
  chevL:      <path d="m15 18-6-6 6-6"/>,
  check:      <path d="M20 6 9 17l-5-5"/>,
  x:          (<><path d="M18 6 6 18M6 6l12 12"/></>),
  search:     (<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>),
  arrowUp:    (<><path d="M12 19V5M5 12l7-7 7 7"/></>),
  arrowDown:  (<><path d="M12 5v14M5 12l7 7 7-7"/></>),
  filter:     <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>,
  plus:       (<><path d="M12 5v14M5 12h14"/></>),
  receipt:    (<><path d="M14 2H6a2 2 0 0 0-2 2v18l4-2 4 2 4-2 4 2V8z"/><path d="M16 2v6h6M8 12h8M8 16h6"/></>),
  settings:   (<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>),
  info:       (<><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>),
  sparkle:    <path d="M12 3l1.9 4.6L19 9l-4 3.8L16 18l-4-2.4L8 18l1-5.2L5 9l5.1-1.4L12 3z"/>,
  history:    (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  target:     (<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>),
  chart:      (<><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/></>),
  cohort:     (<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 21c0-3 2.5-6 6-6s6 3 6 6"/><path d="M14 17c1-1.5 2-2 3-2s2.5.5 3 2"/></>),
  lock:       (<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>),
  lift:       (<><rect x="3" y="14" width="6" height="7" rx="1"/><rect x="15" y="8" width="6" height="13" rx="1"/><path d="M9 11l3-4 3 4"/></>),
  influence:  (<><circle cx="12" cy="12" r="2"/><circle cx="4" cy="4" r="2"/><circle cx="20" cy="4" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/><path d="M10.5 10.5L5.5 5.5M13.5 10.5l5-5M10.5 13.5l-5 5M13.5 13.5l5 5"/></>),
  lagged:     (<><circle cx="10" cy="12" r="7"/><path d="M10 8v4l3 2"/><path d="M19 12h3M20 9l3 3-3 3"/></>),
};

export function Icon({ name, size = 16, stroke = 2 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name] ?? null}
    </svg>
  );
}
