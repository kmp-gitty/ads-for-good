// Self-serve Billing view. Left column: plan summary → payment details →
// invoices. Right column: per-tool breakdown (Smart Prompts / Smart Links) with
// price, what's included, and a Subscribe button. Stripe Checkout + Customer
// Portal are live (Phase 5); invoices live in the portal.

import { SubscribeButton, ManagePlanButton } from "./BillingActions";
import type { TenantBilling } from "./_actions";
import { ACTIVE_SUB_STATUSES, BILLABLE_TOOLS } from "@/app/lib/stripe/config";

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
    price: 19,
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
    price: 9,
    blurb: "One link, many destinations — route each visitor to the right place.",
    features: [
      "Unlimited smart links",
      "Route by device, location, time, campaign, or referrer",
      "Click analytics per link",
      "Your own branded domain (go.yourbrand.com)",
    ],
  },
};

export default function SelfServeBilling({
  businessName,
  plan,
  billingStatus,
  trialEndsAt,
  toolsEnabled,
  billing,
  checkout,
}: {
  businessName: string | null;
  plan: string | null;
  billingStatus: string | null;
  trialEndsAt: string | null;
  toolsEnabled: string[];
  billing: TenantBilling;
  checkout?: string;
}) {
  const isTrialing = billingStatus === "trialing";
  const tools = toolsEnabled.filter((t) => t !== "chapter" && TOOL_INFO[t]);
  const total = tools.reduce((a, t) => a + TOOL_INFO[t].price, 0);
  const subFor = (t: string) => billing.subs[t as keyof typeof billing.subs];
  const isSubscribed = (t: string) => {
    const s = subFor(t);
    return !!s && ACTIVE_SUB_STATUSES.has(s.status);
  };

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
  } else if (billingStatus === "past_due") {
    statusLabel = "Past due";
    statusDetail = "Update your card in Manage plan to keep your tools live.";
  } else if (billingStatus === "canceled") {
    statusLabel = "No active plan";
    statusDetail = "Subscribe below to turn your tools back on — your prompts and links are still saved.";
  }

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 1040, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Billing</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px" }}>
        {businessName ? `${businessName}'s plan and billing.` : "Your plan and billing."}
      </p>

      {checkout === "success" && (
        <div style={{ border: `1px solid ${GREEN}44`, background: "#EEF6F1", borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: 13.5, color: INK }}>
          ✓ You&rsquo;re all set — your subscription is active. It can take a few seconds to reflect here.
        </div>
      )}

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* LEFT — plan / payment / invoices */}
        <div style={{ flex: "1 1 380px", minWidth: 0, maxWidth: 460, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Plan summary */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <Label>Current plan</Label>
                <div style={{ fontSize: 19, fontWeight: 700, color: INK }}>
                  {plan || (tools.length ? tools.map((t) => TOOL_INFO[t].name).join(" + ") : isTrialing ? "Free trial" : "No active plan")}
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
              {billing.hasCustomer
                ? "Your card and invoices live in the billing portal."
                : isTrialing
                  ? "No card on file yet. Subscribe to a tool to add one — you won’t be charged until your trial ends."
                  : "No card on file. Subscribe to a tool below to add one."}
            </div>
            {billing.hasCustomer ? <ManagePlanButton subtle /> : <Placeholder>Added when you subscribe</Placeholder>}
          </Card>

          {/* Invoices */}
          <Card>
            <Label>Billing history</Label>
            {billing.invoices.length === 0 ? (
              <div style={{ border: `1px dashed ${LINE}`, borderRadius: 8, padding: "18px 14px", textAlign: "center", background: PANEL, marginTop: 8 }}>
                <div style={{ fontSize: 13, color: MUTED }}>No charges yet</div>
                <div style={{ fontSize: 11.5, color: FAINT, marginTop: 4, lineHeight: 1.4 }}>
                  Your first invoice appears after your trial converts to a paid plan.
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8, maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {billing.invoices.map((inv) => {
                  const date = new Date(inv.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const paid = inv.status === "paid";
                  return (
                    <a
                      key={inv.id}
                      href={inv.hostedUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textDecoration: "none", border: `1px solid ${LINE}`, borderRadius: 8, padding: "9px 12px", background: "white" }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{date}</div>
                        <div style={{ fontSize: 11, color: paid ? GREEN : FAINT, textTransform: "capitalize" }}>{inv.status}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>${inv.amount.toFixed(2)}</span>
                        <span style={{ fontSize: 12, color: ORANGE, fontWeight: 600 }}>View →</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
            {billing.hasCustomer && billing.invoices.length > 0 && (
              <p style={{ fontSize: 11, color: FAINT, marginTop: 8, lineHeight: 1.4 }}>
                Each opens its Stripe receipt. Full history + card management is in <strong style={{ color: MUTED }}>Manage plan</strong>.
              </p>
            )}
          </Card>
        </div>

        {/* RIGHT — your tools (always show both so Subscribe is reachable) */}
        <div style={{ flex: "1 1 400px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 10 }}>Your tools</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {BILLABLE_TOOLS.map((t) => {
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
                  <div style={{ marginTop: 14 }}>
                    {isSubscribed(t)
                      ? <SubState sub={subFor(t)!} />
                      : <SubscribeButton tool={t} label={`Subscribe · $${info.price}/mo`} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manage plan */}
          <div style={{ marginTop: 16 }}>
            {billing.hasCustomer ? (
              <>
                <ManagePlanButton />
                <p style={{ fontSize: 11.5, color: FAINT, marginTop: 8, lineHeight: 1.4 }}>
                  Update your card, download invoices, or cancel any time in the billing portal.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 11.5, color: FAINT, lineHeight: 1.4 }}>
                Subscribe to a tool above — you can manage your card, invoices, and cancellation in one place after that.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubState({ sub }: { sub: { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null } }) {
  const date = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  let text: string;
  let tone: "green" | "orange" = "green";
  if (sub.status === "past_due") { text = "Past due — update your card"; tone = "orange"; }
  else if (sub.cancelAtPeriodEnd) { text = date ? `Cancels ${date}` : "Cancels at period end"; tone = "orange"; }
  else if (sub.status === "trialing") { text = date ? `On trial — renews ${date}` : "On trial"; tone = "green"; }
  else { text = "Subscribed"; tone = "green"; }
  const c = tone === "green" ? { bg: "#EEF6F1", fg: GREEN } : { bg: "#FFF4EC", fg: ORANGE };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: c.bg, color: c.fg, border: `1px solid ${c.fg}33`, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600 }}>
      <span>{tone === "green" ? "✓" : "!"}</span>
      {text}
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
