"use client";

// Per-row actions on the internal redirect-rules list. Visual language matches
// the self-serve prompt list (small pill buttons for non-destructive actions,
// red-outlined pill on the right for delete).

import Link from "next/link";
import { useTransition } from "react";
import { toggleRule, deleteRule } from "../_actions";

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

export default function RuleRowActions({
  id,
  client_key,
  slug,
  enabled,
}: {
  id: string;
  client_key: string;
  slug: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      await toggleRule(id, !enabled, client_key, slug);
    });
  }

  function onDelete() {
    if (!window.confirm("Delete this rule? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteRule(id, client_key, slug);
    });
  }

  const disabledStyle = pending ? { opacity: 0.55, cursor: "not-allowed" as const } : {};

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
      <Link
        href={`/internal/redirect-rules/${client_key}/${id}`}
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
