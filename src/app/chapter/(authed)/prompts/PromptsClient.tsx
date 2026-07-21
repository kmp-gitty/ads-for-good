"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { togglePrompt, deletePrompt } from "./_actions";
import { PRESET_LABELS, type ExistingPrompt, type SelfServePresetType } from "./types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

function triggerLabel(t: Record<string, unknown> | null): string {
  if (!t) return "—";
  switch (t.type) {
    case "click_element": return `On click · ${t.selector || "?"}`;
    case "exit_intent": return "On exit intent";
    case "time_on_page": return `After ${Math.round((Number(t.delay_ms) || 0) / 1000)}s on page`;
    case "scroll_depth": return `At ${t.percent}% scroll`;
    default: return String(t.type || "—");
  }
}

export default function PromptsClient({
  clientKey,
  prompts,
}: {
  clientKey: string;
  prompts: ExistingPrompt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await fn();
      setBusyId(null);
      if (!res.ok) alert(res.error || "Something went wrong.");
      else router.refresh();
    });
  };

  return (
    <div style={{ padding: "28px 30px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Smart Prompts</h1>
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>
            On-site prompts that turn lost moments into conversions.
          </p>
        </div>
        <Link
          href={`/chapter/${clientKey}/prompts/new`}
          style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 18px", borderRadius: 10, whiteSpace: "nowrap" }}
        >
          + New prompt
        </Link>
      </div>

      {prompts.length === 0 ? (
        <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", background: PANEL }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No prompts yet</div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto 18px", maxWidth: 360, lineHeight: 1.5 }}>
            Create your first prompt, then install your snippet so it starts capturing on your site.
          </p>
          <Link
            href={`/chapter/${clientKey}/prompts/new`}
            style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 20px", borderRadius: 10, display: "inline-block" }}
          >
            Create your first prompt
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {prompts.map((p) => {
            const rate = p.hit_count > 0 ? Math.round((p.submit_count / p.hit_count) * 100) : null;
            const busy = busyId === p.id && pending;
            return (
              <div key={p.id} style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: 16, background: "white", opacity: busy ? 0.6 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{p.headline || p.slug}</span>
                      <span style={{ fontSize: 10.5, color: ORANGE, background: "#FFF4EC", border: `1px solid ${ORANGE}33`, borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: ".06em" }}>
                        {PRESET_LABELS[p.preset_type as SelfServePresetType] || p.preset_type}
                      </span>
                      <span style={{ fontSize: 11, color: p.enabled ? "#2E7D5B" : FAINT, fontWeight: 600 }}>
                        {p.enabled ? "● Live" : "○ Off"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{p.slug}</div>
                    <div style={{ fontSize: 12.5, color: FAINT, marginTop: 4 }}>{triggerLabel(p.trigger_jsonb)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: FAINT }}>Shown {p.hit_count} · Submitted {p.submit_count}</div>
                    {rate !== null && <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 2 }}>{rate}%</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
                  <Link href={`/chapter/${clientKey}/prompts/${p.id}/edit`} style={btn(false)}>Edit</Link>
                  <button type="button" disabled={busy} onClick={() => act(p.id, () => togglePrompt(p.id, !p.enabled))} style={btn(false)}>
                    {p.enabled ? "Turn off" : "Turn on"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { if (confirm("Delete this prompt? This can’t be undone.")) act(p.id, () => deletePrompt(p.id)); }}
                    style={{ ...btn(true), marginLeft: "auto" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function btn(danger: boolean): React.CSSProperties {
  return {
    fontSize: 12.5,
    fontWeight: 600,
    color: danger ? "#B3261E" : INK,
    background: "white",
    border: `1px solid ${danger ? "#E7C9C6" : LINE}`,
    borderRadius: 8,
    padding: "6px 12px",
    textDecoration: "none",
    cursor: "pointer",
  };
}
