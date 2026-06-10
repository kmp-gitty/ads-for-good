// Per-page loading state for /chapter/journeys (Customer Journeys).
// Layout: filter row across top + 2-column main (identity list left,
// detail panel right). Detail panel collapses to nothing on mobile.

import { SkelCard, SkelTitle, SkelLine, SkelChip } from "../../_components/Skeleton";

export default function JourneysLoading() {
  return (
    <div className="px-6 py-5" aria-busy="true" aria-live="polite">
      <div className="mb-4">
        <SkelTitle />
        <div style={{ marginTop: 8 }}>
          <SkelLine width="mid" />
        </div>
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <SkelChip /><SkelChip /><SkelChip /><SkelChip />
      </div>

      {/* Identity list + detail panel */}
      <div
        className="journeys-detail-grid"
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)",
        }}
      >
        <SkelCard rows={10} />
        <SkelCard rows={8} />
      </div>
    </div>
  );
}
