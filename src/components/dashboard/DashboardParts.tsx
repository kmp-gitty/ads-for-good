"use client";

import React from "react";
import type { DashboardJSON, MetricTileConfig } from "@/app/lib/dashboard/types";
import { fmtCurrency, fmtDuration, fmtNumber, fmtPct } from "@/app/lib/dashboard/formatters";

export function Card({
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

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-sm font-extrabold tracking-tight text-neutral-900">{title}</h2>
      {right ? <div className="text-xs text-neutral-500">{right}</div> : null}
    </div>
  );
}

function getMetricValue(data: DashboardJSON, source: "kpi_tiles" | "journey_tiles", valueKey: string) {
  return (data as any)?.[source]?.[valueKey];
}

function renderMetricValue(
  value: number | null | undefined,
  type: "currency" | "number" | "percent" | "duration",
  currency?: string | null,
  digits = 0
) {
  if (type === "currency") return fmtCurrency(value, currency);
  if (type === "percent") return fmtPct(value, digits || 2);
  if (type === "duration") return fmtDuration(value);
  return fmtNumber(value, digits);
}

export function MetricCardGrid({
  title,
  tiles,
  data,
  currency,
}: {
  title: string;
  tiles: MetricTileConfig[];
  data: DashboardJSON;
  currency?: string | null;
}) {
  return (
    <div className="mt-6">
      <SectionTitle title={title} />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const rawValue = getMetricValue(data, tile.source, tile.valueKey);

          const sub =
            tile.type === "duration" && tile.valueKey === "avg_chapter_seconds" && rawValue != null
              ? `${fmtNumber(rawValue, 2)} sec`
              : tile.sub;

          return (
            <Card
              key={tile.key}
              title={tile.label}
              value={renderMetricValue(rawValue, tile.type, currency, tile.digits || 0)}
              sub={sub}
            />
          );
        })}
      </div>
    </div>
  );
}

export function FirstLastTouchTables({ data, firstTitle, lastTitle }: {
  data: DashboardJSON;
  firstTitle: string;
  lastTitle: string;
}) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <SectionTitle title={firstTitle} />
        <div className="mt-3 overflow-auto">
          <table className="w-full text-left text-sm text-neutral-800">
            <thead className="text-xs text-neutral-500">
              <tr>
                <th className="py-2 pr-3">Channel</th>
                <th className="py-2 text-right">Chapters</th>
              </tr>
            </thead>
            <tbody>
              {(data.first_touch || []).map((r, i) => (
                <tr key={`${r.channel}-${i}`} className="border-t border-neutral-200">
                  <td className="py-2 pr-3 font-semibold text-neutral-900">{r.channel}</td>
                  <td className="py-2 text-right font-semibold text-neutral-900">
                    {fmtNumber(r.chapter_count)}
                  </td>
                </tr>
              ))}
              {(data.first_touch || []).length === 0 ? (
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
        <SectionTitle title={lastTitle} />
        <div className="mt-3 overflow-auto">
          <table className="w-full text-left text-sm text-neutral-800">
            <thead className="text-xs text-neutral-500">
              <tr>
                <th className="py-2 pr-3">Channel</th>
                <th className="py-2 text-right">Chapters</th>
              </tr>
            </thead>
            <tbody>
              {(data.last_touch || []).map((r, i) => (
                <tr key={`${r.channel}-${i}`} className="border-t border-neutral-200">
                  <td className="py-2 pr-3 font-semibold text-neutral-900">{r.channel}</td>
                  <td className="py-2 text-right font-semibold text-neutral-900">
                    {fmtNumber(r.chapter_count)}
                  </td>
                </tr>
              ))}
              {(data.last_touch || []).length === 0 ? (
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
  );
}

export function LinearAttributionTable({
  data,
  title,
  currency,
}: {
  data: DashboardJSON;
  title: string;
  currency: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <SectionTitle title={title} />
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
            {(data.linear_attribution || []).map((r, i) => (
              <tr key={`${r.channel}-${i}`} className="border-t border-neutral-200">
                <td className="py-2 pr-3 font-semibold text-neutral-900">{r.channel}</td>
                <td className="py-2 text-right">{fmtNumber(r.contributing_chapters)}</td>
                <td className="py-2 text-right font-semibold">
                  {fmtCurrency(r.attributed_revenue, currency)}
                </td>
                <td className="py-2 text-right">{fmtPct(r.attributed_pct_of_all)}</td>
                <td className="py-2 text-right">
                  {fmtCurrency(r.channel_chapter_revenue, currency)}
                </td>
                <td className="py-2 text-right">
                  {fmtPct(r.attributed_pct_of_channel_chapters)}
                </td>
                <td className="py-2 text-right">
                  {fmtNumber(r.avg_other_channels_per_chapter, 2)}
                </td>
              </tr>
            ))}
            {(data.linear_attribution || []).length === 0 ? (
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
  );
}

export function CorrelationTable({
  data,
  title,
  currency,
}: {
  data: DashboardJSON;
  title: string;
  currency: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <SectionTitle title={title} right="Directional only — watch sample sizes" />
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
            {(data.correlation_lift || []).map((r, i) => (
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
                <td className="py-2 text-right">
                  {r.z_score == null ? "—" : fmtNumber(r.z_score, 4)}
                </td>
                <td className="py-2 pr-1 text-right">
                  <span className="inline-flex rounded-full border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700">
                    {r.confidence_flag || "—"}
                  </span>
                </td>
              </tr>
            ))}
            {(data.correlation_lift || []).length === 0 ? (
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
  );
}

export function TopPathsTable({
  data,
  title,
  currency,
}: {
  data: DashboardJSON;
  title: string;
  currency: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <SectionTitle title={title} />
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
            {(data.top5_chapter_paths || []).map((r, i) => (
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
            {(data.top5_chapter_paths || []).length === 0 ? (
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
  );
}