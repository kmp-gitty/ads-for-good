// Reusable skeleton building blocks for loading.tsx + Suspense fallbacks.
// Shapes mirror the real card / kpi / row primitives so the layout doesn't
// reflow when real content arrives. Pure visual; no data or logic.

export function SkelLine({
  width,
  className = "",
}: {
  width?: "short" | "mid" | "full";
  className?: string;
}) {
  const w = width === "short" ? "short" : width === "mid" ? "mid" : "";
  return <div className={`skel line ${w} ${className}`} aria-hidden="true" />;
}

export function SkelTitle() {
  return <div className="skel title" aria-hidden="true" />;
}

export function SkelChip() {
  return <div className="skel chip" aria-hidden="true" />;
}

// Generic card-shaped placeholder. Use inside Suspense fallbacks for a tile
// so the page reserves the same vertical real estate the real card will fill.
export function SkelCard({
  title = true,
  rows = 3,
}: {
  title?: boolean;
  rows?: number;
}) {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      {title && (
        <div className="card-head">
          <SkelTitle />
        </div>
      )}
      <div className="skel-stack" style={{ marginTop: title ? 16 : 0 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkelLine
            key={i}
            width={i === 0 ? "full" : i === rows - 1 ? "short" : "mid"}
          />
        ))}
      </div>
    </div>
  );
}

// KPI strip skeleton — 5 cells matching the real KpiStrip shape.
export function SkelKpiStrip({ cells = 5 }: { cells?: number }) {
  return (
    <div className="kpi-strip" aria-busy="true">
      {Array.from({ length: cells }).map((_, i) => (
        <div className="kpi-cell" key={i}>
          <div className="kpi-label">
            <SkelLine width="short" />
          </div>
          <div className="kpi-value" style={{ marginTop: 6 }}>
            <div className="skel kpi-value" aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );
}
