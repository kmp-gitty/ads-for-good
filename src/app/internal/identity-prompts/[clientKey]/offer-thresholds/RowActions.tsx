"use client";

// MI v2 Phase 5.6 — Per-row Deactivate / Reactivate button.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setThresholdActive } from "./_actions";

export default function RowActions({
  clientKey,
  id,
  active,
}: {
  clientKey: string;
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setThresholdActive(clientKey, id, !active);
      if (!result.ok) {
        alert(`Update failed: ${result.error}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      style={{
        padding: "4px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer",
        border: "1px solid #D6DCE5",
        background: active ? "white" : "#F4F5F7",
        color: active ? "#7A1F1F" : "#0F5C24",
      }}
    >
      {active ? "Deactivate" : "Reactivate"}
    </button>
  );
}
