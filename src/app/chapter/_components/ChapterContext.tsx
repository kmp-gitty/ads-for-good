"use client";

// Cross-page state: client selector, date range, comparison mode, attribution
// model, and the floating "pinned observation" panel that follows the user
// when they click "Show me where this came from" on an observation card.

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
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
};

const ChapterCtx = createContext<Ctx | null>(null);

export function ChapterProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [client, setClient] = useState<Client>(CLIENTS[0]);
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [compare, setCompare] = useState("Compare to prior period");
  const [model, setModel] = useState<AttributionModel>("linear");
  const [pinnedObs, setPinnedObs] = useState<Observation | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);

  const pinObservation = useCallback((o: Observation | null) => {
    setPinnedObs(o);
    setHighlightTarget(o?.id ?? null);
  }, []);

  // Auto-dismiss pinned obs when navigating off the destination page.
  useEffect(() => {
    if (!pinnedObs) return;
    const pinnedPath = `/chapter/${pinnedObs.page}`;
    if (pathname !== pinnedPath) {
      setPinnedObs(null);
      setHighlightTarget(null);
    }
  }, [pathname, pinnedObs]);

  return (
    <ChapterCtx.Provider value={{
      client, setClient,
      dateRange, setDateRange,
      compare, setCompare,
      model, setModel,
      pinnedObs, pinObservation,
      highlightTarget, setHighlightTarget,
    }}>
      {children}
    </ChapterCtx.Provider>
  );
}

export function useChapter(): Ctx {
  const ctx = useContext(ChapterCtx);
  if (!ctx) throw new Error("useChapter must be used inside <ChapterProvider>");
  return ctx;
}
