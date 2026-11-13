"use client";

// Partner input for clients whose partners come from WordPress (partner
// catalog mode 'enforce', today acj_today). Offers the WordPress list by name,
// stores the normalised key, and shows whether the typed key can be used for a
// new link. The server re-checks on register, so this is guidance, not the gate.

import {
  checkPartner,
  describeVerdict,
  normalizePartnerKey,
  partnerAllowed,
  type PartnerCatalog,
} from "@/app/lib/links/partner-check";

export default function PartnerField({
  value,
  onChange,
  catalog,
  override,
  onOverride,
  listId,
  inputClassName,
  placeholder = "start typing a partner name",
}: {
  value: string;
  onChange: (v: string) => void;
  catalog: PartnerCatalog;
  override: boolean;
  onOverride: (v: boolean) => void;
  listId: string;
  inputClassName: string;
  placeholder?: string;
}) {
  const verdict = checkPartner(value, catalog);
  const allowed = partnerAllowed(verdict, override);
  const msg = describeVerdict(value.trim(), verdict);
  const tone =
    verdict.kind === "wp" || verdict.kind === "reserved" ? "text-emerald-700"
      : verdict.kind === "legacy" ? "text-amber-700"
      : allowed ? "text-amber-700" : "text-red-700";

  return (
    <div>
      <input
        className={inputClassName}
        list={listId}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => {
          // Picking from the list already stores the key; this tidies typed
          // input (Firstrust-Bank -> firstrust_bank).
          const n = normalizePartnerKey(value);
          if (value.trim() && n !== value) onChange(n);
        }}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {catalog.reserved.map(k => <option key={k} value={k}>ACJ house link</option>)}
        {catalog.partners.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
      </datalist>
      {msg ? (
        <p className={`mt-1 text-xs ${tone}`}>
          {msg}
          {verdict.kind === "legacy" && verdict.suggested && (
            <button
              type="button"
              className="ml-1 font-semibold underline underline-offset-2"
              onClick={() => onChange(verdict.suggested!)}
            >
              Use {verdict.suggested}
            </button>
          )}
          {verdict.kind === "malformed" && (
            <button
              type="button"
              className="ml-1 font-semibold underline underline-offset-2"
              onClick={() => onChange(verdict.normalized)}
            >
              Fix
            </button>
          )}
        </p>
      ) : (
        <p className="mt-1 text-xs text-neutral-500">
          {catalog.partners.length} partners from WordPress. Pick one; it stores the WordPress slug with underscores.
        </p>
      )}
      {verdict.kind === "unknown" && verdict.near.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {verdict.near.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.key)}
              className="rounded-full border border-neutral-300 bg-white px-2 py-0.5 font-mono text-[11px] text-neutral-600 hover:border-orange-400"
            >
              {p.key}
            </button>
          ))}
        </div>
      )}
      {verdict.kind === "unknown" && (
        <label className="mt-1 flex items-center gap-2 text-xs text-neutral-700">
          <input type="checkbox" checked={override} onChange={e => onOverride(e.target.checked)} />
          Not in WordPress yet — use this key anyway (recorded on the link)
        </label>
      )}
    </div>
  );
}
