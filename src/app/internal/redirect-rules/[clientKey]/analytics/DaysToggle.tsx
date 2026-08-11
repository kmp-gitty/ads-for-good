"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINE = "#E5E0D4";
const MUTED = "#5C6B82";
const ORANGE = "#E36410";

export default function DaysToggle({ days }: { days: number }) {
  const pathname = usePathname();
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${LINE}`, borderRadius: 999, overflow: "hidden" }}>
      {[7, 30, 90].map((d) => {
        const active = d === days;
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
            {d}d
          </Link>
        );
      })}
    </div>
  );
}
