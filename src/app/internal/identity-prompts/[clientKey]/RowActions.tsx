"use client";

import { useTransition } from "react";
import { togglePrompt, deletePrompt } from "../_actions";

export default function RowActions({
  id,
  client_key,
  enabled,
}: {
  id: string;
  client_key: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      await togglePrompt(id, !enabled, client_key);
    });
  }

  function onDelete() {
    if (!window.confirm("Delete this prompt? This cannot be undone.")) return;
    startTransition(async () => {
      await deletePrompt(id, client_key);
    });
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className="text-neutral-600 hover:text-orange-700 disabled:opacity-50"
      >
        {enabled ? "Disable" : "Enable"}
      </button>
      <span className="text-neutral-300">·</span>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
