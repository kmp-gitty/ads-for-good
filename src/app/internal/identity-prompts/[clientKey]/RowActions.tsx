"use client";

// Per-row action buttons on the internal identity-prompts list. Same visual
// vocabulary as the self-serve prompt list (small white pill buttons for
// non-destructive actions, red-outlined pill for delete on the right edge).

import { useTransition } from "react";
import Link from "next/link";
import { togglePrompt, deletePrompt } from "../_actions";

const INK = "#1F2D43";
const LINE = "#E5E0D4";
const DANGER = "#B3261E";
const DANGER_LINE = "#E7C9C6";

function btnStyle(danger: boolean): React.CSSProperties {
  return {
    fontSize: 12.5,
    fontWeight: 600,
    color: danger ? DANGER : INK,
    background: "white",
    border: `1px solid ${danger ? DANGER_LINE : LINE}`,
    borderRadius: 8,
    padding: "6px 12px",
    textDecoration: "none",
    cursor: "pointer",
    display: "inline-block",
  };
}

export default function RowActions({
  id,
  client_key,
  enabled,
}: {
  id: string;
  client_key: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      await togglePrompt(id, !enabled, client_key);
    });
  }

  function onDelete() {
    if (!window.confirm("Delete this prompt? This cannot be undone.")) return;
    startTransition(async () => {
      await deletePrompt(id, client_key);
    });
  }

  const disabledStyle = pending ? { opacity: 0.55, cursor: "not-allowed" as const } : {};

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <Link
        href={`/internal/identity-prompts/${client_key}/${id}/edit`}
        style={btnStyle(false)}
      >
        Edit
      </Link>
      <button type="button" onClick={onToggle} disabled={pending} style={{ ...btnStyle(false), ...disabledStyle }}>
        {enabled ? "Turn off" : "Turn on"}
      </button>
      <button type="button" onClick={onDelete} disabled={pending} style={{ ...btnStyle(true), ...disabledStyle }}>
        Delete
      </button>
    </div>
  );
}
