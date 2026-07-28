// Internal identity-prompts admin chrome. Warm-paper background + orange
// "ads for Good · Admin" accent — matches the visual family of the other
// /internal/* admin surfaces, refreshed to align typographic weight + spacing
// with the self-serve editor. Kept lightweight (server component) so per-page
// state remains client-side where it belongs.

import Link from "next/link";

export const metadata = {
  title: "Identity prompts | ads for Good Admin",
  robots: { index: false, follow: false },
};

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";

export default function IdentityPromptsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "#f7f4ee", color: INK }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 30px 60px" }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: ".18em", textTransform: "uppercase" }}>
              ads for Good · Admin
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, margin: "6px 0 6px", letterSpacing: "-0.01em" }}>
              <Link href="/internal/identity-prompts" style={{ color: INK, textDecoration: "none" }}>
                Identity prompts
              </Link>
            </h1>
            <p style={{ fontSize: 13.5, color: MUTED, margin: 0, lineHeight: 1.5, maxWidth: 640 }}>
              Configurable on-site popups that capture identity in exchange for a discount or offer. Fires via the Chapter pixel.
            </p>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: MUTED, flexWrap: "wrap" }}>
            <Link href="/internal/redirect-rules" style={{ color: MUTED, textDecoration: "none" }}>Redirects →</Link>
            <span style={{ color: FAINT }}>·</span>
            <Link href="/internal/offline-events" style={{ color: MUTED, textDecoration: "none" }}>Offline →</Link>
            <span style={{ color: FAINT }}>·</span>
            <Link href="/internal/tasks" style={{ color: MUTED, textDecoration: "none" }}>Tasks →</Link>
            <span style={{ color: FAINT }}>·</span>
            <Link href="/internal/client-portal-config" style={{ color: MUTED, textDecoration: "none" }}>Client Config →</Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
