"use client";

import { useMemo, useState } from "react";
import InquiryModal from "@/components/InquiryModal";

type Props = {
  // Old API (still supported)
  label?: string;
  defaultServices?: string[];

  // New API (supported)
  buttonLabel?: string;
  service?: string;

  // Shared
  className?: string;
  sourceLabel?: string;
};

export default function InquiryLauncher({
  label,
  defaultServices,
  buttonLabel,
  service,
  className = "",
  sourceLabel,
}: Props) {
  const [open, setOpen] = useState(false);

  const resolvedLabel = buttonLabel ?? label ?? "Contact";
  const resolvedServices = useMemo(() => {
    if (defaultServices && defaultServices.length) return defaultServices;
    if (service) return [service];
    return [];
  }, [defaultServices, service]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label={resolvedLabel}
      >
        {resolvedLabel}
      </button>

      <InquiryModal
        open={open}
        onClose={() => setOpen(false)}
        defaultServices={resolvedServices}
        sourceLabel={sourceLabel}
      />
    </>
  );
}
