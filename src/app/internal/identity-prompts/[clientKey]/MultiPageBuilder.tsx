"use client";

// MI v2 Phase 2B — Multi-page composer for Custom Form preset.
// Wraps CustomFormBuilder per-page; each page has its own content blocks +
// form fields. Operator can add/remove/reorder pages. Conditional branching
// rules are deferred to Phase 2B.1.

import CustomFormBuilder, { type ContentBlock, type FormField } from "./CustomFormBuilder";

export type Page = {
  id: string;
  content_blocks: ContentBlock[];
  form_fields: FormField[];
};

export type PagesConfig = {
  pages: Page[];
  progress_indicator: boolean;
  back_button: boolean;
};

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900";

export default function MultiPageBuilder({
  value,
  onChange,
}: {
  value: PagesConfig;
  onChange: (next: PagesConfig) => void;
}) {
  function updatePage(idx: number, next: Partial<Page>) {
    onChange({
      ...value,
      pages: value.pages.map((p, i) => (i === idx ? { ...p, ...next } : p)),
    });
  }

  function addPage() {
    onChange({
      ...value,
      pages: [
        ...value.pages,
        { id: `page_${value.pages.length + 1}`, content_blocks: [], form_fields: [] },
      ],
    });
  }

  function removePage(idx: number) {
    if (value.pages.length <= 1) return;
    onChange({
      ...value,
      pages: value.pages.filter((_, i) => i !== idx),
    });
  }

  function movePage(idx: number, delta: -1 | 1) {
    const target = idx + delta;
    if (target < 0 || target >= value.pages.length) return;
    const updated = [...value.pages];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    onChange({ ...value, pages: updated });
  }

  return (
    <div className="space-y-4 rounded-md border border-orange-300 bg-orange-50/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
          Multi-page composer
        </p>
        <p className="text-xs text-orange-700">{value.pages.length} page{value.pages.length === 1 ? "" : "s"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-700">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={value.progress_indicator}
            onChange={e => onChange({ ...value, progress_indicator: e.target.checked })}
          />
          Show progress indicator
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={value.back_button}
            onChange={e => onChange({ ...value, back_button: e.target.checked })}
          />
          Allow Back button
        </label>
      </div>

      <div className="space-y-4">
        {value.pages.map((page, idx) => (
          <div key={idx} className="rounded border border-neutral-300 bg-white p-3">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                Page {idx + 1}
              </span>
              <input
                type="text"
                value={page.id}
                onChange={e => updatePage(idx, { id: e.target.value.trim().replace(/\s+/g, "_") })}
                placeholder="page_id"
                className={inputCls + " max-w-[180px] font-mono"}
              />
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => movePage(idx, -1)}
                  disabled={idx === 0}
                  className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30"
                  aria-label="Move page up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => movePage(idx, 1)}
                  disabled={idx === value.pages.length - 1}
                  className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30"
                  aria-label="Move page down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removePage(idx)}
                  disabled={value.pages.length <= 1}
                  className="text-xs text-red-600 hover:text-red-800 disabled:opacity-30"
                >
                  Delete page
                </button>
              </div>
            </div>

            <CustomFormBuilder
              contentBlocks={page.content_blocks}
              formFields={page.form_fields}
              onChange={(next) =>
                updatePage(idx, {
                  content_blocks: next.contentBlocks,
                  form_fields: next.formFields,
                })
              }
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addPage}
        className="rounded bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
      >
        + Add page
      </button>

      <p className="text-xs text-neutral-500">
        Conditional branching (route between pages based on prior answers) lands in Phase 2B.1.
        For now, pages always render in order.
      </p>
    </div>
  );
}
