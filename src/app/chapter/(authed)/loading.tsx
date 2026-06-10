// Group-level loading state for /chapter/(authed)/* navigations.
//
// Next.js renders this automatically while the page's server component
// computes (RPCs, awaits, etc). The (authed) layout — sidebar, top bar,
// pinned observation — stays visible because the layout itself isn't
// re-rendering between pages. Only this skeleton replaces the page body.
//
// Per-page loading.tsx files can override this for pages where a
// more-specific shape (e.g. anchor card + table panels for Cross-Source
// Influence) gives a better preview of what's coming.

import { SkelCard, SkelKpiStrip, SkelTitle, SkelLine } from "../_components/Skeleton";

export default function ChapterDashboardLoading() {
  return (
    <div className="px-6 py-5" aria-busy="true" aria-live="polite">
      <div className="mb-4">
        <SkelTitle />
        <div style={{ marginTop: 8 }}>
          <SkelLine width="mid" />
        </div>
      </div>
      <SkelKpiStrip cells={5} />
      <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <SkelCard rows={4} />
        <SkelCard rows={4} />
      </div>
      <div className="mt-4">
        <SkelCard rows={6} />
      </div>
    </div>
  );
}
