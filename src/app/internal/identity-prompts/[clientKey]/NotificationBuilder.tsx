"use client";

// MI v2 Phase 4 — Custom Notification composer (bubble container).
// Operator picks a corner position, adds content blocks (headline + body),
// and chooses a CTA type (dismiss_only / button / yes_no).

import type { ContentBlock } from "./CustomFormBuilder";

export type BubblePosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export type SubmitActions = {
  cta_type: "dismiss_only" | "button" | "yes_no";
  cta_label?: string;
  cta_url?: string;
  yes_label?: string;
  yes_url?: string;
  no_label?: string;
};

export type NotificationConfig = {
  container: { type: "bubble"; position: BubblePosition };
  content_blocks: ContentBlock[];
  submit_actions: SubmitActions;
};

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900";

export default function NotificationBuilder({
  value,
  onChange,
}: {
  value: NotificationConfig;
  onChange: (next: NotificationConfig) => void;
}) {
  function updateBlock(idx: number, next: Partial<ContentBlock>) {
    onChange({
      ...value,
      content_blocks: value.content_blocks.map((c, i) => (i === idx ? { ...c, ...next } : c)),
    });
  }

  function addBlock(type: "headline" | "body") {
    onChange({ ...value, content_blocks: [...value.content_blocks, { type, text: "" }] });
  }

  function removeBlock(idx: number) {
    onChange({ ...value, content_blocks: value.content_blocks.filter((_, i) => i !== idx) });
  }

  function updateActions(next: Partial<SubmitActions>) {
    onChange({ ...value, submit_actions: { ...value.submit_actions, ...next } });
  }

  const a = value.submit_actions;

  return (
    <div className="space-y-5 rounded-md border border-orange-200 bg-orange-50/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
        Notification composer
      </p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-700">
        <span className="font-semibold">Position</span>
        {(["bottom-right", "bottom-left", "top-right", "top-left"] as BubblePosition[]).map(p => (
          <label key={p} className="flex items-center gap-1">
            <input
              type="radio"
              name="bubble-position"
              checked={value.container.position === p}
              onChange={() => onChange({ ...value, container: { type: "bubble", position: p } })}
            />
            {p}
          </label>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Content</p>
        <div className="mt-2 space-y-2">
          {value.content_blocks.map((block, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded border border-neutral-200 bg-white p-2">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-neutral-600">
                {block.type}
              </span>
              <input
                type="text"
                value={block.text}
                onChange={e => updateBlock(idx, { text: e.target.value })}
                placeholder={block.type === "headline" ? "Headline text" : "Body text"}
                className={inputCls + " flex-1"}
              />
              <button type="button" onClick={() => removeBlock(idx)} className="text-xs text-red-600 hover:text-red-800">
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => addBlock("headline")}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            + Headline
          </button>
          <button
            type="button"
            onClick={() => addBlock("body")}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            + Body
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">Call to action</p>
        <div className="mt-2 flex gap-3 text-xs text-neutral-700">
          {(["dismiss_only", "button", "yes_no"] as SubmitActions["cta_type"][]).map(t => (
            <label key={t} className="flex items-center gap-1">
              <input
                type="radio"
                name="cta-type"
                checked={a.cta_type === t}
                onChange={() => updateActions({ cta_type: t })}
              />
              {t.replace("_", " ")}
            </label>
          ))}
        </div>

        {a.cta_type === "button" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="text"
              value={a.cta_label ?? ""}
              onChange={e => updateActions({ cta_label: e.target.value })}
              placeholder="Button label (e.g. Open chat)"
              className={inputCls}
            />
            <input
              type="url"
              value={a.cta_url ?? ""}
              onChange={e => updateActions({ cta_url: e.target.value })}
              placeholder="https://… (where the button goes)"
              className={inputCls + " font-mono"}
            />
          </div>
        )}

        {a.cta_type === "yes_no" && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <input
              type="text"
              value={a.yes_label ?? ""}
              onChange={e => updateActions({ yes_label: e.target.value })}
              placeholder="Yes label (e.g. Yes please)"
              className={inputCls}
            />
            <input
              type="url"
              value={a.yes_url ?? ""}
              onChange={e => updateActions({ yes_url: e.target.value })}
              placeholder="https://… (optional Yes URL)"
              className={inputCls + " font-mono"}
            />
            <input
              type="text"
              value={a.no_label ?? ""}
              onChange={e => updateActions({ no_label: e.target.value })}
              placeholder="No label (e.g. No thanks)"
              className={inputCls}
            />
          </div>
        )}

        {a.cta_type === "dismiss_only" && (
          <p className="mt-2 text-xs text-neutral-500">
            Bubble shows close button only. Use this for informational notifications.
          </p>
        )}
      </div>
    </div>
  );
}
