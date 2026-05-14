"use client";

// Click-outside-to-close dropdown popover (ported from primitives.jsx).
// Children can be a function that receives a `close` callback so an item click
// can dismiss the dropdown.

import React, { useState, useRef, useEffect } from "react";

type DropdownChildren =
  | React.ReactNode
  | ((close: () => void) => React.ReactNode);

export function Dropdown({
  trigger, children, align = "right", width = 240,
}: {
  trigger: React.ReactNode;
  children: DropdownChildren;
  align?: "left" | "right";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const close = () => setOpen(false);

  return (
    <div className="pos" ref={ref}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className="dropdown-pop" style={{ minWidth: width, [align]: 0 } as React.CSSProperties}>
          {typeof children === "function" ? (children as (c: () => void) => React.ReactNode)(close) : children}
        </div>
      )}
    </div>
  );
}
