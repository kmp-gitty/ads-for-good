// Per-page loading state for /chapter/lift (Lift, Incrementality & Value).
// Heavy 3-tab page with channel-level stat cards and a quadrant matrix.
// Skeleton shows the tab row + a grid of channel cards.

import { SkelCard, SkelTitle, SkelLine, SkelChip } from "../../_components/Skeleton";

export default function LiftLoading() {
  return (
    <div className="px-6 py-5" aria-busy="true" aria-live="polite">
      <div className="mb-4">
        <SkelTitle />
        <div style={{ marginTop: 8 }}>
          <SkelLine width="mid" />
        </div>
      </div>

      {/* Tab row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <SkelChip /><SkelChip /><SkelChip />
      </div>

      {/* Channel-level cards in a 2-column grid */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
      >
        <SkelCard rows={5} />
        <SkelCard rows={5} />
        <SkelCard rows={5} />
        <SkelCard rows={5} />
      </div>
    </div>
  );
}
