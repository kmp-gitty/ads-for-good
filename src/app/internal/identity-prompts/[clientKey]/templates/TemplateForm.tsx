"use client";

// MI v2 Phase 3 — per-template editor.
// Subject + body + merge-token reference. Save upserts to chapter_config.email_templates.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertTemplate, deleteTemplate, type TemplateFormInput } from "./_actions";

// Common merge tokens by template_type. Operators see these in the cheat sheet.
const MERGE_TOKEN_HINTS: Record<string, { token: string; description: string }[]> = {
  welcome_offer: [
    { token: "offer_code", description: "The operator-configured offer code (e.g. WELCOME10)" },
    { token: "offer_description", description: "Description of the offer (optional)" },
  ],
  offer_accepted: [
    { token: "offer_code", description: "Generated discount code (Shopify) or operator-provided code" },
    { token: "product_name", description: "Name of the product the visitor offered on" },
    { token: "accepted_amount", description: "The amount we accepted (in dollars)" },
  ],
  offer_countered: [
    { token: "counter_amount", description: "The amount we're counter-offering" },
    { token: "product_name", description: "Name of the product" },
    { token: "expires_at", description: "ISO timestamp when counter-offer expires" },
  ],
  offer_declined: [
    { token: "product_name", description: "Name of the product" },
  ],
  back_in_stock: [
    { token: "product_name", description: "Product that's now in stock" },
    { token: "product_url", description: "Link back to the product page" },
  ],
  price_dropped: [
    { token: "product_name", description: "Product name" },
    { token: "old_price", description: "Previous price (formatted)" },
    { token: "new_price", description: "New (lower) price (formatted)" },
    { token: "product_url", description: "Link back to the product page" },
  ],
};

const COMMON_TYPES = [
  "welcome_offer",
  "offer_accepted",
  "offer_countered",
  "offer_declined",
  "back_in_stock",
  "price_dropped",
  "custom_form_followup",
] as const;

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400";

export type ExistingTemplate = {
  template_type: string;
  subject: string;
  body: string;
  updated_at: string;
  updated_by: string | null;
};

export default function TemplateForm({
  client_key,
  template,
}: {
  client_key: string;
  template?: ExistingTemplate;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!template;

  const [templateType, setTemplateType] = useState(template?.template_type || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");

  const hints = MERGE_TOKEN_HINTS[templateType] || [];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: TemplateFormInput = {
      client_key,
      template_type: templateType.trim().toLowerCase().replace(/\s+/g, "_"),
      subject,
      body,
    };

    startTransition(async () => {
      const res = await upsertTemplate(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/internal/identity-prompts/${client_key}/templates`);
      router.refresh();
    });
  }

  function onDelete() {
    if (!template) return;
    if (!window.confirm(`Delete template "${template.template_type}"?`)) return;
    startTransition(async () => {
      const res = await deleteTemplate(client_key, template.template_type);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/internal/identity-prompts/${client_key}/templates`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Template type</span>
        <span className="block text-xs text-neutral-500">
          Used as the lookup key when a preset fires. Common types listed; you can also type a custom one.
        </span>
        <input
          type="text"
          list="template-type-suggestions"
          value={templateType}
          onChange={e => setTemplateType(e.target.value)}
          disabled={isEdit}
          placeholder="welcome_offer"
          required
          className={inputCls + " font-mono"}
        />
        <datalist id="template-type-suggestions">
          {COMMON_TYPES.map(t => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Subject</span>
        <span className="block text-xs text-neutral-500">
          Use <code>{"{{merge_token}}"}</code> for substitution at send time.
        </span>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Your code: {{offer_code}}"
          required
          className={inputCls}
        />
      </label>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Body</span>
        <span className="block text-xs text-neutral-500">
          Blank lines split paragraphs. Single newlines become line breaks. Paste raw HTML for fine control.
        </span>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={12}
          placeholder={"Thanks for signing up!\n\nHere's your code:\n\n<span class=\"offer-code\">{{offer_code}}</span>"}
          required
          className={inputCls + " font-mono"}
        />
      </label>

      {hints.length > 0 && (
        <div className="rounded-md border border-orange-200 bg-orange-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
            Available merge tokens for {templateType}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-neutral-700">
            {hints.map(h => (
              <li key={h.token}>
                <code className="bg-white px-1 rounded">{`{{${h.token}}}`}</code> — {h.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create template")}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Delete template
          </button>
        )}
      </div>
    </form>
  );
}
