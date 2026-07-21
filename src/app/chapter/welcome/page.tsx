// Post-signup landing for self-serve tenants (Phase 1). Sits outside the
// (authed) dashboard chrome. The clean URL /chapter/<client_key>/welcome is
// rewritten by middleware to /chapter/welcome?client=<client_key>, so we read
// the tenant from ?client. Access is already enforced by middleware
// (canAccessClient), so the row we read is the visitor's own tenant.
//
// The real per-tool setup surface arrives in Phase 2/3; this is a minimal,
// friendly confirmation so a new signup doesn't land on an empty dashboard.

import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";

export const metadata = { title: "Welcome to Chapter" };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();

  let businessName = "";
  let trialEnds: string | null = null;
  if (clientKey) {
    const supabase = createSupabaseServiceRoleClient();
    const { data } = await supabase
      .schema("chapter_config")
      .from("clients")
      .select("business_name, trial_ends_at")
      .eq("client_key", clientKey)
      .maybeSingle();
    businessName = (data?.business_name as string) || "";
    trialEnds = (data?.trial_ends_at as string) || null;
  }

  const trialEndsLabel = trialEnds
    ? new Date(trialEnds).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F6F1E5",
        fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
        padding: "24px 0",
      }}
    >
      <div
        style={{
          width: 460,
          background: "white",
          border: "1px solid #E5DDC9",
          borderRadius: 14,
          padding: 30,
          boxShadow: "0 1px 2px rgba(31,45,67,.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 30, height: 30, background: "#E36410", color: "white", borderRadius: 8, display: "grid", placeItems: "center", fontWeight: 700 }}>C</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1F2D43" }}>
            Chapter
            <span style={{ color: "#8A98AD", fontSize: 11, marginLeft: 6, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 400 }}>by afG</span>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1F2D43", margin: "0 0 8px" }}>
          Welcome{businessName ? `, ${businessName}` : ""}! 🎉
        </h1>
        <p style={{ fontSize: 14, color: "#5C6B82", margin: "0 0 20px", lineHeight: 1.6 }}>
          Your account is live and your <strong>30-day free trial</strong> is active
          {trialEndsLabel ? <> — it runs through <strong>{trialEndsLabel}</strong></> : null}.
        </p>

        <div style={{ background: "#FAFAF6", border: "1px solid #E5DDC9", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#8A98AD", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 4 }}>Workspace ID</div>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 15, color: "#1F2D43", fontWeight: 600 }}>
            {clientKey || "—"}
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#5C6B82", margin: "0 0 6px", fontWeight: 600 }}>What&rsquo;s next</p>
        <p style={{ fontSize: 13, color: "#5C6B82", margin: 0, lineHeight: 1.6 }}>
          Head into your workspace to see your <strong>Smart Prompts</strong> and <strong>Smart Links</strong>. The
          setup tools are almost ready — we&rsquo;ll email you the moment they go live.
        </p>

        {clientKey && (
          <a
            href={`/chapter/${clientKey}/home`}
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 20,
              background: "#E36410",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              padding: "12px 16px",
              textDecoration: "none",
            }}
          >
            Enter your workspace →
          </a>
        )}

        <p style={{ fontSize: 12, color: "#8A98AD", margin: "18px 0 0", lineHeight: 1.5 }}>
          Sign back in anytime at{" "}
          <a href="/chapter/login" style={{ color: "#E36410", fontWeight: 600 }}>/chapter/login</a>.
        </p>
      </div>
    </div>
  );
}
