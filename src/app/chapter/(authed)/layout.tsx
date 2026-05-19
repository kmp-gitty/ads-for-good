import React, { Suspense } from "react";
import "../chapter.css";
import { ChapterProvider } from "../_components/ChapterContext";
import { Sidebar } from "../_components/Sidebar";
import { PinnedObservation } from "../_components/PinnedObservation";

export const metadata = {
  title: "Chapter — Dashboard",
  description: "Lifecycle attribution dashboard for agency operators.",
};

export default function ChapterAuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="chapter-app">
      {/* ChapterProvider calls useSearchParams() to read URL-backed selectors
       *  (client / range / compare / model). Next.js requires a Suspense
       *  boundary around any component using useSearchParams() in pages that
       *  could be statically pre-rendered. The fallback is null because the
       *  layout chrome (sidebar, top bar) renders cleanly with defaults while
       *  searchParams resolves on the client. */}
      <Suspense fallback={null}>
        <ChapterProvider>
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
