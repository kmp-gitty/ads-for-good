"use client";

// MI v2 Phase 5 — Make an Offer composer.
//
// Captures the two things a make_an_offer prompt needs beyond the base form:
//   1. Content blocks (headline + body) that render at the top of the modal
//   2. Target resource (product | collection | storewide) that the offer
//      applies to — the evaluator uses this to look up thresholds + the pixel
//      uses product_name / list_price for display copy
//
// Threshold config for the target lives at
// /internal/identity-prompts/<key>/offer-thresholds (separate surface).

import type { ContentBlock } from "./CustomFormBuilder";

export type OfferTarget =
  | { type: "product"; product_id: string; product_name?: string; list_price?: number }
  | { type: "collection"; collection_id: string; collection_name?: string }
  | { type: "storewide" };

export type MakeAnOfferConfig = {
  content_blocks: ContentBlock[];
  target: OfferTarget;
};

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900";

export default function MakeAnOfferBuilder({
  value,
  onChange,
}: {
  value: MakeAnOfferConfig;
  onChange: (next: MakeAnOfferConfig) => void;
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

  function setTargetType(type: OfferTarget["type"]) {
    if (type === "product") {
      onChange({ ...value, target: { type: "product", product_id: "" } });
    } else if (type === "collection") {
      onChange({ ...value, target: { type: "collection", collection_id: "" } });
    } else {
      onChange({ ...value, target: { type: "storewide" } });
    }
  }

  return (
    <div className="space-y-4">
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
          Optional. The visitor sees these at the top of the offer modal above the bid + email inputs.
        </p>

        {value.content_blocks.length === 0 ? (
          <p className="mt-3 text-xs italic text-neutral-500">
            No content blocks — modal renders bid + email inputs only.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {value.content_blocks.map((b, i) => (
              <li key={i} className="rounded border border-neutral-200 bg-white p-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-neutral-600">
                    {b.type}
                  </span>
                  <input
                    value={b.text}
                    onChange={e => updateBlock(i, { text: e.target.value })}
                    placeholder={b.type === "headline" ? "Name your price" : "We're open to fair offers on this piece."}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => moveBlock(i, -1)}
                    disabled={i === 0}
                    className="text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-30"
                    aria-label="Move up"
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => moveBlock(i, 1)}
                    disabled={i === value.content_blocks.length - 1}
                    className="text-xs text-neutral-500 hover:text-neutral-700 disabled:opacity-30"
                    aria-label="Move down"
                  >↓</button>
                  <button
                    type="button"
                    onClick={() => removeBlock(i)}
                    className="text-xs text-red-600 hover:text-red-800"
                    aria-label="Remove"
                  >×</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
          Target resource
        </p>
        <p className="mt-1 text-[11px] text-neutral-500">
          What the visitor is bidding on. Thresholds configured under{" "}
          <em>Offer thresholds</em> apply to product / collection / global scope
          in that order.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["product", "collection", "storewide"] as const).map(t => {
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

        {value.target.type === "product" && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Product ID</span>
              <input
                value={value.target.product_id}
                onChange={e =>
                  onChange({
                    ...value,
                    target: { ...(value.target as { type: "product"; product_id: string; product_name?: string; list_price?: number }), product_id: e.target.value },
                  })
                }
                placeholder="gid://shopify/Product/…"
                className={inputCls + " font-mono mt-1"}
              />
            </label>
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Product name (display)</span>
              <input
                value={value.target.product_name ?? ""}
                onChange={e =>
                  onChange({
                    ...value,
                    target: { ...(value.target as { type: "product"; product_id: string; product_name?: string; list_price?: number }), product_name: e.target.value },
                  })
                }
                placeholder="Holiday embroidered eyelet dress"
                className={inputCls + " mt-1"}
              />
            </label>
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">List price</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={value.target.list_price ?? ""}
                onChange={e =>
                  onChange({
                    ...value,
                    target: {
                      ...(value.target as { type: "product"; product_id: string; product_name?: string; list_price?: number }),
                      list_price: e.target.value === "" ? undefined : parseFloat(e.target.value),
                    },
                  })
                }
                placeholder="149"
                className={inputCls + " mt-1"}
              />
            </label>
          </div>
        )}

        {value.target.type === "collection" && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Collection ID</span>
              <input
                value={value.target.collection_id}
                onChange={e =>
                  onChange({
                    ...value,
                    target: { ...(value.target as { type: "collection"; collection_id: string; collection_name?: string }), collection_id: e.target.value },
                  })
                }
                placeholder="gid://shopify/Collection/…"
                className={inputCls + " font-mono mt-1"}
              />
            </label>
            <label className="text-xs">
              <span className="block font-semibold text-neutral-700">Collection name (display)</span>
              <input
                value={value.target.collection_name ?? ""}
                onChange={e =>
                  onChange({
                    ...value,
                    target: { ...(value.target as { type: "collection"; collection_id: string; collection_name?: string }), collection_name: e.target.value },
                  })
                }
                placeholder="New Arrivals"
                className={inputCls + " mt-1"}
              />
            </label>
          </div>
        )}

        {value.target.type === "storewide" && (
          <p className="mt-3 text-xs italic text-neutral-500">
            Storewide bids evaluate against the global default threshold.
          </p>
        )}
      </section>
    </div>
  );
}
