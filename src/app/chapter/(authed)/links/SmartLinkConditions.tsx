"use client";

// Context-only condition builder for self-serve Smart Links (Phase 4a).
//
// Forked from the operator ConditionBuilder, trimmed to the condition types
// that need NO pixel/segment data (device, os, geo, day/hour, date range, query
// param, referrer). Behavioral conditions (new/returning, converted, cart,
// audience) and A/B buckets are intentionally excluded — those require Chapter
// analytics/experiments and are a natural upsell. The emitted JSON shape is
// identical to the operator's, so the same redirect evaluator reads it.
//
// value in/out is the condition object the rule engine expects, e.g.
// {device_type: "mobile", country_in: ["US","CA"]}.

import { useEffect, useMemo, useState } from "react";

type CondKind =
  | "csv"
  | "device_type"
  | "day_of_week"
  | "hour_of_day"
  | "date_range"
  | "query_param"
  | "referrer";

type CondMeta = { type: string; label: string; kind: CondKind; hint?: string };

// Context-only subset (9 types).
const CONDITIONS: CondMeta[] = [
  { type: "device_type", label: "Device type", kind: "device_type", hint: "Route by mobile / tablet / desktop." },
  { type: "os", label: "Operating system", kind: "csv", hint: "ios, android, macos, windows, linux (comma-separated)." },
  { type: "country_in", label: "Country", kind: "csv", hint: "2-letter codes: US, CA, GB … (comma-separated)." },
  { type: "region_in", label: "Region / state", kind: "csv", hint: "State or region codes (comma-separated)." },
  { type: "day_of_week", label: "Day of week (UTC)", kind: "day_of_week", hint: "Pick one or more days." },
  { type: "hour_of_day", label: "Hour of day (UTC)", kind: "hour_of_day", hint: "From–to, 24-hour." },
  { type: "date_range", label: "Date range", kind: "date_range", hint: "Active between these dates." },
  { type: "query_param", label: "URL parameter", kind: "query_param", hint: "Match a ?key=value on the incoming link." },
  { type: "referrer_matches", label: "Referrer matches", kind: "referrer", hint: "Case-insensitive match on where the click came from." },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEVICE_TYPES = ["mobile", "tablet", "desktop"];

export default function SmartLinkConditions({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [obj, setObj] = useState<Record<string, unknown>>(value || {});
  const [adding, setAdding] = useState("");

  // Keep local state in sync if the parent swaps the value wholesale.
  const valueKey = useMemo(() => JSON.stringify(value || {}), [value]);
  useEffect(() => {
    setObj(value || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  function commit(next: Record<string, unknown>) {
    setObj(next);
    onChange(next);
  }

  const activeTypes = Object.keys(obj);
  const availableTypes = CONDITIONS.filter((c) => !activeTypes.includes(c.type));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={adding} onChange={(e) => setAdding(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm">
          <option value="">Add a condition…</option>
          {availableTypes.map((c) => <option key={c.type} value={c.type}>{c.label}</option>)}
        </select>
        <button
          type="button"
          disabled={!adding}
          onClick={() => {
            const meta = CONDITIONS.find((c) => c.type === adding);
            if (!meta) return;
            commit({ ...obj, [adding]: defaultValueFor(meta) });
            setAdding("");
          }}
          className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      {activeTypes.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-center text-xs text-neutral-500">
          No conditions yet. Add one to control who this rule sends.
        </div>
      ) : (
        <ul className="space-y-2">
          {activeTypes.map((type) => {
            const meta = CONDITIONS.find((c) => c.type === type);
            if (!meta) return null;
            return (
              <li key={type} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-800">{meta.label}</div>
                    {meta.hint && <div className="text-xs text-neutral-500">{meta.hint}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => { const n = { ...obj }; delete n[type]; commit(n); }}
                    className="text-xs text-neutral-400 hover:text-red-600"
                  >
                    × remove
                  </button>
                </div>
                <div className="mt-2">
                  <ValueEditor kind={meta.kind} value={obj[type]} onChange={(v) => commit({ ...obj, [type]: v })} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ValueEditor({ kind, value, onChange }: { kind: CondKind; value: unknown; onChange: (v: unknown) => void }) {
  if (kind === "csv") {
    const arr = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    return (
      <input
        type="text"
        value={arr.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="comma, separated, values"
        className="w-full rounded-md border border-neutral-300 px-3 py-1 text-sm"
      />
    );
  }
  if (kind === "device_type") {
    return (
      <select value={typeof value === "string" ? value : "desktop"} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-1 text-sm">
        {DEVICE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    );
  }
  if (kind === "day_of_week") {
    const arr = Array.isArray(value) ? (value as number[]) : typeof value === "number" ? [value] : [];
    return (
      <div className="flex flex-wrap gap-1">
        {DAY_LABELS.map((label, i) => {
          const selected = arr.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(selected ? arr.filter((d) => d !== i) : [...arr, i].sort())}
              className={`rounded px-2.5 py-1 text-xs font-medium ${selected ? "bg-orange-500 text-white" : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }
  if (kind === "hour_of_day") {
    const o = (value as { from?: number; to?: number }) || {};
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs text-neutral-500">From</span>
        <input type="number" min={0} max={23} value={o.from ?? 0} onChange={(e) => onChange({ ...o, from: parseInt(e.target.value, 10) || 0 })} className="w-20 rounded-md border border-neutral-300 px-2 py-1" />
        <span className="text-xs text-neutral-500">To</span>
        <input type="number" min={0} max={24} value={o.to ?? 24} onChange={(e) => onChange({ ...o, to: parseInt(e.target.value, 10) || 0 })} className="w-20 rounded-md border border-neutral-300 px-2 py-1" />
      </div>
    );
  }
  if (kind === "date_range") {
    const o = (value as { from?: string; to?: string }) || {};
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs text-neutral-500">From</span>
        <input type="date" value={o.from?.slice(0, 10) ?? ""} onChange={(e) => onChange({ ...o, from: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="rounded-md border border-neutral-300 px-2 py-1" />
        <span className="text-xs text-neutral-500">To</span>
        <input type="date" value={o.to?.slice(0, 10) ?? ""} onChange={(e) => onChange({ ...o, to: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="rounded-md border border-neutral-300 px-2 py-1" />
      </div>
    );
  }
  if (kind === "query_param") {
    const o = (value as Record<string, string>) || {};
    const entries = Object.entries(o);
    return (
      <div className="space-y-1">
        {entries.map(([k, v], i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={k}
              onChange={(e) => { const next: Record<string, string> = {}; entries.forEach(([kk, vv], j) => { next[j === i ? e.target.value : kk] = vv; }); onChange(next); }}
              placeholder="key (e.g. utm_source)"
              className="w-40 rounded-md border border-neutral-300 px-2 py-1 text-sm font-mono"
            />
            <span className="text-xs text-neutral-500">=</span>
            <input type="text" value={v} onChange={(e) => onChange({ ...o, [k]: e.target.value })} placeholder="value" className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm font-mono" />
            <button type="button" onClick={() => { const n = { ...o }; delete n[k]; onChange(n); }} className="text-xs text-neutral-400 hover:text-red-600">×</button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...o, "": "" })} className="text-xs text-orange-700 hover:text-orange-900">+ add parameter</button>
      </div>
    );
  }
  if (kind === "referrer") {
    return (
      <input type="text" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder="e.g. instagram" className="w-full rounded-md border border-neutral-300 px-3 py-1 text-sm" />
    );
  }
  return null;
}

function defaultValueFor(meta: CondMeta): unknown {
  switch (meta.kind) {
    case "csv": return [];
    case "device_type": return "mobile";
    case "day_of_week": return [6];
    case "hour_of_day": return { from: 0, to: 24 };
    case "date_range": return {};
    case "query_param": return {};
    case "referrer": return "";
    default: return null;
  }
}
