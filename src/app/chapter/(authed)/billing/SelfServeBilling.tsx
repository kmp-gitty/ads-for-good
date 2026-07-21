// Self-serve Billing view (Phase 2 stub). Shows the tenant's plan + trial
// status. Real Stripe Checkout / Customer Portal wiring lands in Phase 5; for
// now the "Manage plan" action is a disabled placeholder so the surface reads
// honestly without a dead link.

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

const TOOL_LABELS: Record<string, string> = {
  smart_prompts: "Smart Prompts",
  smart_links: "Smart Links",
  chapter: "Chapter Analytics",
};

export default function SelfServeBilling({
  businessName,
  plan,
  billingStatus,
  trialEndsAt,
  toolsEnabled,
}: {
  businessName: string | null;
  plan: string | null;
  billingStatus: string | null;
  trialEndsAt: string | null;
  toolsEnabled: string[];
}) {
  const isTrialing = billingStatus === "trialing";
  let statusLabel = billingStatus || "—";
  let statusDetail: string | null = null;
  if (isTrialing && trialEndsAt) {
    const days = Math.max(
      0,
      Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000),
    );
    const ends = new Date(trialEndsAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    statusLabel = "Free trial";
    statusDetail = `${days} day${days === 1 ? "" : "s"} left — renews ${ends}`;
  } else if (billingStatus === "active") {
    statusLabel = "Active";
  }

  const tools = toolsEnabled.filter((t) => t !== "chapter");

  return (
    <div style={{ padding: "28px 30px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Billing</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px" }}>
        {businessName ? `${businessName}'s plan and billing.` : "Your plan and billing."}
      </p>

      {/* Status card */}
      <div style={{ background: "white", border: `1px solid ${LINE}`, borderRadius: 12, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: FAINT, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 5 }}>
              Current plan
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: INK }}>
              {plan ? plan : tools.map((t) => TOOL_LABELS[t] || t).join(" + ") || "Starter"}
            </div>
          </div>
          <div
            style={{
              background: isTrialing ? "#FFF4EC" : "#EEF6F1",
              color: isTrialing ? ORANGE : "#2E7D5B",
              border: `1px solid ${isTrialing ? ORANGE + "33" : "#2E7D5B33"}`,
              borderRadius: 999,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {statusLabel}
          </div>
        </div>
        {statusDetail && (
          <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>{statusDetail}</div>
        )}

        <div style={{ height: 1, background: LINE, margin: "18px 0" }} />

        <div style={{ fontSize: 11, color: FAINT, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>
          Included tools
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tools.length === 0 && <span style={{ fontSize: 13, color: MUTED }}>—</span>}
          {tools.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 12.5,
                color: INK,
                background: PANEL,
                border: `1px solid ${LINE}`,
                borderRadius: 999,
                padding: "5px 12px",
              }}
            >
              {TOOL_LABELS[t] || t}
            </span>
          ))}
        </div>
      </div>

      {/* Manage (Phase 5 placeholder) */}
      <div
        style={{
          background: PANEL,
          border: `1px solid ${LINE}`,
          borderRadius: 12,
          padding: 20,
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, maxWidth: 460 }}>
          {isTrialing
            ? "You won’t be charged until your trial ends. Add a payment method anytime to keep your tools live afterward."
            : "Update your payment method, download invoices, or change your plan."}
        </div>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: FAINT,
            border: `1px dashed ${LINE}`,
            borderRadius: 8,
            padding: "9px 14px",
            whiteSpace: "nowrap",
          }}
        >
          Manage plan — coming soon
        </div>
      </div>
    </div>
  );
}
