"use client";

import { useState } from "react";
import AutobooksCheckoutModal from "@/components/AutobooksCheckoutModal";

const trackGuidebookCheckoutClick = () => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "service_click", {
        service_name: "Marketing Guidebook",
        action_type: "checkout",
        location: "guidebook_cta",
        source: "guidebook_page",
      });
    }
  };

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
        onClick={() => {
            trackGuidebookCheckoutClick();
            setOpen(true);
          }}
        className={className}
      >
        {label}
      </button>

      <AutobooksCheckoutModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
