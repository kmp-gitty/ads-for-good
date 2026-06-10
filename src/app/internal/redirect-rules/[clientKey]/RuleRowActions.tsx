"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleRule, deleteRule } from "../_actions";

export default function RuleRowActions({
  id,
  client_key,
  slug,
  enabled,
}: {
  id: string;
  client_key: string;
  slug: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      await toggleRule(id, !enabled, client_key, slug);
    });
  }

  function onDelete() {
    if (!window.confirm("Delete this rule? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteRule(id, client_key, slug);
    });
  }

  return (
    <div className="flex items-center justify-end gap-2 text-xs">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className="text-neutral-600 hover:text-orange-700 disabled:opacity-50"
      >
        {enabled ? "Disable" : "Enable"}
      </button>
      <span className="text-neutral-300">·</span>
      <Link
        href={`/internal/redirect-rules/${client_key}/${id}`}
        className="text-orange-700 hover:underline"
      >
        Edit
      </Link>
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
