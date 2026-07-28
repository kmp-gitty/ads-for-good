"use client";

// Structured condition editor for redirect-rule conditions. Restyled to match
// the shared builder-primitives visual family. All 17 condition-type support
// preserved from the prior Tailwind implementation — this is a pure visual
// refresh.
//
// The underlying value is still the same JSON object the rule engine expects
// (e.g. `{day_of_week: [6], country_in: ["US"]}`). This component renders an
// add-row UX on top so operators don't have to know each condition type's
// exact JSON shape.
//
// Edits flow: structured UI → state.conditions object → onChange(jsonString).
// If parse fails (operator edited the raw textarea to something invalid), we
// render in "raw-only" mode.

import { useEffect, useMemo, useState } from "react";
import { INK, MUTED, FAINT, ORANGE, LINE, PANEL, SUBTLE } from "@/app/lib/ui/builder-primitives";

// All 17 condition types. Per-row UI rendered via `kind`.
type CondMeta = {
  type: string;
  label: string;
  kind:
    | "boolean"
    | "number"
    | "csv"
    | "device_type"
    | "day_of_week"
    | "hour_of_day"
    | "date_range"
    | "query_param"
    | "referrer"
    | "ab_bucket";
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
  { type: "country_in", label: "Country code in", kind: "csv", hint: "US, CA, GB … (comma-separated)" },
  { type: "region_in", label: "Region code in", kind: "csv", hint: "State/region. Comma-separated." },
  { type: "device_type", label: "Device type", kind: "device_type" },
  { type: "os", label: "OS in", kind: "csv", hint: "ios, android, macos, windows, linux, unknown" },
  { type: "ab_bucket", label: "A/B test bucket", kind: "ab_bucket", hint: "Visitor assigned to a specific bucket" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEVICE_TYPES = ["mobile", "tablet", "desktop", "bot", "unknown"];

const smallInp: React.CSSProperties = {
  fontSize: 13,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  padding: "6px 9px",
};

const smallMono: React.CSSProperties = {
  ...smallInp,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

type Props = {
  jsonValue: string;
  onChange: (jsonString: string) => void;
};

export default function ConditionBuilder({ jsonValue, onChange }: Props) {
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
      <div>
        <div style={{ border: "1px solid #E4C57A", background: "#FFF8DC", color: "#7B5B10", borderRadius: 8, padding: "8px 10px", fontSize: 12, marginBottom: 8 }}>
          Couldn&apos;t parse current conditions ({parseError}). Edit raw JSON below.
        </div>
        <textarea
          value={jsonValue}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          style={{ ...smallMono, width: "100%", boxSizing: "border-box", padding: "8px 10px" }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Add condition row + raw JSON toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <select
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          style={smallInp}
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
          style={{
            background: ORANGE,
            color: "white",
            fontSize: 12.5,
            fontWeight: 600,
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: adding ? "pointer" : "not-allowed",
            opacity: adding ? 1 : 0.5,
          }}
        >
          + Add
        </button>
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: MUTED,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {showRaw ? "Hide raw JSON" : "Show raw JSON"}
        </button>
      </div>

      {/* Active condition cards */}
      {activeTypes.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${LINE}`,
            background: PANEL,
            borderRadius: 10,
            padding: "14px",
            textAlign: "center",
            fontSize: 12.5,
            color: FAINT,
            lineHeight: 1.4,
          }}
        >
          No conditions = catch-all (always matches). Add conditions to narrow which visitors this rule fires for.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activeTypes.map((type) => {
            const meta = CONDITIONS.find((c) => c.type === type);
            if (!meta) {
              return (
                <div
                  key={type}
                  style={{
                    border: "1px solid #E4C57A",
                    background: "#FFF8DC",
                    color: "#7B5B10",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 12,
                  }}
                >
                  Unknown condition type <code>{type}</code> in JSON. Use raw editor to fix.{" "}
                  <button
                    onClick={() => removeCondition(type)}
                    style={{ background: "none", border: "none", color: "#7B5B10", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: 12 }}
                  >
                    Remove
                  </button>
                </div>
              );
            }
            return (
              <div
                key={type}
                style={{ border: `1px solid ${LINE}`, background: "white", borderRadius: 10, padding: "10px 12px" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{meta.label}</div>
                    {meta.hint && (
                      <div style={{ fontSize: 11, color: FAINT, marginTop: 2 }}>{meta.hint}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCondition(type)}
                    style={{ background: "none", border: "none", color: FAINT, fontSize: 12, cursor: "pointer", padding: 0 }}
                  >
                    × remove
                  </button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <ConditionValueEditor
                    kind={meta.kind}
                    value={obj[type]}
                    onChange={(v) => updateCondition(type, v)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw JSON view (kept in sync with structured state) */}
      {showRaw && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
            Raw JSON
          </div>
          <textarea
            value={Object.keys(obj).length === 0 ? "{}" : JSON.stringify(obj, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                  setObj(parsed);
                }
              } catch {
                /* ignore parse errors while typing */
              }
            }}
            rows={4}
            style={{ ...smallMono, width: "100%", boxSizing: "border-box", padding: "8px 10px" }}
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
        style={smallInp}
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
        style={{ ...smallInp, width: 120 }}
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
        style={{ ...smallInp, width: "100%", boxSizing: "border-box" }}
      />
    );
  }

  if (kind === "device_type") {
    return (
      <select
        value={typeof value === "string" ? value : "desktop"}
        onChange={(e) => onChange(e.target.value)}
        style={smallInp}
      >
        {DEVICE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    );
  }

  if (kind === "day_of_week") {
    const arr = Array.isArray(value) ? (value as number[]) : typeof value === "number" ? [value] : [];
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "5px 10px",
                borderRadius: 6,
                cursor: "pointer",
                border: `1px solid ${selected ? ORANGE : LINE}`,
                background: selected ? SUBTLE : "white",
                color: selected ? ORANGE : INK,
              }}
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
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, flexWrap: "wrap" }}>
        <span>From</span>
        <input
          type="number"
          min={0}
          max={23}
          value={o.from ?? 0}
          onChange={(e) => onChange({ ...o, from: parseInt(e.target.value, 10) || 0 })}
          style={{ ...smallInp, width: 70 }}
        />
        <span>To</span>
        <input
          type="number"
          min={0}
          max={24}
          value={o.to ?? 24}
          onChange={(e) => onChange({ ...o, to: parseInt(e.target.value, 10) || 0 })}
          style={{ ...smallInp, width: 70 }}
        />
        <span style={{ color: FAINT }}>(0–24, supports cross-midnight if from &gt; to)</span>
      </div>
    );
  }

  if (kind === "date_range") {
    const o = (value as { from?: string; to?: string }) || {};
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, flexWrap: "wrap" }}>
        <span>From</span>
        <input
          type="date"
          value={o.from?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ ...o, from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          style={smallInp}
        />
        <span>To</span>
        <input
          type="date"
          value={o.to?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ ...o, to: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          style={smallInp}
        />
      </div>
    );
  }

  if (kind === "query_param") {
    const o = (value as Record<string, string>) || {};
    const entries = Object.entries(o);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.length === 0 && (
          <div style={{ fontSize: 12, color: FAINT }}>No params yet — add one below.</div>
        )}
        {entries.map(([k, v], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="text"
              value={k}
              onChange={(e) => {
                const next: Record<string, string> = {};
                entries.forEach(([kk, vv], j) => {
                  next[j === i ? e.target.value : kk] = vv;
                });
                onChange(next);
              }}
              placeholder="key"
              style={{ ...smallMono, width: 140 }}
            />
            <span style={{ fontSize: 12, color: FAINT }}>=</span>
            <input
              type="text"
              value={v}
              onChange={(e) => onChange({ ...o, [k]: e.target.value })}
              placeholder="value"
              style={{ ...smallMono, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => {
                const next = { ...o };
                delete next[k];
                onChange(next);
              }}
              style={{ background: "none", border: "none", color: FAINT, fontSize: 13, cursor: "pointer", padding: "0 4px" }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...o, "": "" })}
          style={{ background: "none", border: "none", color: ORANGE, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, alignSelf: "flex-start" }}
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
        style={{ ...smallMono, width: "100%", boxSizing: "border-box" }}
      />
    );
  }

  if (kind === "ab_bucket") {
    const o = (value as { experiment_id?: string; bucket?: string }) || {};
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, flexWrap: "wrap" }}>
        <span>Experiment</span>
        <input
          type="text"
          value={o.experiment_id ?? ""}
          onChange={(e) => onChange({ ...o, experiment_id: e.target.value })}
          placeholder="hero_test"
          style={{ ...smallMono, width: 160 }}
        />
        <span>Bucket</span>
        <input
          type="text"
          value={o.bucket ?? ""}
          onChange={(e) => onChange({ ...o, bucket: e.target.value })}
          placeholder="A"
          style={{ ...smallMono, width: 80 }}
        />
      </div>
    );
  }

  return null;
}

function defaultValueFor(meta: CondMeta): unknown {
  switch (meta.kind) {
    case "boolean": return true;
    case "number": return 7;
    case "csv": return [];
    case "device_type": return "desktop";
    case "day_of_week": return [6];
    case "hour_of_day": return { from: 0, to: 24 };
    case "date_range": return {};
    case "query_param": return {};
    case "referrer": return "";
    case "ab_bucket": return { experiment_id: "", bucket: "A" };
    default: return null;
  }
}
