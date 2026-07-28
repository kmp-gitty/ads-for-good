// Internal redirect-rules admin chrome. Mirrors identity-prompts/layout.tsx so
// the two internal builder surfaces feel like the same family.

import Link from "next/link";

export const metadata = {
  title: "Redirect Rules | ads for Good Admin",
  robots: { index: false, follow: false },
};

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";

export default function RedirectRulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "#f7f4ee", color: INK }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 30px 60px" }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: ".18em", textTransform: "uppercase" }}>
              ads for Good · Admin
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, margin: "6px 0 6px", letterSpacing: "-0.01em" }}>
              <Link href="/internal/redirect-rules" style={{ color: INK, textDecoration: "none" }}>
                Tier 1 Redirect Rules
              </Link>
            </h1>
            <p style={{ fontSize: 13.5, color: MUTED, margin: 0, lineHeight: 1.5, maxWidth: 720 }}>
              Routes <code style={{ background: "white", padding: "1px 5px", borderRadius: 4, border: "1px solid #E5E0D4" }}>/r/&lt;client_key&gt;/&lt;slug&gt;</code> clicks based on identity, cart, geo, device, A/B, time, query params.
            </p>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: MUTED, flexWrap: "wrap" }}>
            <Link href="/internal/identity-prompts" style={{ color: MUTED, textDecoration: "none" }}>Identity prompts →</Link>
            <span style={{ color: FAINT }}>·</span>
            <Link href="/chapter" style={{ color: MUTED, textDecoration: "none" }}>Chapter Dashboard →</Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
