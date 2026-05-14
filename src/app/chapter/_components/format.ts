// Format helpers (ported from primitives.jsx).

export const fmtMoney = (n: number): string => "$" + Math.round(n).toLocaleString();

export const fmtMoneyK = (n: number): string =>
  "$" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : Math.round(n).toLocaleString());

export const fmtNum = (n: number): string => n.toLocaleString();
