import React, { Suspense } from "react";
import "../chapter.css";
import { ChapterProvider, type UserInfo } from "../_components/ChapterContext";
import { Sidebar } from "../_components/Sidebar";
import { PinnedObservation } from "../_components/PinnedObservation";
import { getCurrentChapterUser } from "@/app/lib/auth/chapter-user";
import { getDashboardFreshnessByClient } from "@/app/lib/dashboard/freshness";

export const metadata = {
  title: "Chapter — Dashboard",
  description: "Lifecycle attribution dashboard for agency operators.",
};

export default async function ChapterAuthedLayout({ children }: { children: React.ReactNode }) {
  // Server-side user resolve. Returns null when the request is using the
  // legacy CHAPTER_DASH_TOKEN cookie gate (no Supabase session); UI falls
  // back to agency-operator behavior in that case (Sprint 5a coexistence).
  const [chapterUser, freshness] = await Promise.all([
    getCurrentChapterUser(),
    getDashboardFreshnessByClient(),
  ]);
  const user: UserInfo | null = chapterUser
    ? { email: chapterUser.email, role: chapterUser.role, client_key: chapterUser.client_key }
    : null;

  return (
    <div className="chapter-app">
      {/* ChapterProvider calls useSearchParams() to read URL-backed selectors
       *  (client / range / compare / model). Next.js requires a Suspense
       *  boundary around any component using useSearchParams() in pages that
       *  could be statically pre-rendered. The fallback is null because the
       *  layout chrome (sidebar, top bar) renders cleanly with defaults while
       *  searchParams resolves on the client. */}
      <Suspense fallback={null}>
        <ChapterProvider user={user} freshness={freshness}>
          <div className="app">
            <Sidebar />
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
