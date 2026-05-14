import React from "react";
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
      <ChapterProvider>
        <div className="app">
          <Sidebar />
          <div className="main">
            {children}
          </div>
        </div>
        <PinnedObservation />
      </ChapterProvider>
    </div>
  );
}
