"use client";

// Cross-page state for the dashboard.
//
// Four values are URL-backed (so refreshing or sharing a link preserves them):
//   - client     ?client=eos_fabrics
//   - dateRange  ?range=30d (7d / 14d / 30d / 90d / mtd / last-month / qtd / last-quarter / ytd / custom)
//   - compare    ?compare=prior|yoy|none
//   - model      ?model=first|last|linear|custom
//
// Three are ephemeral UI state (not URL-worthy):
//   - pinnedObs / highlightTarget — floating "show me where this came from" panel
//   - sidebarOpen — mobile drawer toggle
//
// Setters call router.replace() which updates the URL → Next.js re-renders the
// current server component with new searchParams → data refetches automatically.

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CLIENTS, Client, AttributionModel, Observation,
} from "./mockdata";

type Ctx = {
  client: Client;
  setClient: (c: Client) => void;

  dateRange: string;
  setDateRange: (d: string) => void;

  compare: string;
  setCompare: (c: string) => void;

  model: AttributionModel;
  setModel: (m: AttributionModel) => void;

  pinnedObs: Observation | null;
  pinObservation: (o: Observation | null) => void;

  highlightTarget: string | null;
  setHighlightTarget: (id: string | null) => void;

  // Mobile sidebar drawer state.
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
};

const ChapterCtx = createContext<Ctx | null>(null);

// ---------- URL ↔ display-label maps ----------
// The dropdown UI shows human labels; URLs carry compact codes. These maps
// translate in both directions.

const DATE_RANGE_LABEL_TO_CODE: Record<string, string> = {
  "Last 7 days":   "7d",
  "Last 14 days":  "14d",
  "Last 30 days":  "30d",
  "Last 90 days":  "90d",
  "This month":    "mtd",
  "Last month":    "last-month",
  "This quarter":  "qtd",
  "Last quarter":  "last-quarter",
  "Year to date":  "ytd",
  "All time":      "all",
  "Custom…":       "custom",
};
const DATE_RANGE_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(DATE_RANGE_LABEL_TO_CODE).map(([label, code]) => [code, label])
);

const COMPARE_LABEL_TO_CODE: Record<string, string> = {
  "Compare to prior period":          "prior",
  "Compare to same period last year": "yoy",
  "No comparison":                    "none",
};
const COMPARE_CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(COMPARE_LABEL_TO_CODE).map(([label, code]) => [code, label])
);

const VALID_MODELS = new Set<AttributionModel>(["first", "last", "linear", "custom"]);

export function ChapterProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Ephemeral UI state — not in URL.
  const [pinnedObs, setPinnedObs] = useState<Observation | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Derive URL-backed values from searchParams. Defaults applied here so any
  // page renders cleanly even without query params.
  const clientId    = searchParams.get("client")  || CLIENTS[0].id;
  const rangeCode   = searchParams.get("range")   || "30d";
  const compareCode = searchParams.get("compare") || "prior";
  const modelParam  = searchParams.get("model")   || "linear";

  const client    = CLIENTS.find(c => c.id === clientId) || CLIENTS[0];
  const dateRange = DATE_RANGE_CODE_TO_LABEL[rangeCode] || "Last 30 days";
  const compare   = COMPARE_CODE_TO_LABEL[compareCode]  || "Compare to prior period";
  const model: AttributionModel = VALID_MODELS.has(modelParam as AttributionModel)
    ? (modelParam as AttributionModel)
    : "linear";

  // Helper: push a partial URL update via router.replace (no history entry).
  // useCallback so identity is stable across renders.
  const updateUrl = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === "" || v == null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  const setClient    = useCallback((c: Client)            => updateUrl({ client: c.id }), [updateUrl]);
  const setDateRange = useCallback((label: string)         => updateUrl({ range:   DATE_RANGE_LABEL_TO_CODE[label] ?? "30d" }), [updateUrl]);
  const setCompare   = useCallback((label: string)         => updateUrl({ compare: COMPARE_LABEL_TO_CODE[label]    ?? "prior" }), [updateUrl]);
  const setModel     = useCallback((m: AttributionModel)   => updateUrl({ model: m }), [updateUrl]);

  const pinObservation = useCallback((o: Observation | null) => {
    setPinnedObs(o);
    setHighlightTarget(o?.id ?? null);
  }, []);

  // Auto-dismiss pinned obs when navigating off the destination page,
  // and auto-close the mobile sidebar on every route change.
  useEffect(() => {
    if (pinnedObs) {
      const pinnedPath = `/chapter/${pinnedObs.page}`;
      if (pathname !== pinnedPath) {
        setPinnedObs(null);
        setHighlightTarget(null);
      }
    }
    setSidebarOpen(false);
  }, [pathname, pinnedObs]);

  // useMemo on the context value so children don't re-render on every parent
  // tick. Identity changes only when one of the URL-backed values changes.
  const value = useMemo<Ctx>(() => ({
    client, setClient,
    dateRange, setDateRange,
    compare, setCompare,
    model, setModel,
    pinnedObs, pinObservation,
    highlightTarget, setHighlightTarget,
    sidebarOpen, setSidebarOpen,
  }), [
    client, setClient,
    dateRange, setDateRange,
    compare, setCompare,
    model, setModel,
    pinnedObs, pinObservation,
    highlightTarget,
    sidebarOpen,
  ]);

  return <ChapterCtx.Provider value={value}>{children}</ChapterCtx.Provider>;
}

export function useChapter(): Ctx {
  const ctx = useContext(ChapterCtx);
  if (!ctx) throw new Error("useChapter must be used inside <ChapterProvider>");
  return ctx;
}
