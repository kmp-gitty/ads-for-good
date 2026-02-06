"use client";

import { useEffect, useMemo, useState } from "react";

type ClientNotepadLauncherProps = {
  /** Use an EMBED/PREVIEW URL if possible */
  docUrl: string;
  /** Optional label override */
  label?: string;
  /** CSS selector for the element we use as the “scroll past” trigger */
  triggerSelector?: string;
};

function NotepadModal({
  open,
  onClose,
  docUrl,
  title = "Notepad",
}: {
  open: boolean;
  onClose: () => void;
  docUrl: string;
  title?: string;
}) {
  useEffect(() => { 
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    // prevent background scroll while modal open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close notepad"
      />

      {/* Modal panel */}
      <div className="relative z-[101] w-[95vw] max-w-6xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="text-sm font-semibold text-neutral-900">{title}</div>

          <button
            onClick={onClose}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Close
          </button>
        </div>

        <div className="h-[78vh] bg-white">
          <iframe
            title={title}
            src={docUrl}
            className="h-full w-full"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
}

export default function ClientNotepadLauncher({
  docUrl,
  label = "Open Notepad",
  triggerSelector = '[data-notepad-trigger="true"]',
}: ClientNotepadLauncherProps) {
  const [open, setOpen] = useState(false);
  const [showFloating, setShowFloating] = useState(false);

  const embedUrl = useMemo(() => docUrl, [docUrl]);

  useEffect(() => {
    const triggerEl = document.querySelector(triggerSelector);

    if (!triggerEl) return;

    // Show floating button only when the trigger is OUT of view (scrolled past)
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloating(!entry.isIntersecting);
      },
      { threshold: 0.01 }
    );

    observer.observe(triggerEl);
    return () => observer.disconnect();
  }, [triggerSelector]);

  return (
    <>
      {/* Top button (you place this next to the tabs) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center justify-center rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
      >
        {label}
      </button>

      {/* Floating right-rail button */}
      {showFloating && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-5 top-1/2 z-[95] -translate-y-1/2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow-lg hover:bg-orange-50"
        >
          {label}
        </button>
      )}

      <NotepadModal
        open={open}
        onClose={() => setOpen(false)}
        docUrl={embedUrl}
        title="Client Portal Notepad"
      />
    </>
  );
}
