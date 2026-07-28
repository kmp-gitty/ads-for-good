"use client";

// MI v2 Phase 6b — Remind Me composer (admin form).
//
// Captures the three things a remind_me prompt needs beyond the base form:
//   1. Content blocks (headline + body) rendered at the top of the subscribe
//      modal above the email input
//   2. Target resource (product or variant) — the cron uses this to poll
//      inventory + price via the PlatformAdapter
//   3. Trigger condition (back_in_stock | price_below with threshold) — the
//      evaluator uses this to decide when to fire the notification email
//
// The subscription lifecycle (cron polling, notification dispatch, auto-cancel
// on purchase) lives entirely server-side. This builder just captures the
// operator's configuration.

import type { ContentBlock } from "./CustomFormBuilder";

export type RemindMeTarget =
  | { type: "product"; product_id: string; product_name?: string; list_price?: number; product_url?: string }
  | { type: "variant"; product_id: string; variant_id: string; variant_name?: string; product_name?: string; list_price?: number; product_url?: string };

export type RemindMeTrigger =
  | { type: "back_in_stock" }
  | { type: "price_below"; threshold: number };

export type RemindMeConfig = {
  content_blocks: ContentBlock[];
  target: RemindMeTarget;
  trigger: RemindMeTrigger;
  // Optional per-prompt override; falls back to the subscriptions table's
  // default of 3. Hard cap at 10 enforced by the API.
  max_notifications?: number;
};

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900";

export default function RemindMeBuilder({
  value,
  onChange,
}: {
  value: RemindMeConfig;
  onChange: (next: RemindMeConfig) => void;
}) {
  function updateBlock(idx: number, next: Partial<ContentBlock>) {
    onChange({
      ...value,
      content_blocks: value.content_blocks.map((c, i) =>
        i === idx ? { ...c, ...next } : c,
      ),
    });
  }
  function addContentBlock(type: "headline" | "body") {
    onChange({
      ...value,
      content_blocks: [...value.content_blocks, { type, text: "" }],
    });
  }
  function removeBlock(idx: number) {
    onChange({
      ...value,
      content_blocks: value.content_blocks.filter((_, i) => i !== idx),
    });
  }
  function moveBlock(idx: number, delta: -1 | 1) {
    const target = idx + delta;
    if (target < 0 || target >= value.content_blocks.length) return;
    const updated = [...value.content_blocks];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    onChange({ ...value, content_blocks: updated });
  }

  function setTargetType(type: RemindMeTarget["type"]) {
    if (type === "product") {
      onChange({
        ...value,
        target: { type: "product", product_id: "" },
      });
    } else {
      onChange({
        ...value,
        target: { type: "variant", product_id: "", variant_id: "" },
      });
    }
  }

  function setTriggerType(type: RemindMeTrigger["type"]) {
    if (type === "back_in_stock") {
      onChange({ ...value, trigger: { type: "back_in_stock" } });
    } else {
      onChange({ ...value, trigger: { type: "price_below", threshold: 0 } });
    }
  }

  const targetIsProduct = value.target.type === "product";
  const productTarget = value.target as RemindMeTarget & { type: "product" };
  const variantTarget = value.target as RemindMeTarget & { type: "variant" };

  return (
    <div className="space-y-4">
      {/* Modal content blocks */}
      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
            Modal content
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addContentBlock("headline")}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              + Headline
            </button>
            <button
              type="button"
              onClick={() => addContentBlock("body")}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              + Body
            </button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-neutral-500">
          Optional. Shown at the top of the subscribe modal above the email input. Notification email content is authored separately in Email templates.
        </p>
        {value.content_blocks.length === 0 && (
          <p className="mt-3 text-[11px] italic text-neutral-500">
            No content blocks yet — modal will show a compact form with the product summary.
          </p>
        )}
        {value.content_blocks.map((block, idx) => (
          <div
            key={idx}
            className="mt-2 flex items-start gap-2 rounded border border-neutral-200 bg-white p-2"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {block.type}
              </div>
              {block.type === "headline" ? (
                <input
                  value={block.text}
                  onChange={(e) => updateBlock(idx, { text: e.target.value })}
                  placeholder="We'll let you know when this is back"
                  className={inputCls + " mt-1"}
                />
              ) : (
                <textarea
                  value={block.text}
                  onChange={(e) => updateBlock(idx, { text: e.target.value })}
                  rows={2}
                  placeholder="Enter your email — one message when it's ready, no marketing spam."
                  className={inputCls + " mt-1 font-normal"}
                />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => moveBlock(idx, -1)}
                disabled={idx === 0}
                className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600 disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveBlock(idx, 1)}
                disabled={idx === value.content_blocks.length - 1}
                className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600 disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeBlock(idx)}
                className="rounded border border-red-200 bg-white px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Target picker */}
      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
          Target
        </p>
        <p className="mt-1 text-[11px] text-neutral-500">
          What product (or specific variant) the cron watches. Product-level watches whole product; variant-level watches a specific SKU (color/size).
        </p>
        <div className="mt-3 flex gap-2">
          {(["product", "variant"] as const).map((t) => {
            const active = value.target.type === t;
            return (
              <button
                type="button"
                key={t}
                onClick={() => setTargetType(t)}
                className={
                  "rounded-md border px-3 py-2 text-xs font-semibold capitalize transition " +
                  (active
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50")
                }
              >
                {t}
              </button>
            );
          })}
        </div>

        {targetIsProduct && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Product ID</span>
              <input
                value={productTarget.product_id}
                onChange={(e) =>
                  onChange({
                    ...value,
                    target: { ...productTarget, product_id: e.target.value },
                  })
                }
                placeholder="remind-me-hoodie"
                className={inputCls + " font-mono mt-1"}
              />
            </label>
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Product name (display)</span>
              <input
                value={productTarget.product_name ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    target: { ...productTarget, product_name: e.target.value },
                  })
                }
                placeholder="Chapter Test Hoodie"
                className={inputCls + " mt-1"}
              />
            </label>
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Product URL</span>
              <input
                value={productTarget.product_url ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    target: { ...productTarget, product_url: e.target.value },
                  })
                }
                placeholder="https://…/products/hoodie"
                className={inputCls + " mt-1"}
              />
            </label>
          </div>
        )}

        {!targetIsProduct && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Product ID</span>
              <input
                value={variantTarget.product_id}
                onChange={(e) =>
                  onChange({
                    ...value,
                    target: { ...variantTarget, product_id: e.target.value },
                  })
                }
                placeholder="remind-me-hoodie"
                className={inputCls + " font-mono mt-1"}
              />
            </label>
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Variant ID</span>
              <input
                value={variantTarget.variant_id}
                onChange={(e) =>
                  onChange({
                    ...value,
                    target: { ...variantTarget, variant_id: e.target.value },
                  })
                }
                placeholder="hoodie-medium-blue"
                className={inputCls + " font-mono mt-1"}
              />
            </label>
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Product name (display)</span>
              <input
                value={variantTarget.product_name ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    target: { ...variantTarget, product_name: e.target.value },
                  })
                }
                placeholder="Chapter Test Hoodie"
                className={inputCls + " mt-1"}
              />
            </label>
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Variant name (display)</span>
              <input
                value={variantTarget.variant_name ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    target: { ...variantTarget, variant_name: e.target.value },
                  })
                }
                placeholder="Medium / Blue"
                className={inputCls + " mt-1"}
              />
            </label>
            <label className="text-xs col-span-2">
              <span className="block font-semibold text-neutral-700">Product URL</span>
              <input
                value={variantTarget.product_url ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    target: { ...variantTarget, product_url: e.target.value },
                  })
                }
                placeholder="https://…/products/hoodie?variant=…"
                className={inputCls + " mt-1"}
              />
            </label>
          </div>
        )}
      </section>

      {/* Trigger picker */}
      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
          Trigger
        </p>
        <p className="mt-1 text-[11px] text-neutral-500">
          When the cron sends the notification email.
        </p>
        <div className="mt-3 flex gap-2">
          {(
            [
              ["back_in_stock", "Back in stock"],
              ["price_below", "Price drops below"],
            ] as const
          ).map(([type, label]) => {
            const active = value.trigger.type === type;
            return (
              <button
                type="button"
                key={type}
                onClick={() => setTriggerType(type)}
                className={
                  "rounded-md border px-3 py-2 text-xs font-semibold transition " +
                  (active
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50")
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {value.trigger.type === "price_below" && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Threshold ($)</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={value.trigger.threshold || ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    trigger: {
                      type: "price_below",
                      threshold: e.target.value === "" ? 0 : parseFloat(e.target.value),
                    },
                  })
                }
                placeholder="99.00"
                className={inputCls + " mt-1"}
              />
              <span className="mt-1 block text-[11px] italic text-neutral-500">
                Fires when the product's current price drops below this value.
              </span>
            </label>
          </div>
        )}

        {value.trigger.type === "back_in_stock" && (
          <p className="mt-3 text-[11px] italic text-neutral-500">
            Fires the first time the product transitions from out-of-stock to in-stock after the visitor subscribes.
          </p>
        )}
      </section>

      {/* Notification cap (optional override) */}
      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
          Notification cap
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="text-xs">
            <span className="block font-semibold text-neutral-700">Max notifications per subscription</span>
            <input
              type="number"
              min={1}
              max={10}
              value={value.max_notifications ?? 3}
              onChange={(e) =>
                onChange({
                  ...value,
                  max_notifications:
                    e.target.value === "" ? undefined : Math.max(1, Math.min(10, parseInt(e.target.value, 10))),
                })
              }
              className={inputCls + " mt-1"}
            />
            <span className="mt-1 block text-[11px] italic text-neutral-500">
              Default 3. Hard cap 10. Prevents spammy configurations.
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}
