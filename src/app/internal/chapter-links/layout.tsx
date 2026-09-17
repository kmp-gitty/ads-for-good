// Chapter Links admin chrome.
//
// One surface for both halves of the job: configuring the routing rules behind
// /r/<client_key>/<slug>, and generating the trackable URLs that point at them.
// (Previously split across /internal/redirect-rules + /internal/outreach-builder;
// both now redirect here.)
//
// Mirrors identity-prompts/layout.tsx so the internal builder surfaces feel
// like the same family.

import Link from "next/link";

export const metadata = {
  title: "Chapter Links | ads for Good Admin",
  robots: { index: false, follow: false },
};

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";

export default function ChapterLinksLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "#f7f4ee", color: INK }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 30px 60px" }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: ".18em", textTransform: "uppercase" }}>
              ads for Good · Admin
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, margin: "6px 0 6px", letterSpacing: "-0.01em" }}>
              <Link href="/internal/chapter-links" style={{ color: INK, textDecoration: "none" }}>
                Chapter Links
              </Link>
            </h1>
            <p style={{ fontSize: 13.5, color: MUTED, margin: 0, lineHeight: 1.5, maxWidth: 760 }}>
              Configure the rules behind <code style={{ background: "white", padding: "1px 5px", borderRadius: 4, border: "1px solid #E5E0D4" }}>/r/&lt;client_key&gt;/&lt;slug&gt;</code> — identity, cart, geo, device, A/B, time, query params — and generate the trackable URLs that point at them.
            </p>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: MUTED, flexWrap: "wrap" }}>
            <Link href="/internal/identity-prompts" style={{ color: MUTED, textDecoration: "none" }}>Identity prompts →</Link>
            <span style={{ color: FAINT }}>·</span>
            <Link href="/internal/crm" style={{ color: MUTED, textDecoration: "none" }}>CRM →</Link>
            <span style={{ color: FAINT }}>·</span>
            <Link href="/chapter" style={{ color: MUTED, textDecoration: "none" }}>Chapter Dashboard →</Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
