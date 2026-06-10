"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { createRule, updateRule, type RuleFormInput } from "../_actions";

export type RuleFormProps = {
  client_key: string;
  initial?: {
    id: string;
    slug: string;
    rule_priority: number;
    condition_jsonb: Record<string, unknown>;
    destination_template: string;
    description: string | null;
    enabled: boolean;
  };
};

export default function RuleForm({ client_key, initial }: RuleFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [priority, setPriority] = useState(String(initial?.rule_priority ?? 100));
  const [conditions, setConditions] = useState(
    initial?.condition_jsonb ? JSON.stringify(initial.condition_jsonb, null, 2) : "{}"
  );
  const [destination, setDestination] = useState(initial?.destination_template ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: RuleFormInput = {
      client_key,
      slug: slug.trim(),
      rule_priority: parseInt(priority, 10) || 0,
      condition_jsonb: conditions,
      destination_template: destination.trim(),
      description: description.trim(),
      enabled,
    };

    startTransition(async () => {
      const res = initial
        ? await updateRule(initial.id, input)
        : await createRule(input);
      if (!res.ok) {
        setError(res.error ?? "save failed");
        return;
      }
      router.push(`/internal/redirect-rules/${client_key}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-3 gap-4">
        <label className="col-span-2 text-sm">
          <span className="block font-semibold text-neutral-800">Slug</span>
          <span className="block text-xs text-neutral-500">URL component: /r/{client_key}/<strong>{slug || "<slug>"}</strong></span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="booknow"
            required
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Priority</span>
          <span className="block text-xs text-neutral-500">Lower wins. 100 = default.</span>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            min={0}
            required
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Conditions (JSON object)</span>
        <span className="block text-xs text-neutral-500">
          Empty <code>{"{}"}</code> = catch-all. All conditions are AND-ed. See condition types list on the client page.
        </span>
        <textarea
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          rows={8}
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
          placeholder='{"is_returning_visitor": true, "has_open_cart": true}'
        />
      </label>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Destination template</span>
        <span className="block text-xs text-neutral-500">
          Supports {"{q:utm_source}"}, {"{country}"}, {"{device_type}"}, {"{identity_key}"}, etc. (URL-encoded). Must be http(s) URL.
        </span>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="https://emmaonesock.myshopify.com/cart?utm_source={q:utm_source}"
          required
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
        />
      </label>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Description (optional)</span>
        <span className="block text-xs text-neutral-500">For operator clarity only — not shown to visitors.</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Returning customers with an open cart → cart page with discount banner"
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded"
        />
        <span className="font-semibold text-neutral-800">Enabled</span>
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? "Saving…" : initial ? "Save changes" : "Create rule"}
        </button>
        <Link
          href={`/internal/redirect-rules/${client_key}`}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
