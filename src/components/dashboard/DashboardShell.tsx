"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DashboardConfig, DashboardJSON, SnapshotResponse } from "@/app/lib/dashboard/types";
import {
  CorrelationTable,
  FirstLastTouchTables,
  LinearAttributionTable,
  MetricCardGrid,
  TopPathsTable,
} from "./DashboardParts";

export default function DashboardShell({
  config,
  defaultClientKey = "adsforgood_prod",
}: {
  config: DashboardConfig;
  defaultClientKey?: string;
}) {
  const [data, setData] = useState<DashboardJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const client_key = useMemo(() => {
    if (typeof window === "undefined") return defaultClientKey;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("client_key") || defaultClientKey;
  }, [defaultClientKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);

        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
          "http://localhost:3000";

          const res = await fetch(
            `${baseUrl}/demo/snapshot?client_key=${encodeURIComponent(client_key)}&lite=true`,
            { cache: "no-store" }
          );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`status: ${res.status} ${res.statusText}\n\n${txt}`);
        }

        const payload = (await res.json()) as SnapshotResponse;

        if (!cancelled) {
          setData(payload.dashboard_json || null);
          setLoadedAt(new Date().toISOString());
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unknown error");
          setData(null);
          setLoadedAt(new Date().toISOString());
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [client_key]);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="text-sm font-extrabold text-red-800">Dashboard fetch failed</div>
          <pre className="mt-3 overflow-auto rounded-xl border border-red-200 bg-white p-3 text-xs text-red-900 whitespace-pre-wrap">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-extrabold text-neutral-900">Loading dashboard…</div>
          {loadedAt ? (
            <div className="mt-2 text-xs text-neutral-500">Last attempt: {loadedAt}</div>
          ) : null}
        </div>
      </div>
    );
  }

  const currency = data.kpi_tiles?.currency || "USD";

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-wide text-neutral-500">
              {config.eyebrow}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
              {config.title}
            </h1>
            {config.subtitle ? (
              <div className="mt-1 text-sm text-neutral-600">{config.subtitle}</div>
            ) : null}
            <div className="mt-1 text-xs text-neutral-500">
              client_key: <span className="font-semibold text-neutral-700">{client_key}</span>
            </div>
            {loadedAt ? (
              <div className="mt-1 text-xs text-neutral-400">Loaded: {loadedAt}</div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`?client_key=${encodeURIComponent(client_key)}`}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              Refresh
            </a>
            <a
              href={`/api/demo/snapshot?client_key=${encodeURIComponent(client_key)}`}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              View JSON
            </a>
          </div>
        </div>

        {config.banner ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {config.banner}
          </div>
        ) : null}

        {config.kpiSection ? (
          <MetricCardGrid
            title={config.kpiSection.title}
            tiles={config.kpiSection.tiles}
            data={data}
            currency={currency}
          />
        ) : null}

        {config.journeySection ? (
          <MetricCardGrid
            title={config.journeySection.title}
            tiles={config.journeySection.tiles}
            data={data}
            currency={currency}
          />
        ) : null}

        {config.showFirstTouch || config.showLastTouch ? (
          <FirstLastTouchTables
            data={data}
            firstTitle={config.sectionTitles?.firstTouch || "First Touch"}
            lastTitle={config.sectionTitles?.lastTouch || "Last Touch"}
          />
        ) : null}

        {config.showLinearAttribution ? (
          <LinearAttributionTable
            data={data}
            title={config.sectionTitles?.linearAttribution || "Linear Attribution"}
            currency={currency}
          />
        ) : null}

        {config.showCorrelation ? (
          <CorrelationTable
            data={data}
            title={config.sectionTitles?.correlation || "Correlation / Lift"}
            currency={currency}
          />
        ) : null}

        {config.showTopPaths ? (
          <TopPathsTable
            data={data}
            title={config.sectionTitles?.topPaths || "Top Paths"}
            currency={currency}
          />
        ) : null}

        <div className="mt-10 text-xs text-neutral-500">
          Tip: change client via{" "}
          <code className="rounded bg-white px-1 py-0.5 border border-neutral-200">
            ?client_key=YOUR_CLIENT_KEY
          </code>
        </div>
      </div>
    </div>
  );
}