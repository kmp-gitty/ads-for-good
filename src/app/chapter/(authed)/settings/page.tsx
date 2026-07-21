// Self-serve Settings (Phase 2). Read-only workspace details for now — the
// tenant can confirm what's set up. Editable fields + pixel-key reveal arrive
// alongside the tool builders in Phase 3.
//
// Rendered inside (authed) chrome; middleware rewrites /chapter/<key>/settings
// → /chapter/settings?client=<key>.

import { getClientEntitlement, getCurrentChapterUser } from "@/app/lib/auth/chapter-user";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const LINE = "#E5E0D4";

const TOOL_LABELS: Record<string, string> = {
  smart_prompts: "Smart Prompts",
  smart_links: "Smart Links",
  chapter: "Chapter Analytics",
};

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "13px 0", borderBottom: `1px solid ${LINE}` }}>
      <span style={{ fontSize: 12.5, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</span>
      <span style={{ fontSize: 14, color: INK, fontWeight: 500, fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();
  const [ent, user] = await Promise.all([
    clientKey ? getClientEntitlement(clientKey) : Promise.resolve(null),
    getCurrentChapterUser(),
  ]);

  const tools = (ent?.tools_enabled || []).filter((t) => t !== "chapter");

  return (
    <div style={{ padding: "28px 30px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Settings</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px" }}>Your workspace details.</p>

      <div style={{ background: "white", border: `1px solid ${LINE}`, borderRadius: 12, padding: "6px 20px 16px" }}>
        <Row label="Business" value={ent?.business_name || "—"} />
        <Row label="Workspace ID" value={clientKey || "—"} mono />
        <Row label="Owner" value={user?.email || "—"} />
        <Row label="Tools" value={tools.map((t) => TOOL_LABELS[t] || t).join(", ") || "—"} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "13px 0" }}>
          <span style={{ fontSize: 12.5, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em" }}>Plan</span>
          <span style={{ fontSize: 14, color: INK, fontWeight: 500, textTransform: "capitalize" }}>
            {ent?.billing_status === "trialing" ? "Free trial" : ent?.plan || ent?.billing_status || "—"}
          </span>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: FAINT, margin: "16px 2px 0", lineHeight: 1.5 }}>
        Need to change your business name or owner? Reach us through <strong style={{ color: MUTED }}>Support</strong> —
        self-editing lands shortly.
      </p>
    </div>
  );
}
