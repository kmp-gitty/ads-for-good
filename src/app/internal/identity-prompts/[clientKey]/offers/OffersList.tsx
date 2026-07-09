"use client";

// MI v2 Phase 5 — Client-side offers list with inline approve / counter / decline.
//
// Only pending_review rows show action buttons. Other statuses render as
// read-only cards. Optimistic UI on state changes; error revert on failure.

import { useState } from "react";
import { approveOffer, counterOffer, declineOffer } from "./_actions";

export type OfferListRow = {
  id: string;
  identity_key_truncated: string;
  target_summary: string;
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

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending_review:    { bg: "#FEE2C6", fg: "#7A3F00" },
  auto_accepted:     { bg: "#D8F0DC", fg: "#0F5C24" },
  manually_accepted: { bg: "#D8F0DC", fg: "#0F5C24" },
  countered:         { bg: "#DCE7F5", fg: "#1F3A6E" },
  declined:          { bg: "#F5DCDC", fg: "#7A1F1F" },
  expired:           { bg: "#EBEBEB", fg: "#555" },
  redeemed:          { bg: "#D8F0DC", fg: "#0F5C24" },
};

export function OffersList({ clientKey, rows }: { clientKey: string; rows: OfferListRow[] }) {
  const [state, setState] = useState<OfferListRow[]>(rows);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  async function doApprove(id: string) {
    setBusy((b) => ({ ...b, [id]: true }));
    const before = state;
    setState((rs) => rs.map((r) => (r.id === id ? { ...r, status: "manually_accepted" } : r)));
    try {
      const result = await approveOffer(clientKey, id);
      if (!result.ok) {
        alert(`Approve failed: ${result.error}`);
        setState(before);
      } else if (result.code) {
        setState((rs) =>
          rs.map((r) => (r.id === id ? { ...r, generated_code: result.code! } : r)),
        );
      }
    } catch (e) {
      alert(`Approve failed: ${String(e)}`);
      setState(before);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function doCounter(id: string, currentBid: number) {
    const amt = window.prompt(`Counter amount (current bid $${currentBid.toFixed(2)}):`);
    if (!amt) return;
    const parsed = parseFloat(amt);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert("Enter a positive amount");
      return;
    }
    setBusy((b) => ({ ...b, [id]: true }));
    const before = state;
    setState((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: "countered", counter_amount: parsed } : r)),
    );
    try {
      const result = await counterOffer(clientKey, id, parsed);
      if (!result.ok) {
        alert(`Counter failed: ${result.error}`);
        setState(before);
      }
    } catch (e) {
      alert(`Counter failed: ${String(e)}`);
      setState(before);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function doDecline(id: string) {
    if (!window.confirm("Decline this offer?")) return;
    setBusy((b) => ({ ...b, [id]: true }));
    const before = state;
    setState((rs) => rs.map((r) => (r.id === id ? { ...r, status: "declined" } : r)));
    try {
      const result = await declineOffer(clientKey, id);
      if (!result.ok) {
        alert(`Decline failed: ${result.error}`);
        setState(before);
      }
    } catch (e) {
      alert(`Decline failed: ${String(e)}`);
      setState(before);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  if (state.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#8B95A6" }}>
        No offers in this filter.
      </div>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
      {state.map((r) => {
        const colors = STATUS_COLORS[r.status] ?? { bg: "#EBEBEB", fg: "#555" };
        const isPending = r.status === "pending_review";
        return (
          <li
            key={r.id}
            style={{
              padding: 16,
              border: "1px solid #E4E7EB",
              borderRadius: 8,
              background: "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: colors.bg, color: colors.fg,
                    }}
                  >
                    {r.status.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: 12, color: "#8B95A6" }}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  <span style={{ fontSize: 12, color: "#8B95A6" }}>
                    {r.identity_key_truncated}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 15 }}>
                  <strong>${r.bid_amount.toFixed(2)}</strong> bid for {r.target_summary}
                  {r.counter_amount != null && (
                    <span style={{ color: "#8B95A6" }}> · countered at ${r.counter_amount.toFixed(2)}</span>
                  )}
                </div>
                {r.generated_code && (
                  <div style={{ marginTop: 4, fontSize: 13, color: "#6B7280", fontFamily: "monospace" }}>
                    code: {r.generated_code}
                  </div>
                )}
                {r.notes && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#8B95A6", fontStyle: "italic" }}>
                    {r.notes}
                  </div>
                )}
              </div>
              {isPending && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => doApprove(r.id)}
                    disabled={busy[r.id]}
                    style={{
                      padding: "6px 12px", borderRadius: 6, border: "none",
                      background: "#0F5C24", color: "white", cursor: "pointer",
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => doCounter(r.id, r.bid_amount)}
                    disabled={busy[r.id]}
                    style={{
                      padding: "6px 12px", borderRadius: 6,
                      border: "1px solid #1F3A6E",
                      background: "white", color: "#1F3A6E", cursor: "pointer",
                    }}
                  >
                    Counter
                  </button>
                  <button
                    onClick={() => doDecline(r.id)}
                    disabled={busy[r.id]}
                    style={{
                      padding: "6px 12px", borderRadius: 6,
                      border: "1px solid #7A1F1F",
                      background: "white", color: "#7A1F1F", cursor: "pointer",
                    }}
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
