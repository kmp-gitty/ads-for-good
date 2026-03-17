// /src/app/demo/dashboard/page.tsx
import React from "react";

type TouchRow = {
  channel: string;
  chapter_count: number;
};

type DashboardJSON = {
  kpi_tiles: {
    revenue: number | null;
    purchases: number | null;
    leads: number | null;
    aov: number | null;
    currency: string | null;
  };
  journey_tiles: {
    journey_count: number | null;
    anon_journeys: number | null;
    idd_journeys: number | null;
    chapter_count: number | null;
    avg_chapter_seconds: number | null;
    avg_touchpoints: number | null;
    avg_unique_channels: number | null;
  };

  // ✅ NEW: snapshot returns these
  first_touch?: TouchRow[];
  last_touch?: TouchRow[];

  linear_attribution?: Array<{
    channel: string;
    contributing_chapters: number;
    attributed_revenue: number;
    all_chapter_revenue: number;
    attributed_pct_of_all: number;
    channel_chapter_revenue: number;
    attributed_pct_of_channel_chapters: number;
    avg_other_channels_per_chapter: number;
    currency: string | null;
  }>;
  correlation_lift?: Array<{
    channel: string;
    chapters_with_channel: number;
    chapters_without_channel: number;
    total_purchase_chapters: number;
    avg_revenue_with: number | null;
    avg_revenue_without: number | null;
    lift_pct_vs_without: number | null;
    z_score: number | null;
    confidence_flag: string | null;
    sd_with: number | null;
    sd_without: number | null;
    total_revenue: number | null;
    avg_revenue_overall: number | null;
    sd_revenue_overall: number | null;
  }>;
  top5_chapter_paths?: Array<{
    boundary_event_name: string;
    path: string;
    chapter_count: number;
    avg_touches: number;
    avg_time_to_boundary: string;
    total_value: number;
    currency: string | null;
  }>;
};

function fmtCurrency(amount: number | null | undefined, currency?: string | null) {
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

function fmtNumber(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
}

function fmtPct(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined) return "—";
  return `${fmtNumber(n, digits)}%`;
}

function fmtDuration(seconds: number | null | undefined) {
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

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold tracking-wide text-neutral-500">{title}</div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-neutral-500">{sub}</div> : null}
    </div>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-sm font-extrabold tracking-tight text-neutral-900">{title}</h2>
      {right ? <div className="text-xs text-neutral-500">{right}</div> : null}
    </div>
  );
}

export default async function DemoDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const clientKeyRaw = sp.client_key;
  const client_key =
    (Array.isArray(clientKeyRaw) ? clientKeyRaw[0] : clientKeyRaw) || "adsforgood_local";

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000";

  const res = await fetch(
    `/api/demo/snapshot?client_key=${encodeURIComponent(client_key)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="text-sm font-extrabold text-red-800">Dashboard fetch failed</div>
          <div className="mt-2 text-xs text-red-800">
            status: {res.status} {res.statusText}
          </div>
          {txt ? (
            <pre className="mt-3 overflow-auto rounded-xl border border-red-200 bg-white p-3 text-xs text-red-900">
              {txt}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }

  const payload = (await res.json()) as { dashboard_json?: DashboardJSON };
  const d = payload.dashboard_json;

  if (!d) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-extrabold text-neutral-900">No dashboard_json returned</div>
          <div className="mt-2 text-xs text-neutral-600">
            Check that <code className="rounded bg-neutral-100 px-1">dashboard_snapshot_v1</code>{" "}
            returns a row for client_key:{" "}
            <code className="rounded bg-neutral-100 px-1">{client_key}</code>
          </div>
        </div>
      </div>
    );
  }

  const currency = d.kpi_tiles?.currency || "USD";

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-wide text-neutral-500">
              Unified Pixel Demo
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
              Executive Dashboard
            </h1>
            <div className="mt-1 text-xs text-neutral-500">
              client_key: <span className="font-semibold text-neutral-700">{client_key}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/demo/dashboard?client_key=${encodeURIComponent(client_key)}`}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              Refresh
            </a>
            <a
              href={`/demo/snapshot?client_key=${encodeURIComponent(client_key)}`}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              View JSON
            </a>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="mt-6">
          <SectionTitle title="Marketing KPIs" />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              title="Revenue"
              value={fmtCurrency(d.kpi_tiles.revenue, currency)}
              sub={`Currency: ${currency}`}
            />
            <Card title="Purchases" value={fmtNumber(d.kpi_tiles.purchases)} />
            <Card title="Leads" value={fmtNumber(d.kpi_tiles.leads)} />
            <Card
              title="AOV"
              value={d.kpi_tiles.aov === null ? "—" : fmtCurrency(d.kpi_tiles.aov, currency)}
            />
          </div>
        </div>

        {/* Journey Tiles */}
        <div className="mt-8">
          <SectionTitle title="Journeys & Chapters" />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Journey Count" value={fmtNumber(d.journey_tiles.journey_count)} />
            <Card title="Anon Journeys" value={fmtNumber(d.journey_tiles.anon_journeys)} />
            <Card title="ID’d Journeys" value={fmtNumber(d.journey_tiles.idd_journeys)} />
            <Card title="Chapter Count" value={fmtNumber(d.journey_tiles.chapter_count)} />

            <Card
              title="Avg Chapter Length"
              value={fmtDuration(d.journey_tiles.avg_chapter_seconds)}
              sub={
                d.journey_tiles.avg_chapter_seconds
                  ? `${fmtNumber(d.journey_tiles.avg_chapter_seconds, 2)} sec`
                  : undefined
              }
            />
            <Card title="Avg Touchpoints / Chapter" value={fmtNumber(d.journey_tiles.avg_touchpoints, 2)} />
            <Card title="Avg Unique Channels / Chapter" value={fmtNumber(d.journey_tiles.avg_unique_channels, 2)} />
            <div className="hidden lg:block" />
          </div>
        </div>

        {/* Top Channels (First/Last Touch) */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <SectionTitle title="Top 5 Chapter Start Channels (First Touch)" />
            <div className="mt-3 overflow-auto">
              <table className="w-full text-left text-sm text-neutral-800">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 text-right">Chapters</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.first_touch || []).map((r, i) => (
                    <tr key={`${r.channel}-${i}`} className="border-t border-neutral-200">
                      <td className="py-2 pr-3 font-semibold text-neutral-900">{r.channel}</td>
                      <td className="py-2 text-right font-semibold text-neutral-900">
                        {fmtNumber(r.chapter_count)}
                      </td>
                    </tr>
                  ))}
                  {(d.first_touch || []).length === 0 ? (
                    <tr className="border-t border-neutral-200">
                      <td className="py-3 text-sm text-neutral-500" colSpan={2}>
                        No rows.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <SectionTitle title="Top 5 Chapter End Channels (Last Touch)" />
            <div className="mt-3 overflow-auto">
              <table className="w-full text-left text-sm text-neutral-800">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 text-right">Chapters</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.last_touch || []).map((r, i) => (
                    <tr key={`${r.channel}-${i}`} className="border-t border-neutral-200">
                      <td className="py-2 pr-3 font-semibold text-neutral-900">{r.channel}</td>
                      <td className="py-2 text-right font-semibold text-neutral-900">
                        {fmtNumber(r.chapter_count)}
                      </td>
                    </tr>
                  ))}
                  {(d.last_touch || []).length === 0 ? (
                    <tr className="border-t border-neutral-200">
                      <td className="py-3 text-sm text-neutral-500" colSpan={2}>
                        No rows.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Linear attribution */}
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <SectionTitle title="Channel Table (Linear Attribution)" />
          <div className="mt-3 overflow-auto">
            <table className="w-full text-left text-sm text-neutral-800">
              <thead className="text-xs text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 text-right">Chapters</th>
                  <th className="py-2 text-right">Attributed Revenue</th>
                  <th className="py-2 text-right">% of All Revenue</th>
                  <th className="py-2 text-right">Channel Chapter Revenue</th>
                  <th className="py-2 text-right">% of Channel Chapters</th>
                  <th className="py-2 text-right">Avg Other Channels</th>
                </tr>
              </thead>
              <tbody>
                {(d.linear_attribution || []).map((r, i) => (
                  <tr key={`${r.channel}-${i}`} className="border-t border-neutral-200">
                    <td className="py-2 pr-3 font-semibold text-neutral-900">{r.channel}</td>
                    <td className="py-2 text-right">{fmtNumber(r.contributing_chapters)}</td>
                    <td className="py-2 text-right font-semibold">
                      {fmtCurrency(r.attributed_revenue, currency)}
                    </td>
                    <td className="py-2 text-right">{fmtPct(r.attributed_pct_of_all)}</td>
                    <td className="py-2 text-right">{fmtCurrency(r.channel_chapter_revenue, currency)}</td>
                    <td className="py-2 text-right">{fmtPct(r.attributed_pct_of_channel_chapters)}</td>
                    <td className="py-2 text-right">{fmtNumber(r.avg_other_channels_per_chapter, 2)}</td>
                  </tr>
                ))}
                {(d.linear_attribution || []).length === 0 ? (
                  <tr className="border-t border-neutral-200">
                    <td className="py-3 text-sm text-neutral-500" colSpan={7}>
                      No rows.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Correlation/Lift */}
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <SectionTitle title="Correlation / Lift (V1)" right="Directional only — watch sample sizes" />
          <div className="mt-3 overflow-auto">
            <table className="w-full text-left text-sm text-neutral-800">
              <thead className="text-xs text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 text-right">With</th>
                  <th className="py-2 text-right">Without</th>
                  <th className="py-2 text-right">Avg With</th>
                  <th className="py-2 text-right">Avg Without</th>
                  <th className="py-2 text-right">Lift %</th>
                  <th className="py-2 text-right">Z</th>
                  <th className="py-2 pr-1 text-right">Flag</th>
                </tr>
              </thead>
              <tbody>
                {(d.correlation_lift || []).map((r, i) => (
                  <tr key={`${r.channel}-${i}`} className="border-t border-neutral-200">
                    <td className="py-2 pr-3 font-semibold text-neutral-900">{r.channel}</td>
                    <td className="py-2 text-right">{fmtNumber(r.chapters_with_channel)}</td>
                    <td className="py-2 text-right">{fmtNumber(r.chapters_without_channel)}</td>
                    <td className="py-2 text-right">
                      {r.avg_revenue_with == null ? "—" : fmtCurrency(r.avg_revenue_with, currency)}
                    </td>
                    <td className="py-2 text-right">
                      {r.avg_revenue_without == null ? "—" : fmtCurrency(r.avg_revenue_without, currency)}
                    </td>
                    <td className="py-2 text-right">{fmtPct(r.lift_pct_vs_without)}</td>
                    <td className="py-2 text-right">{r.z_score == null ? "—" : fmtNumber(r.z_score, 4)}</td>
                    <td className="py-2 pr-1 text-right">
                      <span className="inline-flex rounded-full border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700">
                        {r.confidence_flag || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(d.correlation_lift || []).length === 0 ? (
                  <tr className="border-t border-neutral-200">
                    <td className="py-3 text-sm text-neutral-500" colSpan={8}>
                      No rows.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top paths */}
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <SectionTitle title="Top 5 Chapter Routes (Start → Finish)" />
          <div className="mt-3 overflow-auto">
            <table className="w-full text-left text-sm text-neutral-800">
              <thead className="text-xs text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Boundary</th>
                  <th className="py-2 pr-3">Path</th>
                  <th className="py-2 text-right">Chapters</th>
                  <th className="py-2 text-right">Avg Touches</th>
                  <th className="py-2 text-right">Avg Time</th>
                  <th className="py-2 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {(d.top5_chapter_paths || []).map((r, i) => (
                  <tr key={`${r.boundary_event_name}-${i}`} className="border-t border-neutral-200 align-top">
                    <td className="py-2 pr-3 font-semibold text-neutral-900">{r.boundary_event_name}</td>
                    <td className="py-2 pr-3 text-neutral-800">
                      <div className="max-w-[900px] whitespace-pre-wrap break-words">{r.path}</div>
                    </td>
                    <td className="py-2 text-right">{fmtNumber(r.chapter_count)}</td>
                    <td className="py-2 text-right">{fmtNumber(r.avg_touches, 2)}</td>
                    <td className="py-2 text-right">{r.avg_time_to_boundary || "—"}</td>
                    <td className="py-2 text-right">{fmtCurrency(r.total_value, currency)}</td>
                  </tr>
                ))}
                {(d.top5_chapter_paths || []).length === 0 ? (
                  <tr className="border-t border-neutral-200">
                    <td className="py-3 text-sm text-neutral-500" colSpan={6}>
                      No rows.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 text-xs text-neutral-500">
          Tip: change client via{" "}
          <code className="rounded bg-white px-1 py-0.5 border border-neutral-200">
            /demo/dashboard?client_key=YOUR_CLIENT_KEY
          </code>
        </div>
      </div>
    </div>
  );
}