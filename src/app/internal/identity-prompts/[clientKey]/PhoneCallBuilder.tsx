"use client";

// MI v2 Phase 4 — Phone Call composer.
// Content blocks (headline + body) + ordered list of phone CTAs. Each phone
// CTA renders as a tel: button in the modal; click fires phone_call_initiated.

import type { ContentBlock } from "./CustomFormBuilder";

export type PhoneCta = { type: "phone_cta"; label: string; phone_number: string };
export type PhoneCallBlock = ContentBlock | PhoneCta;

export type PhoneCallConfig = {
  content_blocks: PhoneCallBlock[];
};

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900";

export default function PhoneCallBuilder({
  value,
  onChange,
}: {
  value: PhoneCallConfig;
  onChange: (next: PhoneCallConfig) => void;
}) {
  // Union-of-partials shape so callers can pass any subset of either variant's
  // fields. Cast happens inside the spread.
  type BlockUpdate = { type?: PhoneCallBlock["type"]; text?: string; label?: string; phone_number?: string };
  function updateBlock(idx: number, next: BlockUpdate) {
    onChange({
      content_blocks: value.content_blocks.map((c, i) =>
        i === idx ? ({ ...c, ...next } as PhoneCallBlock) : c,
      ),
    });
  }

  function addContentBlock(type: "headline" | "body") {
    onChange({ content_blocks: [...value.content_blocks, { type, text: "" }] });
  }

  function addPhoneCta() {
    onChange({
      content_blocks: [...value.content_blocks, { type: "phone_cta", label: "", phone_number: "" }],
    });
  }

  function removeBlock(idx: number) {
    onChange({ content_blocks: value.content_blocks.filter((_, i) => i !== idx) });
  }

  function moveBlock(idx: number, delta: -1 | 1) {
    const target = idx + delta;
    if (target < 0 || target >= value.content_blocks.length) return;
    const updated = [...value.content_blocks];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    onChange({ content_blocks: updated });
  }

  const phoneCtaCount = value.content_blocks.filter(b => b.type === "phone_cta").length;

  return (
    <div className="space-y-4 rounded-md border border-orange-200 bg-orange-50/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
          Phone call composer
        </p>
        <p className="text-xs text-orange-700">
          {phoneCtaCount} phone CTA{phoneCtaCount === 1 ? "" : "s"}
        </p>
      </div>

      <p className="text-xs text-neutral-600">
        Each phone CTA renders as a <code>tel:</code> link. Click fires <code>phone_call_initiated</code>
        with the SHA-256 hash of the number (never raw). No identity capture, no form.
      </p>

      <div className="space-y-2">
        {value.content_blocks.map((block, idx) => (
          <div key={idx} className="rounded border border-neutral-200 bg-white p-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-neutral-600">
                {block.type}
              </span>
              {block.type === "phone_cta" ? (
                <>
                  <input
                    type="text"
                    value={block.label}
                    onChange={e => updateBlock(idx, { label: e.target.value })}
                    placeholder="Label (e.g. Sales)"
                    className={inputCls + " max-w-[180px]"}
                  />
                  <input
                    type="tel"
                    value={block.phone_number}
                    onChange={e => updateBlock(idx, { phone_number: e.target.value })}
                    placeholder="+15551234567"
                    className={inputCls + " flex-1 font-mono"}
                  />
                </>
              ) : (
                <input
                  type="text"
                  value={block.text}
                  onChange={e => updateBlock(idx, { text: e.target.value })}
                  placeholder={block.type === "headline" ? "Headline text" : "Body text"}
                  className={inputCls + " flex-1"}
                />
              )}
              <button
                type="button"
                onClick={() => moveBlock(idx, -1)}
                disabled={idx === 0}
                className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveBlock(idx, 1)}
                disabled={idx === value.content_blocks.length - 1}
                className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30"
              >
                ↓
              </button>
              <button type="button" onClick={() => removeBlock(idx)} className="text-xs text-red-600 hover:text-red-800">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => addContentBlock("headline")}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + Headline
        </button>
        <button
          type="button"
          onClick={() => addContentBlock("body")}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + Body
        </button>
        <button
          type="button"
          onClick={addPhoneCta}
          className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600"
        >
          + Phone CTA
        </button>
      </div>
    </div>
  );
}
