// Minimal pass-through layout at /chapter root. Lets the login page render
// without the dashboard chrome (sidebar etc.). The dashboard chrome lives in
// /chapter/(authed)/layout.tsx — the route group adds no URL segment.

import React from "react";

export const metadata = {
  title: "Chapter — Dashboard",
};

export default function ChapterRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
