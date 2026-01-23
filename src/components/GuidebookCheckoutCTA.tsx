"use client";

import { useState } from "react";
import AutobooksCheckoutModal from "@/components/AutobooksCheckoutModal";

type Props = {
  className?: string;
  label?: string;
};

export default function GuidebookCheckoutCTA({
  className = "",
  label = "Buy the Guidebook",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {label}
      </button>

      <AutobooksCheckoutModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
