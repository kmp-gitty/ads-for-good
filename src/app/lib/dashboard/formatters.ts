export function fmtCurrency(amount: number | null | undefined, currency?: string | null) {
    if (amount === null || amount === undefined) return "—";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency || ""}`.trim();
    }
  }
  
  export function fmtNumber(n: number | null | undefined, digits = 0) {
    if (n === null || n === undefined) return "—";
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
  }
  
  export function fmtPct(n: number | null | undefined, digits = 2) {
    if (n === null || n === undefined) return "—";
    return `${fmtNumber(n, digits)}%`;
  }
  
  export function fmtDuration(seconds: number | null | undefined) {
    if (seconds === null || seconds === undefined) return "—";
    const s = Math.max(0, seconds);
    if (s < 60) return `${Math.round(s)}s`;
    const mins = s / 60;
    if (mins < 60) return `${Math.round(mins)} min`;
    const hrs = mins / 60;
    if (hrs < 24) return `${Math.round(hrs)} hr`;
    const days = hrs / 24;
    return `${days.toFixed(1)} days`;
  }