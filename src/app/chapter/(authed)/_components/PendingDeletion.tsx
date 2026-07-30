"use client";

// Full-screen state shown to a self-serve tenant whose account is scheduled for
// deletion. Replaces the whole tool surface (rendered by the (authed) layout
// gate on ent.deletion_requested_at). Their live prompts/links keep serving
// end-users during the grace window; this is the owner's off-switch + undo.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reactivateAccount } from "../settings/_delete-actions";

const INK = "#1F2D43", MUTED = "#5C6B82", ORANGE = "#E36410", LINE = "#E5E0D4";

export default function PendingDeletion({
  businessName,
  requestedAt,
}: {
  businessName: string;
  requestedAt: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const purge = new Date(new Date(requestedAt).getTime() + 30 * 86_400_000);
  const purgeLabel = purge.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const daysLeft = Math.max(0, Math.ceil((purge.getTime() - Date.now()) / 86_400_000));

  function onReactivate() {
    setError(null);
    start(async () => {
      const res = await reactivateAccount();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#F6F1E5" }}>
      <div style={{ maxWidth: 480, width: "100%", background: "white", border: `1px solid ${LINE}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🗓️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 8px" }}>
          {businessName} is scheduled for deletion
        </h1>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 4px" }}>
          Your data will be permanently erased on <strong style={{ color: INK }}>{purgeLabel}</strong>
          {" "}({daysLeft} day{daysLeft === 1 ? "" : "s"} left). We emailed a full export of your leads,
          submissions, and links to your account address.
        </p>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: "12px 0 20px" }}>
          Changed your mind? Reactivate now and pick up right where you left off — nothing has been deleted yet.
        </p>

        {error && (
          <div style={{ fontSize: 12.5, color: "#B2452F", marginBottom: 12 }}>{error}</div>
        )}

        <button
          onClick={onReactivate}
          disabled={pending}
          style={{
            width: "100%", padding: "11px 12px", borderRadius: 9, border: "none",
            background: ORANGE, color: "white", fontWeight: 600, fontSize: 14.5,
            cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Reactivating…" : "Reactivate my account"}
        </button>

        <p style={{ fontSize: 11.5, color: "#8A98AD", margin: "16px 0 0", lineHeight: 1.5 }}>
          Need help? <a href="mailto:katoa@ads4good.com" style={{ color: ORANGE, fontWeight: 600 }}>katoa@ads4good.com</a>
        </p>
      </div>
    </div>
  );
}
