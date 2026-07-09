// MI v2 Phase 5.6 — Offer thresholds admin.
//
// Lists rows from chapter_config.offer_thresholds for the client. Operators
// configure the auto-accept hierarchy: product-specific → collection → global
// → hardcoded fallback (90% of list_price). Deleted / revoked rows are set
// to active=false rather than hard-deleted so the audit trail sticks around.

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import ThresholdForm from "./ThresholdForm";
import RowActions from "./RowActions";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type ThresholdRow = {
  id: string;
  target_type: string;
  target_id: string | null;
  threshold_pct: number | null;
  threshold_absolute: number | null;
  active: boolean;
  notes: string | null;
  updated_at: string;
};

export default async function OfferThresholdsPage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("offer_thresholds")
    .select(
      "id, target_type, target_id, threshold_pct, threshold_absolute, active, notes, updated_at",
    )
    .eq("client_key", clientKey)
    .order("active", { ascending: false })
    .order("target_type", { ascending: true });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Offer thresholds</h1>
        <pre style={{ color: "crimson" }}>Query failed: {error.message}</pre>
      </main>
    );
  }

  const rows = ((data ?? []) as ThresholdRow[]).sort((a, b) => rank(a) - rank(b));

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Offer thresholds — {clientKey}</h1>
        <Link
          href={`/internal/identity-prompts/${clientKey}`}
          style={{ color: "#8B95A6", textDecoration: "none", fontSize: 14 }}
        >
          ← All prompts
        </Link>
      </div>

      <p style={{ color: "#8B95A6", marginTop: 8, maxWidth: 720 }}>
        Auto-accept thresholds for Make-an-Offer bids. Evaluator checks
        product-specific first, then collection, then the global default. Without
        a match it falls back to <strong>90% of list price</strong>. Set{" "}
        <strong>threshold %</strong> against list price or an absolute floor — if
        both are set, the stricter one wins.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Add threshold</h2>
        <ThresholdForm clientKey={clientKey} />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Configured thresholds</h2>
        {rows.length === 0 ? (
          <div style={{ padding: 16, color: "#8B95A6", background: "#F4F5F7", borderRadius: 6 }}>
            No thresholds configured. Fallback = 90% of list price.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#F4F5F7" }}>
                <th style={th}>Scope</th>
                <th style={th}>Target</th>
                <th style={th}>Threshold %</th>
                <th style={th}>Threshold $</th>
                <th style={th}>Active</th>
                <th style={th}>Updated</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: "1px solid #EBEBEB", opacity: r.active ? 1 : 0.55 }}
                >
                  <td style={td}>{r.target_type}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 13 }}>
                    {r.target_id ?? "—"}
                  </td>
                  <td style={td}>{r.threshold_pct != null ? `${r.threshold_pct}%` : "—"}</td>
                  <td style={td}>
                    {r.threshold_absolute != null ? `$${r.threshold_absolute.toFixed(2)}` : "—"}
                  </td>
                  <td style={td}>{r.active ? "Yes" : "No"}</td>
                  <td style={{ ...td, color: "#8B95A6", fontSize: 12 }}>
                    {new Date(r.updated_at).toLocaleDateString()}
                  </td>
                  <td style={td}>
                    <RowActions clientKey={clientKey} id={r.id} active={r.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 600, borderBottom: "1px solid #E4E7EB" };
const td: React.CSSProperties = { padding: "8px 12px", verticalAlign: "top" };

// Sort: product-specific → collection → global (matches evaluator hierarchy).
function rank(r: { target_type: string }): number {
  switch (r.target_type) {
    case "product": return 0;
    case "collection": return 1;
    case "global": return 2;
    default: return 3;
  }
}
