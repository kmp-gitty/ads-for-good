"use client";

// Client-side rendering of the leads table. Server component passes fetched
// rows + client's storefront_domain. This handles the row-expand state so
// operator can drill into any lead's cart items + open the cart-recovery URL.
//
// Kept intentionally small — no per-row mutations, just read + expand.

import { useMemo, useState } from "react";

export type CartItem = {
  variant_id?: string | null;
  product_title?: string | null;
  variant_title?: string | null;
  quantity?: number | null;
  line_price_cents?: number | null;
  currency?: string | null;
  url?: string | null;
};

export type LeadRow = {
  id: string;
  captured_at: string;
  prompt_slug: string | null;
  email: string | null;
  phone: string | null;
  identity_key: string | null;
  anonymous_id: string | null;
  journey_id: string | null;
  responses_jsonb: Record<string, unknown> | null;
  consent_mode: string | null;
  consent_declined: boolean;
  page_url: string | null;
  ip_country: string | null;
  cart_token: string | null;
  cart_items_jsonb: CartItem[] | null;
};

function truncateIdentity(key: string | null): string {
  if (!key) return "—";
  const colonIdx = key.indexOf(":");
  if (colonIdx === -1) return key.slice(0, 12) + "…";
  const prefix = key.slice(0, colonIdx);
  const hash = key.slice(colonIdx + 1);
  return `${prefix}:${hash.slice(0, 8)}…`;
}

function formatMoneyFromCents(cents: number, currency: string = "USD"): string {
  const dollars = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(dollars);
  } catch {
    return `${currency} ${dollars.toFixed(2)}`;
  }
}

function cartTotalCents(items: CartItem[] | null): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, it) => s + (Number(it.line_price_cents) || 0), 0);
}

function buildCartUrl(
  storefrontDomain: string | null,
  cartToken: string | null,
  items: CartItem[] | null,
): string | null {
  if (!storefrontDomain) return null;
  const domain = storefrontDomain.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!domain) return null;
  if (cartToken) {
    return `https://${domain}/cart/c/${encodeURIComponent(cartToken)}`;
  }
  if (items && items.length > 0) {
    const parts = items
      .filter((it) => it.variant_id && Number(it.quantity) > 0)
      .map((it) => `${it.variant_id}:${Math.max(1, Number(it.quantity) || 1)}`);
    if (parts.length === 0) return null;
    return `https://${domain}/cart/${parts.join(",")}`;
  }
  return null;
}

export default function LeadsClient({
  leads,
  storefrontDomain,
}: {
  leads: LeadRow[];
  storefrontDomain: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const capped = leads.length >= 500;

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-600">
          <tr>
            <th className="px-3 py-2 text-left font-semibold w-[1%]"></th>
            <th className="px-3 py-2 text-left font-semibold">Captured</th>
            <th className="px-3 py-2 text-left font-semibold">Prompt</th>
            <th className="px-3 py-2 text-left font-semibold">Contact</th>
            <th className="px-3 py-2 text-left font-semibold">Identity</th>
            <th className="px-3 py-2 text-left font-semibold">Cart</th>
            <th className="px-3 py-2 text-left font-semibold">Country</th>
            <th className="px-3 py-2 text-left font-semibold">Page</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {leads.map((r) => {
            const isExpanded = expandedId === r.id;
            const hasCart = Array.isArray(r.cart_items_jsonb) && r.cart_items_jsonb.length > 0;
            const cartUrl = hasCart ? buildCartUrl(storefrontDomain, r.cart_token, r.cart_items_jsonb) : null;
            const cartTotal = hasCart ? cartTotalCents(r.cart_items_jsonb) : 0;
            const currency = hasCart && r.cart_items_jsonb?.[0]?.currency ? r.cart_items_jsonb[0].currency : "USD";
            return (
              <RowGroup
                key={r.id}
                r={r}
                isExpanded={isExpanded}
                onToggle={() => setExpandedId(isExpanded ? null : r.id)}
                hasCart={hasCart}
                cartUrl={cartUrl}
                cartTotal={cartTotal}
                currency={currency}
              />
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
        Showing latest {leads.length} {capped ? "(capped at 500 — narrow filters to see older)" : ""}
      </p>
    </div>
  );
}

function RowGroup({
  r,
  isExpanded,
  onToggle,
  hasCart,
  cartUrl,
  cartTotal,
  currency,
}: {
  r: LeadRow;
  isExpanded: boolean;
  onToggle: () => void;
  hasCart: boolean;
  cartUrl: string | null;
  cartTotal: number;
  currency: string;
}) {
  const responseSummary = useMemo(() => {
    if (!r.responses_jsonb) return "";
    const entries = Object.entries(r.responses_jsonb);
    if (entries.length === 0) return "";
    return entries
      .map(([k, v]) => {
        const valStr = Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v);
        const trunc = valStr.length > 40 ? valStr.slice(0, 40) + "…" : valStr;
        return `${k}: ${trunc}`;
      })
      .join(" · ");
  }, [r.responses_jsonb]);

  return (
    <>
      <tr
        className={`hover:bg-neutral-50 cursor-pointer ${isExpanded ? "bg-orange-50/40" : ""}`}
        onClick={onToggle}
      >
        <td className="px-3 py-2 text-neutral-400">{isExpanded ? "▾" : "▸"}</td>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-600">
          {new Date(r.captured_at).toLocaleString()}
        </td>
        <td className="px-3 py-2">
          <code className="text-xs">{r.prompt_slug ?? "—"}</code>
        </td>
        <td className="px-3 py-2 text-xs">
          {r.email && <div className="text-neutral-900">{r.email}</div>}
          {r.phone && <div className="text-neutral-500">{r.phone}</div>}
          {!r.email && !r.phone && <span className="text-neutral-400">—</span>}
          {r.consent_declined && (
            <span className="ml-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
              consent declined
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          <code className="text-[11px] text-neutral-700">{truncateIdentity(r.identity_key)}</code>
        </td>
        <td className="px-3 py-2 text-xs">
          {hasCart ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
              🛒 {r.cart_items_jsonb!.length} item{r.cart_items_jsonb!.length === 1 ? "" : "s"} · {formatMoneyFromCents(cartTotal, currency)}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">
          {r.ip_country ?? "—"}
        </td>
        <td className="max-w-[200px] truncate px-3 py-2 text-xs text-neutral-500" title={r.page_url ?? ""}>
          {r.page_url ?? "—"}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-orange-50/20">
          <td></td>
          <td colSpan={7} className="px-3 py-4">
            <div className="space-y-3 text-xs">
              {hasCart && (
                <div>
                  <div className="mb-1 font-semibold uppercase tracking-wide text-neutral-500">
                    Abandoned cart
                  </div>
                  <ul className="mt-1 space-y-1">
                    {r.cart_items_jsonb!.map((it, idx) => (
                      <li key={idx} className="flex items-baseline gap-2">
                        <span className="font-medium text-neutral-900">{it.product_title ?? "—"}</span>
                        {it.variant_title && (
                          <span className="text-neutral-500">({it.variant_title})</span>
                        )}
                        <span className="text-neutral-500">×{it.quantity ?? 1}</span>
                        <span className="text-neutral-500">
                          — {formatMoneyFromCents(Number(it.line_price_cents) || 0, it.currency || "USD")}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {cartUrl && (
                    <a
                      href={cartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600"
                    >
                      Open recovery link →
                    </a>
                  )}
                  {r.cart_token && (
                    <div className="mt-2 text-[10px] text-neutral-400">
                      cart_token: <code>{r.cart_token.slice(0, 20)}…</code>
                    </div>
                  )}
                </div>
              )}

              {responseSummary && (
                <div>
                  <div className="mb-1 font-semibold uppercase tracking-wide text-neutral-500">
                    Form responses
                  </div>
                  <div className="text-neutral-800">{responseSummary}</div>
                </div>
              )}

              <div>
                <div className="mb-1 font-semibold uppercase tracking-wide text-neutral-500">
                  Session
                </div>
                <div className="grid grid-cols-2 gap-2 text-neutral-600 md:grid-cols-4">
                  <div>
                    <span className="text-neutral-400">anonymous_id: </span>
                    <code className="text-[10px]">{r.anonymous_id ?? "—"}</code>
                  </div>
                  <div>
                    <span className="text-neutral-400">journey_id: </span>
                    <code className="text-[10px]">{r.journey_id?.slice(0, 12) ?? "—"}…</code>
                  </div>
                  <div>
                    <span className="text-neutral-400">consent: </span>
                    <code className="text-[10px]">{r.consent_mode ?? "—"}</code>
                  </div>
                  <div>
                    <span className="text-neutral-400">page: </span>
                    <span className="text-[10px]">{r.page_url ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
