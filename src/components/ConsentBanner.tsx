"use client";

import { useEffect, useState } from "react";

const KEY = "afg_consent_v1"; // value: "accepted" | "declined"

export default function ConsentBanner() {
  const [choice, setChoice] = useState<"accepted" | "declined" | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "accepted" || v === "declined") {
        setChoice(v);
        setOpen(false);
      } else {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(KEY, "accepted");
    } catch {}
    setChoice("accepted");
    setOpen(false);
    // optional: reload to ensure scripts gated by consent mount cleanly
    // window.location.reload();
  };

  const decline = () => {
    try {
      localStorage.setItem(KEY, "declined");
    } catch {}
    setChoice("declined");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-neutral-700">
          We use cookies/pixels to understand site usage and improve performance. You can accept or decline non-essential tracking.
          <a href="/privacy" className="ml-2 font-semibold text-orange-600 hover:underline">
            Privacy Policy
          </a>
        </div>

        <div className="flex gap-2">
          <button
            onClick={decline}
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export function getConsent(): "accepted" | "declined" | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}
