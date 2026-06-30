"use client";

// MI v2 Phase 2A — Custom Form composable builder.
//
// Operators add ordered content blocks (headline, body) and form fields
// (email, phone, text, textarea, single_choice, multi_choice). Identity
// fields (email/phone with for_identity=true) auto-hash client-side and
// flow through /api/identify; non-identity fields land in
// chapter_engagement.prompt_responses via /api/chapter/prompt-response.

import { useState } from "react";

export type ContentBlock = { type: "headline" | "body"; text: string };

export type FormField = {
  id: string;
  type: "email" | "phone" | "text" | "textarea" | "single_choice" | "multi_choice";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  for_identity?: boolean;
};

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900";

export default function CustomFormBuilder({
  contentBlocks,
  formFields,
  onChange,
}: {
  contentBlocks: ContentBlock[];
  formFields: FormField[];
  onChange: (next: { contentBlocks: ContentBlock[]; formFields: FormField[] }) => void;
}) {
  const [draftFieldId, setDraftFieldId] = useState("");

  function updateContent(idx: number, next: Partial<ContentBlock>) {
    const updated = contentBlocks.map((c, i) => (i === idx ? { ...c, ...next } : c));
    onChange({ contentBlocks: updated, formFields });
  }

  function addContent(type: "headline" | "body") {
    onChange({
      contentBlocks: [...contentBlocks, { type, text: "" }],
      formFields,
    });
  }

  function removeContent(idx: number) {
    onChange({
      contentBlocks: contentBlocks.filter((_, i) => i !== idx),
      formFields,
    });
  }

  function updateField(idx: number, next: Partial<FormField>) {
    const updated = formFields.map((f, i) => (i === idx ? { ...f, ...next } : f));
    onChange({ contentBlocks, formFields: updated });
  }

  function addField() {
    const id = (draftFieldId.trim() || `field_${formFields.length + 1}`).replace(/\s+/g, "_").toLowerCase();
    if (formFields.some(f => f.id === id)) return;
    onChange({
      contentBlocks,
      formFields: [
        ...formFields,
        { id, type: "text", label: "", required: false, for_identity: false },
      ],
    });
    setDraftFieldId("");
  }

  function removeField(idx: number) {
    onChange({
      contentBlocks,
      formFields: formFields.filter((_, i) => i !== idx),
    });
  }

  function moveField(idx: number, delta: -1 | 1) {
    const target = idx + delta;
    if (target < 0 || target >= formFields.length) return;
    const updated = [...formFields];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    onChange({ contentBlocks, formFields: updated });
  }

  return (
    <div className="space-y-6 rounded-md border border-orange-200 bg-orange-50/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
          Custom Form composer
        </p>
        <p className="text-xs text-orange-700">
          {contentBlocks.length} content · {formFields.length} field{formFields.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Content blocks */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Content blocks</p>
        <div className="mt-2 space-y-2">
          {contentBlocks.map((block, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded border border-neutral-200 bg-white p-2">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-neutral-600">
                {block.type}
              </span>
              <input
                type="text"
                value={block.text}
                onChange={e => updateContent(idx, { text: e.target.value })}
                placeholder={block.type === "headline" ? "Headline text" : "Body text"}
                className={inputCls + " flex-1"}
              />
              <button
                type="button"
                onClick={() => removeContent(idx)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => addContent("headline")}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            + Headline
          </button>
          <button
            type="button"
            onClick={() => addContent("body")}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            + Body
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Form fields</p>
        <p className="mt-1 text-xs text-neutral-500">
          Identity-marked fields (email / phone with &ldquo;identity&rdquo; checked) auto-hash and stitch via <code>/api/identify</code>.
          Other fields land in <code>chapter_engagement.prompt_responses</code> for operator review.
        </p>
        <div className="mt-3 space-y-2">
          {formFields.map((field, idx) => {
            const supportsIdentity = field.type === "email" || field.type === "phone";
            const supportsOptions = field.type === "single_choice" || field.type === "multi_choice";
            return (
              <div key={idx} className="space-y-2 rounded border border-neutral-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">
                    {field.id}
                  </span>
                  <select
                    value={field.type}
                    onChange={e => updateField(idx, { type: e.target.value as FormField["type"] })}
                    className={inputCls + " max-w-[140px]"}
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="single_choice">Single choice</option>
                    <option value="multi_choice">Multi choice</option>
                  </select>
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => updateField(idx, { label: e.target.value })}
                    placeholder="Label"
                    className={inputCls + " flex-1"}
                  />
                  <button
                    type="button"
                    onClick={() => moveField(idx, -1)}
                    disabled={idx === 0}
                    className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(idx, 1)}
                    disabled={idx === formFields.length - 1}
                    className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-700">
                  <input
                    type="text"
                    value={field.placeholder ?? ""}
                    onChange={e => updateField(idx, { placeholder: e.target.value })}
                    placeholder="Placeholder (optional)"
                    className={inputCls + " max-w-[200px]"}
                  />
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(idx, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  {supportsIdentity && (
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!field.for_identity}
                        onChange={e => updateField(idx, { for_identity: e.target.checked })}
                      />
                      Identity field
                    </label>
                  )}
                  {supportsOptions && (
                    <input
                      type="text"
                      value={(field.options ?? []).join(", ")}
                      onChange={e => updateField(idx, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="Options (comma-separated)"
                      className={inputCls + " flex-1"}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={draftFieldId}
            onChange={e => setDraftFieldId(e.target.value)}
            placeholder="field_id (or auto)"
            className={inputCls + " max-w-[200px]"}
          />
          <button
            type="button"
            onClick={addField}
            className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600"
          >
            + Add field
          </button>
        </div>
      </div>
    </div>
  );
}
