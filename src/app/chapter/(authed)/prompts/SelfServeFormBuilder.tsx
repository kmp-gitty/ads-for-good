"use client";

// Self-serve Custom Form builder (Phase 3, forked from the operator
// CustomFormBuilder). Differences per review feedback:
//   - No "identity field" checkbox — email/phone are always identity fields
//     (for_identity is set automatically at save).
//   - Real field types incl. Number; email/phone/number carry validation the
//     pixel enforces on submit.
//   - Single-select / Multi-select use an editable options LIST (add a choice
//     at a time), not a comma-separated string; no placeholder for choices.

import { useState } from "react";
import {
  FIELD_TYPE_OPTIONS,
  CHOICE_TYPES,
  IDENTITY_TYPES,
  type ContentBlock,
  type FormField,
  type FieldType,
} from "./types";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900";

export default function SelfServeFormBuilder({
  contentBlocks,
  formFields,
  onChange,
}: {
  contentBlocks: ContentBlock[];
  formFields: FormField[];
  onChange: (next: { contentBlocks: ContentBlock[]; formFields: FormField[] }) => void;
}) {
  const [draftFieldId, setDraftFieldId] = useState("");

  const emit = (next: { contentBlocks?: ContentBlock[]; formFields?: FormField[] }) =>
    onChange({ contentBlocks: next.contentBlocks ?? contentBlocks, formFields: next.formFields ?? formFields });

  // ----- content blocks -----
  const addContent = (type: "headline" | "body") =>
    emit({ contentBlocks: [...contentBlocks, { type, text: "" }] });
  const updateContent = (idx: number, text: string) =>
    emit({ contentBlocks: contentBlocks.map((c, i) => (i === idx ? { ...c, text } : c)) });
  const removeContent = (idx: number) =>
    emit({ contentBlocks: contentBlocks.filter((_, i) => i !== idx) });

  // ----- fields -----
  const updateField = (idx: number, next: Partial<FormField>) =>
    emit({ formFields: formFields.map((f, i) => (i === idx ? { ...f, ...next } : f)) });

  const changeType = (idx: number, type: FieldType) => {
    const f = formFields[idx];
    const next: FormField = { ...f, type };
    if (CHOICE_TYPES.includes(type)) {
      if (!next.options || next.options.length === 0) next.options = [""];
      next.placeholder = undefined;
    } else {
      next.options = undefined;
    }
    emit({ formFields: formFields.map((x, i) => (i === idx ? next : x)) });
  };

  const addField = () => {
    const id = (draftFieldId.trim() || `field_${formFields.length + 1}`).replace(/\s+/g, "_").toLowerCase();
    if (formFields.some((f) => f.id === id)) return;
    emit({ formFields: [...formFields, { id, type: "text", label: "", required: false }] });
    setDraftFieldId("");
  };
  const removeField = (idx: number) => emit({ formFields: formFields.filter((_, i) => i !== idx) });
  const moveField = (idx: number, delta: -1 | 1) => {
    const t = idx + delta;
    if (t < 0 || t >= formFields.length) return;
    const copy = [...formFields];
    [copy[idx], copy[t]] = [copy[t], copy[idx]];
    emit({ formFields: copy });
  };

  // ----- options (for choice fields) -----
  const setOptions = (idx: number, options: string[]) => updateField(idx, { options });
  const addOption = (idx: number) => setOptions(idx, [...(formFields[idx].options ?? []), ""]);
  const updateOption = (idx: number, oi: number, val: string) =>
    setOptions(idx, (formFields[idx].options ?? []).map((o, i) => (i === oi ? val : o)));
  const removeOption = (idx: number, oi: number) =>
    setOptions(idx, (formFields[idx].options ?? []).filter((_, i) => i !== oi));

  return (
    <div className="space-y-6 rounded-md border border-orange-200 bg-orange-50/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">Custom Form</p>
        <p className="text-xs text-orange-700">
          {contentBlocks.length} content · {formFields.length} field{formFields.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Content blocks */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Content</p>
        <div className="mt-2 space-y-2">
          {contentBlocks.map((block, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded border border-neutral-200 bg-white p-2">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-neutral-600">{block.type}</span>
              <input
                type="text"
                value={block.text}
                onChange={(e) => updateContent(idx, e.target.value)}
                placeholder={block.type === "headline" ? "Headline text" : "Body text"}
                className={inputCls + " flex-1"}
              />
              <button type="button" onClick={() => removeContent(idx)} className="text-xs text-red-600 hover:text-red-800">×</button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => addContent("headline")} className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">+ Headline</button>
          <button type="button" onClick={() => addContent("body")} className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">+ Body</button>
        </div>
      </div>

      {/* Fields */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Fields</p>
        <p className="mt-1 text-xs text-neutral-500">Email and phone are captured as identity automatically. Number, email, and phone fields are validated when a visitor submits.</p>
        <div className="mt-3 space-y-2">
          {formFields.map((field, idx) => {
            const isChoice = CHOICE_TYPES.includes(field.type);
            const isIdentity = IDENTITY_TYPES.includes(field.type);
            return (
              <div key={idx} className="space-y-2 rounded border border-neutral-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">{field.id}</span>
                  <select value={field.type} onChange={(e) => changeType(idx, e.target.value as FieldType)} className={inputCls + " max-w-[180px]"}>
                    {FIELD_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input type="text" value={field.label} onChange={(e) => updateField(idx, { label: e.target.value })} placeholder="Label" className={inputCls + " flex-1"} />
                  <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0} className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30" aria-label="Move up">↑</button>
                  <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === formFields.length - 1} className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30" aria-label="Move down">↓</button>
                  <button type="button" onClick={() => removeField(idx)} className="text-xs text-red-600 hover:text-red-800">×</button>
                </div>

                {/* Options list (choice fields) */}
                {isChoice ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-neutral-500">
                      Choices {field.type === "multi_choice" ? "(visitor can pick several)" : "(visitor picks one)"}
                    </p>
                    {(field.options ?? []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-neutral-400 text-xs">{field.type === "multi_choice" ? "☐" : "○"}</span>
                        <input type="text" value={opt} onChange={(e) => updateOption(idx, oi, e.target.value)} placeholder="Enter choice" className={inputCls + " flex-1"} />
                        <button type="button" onClick={() => removeOption(idx, oi)} className="text-xs text-red-600 hover:text-red-800">×</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(idx)} className="text-xs font-medium text-orange-700 hover:text-orange-900">+ Add choice</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-700">
                    <input
                      type="text"
                      value={field.placeholder ?? ""}
                      onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                      placeholder={isIdentity ? "Placeholder (optional)" : "Placeholder (optional)"}
                      className={inputCls + " max-w-[220px]"}
                    />
                  </div>
                )}

                <label className="flex items-center gap-1 text-xs text-neutral-700">
                  <input type="checkbox" checked={field.required} onChange={(e) => updateField(idx, { required: e.target.checked })} />
                  Required
                </label>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input type="text" value={draftFieldId} onChange={(e) => setDraftFieldId(e.target.value)} placeholder="field_id (or auto)" className={inputCls + " max-w-[200px]"} />
          <button type="button" onClick={addField} className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600">+ Add field</button>
        </div>
      </div>
    </div>
  );
}
