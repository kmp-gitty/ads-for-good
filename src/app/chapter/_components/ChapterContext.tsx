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

export type UserInfo = {
  email: string;
  role: "chapter_staff" | "agency_operator" | "client_employee";
  client_key: string | null;
  agency_key: string | null;
};

// Per-client dashboard freshness — populated server-side by the (authed)
// layout, used by TopBar to render "Data as of …" under the page title.
// Map keyed by client_key; missing entries fall back to "live" labeling.
export type FreshnessByClient = Record<
  string,
  { as_of_iso: string; display_tz: string }
>;

// Phase 2 self-serve — the tenant's entitlement, resolved server-side in the
// (authed) layout from chapter_config.clients. Drives which sidebar the client
// sees (full analytics vs. tools-only) and the Billing/Home surfaces.
export type EntitlementInfo = {
  toolsEnabled: string[];
  selfServe: boolean;
  billingStatus: string | null;
  trialEndsAt: string | null;
};

const DEFAULT_ENTITLEMENT: EntitlementInfo = {
  // Default is full analytics so operators + existing clients are unaffected
  // when no entitlement is resolved (chapter_staff / agency_operator / legacy).
  toolsEnabled: ["chapter"],
  selfServe: false,
  billingStatus: null,
  trialEndsAt: null,
};

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

  // Sprint 5c — user info from server-side fetch in the (authed) layout.
  // null when using legacy CHAPTER_DASH_TOKEN cookie (no Supabase session
  // resolves). UI falls back to chapter-staff behavior (full multi-client
  // dropdown) in that case so legacy operators keep their old experience.
  user: UserInfo | null;

  // Sprint 7 — accessible client_keys for this user. chapter_staff = all
  // CLIENTS; agency_operator = only their agency's clients; client_employee
  // = their single client. Sidebar filters the multi-client dropdown by this.
  // Empty array when populated (vs. null = use all): an agency_operator with
  // no clients assigned should see an empty dropdown, not all clients.
  accessibleClientKeys: string[] | null;

  // Per-client freshness map — TopBar derives the "Data as of" line by
  // looking up the current client.
  freshness: FreshnessByClient;

  // Phase 2 self-serve — current tenant's entitlement (tools + billing state).
  entitlement: EntitlementInfo;
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

export function ChapterProvider({
  children,
  user = null,
  accessibleClientKeys = null,
  freshness = {},
  entitlement = DEFAULT_ENTITLEMENT,
  selfServeClient = null,
}: {
  children: React.ReactNode;
  user?: UserInfo | null;
  accessibleClientKeys?: string[] | null;
  freshness?: FreshnessByClient;
  entitlement?: EntitlementInfo;
  // Resolved Client for a self-serve tenant whose client_key isn't in the
  // CLIENTS operator mock. Used as the fallback so the sidebar/URLs render the
  // real tenant instead of defaulting to CLIENTS[0].
  selfServeClient?: Client | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Ephemeral UI state — not in URL.
  const [pinnedObs, setPinnedObs] = useState<Observation | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Derive URL-backed values from searchParams + pathname.
  //
  // Sprint 5b real (June 14, 2026) made the canonical URL form
  // `/chapter/<client_key>/<slug>`. Middleware rewrites that internally to
  // `/chapter/<slug>?client=<key>` for the page tree, but the BROWSER URL
  // stays in path form — so useSearchParams() sees no `client` param. We
  // resolve clientId in this priority order:
  //   1. Path segment (if /chapter/<X>/... and X contains an underscore →
  //      it's a client_key, per the locked naming convention).
  //   2. ?client= query param (legacy form, still emitted by setClient on
  //      non-client-scoped paths).
  //   3. CLIENTS[0].id default.
  //
  // Sprint 5c: client_employee role pins clientId to their assigned client_key
  // regardless of URL so the UI can't be tricked into showing a different
  // client even if the URL is manipulated. Middleware enforces at the route
  // layer too; this is UI-side belt + suspenders.
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathClientId =
    pathSegments[0] === "chapter" && pathSegments[1]?.includes("_")
      ? pathSegments[1]
      : null;
  const urlClientId = pathClientId || searchParams.get("client") || CLIENTS[0].id;
  const clientId =
    user && user.role === "client_employee" && user.client_key
      ? user.client_key
      : urlClientId;
  const rangeCode   = searchParams.get("range")   || "30d";
  const compareCode = searchParams.get("compare") || "prior";
  const modelParam  = searchParams.get("model")   || "linear";

  // Resolve the Client for display. Operator/full clients live in the CLIENTS
  // mock; a self-serve tenant (not in the mock) uses the server-resolved
  // selfServeClient. Falls back to CLIENTS[0] only if neither matches.
  const client =
    CLIENTS.find(c => c.id === clientId) ||
    (selfServeClient && selfServeClient.id === clientId ? selfServeClient : null) ||
    selfServeClient ||
    CLIENTS[0];
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

  // setClient: if we're on a /chapter/<old_key>/<slug>... path, swap the
  // client_key segment in place. Otherwise (e.g. legacy `/chapter/<slug>?client=`
  // URL or non-client-scoped path), fall back to setting the ?client= query
  // param. Keeps the URL canonical post-Sprint-5b-real on every nav.
  const setClient = useCallback((c: Client) => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "chapter" && parts[1]?.includes("_")) {
      parts[1] = c.id;
      const newPath = "/" + parts.join("/");
      const qs = searchParams.toString();
      router.replace(qs ? `${newPath}?${qs}` : newPath);
    } else {
      updateUrl({ client: c.id });
    }
  }, [pathname, router, searchParams, updateUrl]);
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
    user,
    accessibleClientKeys,
    freshness,
    entitlement,
  }), [
    client, setClient,
    dateRange, setDateRange,
    compare, setCompare,
    model, setModel,
    pinnedObs, pinObservation,
    highlightTarget,
    sidebarOpen,
    user,
    accessibleClientKeys,
    freshness,
    entitlement,
  ]);

  return <ChapterCtx.Provider value={value}>{children}</ChapterCtx.Provider>;
}

export function useChapter(): Ctx {
  const ctx = useContext(ChapterCtx);
  if (!ctx) throw new Error("useChapter must be used inside <ChapterProvider>");
  return ctx;
}
