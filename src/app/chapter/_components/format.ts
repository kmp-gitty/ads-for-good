// Format helpers (ported from primitives.jsx).

export const fmtMoney = (n: number): string => "$" + Math.round(n).toLocaleString();

export const fmtMoneyK = (n: number): string =>
  "$" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : Math.round(n).toLocaleString());

export const fmtNum = (n: number): string => n.toLocaleString();

// ---------------------------------------------------------------------------
// Date range helpers — shared by the dashboard's TopBar UI and the server-
// component data fetchers. Single source of truth for what "Last 30 days"
// actually means in dates.
// ---------------------------------------------------------------------------

export type DateWindow = { start: Date; end: Date };

// Timezone we anchor "today" to when resolving date codes. Matches Shopify
// shop-tz convention so dashboard windows align with what merchants see in
// Shopify Analytics. Hardcoded to PT for now (EOS / Projectagram both view
// from PT). Per-client display tz should move into chapter_config when we
// onboard a client in a different region.
const DISPLAY_TZ = "America/Los_Angeles";

/** Returns midnight (UTC instant) of "today" as seen in DISPLAY_TZ. */
function todayMidnightInDisplayTz(now: Date): Date {
  // Format the current instant as a YYYY-MM-DD calendar date in DISPLAY_TZ,
  // then re-parse as UTC midnight. This gives us "the UTC instant that
  // corresponds to 00:00 on today's calendar date" — which is what calendar
  // analytics platforms use as the boundary.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const [y, m, d] = fmt.format(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Resolve a URL range code into a [start, end] window.
 *  "Nd" codes match Shopify's "Last N days" convention: today + N prior days
 *  (a 31-day window for N=30 because today is inclusive). "Today" is anchored
 *  to DISPLAY_TZ so the window matches what merchants see in shop analytics.
 *  `all` returns start=epoch — caller decides whether to apply a floor. */
export function rangeToWindow(code: string, now: Date = new Date()): DateWindow {
  const end = new Date(now);
  const todayMidnight = todayMidnightInDisplayTz(now);
  const start = new Date(todayMidnight);
  const m = code.match(/^(\d+)d$/);
  if (m) {
    start.setUTCDate(start.getUTCDate() - parseInt(m[1], 10));
  } else if (code === "all") {
    start.setTime(0); // 1970 — effectively "all time"
  } else if (code === "mtd") {
    start.setUTCDate(1);
  } else if (code === "ytd") {
    start.setUTCMonth(0); start.setUTCDate(1);
  } else if (code === "qtd") {
    const q = Math.floor(start.getUTCMonth() / 3);
    start.setUTCMonth(q * 3); start.setUTCDate(1);
  } else if (code === "last-month") {
    start.setUTCMonth(start.getUTCMonth() - 1); start.setUTCDate(1);
    end.setTime(todayMidnight.getTime());
    end.setUTCDate(1);
  } else if (code === "last-quarter") {
    const q = Math.floor(start.getUTCMonth() / 3);
    start.setUTCMonth((q - 1) * 3); start.setUTCDate(1);
    end.setTime(todayMidnight.getTime());
    end.setUTCMonth(q * 3); end.setUTCDate(1);
  } else {
    start.setUTCDate(start.getUTCDate() - 30);
  }
  return { start, end };
}

/** For a given range, compute the "prior period" comparison window
 *  (same span, ending exactly where the current range starts). Returns null
 *  for "all" (no prior period defined) or "none". */
export function compareWindow(rangeCode: string, compareCode: string, now: Date = new Date()): DateWindow | null {
  if (compareCode === "none") return null;
  if (rangeCode === "all") return null;
  const cur = rangeToWindow(rangeCode, now);
  if (compareCode === "prior") {
    const span = cur.end.getTime() - cur.start.getTime();
    return { start: new Date(cur.start.getTime() - span), end: new Date(cur.start) };
  }
  if (compareCode === "yoy") {
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    return {
      start: new Date(cur.start.getTime() - yearMs),
      end:   new Date(cur.end.getTime()   - yearMs),
    };
  }
  return null;
}

// Short month names used by fmtDateRange.
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Apr 16 – May 16, 2026" — used under the TopBar date-range pill. */
export function fmtDateRange(w: DateWindow): string {
  const s = w.start, e = w.end;
  const sameYear = s.getFullYear() === e.getFullYear();
  const startStr = `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()}${sameYear ? "" : `, ${s.getFullYear()}`}`;
  const endStr   = `${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  return `${startStr} – ${endStr}`;
}

/** Human-readable version of a range code. Handles "all" specially. */
export function fmtRangeSubtitle(code: string, now: Date = new Date()): string {
  if (code === "all") return "All time";
  return fmtDateRange(rangeToWindow(code, now));
}
