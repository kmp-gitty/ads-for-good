"use client";

// Small popover menu on each Recommendation card that lets the operator set
// or clear a severity override, or dismiss the finding entirely.
//
// Kept in a separate component (rather than inlined into RecommendationCard)
// so the card render stays fully server-friendly (Card is just a display
// component; menu is the interactive slice).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFindingSeverityOverride, dismissFinding } from "./_actions";

type Sev = "high" | "medium" | "low";

export default function OverrideMenu({
  findingId,
  computedSeverity,
  currentOverride,
  overrideNote,
  overrideBy,
  overrideAt,
}: {
  findingId: string;
  computedSeverity: Sev;
  currentOverride: Sev | null;
  overrideNote: string | null;
  overrideBy: string | null;
  overrideAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function apply(next: Sev | null) {
    let note: string | null = null;
    if (next !== null) {
      const raw = window.prompt(
        `Set severity to ${next.toUpperCase()}. Optional note (why override?):`,
        overrideNote ?? "",
      );
      if (raw === null) return; // cancelled
      note = raw.trim() || null;
    } else if (!window.confirm("Clear the severity override?")) {
      return;
    }

    startTransition(async () => {
      const result = await setFindingSeverityOverride({
        finding_id: findingId,
        override: next,
        note,
      });
      if (!result.ok) {
        alert(`Update failed: ${result.error}`);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function doDismiss() {
    if (!window.confirm("Dismiss this finding? It'll disappear from Current view.")) return;
    startTransition(async () => {
      const result = await dismissFinding({ finding_id: findingId });
      if (!result.ok) {
        alert(`Dismiss failed: ${result.error}`);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const isOverridden = currentOverride !== null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-label="Override severity or dismiss"
        title={
          isOverridden && overrideBy && overrideAt
            ? `Overridden to ${currentOverride} by ${overrideBy} on ${new Date(overrideAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}${overrideNote ? ` — "${overrideNote}"` : ""}`
            : "Adjust severity or dismiss"
        }
        style={{
          background: "transparent",
          border: "1px solid var(--line-2)",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 11,
          color: "var(--ink-2)",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        {isOverridden ? `Override: ${currentOverride}` : "···"}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 40, background: "transparent",
            }}
          />
          <div
            style={{
              position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
              background: "white", border: "1px solid var(--line-2)", borderRadius: 6,
              padding: 6, minWidth: 220,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              display: "flex", flexDirection: "column", gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em",
                color: "var(--ink-3)", padding: "6px 8px 4px",
              }}
            >
              Set displayed severity
            </div>
            {(["high", "medium", "low"] as const).map((s) => (
              <button
                key={s}
                onClick={() => apply(s)}
                disabled={pending || currentOverride === s}
                style={menuBtn(currentOverride === s)}
              >
                <span>Override to {s}</span>
                {computedSeverity === s && !isOverridden && (
                  <span style={{ fontSize: 10, color: "var(--ink-3)" }}>current</span>
                )}
              </button>
            ))}
            {isOverridden && (
              <button
                onClick={() => apply(null)}
                disabled={pending}
                style={menuBtn(false)}
              >
                <span>Clear override</span>
                <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
                  reverts to {computedSeverity}
                </span>
              </button>
            )}
            <div style={{ height: 1, background: "var(--line-2)", margin: "4px 0" }} />
            <button
              onClick={doDismiss}
              disabled={pending}
              style={{
                ...menuBtn(false),
                color: "#7A1F1F",
              }}
            >
              <span>Dismiss finding</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function menuBtn(active: boolean): React.CSSProperties {
  return {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
    padding: "6px 10px", border: "none", borderRadius: 4,
    background: active ? "rgba(227,100,16,0.10)" : "transparent",
    color: active ? "var(--accent)" : "var(--ink)",
    fontSize: 13, cursor: active ? "default" : "pointer", textAlign: "left" as const,
    fontWeight: active ? 600 : 400,
  };
}
