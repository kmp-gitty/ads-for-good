"use client";

import { useState, useTransition } from "react";
import { startCheckout, openBillingPortal } from "./_actions";

const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const INK = "#1F2D43";

export function SubscribeButton({ tool, label }: { tool: string; label: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const go = () =>
    start(async () => {
      setErr(null);
      const res = await startCheckout(tool);
      if (!res.ok) { setErr(res.error); return; }
      window.location.href = res.url;
    });
  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        style={{ background: ORANGE, color: "white", fontSize: 13.5, fontWeight: 600, border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", opacity: pending ? 0.6 : 1, width: "100%" }}
      >
        {pending ? "Starting…" : label}
      </button>
      {err && <div style={{ fontSize: 12, color: "#B3261E", marginTop: 6 }}>{err}</div>}
    </div>
  );
}

export function ManagePlanButton({ subtle = false }: { subtle?: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const go = () =>
    start(async () => {
      setErr(null);
      const res = await openBillingPortal();
      if (!res.ok) { setErr(res.error); return; }
      window.location.href = res.url;
    });
  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        style={
          subtle
            ? { background: "white", color: INK, fontSize: 12.5, fontWeight: 600, border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", opacity: pending ? 0.6 : 1 }
            : { background: INK, color: "white", fontSize: 13.5, fontWeight: 600, border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", opacity: pending ? 0.6 : 1 }
        }
      >
        {pending ? "Opening…" : "Manage plan"}
      </button>
      {err && <div style={{ fontSize: 12, color: "#B3261E", marginTop: 6 }}>{err}</div>}
    </div>
  );
}
