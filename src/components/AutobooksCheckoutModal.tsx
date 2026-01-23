"use client";

import { useEffect } from "react";

type AutobooksCheckoutModalProps = {
  open: boolean;
  onClose: () => void;
};

const CHECKOUT_URL = "https://checkout.page/s/vl1JYN47vSjL5";

export default function AutobooksCheckoutModal({
  open,
  onClose,
}: AutobooksCheckoutModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  useEffect(() => {
    if (!open) return;
    window.open(CHECKOUT_URL, "_blank", "noopener,noreferrer");
  }, [open]);
  
  if (!open) return null;

  const openCheckout = () => {
    window.open(CHECKOUT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close checkout"
      />

      {/* Modal */}
      <div className="relative z-[10000] w-[min(760px,92vw)] overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Complete Checkout</div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm hover:bg-neutral-100"
          >
            Close
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <div className="text-lg font-semibold text-neutral-900">
            Checkout opens in a secure window
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            For security, Autobooks doesn’t allow checkout pages to load inside an embedded window.
            Click below to continue.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openCheckout}
              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
            >
              Continue to Checkout
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-neutral-200 px-6 py-3 text-sm sm:text-base font-semibold text-neutral-900 hover:bg-neutral-50"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
