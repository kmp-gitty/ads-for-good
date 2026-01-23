"use client";

import { useEffect, useState } from "react";
import InquiryLauncher from "@/components/InquiryLauncher";

type StickyCTAProps = {
  targetId: string;
  label: string;
  variant?: "inquiry" | "checkout-direct";
  defaultServices?: string[];
  sourceLabel?: string;
  topOffset?: number;
};

const CHECKOUT_URL = "https://checkout.page/s/vl1JYN47vSjL5";

export default function StickyCTA({
  targetId,
  label,
  variant = "inquiry",
  defaultServices,
  sourceLabel,
  topOffset = 64,
}: StickyCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [targetId]);

  if (!visible) return null;

  const openCheckout = () => {
    window.open(CHECKOUT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed left-0 right-0 z-40 border-b border-orange-200 bg-white/95 backdrop-blur"
      style={{ top: topOffset }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-4 px-4 py-3">
        <div className="hidden text-sm font-medium text-neutral-800 sm:block">
          Ready to get started?
        </div>

        {variant === "checkout-direct" ? (
          <button
            type="button"
            onClick={openCheckout}
            className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            {label}
          </button>
        ) : (
          <InquiryLauncher
            label={label}
            defaultServices={defaultServices}
            sourceLabel={sourceLabel}
            className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          />
        )}
      </div>
    </div>
  );
}


