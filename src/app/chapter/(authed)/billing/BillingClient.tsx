"use client";

// Phase 1 transparency view. Three columns of trust: real customer journeys
// counted toward plan, low-signal sessions excluded, filtered bot traffic
// excluded. The "we excluded N additional sessions from your plan" line is the
// good-faith claim per the handoff doc.

import type { UsageSnapshot } from "./page";

const TIER_LABELS: Record<string, { name: string; ceiling: number; retention_days: number }> = {
  standard: { name: "Standard", ceiling: 25000, retention_days: 30 },
  growth:   { name: "Growth",   ceiling: 75000, retention_days: 60 },
  pro:      { name: "Pro",      ceiling: 150000, retention_days: 180 },
};

function formatNumber(n: number | string | null | undefined): string {
  if (n == null) return "—";
  const v = typeof n === "string" ? Number(n) : n;
  return v.toLocaleString();
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function BillingClient({
  clientKey,
  snapshot,
}: {
  clientKey: string;
  snapshot: UsageSnapshot | null;
}) {
  if (!snapshot) {
    return (
      <div className="chapter-app">
        <div className="page-wrap">
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <div className="mt-6 rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
            <p className="text-sm text-neutral-600">
              No usage snapshot yet for <code>{clientKey}</code>. Snapshots are computed nightly at 04:00 UTC.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tier = snapshot.tier && TIER_LABELS[snapshot.tier] ? TIER_LABELS[snapshot.tier] : null;
  const tierLabel = tier?.name ?? "Plan not assigned";
  const ceiling = snapshot.tier_journey_ceiling ?? tier?.ceiling ?? null;
  const retentionDays = snapshot.retention_days ?? tier?.retention_days ?? null;

  const human = snapshot.human_likely_journeys;
  const suspect = snapshot.suspect_journeys;
  const bot = snapshot.bot_likely_journeys;
  const excluded = suspect + bot;
  const total = snapshot.total_journeys;
  const totalEvents = Number(snapshot.total_events);
  const evPerHuman = snapshot.avg_events_per_human_journey;
  const utilization = snapshot.utilization_pct;

  return (
    <div className="chapter-app">
      <div className="page-wrap">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Month-to-date as of {formatDate(snapshot.snapshot_date)}. Snapshot refreshes nightly at 04:00 UTC.
          </p>
        </header>

        {/* Plan header */}
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Your plan</p>
              <p className="mt-1 text-3xl font-semibold text-neutral-900">{tierLabel}</p>
              {ceiling != null ? (
                <p className="mt-1 text-sm text-neutral-600">
                  Up to {formatNumber(ceiling)} real customer journeys/month
                  {retentionDays != null && ` · ${retentionDays}-day retention`}
                </p>
              ) : (
                <p className="mt-1 text-sm text-neutral-500 italic">Contact us to set a plan.</p>
              )}
            </div>
            {utilization != null && ceiling != null && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Utilization</p>
                <p className="mt-1 text-3xl font-semibold text-orange-600">{utilization.toFixed(1)}%</p>
                <p className="mt-1 text-sm text-neutral-600">
                  {formatNumber(human)} of {formatNumber(ceiling)}
                </p>
              </div>
            )}
          </div>
          {utilization != null && ceiling != null && (
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
          )}
        </section>

        {/* Class breakdown */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-800">What we processed this month</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Chapter classifies every session as real customer activity, low-signal, or filtered bot.
            Only real customer journeys count toward your plan.
          </p>

          <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Classification</th>
                  <th className="px-4 py-3 text-right font-semibold">Journeys</th>
                  <th className="px-4 py-3 text-right font-semibold">Share</th>
                  <th className="px-4 py-3 text-left font-semibold">Counts toward plan?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-neutral-900">Real customer journeys</span>
                    <p className="text-xs text-neutral-500">Verified human activity (multi-signal classifier)</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-900">{formatNumber(human)}</td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-600">
                    {total > 0 ? `${((human / total) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      Counts
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-neutral-900">Low-signal sessions</span>
                    <p className="text-xs text-neutral-500">Brief, single-event, or no engagement — likely non-human</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-900">{formatNumber(suspect)}</td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-600">
                    {total > 0 ? `${((suspect / total) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                      Excluded
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-neutral-900">Filtered bot traffic</span>
                    <p className="text-xs text-neutral-500">Scripts, crawlers, automated agents</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-900">{formatNumber(bot)}</td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-600">
                    {total > 0 ? `${((bot / total) * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                      Excluded
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-600">
                <tr>
                  <td className="px-4 py-3 font-semibold">Total processed</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900">{formatNumber(total)}</td>
                  <td className="px-4 py-3 text-right font-mono">100.0%</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          {ceiling != null && excluded > 0 && (
            <p className="mt-4 rounded-md bg-orange-50/40 border border-orange-200 px-4 py-3 text-sm text-neutral-800">
              We processed <strong>{formatNumber(excluded)}</strong> additional sessions this month and{" "}
              <strong>excluded them from your plan</strong>, so you&apos;re only assessed on verified customer activity.
            </p>
          )}
        </section>

        {/* Secondary metrics */}
        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total events this month</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{formatNumber(totalEvents)}</p>
            <p className="mt-1 text-xs text-neutral-500">All event types across all journeys</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Avg events per real journey</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{evPerHuman != null ? evPerHuman.toFixed(1) : "—"}</p>
            <p className="mt-1 text-xs text-neutral-500">Depth signal — higher means richer attribution</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Lifetime events tracked</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{formatNumber(snapshot.cumulative_events_to_date)}</p>
            <p className="mt-1 text-xs text-neutral-500">Cumulative since onboarding</p>
          </div>
        </section>

        <footer className="mt-12 text-xs text-neutral-400">
          Classifier version: <code>{snapshot.classifier_version}</code> · See classifier definition in our docs.
        </footer>
      </div>
    </div>
  );
}
