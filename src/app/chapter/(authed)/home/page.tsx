// Self-serve Home hub (Phase 2). The first-run landing for tools-only tenants:
// a friendly welcome, live trial status, and a tile per enabled tool. Tool
// setup surfaces (Prompts builder, Links builder) arrive in Phases 3–4; until
// then the tiles explain the tool and show a "coming soon" state so the page
// reads as onboarding, not a dead end.
//
// Rendered inside the (authed) dashboard chrome. Middleware rewrites the clean
// URL /chapter/<client_key>/home → /chapter/home?client=<client_key>, so we
// read the tenant from ?client. Access is already enforced by middleware.

import { getClientEntitlement } from "@/app/lib/auth/chapter-user";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

type Tool = {
  key: string;
  name: string;
  blurb: string;
  cta: string;
};

const TOOL_META: Record<string, Tool> = {
  smart_prompts: {
    key: "smart_prompts",
    name: "Smart Prompts",
    blurb:
      "On-site prompts that turn lost moments into conversions — capture an email, a form, or a sale at exactly the right time.",
    cta: "Set up prompts",
  },
  smart_links: {
    key: "smart_links",
    name: "Smart Links",
    blurb:
      "One link, many destinations. Route each visitor to the right page by device, location, time, or campaign — on your own domain.",
    cta: "Set up links",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();
  const ent = clientKey ? await getClientEntitlement(clientKey) : null;

  const name = ent?.business_name || clientKey || "there";
  const tools = (ent?.tools_enabled || []).filter((t) => t !== "chapter");

  let trialLine: string | null = null;
  if (ent?.billing_status === "trialing" && ent.trial_ends_at) {
    const days = Math.max(
      0,
      Math.ceil((new Date(ent.trial_ends_at).getTime() - Date.now()) / 86_400_000),
    );
    const ends = new Date(ent.trial_ends_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    trialLine = `Free trial · ${days} day${days === 1 ? "" : "s"} left (through ${ends})`;
  }

  return (
    <div style={{ padding: "28px 30px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header + trial banner */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: INK, margin: "0 0 6px" }}>
            Welcome, {name} 👋
          </h1>
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>
            Your workspace is live. Here&rsquo;s what&rsquo;s included on your plan.
          </p>
        </div>
        {trialLine && (
          <div
            style={{
              background: "#FFF4EC",
              border: `1px solid ${ORANGE}33`,
              color: ORANGE,
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {trialLine}
          </div>
        )}
      </div>

      {/* Tool tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: tools.length > 1 ? "1fr 1fr" : "1fr",
          gap: 16,
          marginTop: 24,
        }}
      >
        {tools.length === 0 && (
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: 20, color: MUTED, fontSize: 14 }}>
            No tools are enabled on this workspace yet.
          </div>
        )}
        {tools.map((t) => {
          const meta = TOOL_META[t];
          if (!meta) return null;
          return (
            <div
              key={t}
              style={{
                background: "white",
                border: `1px solid ${LINE}`,
                borderRadius: 12,
                padding: 20,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: INK }}>{meta.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    color: FAINT,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    border: `1px solid ${LINE}`,
                    borderRadius: 999,
                    padding: "2px 7px",
                  }}
                >
                  0 live
                </span>
              </div>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 16px", lineHeight: 1.55, flex: 1 }}>
                {meta.blurb}
              </p>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: FAINT,
                  border: `1px dashed ${LINE}`,
                  borderRadius: 8,
                  padding: "9px 12px",
                  textAlign: "center",
                }}
              >
                {meta.cta} — coming soon
              </div>
            </div>
          );
        })}
      </div>

      {/* Get started checklist */}
      <div
        style={{
          background: PANEL,
          border: `1px solid ${LINE}`,
          borderRadius: 12,
          padding: 20,
          marginTop: 20,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 12 }}>Getting started</div>
        <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Confirm your workspace details in Settings",
            "Install your one-line snippet on your site (we’ll walk you through it)",
            `Create your first ${tools.includes("smart_prompts") ? "prompt" : "link"} and go live`,
          ].map((step, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: "white",
                  border: `1px solid ${LINE}`,
                  color: FAINT,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>{step}</span>
            </li>
          ))}
        </ol>
        <p style={{ fontSize: 12.5, color: FAINT, margin: "14px 0 0", lineHeight: 1.5 }}>
          We&rsquo;re putting the finishing touches on the setup tools — you&rsquo;ll get an email the moment they&rsquo;re
          ready. Questions in the meantime? Use <strong style={{ color: MUTED }}>Support</strong> in the sidebar.
        </p>
      </div>
    </div>
  );
}
