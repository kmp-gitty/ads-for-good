import React, { Suspense } from "react";
import "../chapter.css";
import {
  ChapterProvider,
  type UserInfo,
  type EntitlementInfo,
} from "../_components/ChapterContext";
import { Sidebar } from "../_components/Sidebar";
import { PinnedObservation } from "../_components/PinnedObservation";
import {
  getCurrentChapterUser,
  listAccessibleClientKeys,
  getClientEntitlement,
} from "@/app/lib/auth/chapter-user";
import { getDashboardFreshnessByClient } from "@/app/lib/dashboard/freshness";
import { getInquiryUnreadCount } from "@/app/lib/inquiries/actions";
import { CLIENTS, type Client } from "../_components/mockdata";

// Stable-ish accent color for a self-serve tenant (not in the operator mock).
const SELFSERVE_COLORS = ["#E36410", "#5868D6", "#2E7D5B", "#8E5DA8", "#C9550B"];
function colorForKey(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SELFSERVE_COLORS[h % SELFSERVE_COLORS.length];
}

export const metadata = {
  title: "Chapter — Dashboard",
  description: "Lifecycle attribution dashboard for agency operators.",
};

export default async function ChapterAuthedLayout({ children }: { children: React.ReactNode }) {
  // Server-side user resolve. Returns null when the request is using the
  // legacy CHAPTER_DASH_TOKEN cookie gate (no Supabase session); UI falls
  // back to chapter_staff behavior in that case (Sprint 5a coexistence).
  const [chapterUser, freshness, inquiryUnread] = await Promise.all([
    getCurrentChapterUser(),
    getDashboardFreshnessByClient(),
    getInquiryUnreadCount(),
  ]);
  const user: UserInfo | null = chapterUser
    ? {
        email: chapterUser.email,
        role: chapterUser.role,
        client_key: chapterUser.client_key,
        agency_key: chapterUser.agency_key,
      }
    : null;
  // Accessible client_keys for sidebar scoping. NULL for legacy sessions =
  // "show all CLIENTS" (matches chapter_staff behavior, no regression).
  const accessibleClientKeys = chapterUser
    ? await listAccessibleClientKeys(chapterUser)
    : null;

  // Phase 2 self-serve — resolve entitlement for a client-scoped user. Only
  // client_employees have a server-known pinned client_key; chapter_staff /
  // agency_operator switch clients via URL, so they keep the full-analytics
  // default (DEFAULT_ENTITLEMENT in the provider). A client_employee whose
  // client_key isn't in the CLIENTS operator mock is a self-serve tenant →
  // synthesize a Client for display so the sidebar/URLs render the real name.
  let entitlement: EntitlementInfo | undefined;
  let selfServeClient: Client | null = null;
  if (chapterUser?.role === "client_employee" && chapterUser.client_key) {
    const ent = await getClientEntitlement(chapterUser.client_key);
    if (ent) {
      entitlement = {
        toolsEnabled: ent.tools_enabled,
        selfServe: ent.self_serve,
        billingStatus: ent.billing_status,
        trialEndsAt: ent.trial_ends_at,
      };
    }
    const key = chapterUser.client_key;
    if (!CLIENTS.some((c) => c.id === key)) {
      selfServeClient = {
        id: key,
        name: ent?.business_name || key,
        tier: "Starter",
        color: colorForKey(key),
      };
    }
  }

  return (
    <div className="chapter-app">
      {/* ChapterProvider calls useSearchParams() to read URL-backed selectors
       *  (client / range / compare / model). Next.js requires a Suspense
       *  boundary around any component using useSearchParams() in pages that
       *  could be statically pre-rendered. The fallback is null because the
       *  layout chrome (sidebar, top bar) renders cleanly with defaults while
       *  searchParams resolves on the client. */}
      <Suspense fallback={null}>
        <ChapterProvider
          user={user}
          accessibleClientKeys={accessibleClientKeys}
          freshness={freshness}
          entitlement={entitlement}
          selfServeClient={selfServeClient}
        >
          <div className="app">
            <Sidebar inquiryUnreadCount={inquiryUnread} />
            <div className="main">
              {children}
            </div>
          </div>
          <PinnedObservation />
        </ChapterProvider>
      </Suspense>
    </div>
  );
}
