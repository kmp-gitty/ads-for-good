"use client";

// Structured condition editor for redirect-rule conditions.
//
// The underlying value is still the same JSON object the rule engine expects
// (e.g. `{day_of_week: [6], country_in: ["US"]}`). This component renders an
// add-row UX on top so operators don't have to know each condition type's
// exact JSON shape.
//
// Edits flow: structured UI → state.conditions object → onChange(jsonString).
// The parent RuleForm passes the current JSON string in; this component parses
// it on mount, then takes over. If JSON parse fails (operator edited the raw
// textarea to something invalid), we render in "raw-only" mode.

import { useEffect, useMemo, useState } from "react";

// All 17 condition types. Per-row UI rendered via `kind`.
type CondMeta = {
  type: string;
  label: string;
  kind:
    | "boolean"      // is_new_visitor, is_returning_visitor, etc.
    | "number"       // has_converted_in_days, cart_older_than_hours
    | "csv"          // country_in, region_in, audience_tag, os (comma-separated, becomes array)
    | "device_type"  // single select enum
    | "day_of_week"  // 7 checkboxes (0-6)
    | "hour_of_day"  // {from, to}
    | "date_range"   // {from, to} dates
    | "query_param"  // key/value pairs
    | "referrer"     // single text (regex)
    | "ab_bucket";   // {experiment_id, bucket}
  hint?: string;
};

const CONDITIONS: CondMeta[] = [
  { type: "is_new_visitor", label: "Is new visitor", kind: "boolean", hint: "First-time visitor only" },
  { type: "is_returning_visitor", label: "Is returning visitor", kind: "boolean" },
  { type: "has_converted_ever", label: "Has converted ever", kind: "boolean" },
  { type: "has_converted_in_days", label: "Has converted in last N days", kind: "number" },
  { type: "audience_tag", label: "Audience tag", kind: "csv", hint: "Cohort tag(s). Comma-separated." },
  { type: "has_open_cart", label: "Has open cart", kind: "boolean" },
  { type: "cart_older_than_hours", label: "Cart older than N hours", kind: "number" },
  { type: "day_of_week", label: "Day of week (UTC)", kind: "day_of_week", hint: "Pick one or more days" },
  { type: "hour_of_day", label: "Hour of day (UTC)", kind: "hour_of_day", hint: "From-to range, 24-hour" },
  { type: "date_range", label: "Date range", kind: "date_range", hint: "Active between dates" },
  { type: "query_param", label: "URL query param", kind: "query_param", hint: 'e.g. {"rid": "acme-coffee-..."}' },
  { type: "referrer_matches", label: "Referrer matches", kind: "referrer", hint: "Case-insensitive regex" },
  { type: "country_in", label: "Country code in", kind: "csv", hint: "US, CA, GB ... (comma-separated)" },
  { type: "region_in", label: "Region code in", kind: "csv", hint: "State/region. Comma-separated." },
  { type: "device_type", label: "Device type", kind: "device_type" },
  { type: "os", label: "OS in", kind: "csv", hint: "ios, android, macos, windows, linux, unknown" },
  { type: "ab_bucket", label: "A/B test bucket", kind: "ab_bucket", hint: "Visitor assigned to a specific bucket" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEVICE_TYPES = ["mobile", "tablet", "desktop", "bot", "unknown"];

type Props = {
  jsonValue: string;                       // current JSON string in the rule
  onChange: (jsonString: string) => void;  // updates JSON string + state.conditions in parent
};

export default function ConditionBuilder({ jsonValue, onChange }: Props) {
  // Parse the incoming JSON ONCE (on mount). After that, this component owns
  // the structured state. If parse fails, we render raw-mode-only.
  const [parseError, setParseError] = useState<string | null>(null);
  const initialObj = useMemo(() => {
    try {
      const o = JSON.parse(jsonValue || "{}");
      if (typeof o !== "object" || o === null || Array.isArray(o)) {
        setParseError("Conditions must be a JSON object");
        return {};
      }
      return o as Record<string, unknown>;
    } catch (e) {
      setParseError((e as Error).message);
      return {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [obj, setObj] = useState<Record<string, unknown>>(initialObj);
  const [showRaw, setShowRaw] = useState(false);
  const [adding, setAdding] = useState<string>("");

  // Sync obj → JSON string up to parent on any structured edit.
  useEffect(() => {
    const json = Object.keys(obj).length === 0 ? "{}" : JSON.stringify(obj, null, 2);
    onChange(json);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj]);

  const activeTypes = Object.keys(obj);
  const availableTypes = CONDITIONS.filter((c) => !activeTypes.includes(c.type));

  function removeCondition(type: string) {
    const next = { ...obj };
    delete next[type];
    setObj(next);
  }

  function updateCondition(type: string, value: unknown) {
    setObj({ ...obj, [type]: value });
  }

  function addCondition() {
    if (!adding) return;
    const meta = CONDITIONS.find((c) => c.type === adding);
    if (!meta) return;
    const defaultValue = defaultValueFor(meta);
    setObj({ ...obj, [adding]: defaultValue });
    setAdding("");
  }

  if (parseError) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Couldn&apos;t parse current conditions ({parseError}). Edit raw JSON below.
        </div>
        <textarea
          value={jsonValue}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add condition row */}
      <div className="flex items-center gap-2">
        <select
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Add condition…</option>
          {availableTypes.map((c) => (
            <option key={c.type} value={c.type}>{c.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={addCondition}
          disabled={!adding}
          className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="ml-auto text-xs text-neutral-500 hover:text-neutral-800"
        >
          {showRaw ? "Hide raw JSON" : "Show raw JSON"}
        </button>
      </div>

      {/* Active condition rows */}
      {activeTypes.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-center text-xs text-neutral-500">
          No conditions = catch-all (always matches). Add conditions to narrow which visitors this rule fires for.
        </div>
      ) : (
        <ul className="space-y-2">
          {activeTypes.map((type) => {
            const meta = CONDITIONS.find((c) => c.type === type);
            if (!meta) {
              return (
                <li key={type} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Unknown condition type <code>{type}</code> in JSON. Use raw editor to fix.
                  <button onClick={() => removeCondition(type)} className="ml-2 underline">Remove</button>
                </li>
              );
            }
            return (
              <li key={type} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-800">{meta.label}</div>
                    {meta.hint && <div className="text-xs text-neutral-500">{meta.hint}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCondition(type)}
                    className="text-xs text-neutral-400 hover:text-red-600"
                  >
                    × remove
                  </button>
                </div>
                <div className="mt-2">
                  <ConditionValueEditor
                    kind={meta.kind}
                    value={obj[type]}
                    onChange={(v) => updateCondition(type, v)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Raw JSON view (sync with structured) */}
      {showRaw && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-neutral-600">Raw JSON</div>
          <textarea
            value={Object.keys(obj).length === 0 ? "{}" : JSON.stringify(obj, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                  setObj(parsed);
                }
              } catch {
                /* ignore parse errors while typing; user can fix */
              }
            }}
            rows={4}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}

// ─── per-type value editors ─────────────────────────────────────────────────

function ConditionValueEditor({
  kind,
  value,
  onChange,
}: {
  kind: CondMeta["kind"];
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (kind === "boolean") {
    return (
      <select
        value={value === true ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className="rounded-md border border-neutral-300 px-3 py-1 text-sm"
      >
        <option value="true">Yes (true)</option>
        <option value="false">No (false)</option>
      </select>
    );
  }

  if (kind === "number") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : 0}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-32 rounded-md border border-neutral-300 px-3 py-1 text-sm"
      />
    );
  }

  if (kind === "csv") {
    const arr = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    return (
      <input
        type="text"
        value={arr.join(", ")}
        onChange={(e) => {
          const parts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
          onChange(parts);
        }}
        placeholder="comma, separated, values"
        className="w-full rounded-md border border-neutral-300 px-3 py-1 text-sm"
      />
    );
  }

  if (kind === "device_type") {
    return (
      <select
        value={typeof value === "string" ? value : "desktop"}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-1 text-sm"
      >
        {DEVICE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    );
  }

  if (kind === "day_of_week") {
    const arr = Array.isArray(value) ? value as number[] : typeof value === "number" ? [value] : [];
    return (
      <div className="flex flex-wrap gap-1">
        {DAY_LABELS.map((label, i) => {
          const selected = arr.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const next = selected ? arr.filter((d) => d !== i) : [...arr, i].sort();
                onChange(next);
              }}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                selected
                  ? "bg-orange-500 text-white"
                  : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  if (kind === "hour_of_day") {
    const obj = (value as { from?: number; to?: number }) || {};
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs text-neutral-500">From</span>
        <input
          type="number"
          min={0} max={23}
          value={obj.from ?? 0}
          onChange={(e) => onChange({ ...obj, from: parseInt(e.target.value, 10) || 0 })}
          className="w-20 rounded-md border border-neutral-300 px-2 py-1"
        />
        <span className="text-xs text-neutral-500">To</span>
        <input
          type="number"
          min={0} max={24}
          value={obj.to ?? 24}
          onChange={(e) => onChange({ ...obj, to: parseInt(e.target.value, 10) || 0 })}
          className="w-20 rounded-md border border-neutral-300 px-2 py-1"
        />
        <span className="text-xs text-neutral-500">(0-24, supports cross-midnight if from &gt; to)</span>
      </div>
    );
  }

  if (kind === "date_range") {
    const obj = (value as { from?: string; to?: string }) || {};
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs text-neutral-500">From</span>
        <input
          type="date"
          value={obj.from?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ ...obj, from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          className="rounded-md border border-neutral-300 px-2 py-1"
        />
        <span className="text-xs text-neutral-500">To</span>
        <input
          type="date"
          value={obj.to?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ ...obj, to: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          className="rounded-md border border-neutral-300 px-2 py-1"
        />
      </div>
    );
  }

  if (kind === "query_param") {
    const obj = (value as Record<string, string>) || {};
    const entries = Object.entries(obj);
    return (
      <div className="space-y-1">
        {entries.length === 0 && (
          <div className="text-xs text-neutral-500">No params yet — add one below.</div>
        )}
        {entries.map(([k, v], i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={k}
              onChange={(e) => {
                const next: Record<string, string> = {};
                entries.forEach(([kk, vv], j) => { next[j === i ? e.target.value : kk] = vv; });
                onChange(next);
              }}
              placeholder="key (e.g. rid)"
              className="w-40 rounded-md border border-neutral-300 px-2 py-1 text-sm font-mono"
            />
            <span className="text-xs text-neutral-500">=</span>
            <input
              type="text"
              value={v}
              onChange={(e) => onChange({ ...obj, [k]: e.target.value })}
              placeholder="value"
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const next = { ...obj };
                delete next[k];
                onChange(next);
              }}
              className="text-xs text-neutral-400 hover:text-red-600"
            >×</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...obj, "": "" })}
          className="text-xs text-orange-700 hover:text-orange-900"
        >
          + add param
        </button>
      </div>
    );
  }

  if (kind === "referrer") {
    return (
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. (linkedin|twitter)\\.com"
        className="w-full rounded-md border border-neutral-300 px-3 py-1 text-sm font-mono"
      />
    );
  }

  if (kind === "ab_bucket") {
    const obj = (value as { experiment_id?: string; bucket?: string }) || {};
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs text-neutral-500">Experiment</span>
        <input
          type="text"
          value={obj.experiment_id ?? ""}
          onChange={(e) => onChange({ ...obj, experiment_id: e.target.value })}
          placeholder="hero_test"
          className="w-40 rounded-md border border-neutral-300 px-2 py-1 font-mono"
        />
        <span className="text-xs text-neutral-500">Bucket</span>
        <input
          type="text"
          value={obj.bucket ?? ""}
          onChange={(e) => onChange({ ...obj, bucket: e.target.value })}
          placeholder="A"
          className="w-24 rounded-md border border-neutral-300 px-2 py-1 font-mono"
        />
      </div>
    );
  }

  return null;
}

// Default value when adding a new condition of a given kind.
function defaultValueFor(meta: CondMeta): unknown {
  switch (meta.kind) {
    case "boolean": return true;
    case "number": return 7;
    case "csv": return [];
    case "device_type": return "desktop";
    case "day_of_week": return [6];        // default: Saturday (the user's example)
    case "hour_of_day": return { from: 0, to: 24 };
    case "date_range": return {};
    case "query_param": return {};
    case "referrer": return "";
    case "ab_bucket": return { experiment_id: "", bucket: "A" };
    default: return null;
  }
}
