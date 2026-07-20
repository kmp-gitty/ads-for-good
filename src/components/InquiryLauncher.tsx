"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import InquiryModal from "@/components/InquiryModal";
import type { ReactNode } from "react";

type Props = {
  // Old API (still supported)
  label?: ReactNode;
  defaultServices?: string[];

  // New API (supported)
  buttonLabel?: string;
  service?: string;

  // Shared
  className?: string;
  sourceLabel?: string;

  ariaLabel?: string;

  // Page-load auto-open. Used by callers that arrive with an intent to open
  // the modal immediately (e.g. inbound URL param /contact?open=inquiry).
  // The button remains fully functional; this just opens the modal once on
  // mount without a click. Does not fire the click-tracked gtag event on
  // its own — the calling page is expected to fire whatever entry event it
  // wants (or not).
  autoOpen?: boolean;
};

export default function InquiryLauncher({
  label,
  ariaLabel,
  defaultServices,
  buttonLabel,
  service,
  className = "",
  sourceLabel,
  autoOpen = false,
}: Props) {
  const [open, setOpen] = useState(false);

  // Fire once on mount when the caller signals auto-open. Guard so a later
  // autoOpen flip doesn't re-open a manually-closed modal (rare, but tidy).
  useEffect(() => {
    if (autoOpen) setOpen(true);
    // Intentional: only run when autoOpen changes to true. Manual close
    // afterwards should not be undone by re-running this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  // ✅ Needed for portals in Next.js to avoid SSR/hydration issues
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const resolvedLabel = buttonLabel ?? label ?? "Contact";
  const resolvedServices = useMemo(() => {
    if (defaultServices && defaultServices.length) return defaultServices;
    if (service) return [service];
    return [];
  }, [defaultServices, service]);

  const trackServiceClick = () => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "service_click", {
        service_name: resolvedServices[0] ?? "unknown",
        action_type: "inquiry",
        location: "service_page_cta",
        source: sourceLabel ?? "unknown",
      });
    }
  };

  return (
    <>
      <button
  type="button"
  onClick={() => {
    trackServiceClick();
    setOpen(true);
  }}
  className={className}
  aria-label={
    ariaLabel ??
    (typeof resolvedLabel === "string" ? resolvedLabel : undefined)
  }
>
  {resolvedLabel}
</button>

      {mounted &&
        createPortal(
          <InquiryModal
            open={open}
            onClose={() => setOpen(false)}
            defaultServices={resolvedServices}
            sourceLabel={sourceLabel}
          />,
          document.body
        )}
    </>
  );
}

