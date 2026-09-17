"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DAYS_OPTIONS, type DaysKey } from "./types";

const LINE = "#E5E0D4";
const MUTED = "#5C6B82";
const ORANGE = "#E36410";

export default function DaysToggle({ dayKey }: { dayKey: DaysKey }) {
  const pathname = usePathname();
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${LINE}`, borderRadius: 999, overflow: "hidden" }}>
      {DAYS_OPTIONS.map((d) => {
        const active = d === dayKey;
        return (
          <Link
            key={d}
            href={`${pathname}?days=${d}`}
            style={{
              padding: "5px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: "none",
              color: active ? "white" : MUTED,
              background: active ? ORANGE : "white",
            }}
          >
            {d === "all" ? "All" : `${d}d`}
          </Link>
        );
      })}
    </div>
  );
}
