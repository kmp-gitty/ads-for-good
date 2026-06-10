// Per-page loading state for /chapter/connections/influence.
// Shape matches the real page: anchor card across top + two side-by-side
// connection panels (Upstream / Downstream) + self-recurrence strip.

import { SkelCard, SkelTitle, SkelLine, SkelChip } from "../../../_components/Skeleton";

export default function InfluenceLoading() {
  return (
    <div className="px-6 py-5" aria-busy="true" aria-live="polite">
      <div className="mb-4">
        <SkelTitle />
        <div style={{ marginTop: 8 }}>
          <SkelLine width="mid" />
        </div>
      </div>

      {/* Anchor card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <SkelTitle />
        </div>
        <div className="skel-stack" style={{ marginTop: 12 }}>
          <SkelLine width="mid" />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <SkelChip /><SkelChip /><SkelChip />
          </div>
        </div>
      </div>

      {/* Upstream / Downstream panels — side by side on desktop */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
      >
        <SkelCard rows={6} />
        <SkelCard rows={6} />
      </div>

      {/* Self-recurrence strip */}
      <div style={{ marginTop: 16 }}>
        <SkelCard rows={2} />
      </div>
    </div>
  );
}
