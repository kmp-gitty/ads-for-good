"use client";

// MI v2 Phase 2B / 2B.1 — Multi-page composer for Custom Form preset.
// Wraps CustomFormBuilder per-page; each page has its own content blocks +
// form fields. Operator can add/remove/reorder pages + add conditional
// branching rules ("if field_X equals Y, jump to page Z").

import CustomFormBuilder, { type ContentBlock, type FormField } from "./CustomFormBuilder";

export type Page = {
  id: string;
  content_blocks: ContentBlock[];
  form_fields: FormField[];
};

export type BranchingRule = {
  from_page_id: string;
  field_id: string;
  operator: "equals";  // Phase 2B.1 MVP — more operators (not_equals, contains, not_empty) coming later
  value: string;
  to_page_id: string;
};

export type PagesConfig = {
  pages: Page[];
  progress_indicator: boolean;
  back_button: boolean;
  branching?: BranchingRule[];
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

  const branching = value.branching ?? [];

  function updateRule(idx: number, next: Partial<BranchingRule>) {
    onChange({
      ...value,
      branching: branching.map((r, i) => (i === idx ? { ...r, ...next } : r)),
    });
  }

  function addRule() {
    if (value.pages.length < 2) return;
    onChange({
      ...value,
      branching: [
        ...branching,
        {
          from_page_id: value.pages[0].id,
          field_id: "",
          operator: "equals",
          value: "",
          to_page_id: value.pages[value.pages.length - 1].id,
        },
      ],
    });
  }

  function removeRule(idx: number) {
    onChange({
      ...value,
      branching: branching.filter((_, i) => i !== idx),
    });
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

      {/* Branching rules — Phase 2B.1 */}
      <div className="rounded border border-neutral-300 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
            Branching rules
          </p>
          <p className="text-xs text-neutral-500">
            {branching.length} rule{branching.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          On <em>Next</em>, if a field on the From page equals the rule&apos;s value, the form jumps to
          the To page (skipping any pages in between). Otherwise, the form advances sequentially.
          First matching rule wins.
        </p>
        <div className="mt-3 space-y-2">
          {branching.map((rule, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 rounded border border-neutral-200 bg-neutral-50 p-2">
              <span className="text-xs text-neutral-500">If</span>
              <select
                value={rule.from_page_id}
                onChange={e => updateRule(idx, { from_page_id: e.target.value })}
                className={inputCls + " max-w-[140px]"}
                title="From page"
              >
                {value.pages.map(p => (
                  <option key={p.id} value={p.id}>{p.id}</option>
                ))}
              </select>
              <span className="text-xs text-neutral-500">field</span>
              <input
                type="text"
                value={rule.field_id}
                onChange={e => updateRule(idx, { field_id: e.target.value.trim() })}
                placeholder="field_id"
                className={inputCls + " max-w-[140px] font-mono"}
              />
              <span className="text-xs text-neutral-500">equals</span>
              <input
                type="text"
                value={rule.value}
                onChange={e => updateRule(idx, { value: e.target.value })}
                placeholder="value"
                className={inputCls + " max-w-[140px]"}
              />
              <span className="text-xs text-neutral-500">go to</span>
              <select
                value={rule.to_page_id}
                onChange={e => updateRule(idx, { to_page_id: e.target.value })}
                className={inputCls + " max-w-[140px]"}
                title="To page"
              >
                {value.pages.map(p => (
                  <option key={p.id} value={p.id}>{p.id}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRule(idx)}
                className="ml-auto text-xs text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRule}
          disabled={value.pages.length < 2}
          className="mt-2 rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          + Add branching rule
        </button>
        {value.pages.length < 2 && (
          <p className="mt-1 text-xs text-neutral-500">Add a second page first.</p>
        )}
      </div>
    </div>
  );
}
