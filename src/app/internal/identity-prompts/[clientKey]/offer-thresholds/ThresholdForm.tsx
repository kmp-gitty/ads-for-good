"use client";

// MI v2 Phase 5.6 — Structured form for a single offer-threshold row.
// Product/collection rows need a target_id; global rows leave it null.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createThreshold } from "./_actions";

type ScopeType = "product" | "collection" | "global";

export default function ThresholdForm({ clientKey }: { clientKey: string }) {
  const router = useRouter();
  const [scope, setScope] = useState<ScopeType>("product");
  const [targetId, setTargetId] = useState("");
  const [pct, setPct] = useState<string>("");
  const [abs, setAbs] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if ((scope === "product" || scope === "collection") && !targetId.trim()) {
      setErr(`${scope} threshold requires a target_id`);
      return;
    }
    const pctNum = pct === "" ? null : Number(pct);
    const absNum = abs === "" ? null : Number(abs);
    if (pctNum == null && absNum == null) {
      setErr("Provide at least one of threshold_pct or threshold_absolute");
      return;
    }
    if (pctNum != null && (pctNum < 0 || pctNum > 100)) {
      setErr("threshold_pct must be between 0 and 100");
      return;
    }
    if (absNum != null && absNum < 0) {
      setErr("threshold_absolute must be >= 0");
      return;
    }

    startTransition(async () => {
      const result = await createThreshold({
        client_key: clientKey,
        target_type: scope,
        target_id: scope === "global" ? null : targetId.trim(),
        threshold_pct: pctNum,
        threshold_absolute: absNum,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setTargetId("");
      setPct("");
      setAbs("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 640 }}>
      <div style={row}>
        <label style={label}>Scope</label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as ScopeType)}
          style={input}
        >
          <option value="product">Product</option>
          <option value="collection">Collection</option>
          <option value="global">Global default</option>
        </select>
      </div>

      {scope !== "global" && (
        <div style={row}>
          <label style={label}>
            {scope === "product" ? "Product ID" : "Collection ID"}
          </label>
          <input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder={scope === "product" ? "shopify_product_id or gid" : "collection_id"}
            style={input}
          />
        </div>
      )}

      <div style={row}>
        <label style={label}>Threshold %</label>
        <input
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          placeholder="e.g. 85 = auto-accept at 85% of list price"
          type="number"
          min={0}
          max={100}
          step={1}
          style={input}
        />
      </div>

      <div style={row}>
        <label style={label}>Threshold $</label>
        <input
          value={abs}
          onChange={(e) => setAbs(e.target.value)}
          placeholder="absolute floor in dollars (optional)"
          type="number"
          min={0}
          step={0.01}
          style={input}
        />
      </div>

      <div style={row}>
        <label style={label}>Notes</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="internal note (optional)"
          style={input}
        />
      </div>

      {err && <div style={{ color: "crimson", fontSize: 13 }}>{err}</div>}

      <div>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "8px 16px", borderRadius: 6, border: "none",
            background: "#E36410", color: "white", cursor: "pointer",
            fontWeight: 600, opacity: pending ? 0.5 : 1,
          }}
        >
          {pending ? "Saving…" : "Add threshold"}
        </button>
      </div>
    </form>
  );
}

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  alignItems: "center",
  gap: 12,
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#1F2D43" };
const input: React.CSSProperties = {
  padding: "8px 12px", border: "1px solid #D6DCE5", borderRadius: 6,
  fontSize: 14, color: "#1F2D43",
};
