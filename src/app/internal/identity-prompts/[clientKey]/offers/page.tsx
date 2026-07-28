// MI v2 Phase 5 — Make an Offer admin review queue.
//
// Chapter-staff-only surface. Shows all offer rows for the client with the
// state chip, bid, target, and (for pending_review) approve/counter/decline
// actions. Terminal-state rows render read-only so operators can audit past
// decisions.
//
// Route: /internal/identity-prompts/<clientKey>/offers

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { OffersList } from "./OffersList";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type OfferRow = {
  id: string;
  client_key: string;
  identity_key: string;
  prompt_id: string | null;
  target_resource_jsonb: Record<string, unknown>;
  bid_amount: number;
  counter_amount: number | null;
  status: string;
  generated_code: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
};

type PageProps = {
  params: Promise<{ clientKey: string }>;
  searchParams: Promise<{ status?: string; limit?: string }>;
};

export default async function OffersAdminPage({ params, searchParams }: PageProps) {
  const { clientKey } = await params;
  const sp = await searchParams;
  const statusFilter = sp?.status?.trim() || "all";
  const limit = Math.min(parseInt(sp?.limit || "50", 10) || 50, 200);

  let query = supabase
    .schema("chapter_engagement")
    .from("offers")
    .select(
      "id, client_key, identity_key, prompt_id, target_resource_jsonb, bid_amount, counter_amount, status, generated_code, expires_at, reviewed_at, reviewed_by, notes, created_at",
    )
    .eq("client_key", clientKey)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter !== "all") query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) {
    return (
      <div style={{ border: "1px solid #E7C9C6", background: "#FDECEA", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
        Query failed: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as unknown as OfferRow[];

  // Count-by-status for the filter pills.
  const counts: Record<string, number> = { all: 0 };
  const { data: allRows } = await supabase
    .schema("chapter_engagement")
    .from("offers")
    .select("status")
    .eq("client_key", clientKey);
  if (allRows) {
    counts.all = allRows.length;
    for (const r of allRows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link
            href={`/internal/identity-prompts/${clientKey}`}
            style={{ color: "#5C6B82", textDecoration: "none", fontSize: 13 }}
          >
            ← Back to {clientKey}
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1F2D43", margin: "6px 0 4px" }}>
            Offers —{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 18, color: "#5C6B82" }}>
              {clientKey}
            </span>
          </h1>
          <p style={{ color: "#5C6B82", margin: 0, fontSize: 13.5 }}>
            Make-an-Offer submissions from the pixel. Pending review → operator decides.
          </p>
        </div>
      </div>

      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["all", "pending_review", "auto_accepted", "manually_accepted", "countered", "declined", "expired", "redeemed"].map(
          (s) => (
            <Link
              key={s}
              href={`/internal/identity-prompts/${clientKey}/offers?status=${s}`}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                textDecoration: "none",
                background: s === statusFilter ? "#E36410" : "white",
                border: `1px solid ${s === statusFilter ? "#E36410" : "#E5E0D4"}`,
                color: s === statusFilter ? "white" : "#1F2D43",
              }}
            >
              {s.replace(/_/g, " ")} ({counts[s] ?? 0})
            </Link>
          ),
        )}
      </nav>

      <OffersList
        clientKey={clientKey}
        rows={rows.map((r) => ({
          id: r.id,
          identity_key_truncated: truncateIdentity(r.identity_key),
          target_summary: summarizeTarget(r.target_resource_jsonb),
          bid_amount: r.bid_amount,
          counter_amount: r.counter_amount,
          status: r.status,
          generated_code: r.generated_code,
          expires_at: r.expires_at,
          reviewed_at: r.reviewed_at,
          reviewed_by: r.reviewed_by,
          notes: r.notes,
          created_at: r.created_at,
        }))}
      />
    </div>
  );
}

function truncateIdentity(key: string | null): string {
  if (!key) return "—";
  const colonIdx = key.indexOf(":");
  if (colonIdx === -1) return key.slice(0, 12) + "…";
  return `${key.slice(0, colonIdx)}:${key.slice(colonIdx + 1, colonIdx + 9)}…`;
}

function summarizeTarget(t: Record<string, unknown>): string {
  const type = t.type as string | undefined;
  if (type === "product") {
    const name = (t.product_name as string) || (t.product_id as string) || "product";
    const price = (t.list_price as number | null) ?? null;
    return price != null ? `${name} (list $${price.toFixed(2)})` : name;
  }
  if (type === "collection") return (t.collection_name as string) || "collection";
  if (type === "cart") return "cart snapshot";
  if (type === "storewide") return "storewide";
  return "unknown target";
}
