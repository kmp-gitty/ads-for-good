// Self-serve Billing view. Left column: plan summary → payment details →
// invoices. Right column: per-tool breakdown (Smart Prompts / Smart Links) with
// price + what's included. Real Stripe Checkout / Customer Portal / invoices
// land in Phase 5; for now Payment + Invoices are honest placeholders.
//
// NOTE: prices below are PLACEHOLDERS — swap TOOL_INFO[...].price once Stripe
// pricing is finalized. The feature lists are accurate.

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const GREEN = "#2E7D5B";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

const TOOL_INFO: Record<string, { name: string; price: number; blurb: string; features: string[] }> = {
  smart_prompts: {
    name: "Smart Prompts",
    price: 29, // placeholder
    blurb: "On-site prompts that turn lost moments into conversions.",
    features: [
      "All 4 prompt types (Email Exchange, Custom Form, Notification, Phone Call)",
      "Unlimited prompts",
      "Every trigger — exit intent, time on page, scroll, on-click",
      "Response capture + show → submit analytics",
      "One-line install, edit anytime (no code)",
    ],
  },
  smart_links: {
    name: "Smart Links",
    price: 19, // placeholder
    blurb: "One link, many destinations — route each visitor to the right place.",
    features: [
      "Unlimited smart links",
      "Route by device, location, time, campaign, or referrer",
      "Click analytics per link",
      "Branded domain — coming soon",
    ],
  },
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
  const tools = toolsEnabled.filter((t) => t !== "chapter" && TOOL_INFO[t]);
  const total = tools.reduce((a, t) => a + TOOL_INFO[t].price, 0);

  let statusLabel = billingStatus || "—";
  let statusDetail: string | null = null;
  let trialEndsLabel = "";
  if (isTrialing && trialEndsAt) {
    const days = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
    trialEndsLabel = new Date(trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    statusLabel = "Free trial";
    statusDetail = `${days} day${days === 1 ? "" : "s"} left — renews ${trialEndsLabel}`;
  } else if (billingStatus === "active") {
    statusLabel = "Active";
  }

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 1040, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Billing</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px" }}>
        {businessName ? `${businessName}'s plan and billing.` : "Your plan and billing."}
      </p>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* LEFT — plan / payment / invoices */}
        <div style={{ flex: "1 1 380px", minWidth: 0, maxWidth: 460, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Plan summary */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <Label>Current plan</Label>
                <div style={{ fontSize: 19, fontWeight: 700, color: INK }}>
                  {plan || tools.map((t) => TOOL_INFO[t].name).join(" + ") || "Starter"}
                </div>
              </div>
              <span style={{ background: isTrialing ? "#FFF4EC" : "#EEF6F1", color: isTrialing ? ORANGE : GREEN, border: `1px solid ${isTrialing ? ORANGE + "33" : GREEN + "33"}`, borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 600 }}>
                {statusLabel}
              </span>
            </div>
            {statusDetail && <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>{statusDetail}</div>}
            <div style={{ height: 1, background: LINE, margin: "16px 0" }} />
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: MUTED }}>{isTrialing ? "After your trial" : "Monthly total"}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: INK }}>${total}<span style={{ fontSize: 12, color: FAINT, fontWeight: 500 }}>/mo</span></span>
            </div>
          </Card>

          {/* Payment details */}
          <Card>
            <Label>Payment method</Label>
            <div style={{ fontSize: 13.5, color: MUTED, margin: "6px 0 12px", lineHeight: 1.5 }}>
              {isTrialing
                ? "No card on file yet. Add one before your trial ends to keep your tools live — you won’t be charged until then."
                : "No card on file."}
            </div>
            <Placeholder>Add payment method — coming soon</Placeholder>
          </Card>

          {/* Invoices */}
          <Card>
            <Label>Invoices</Label>
            <div style={{ border: `1px dashed ${LINE}`, borderRadius: 8, padding: "18px 14px", textAlign: "center", background: PANEL, marginTop: 8 }}>
              <div style={{ fontSize: 13, color: MUTED }}>No invoices yet</div>
              <div style={{ fontSize: 11.5, color: FAINT, marginTop: 4, lineHeight: 1.4 }}>
                Your first invoice appears after your trial converts to a paid plan.
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT — what's included */}
        <div style={{ flex: "1 1 400px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 10 }}>What&rsquo;s included</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tools.length === 0 && <Card><span style={{ fontSize: 13, color: MUTED }}>No tools on this workspace yet.</span></Card>}
            {tools.map((t) => {
              const info = TOOL_INFO[t];
              return (
                <div key={t} style={{ background: "white", border: `1px solid ${LINE}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: INK }}>{info.name}</span>
                    <span style={{ fontSize: 17, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>${info.price}<span style={{ fontSize: 12, color: FAINT, fontWeight: 500 }}>/mo</span></span>
                  </div>
                  <p style={{ fontSize: 12.5, color: MUTED, margin: "4px 0 12px", lineHeight: 1.5 }}>{info.blurb}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {info.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: INK, lineHeight: 1.4 }}>
                        <span style={{ color: GREEN, flexShrink: 0, fontWeight: 700 }}>✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {tools.length > 1 && (
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "4px 20px" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: INK }}>${total}<span style={{ fontSize: 12, color: FAINT, fontWeight: 500 }}>/mo</span></span>
              </div>
            )}
          </div>

          {/* Manage plan (Phase 5 / Stripe) */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: FAINT, border: `1px dashed ${LINE}`, borderRadius: 8, padding: "8px 12px" }}>+ Add a tool — coming soon</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: FAINT, border: `1px dashed ${LINE}`, borderRadius: 8, padding: "8px 12px" }}>Change plan — coming soon</span>
            </div>
            <p style={{ fontSize: 11.5, color: FAINT, marginTop: 8, lineHeight: 1.4 }}>
              Add or remove tools and change your plan here once billing is live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "white", border: `1px solid ${LINE}`, borderRadius: 12, padding: 20 }}>{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: FAINT, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 5 }}>{children}</div>;
}
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 600, color: FAINT, border: `1px dashed ${LINE}`, borderRadius: 8, padding: "9px 12px", textAlign: "center" }}>
      {children}
    </div>
  );
}
