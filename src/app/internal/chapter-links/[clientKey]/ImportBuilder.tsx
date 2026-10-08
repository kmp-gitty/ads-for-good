"use client";

// Bulk link import — LIST mode.
//
// The sibling of Matrix, not a replacement. They differ only in how ROWS are
// produced and share everything after:
//   axes mode (Matrix) — properties x placements x axis values. Right for one
//                        advertiser with variations: 4 banners x 5 papers.
//   list mode (here)   — a bespoke list where nothing is a product of anything:
//                        52 advertisers each with their own destination, size
//                        and creative.
//
// 🔑 LINK IDS ARE DERIVED, NEVER PASTED. Of 66 hand-entered ids in the live
//    registry, one has the slug sitting in the promo position. Eliminating the
//    input beats validating it. If the sheet still carries its old link column
//    you can map it as a CROSS-CHECK — it is compared, never used.

import { useMemo, useState } from "react";
import { normalizeDestination } from "./UrlBuilder";
import { hostLabel, propertyToken, slugify, parseSheet, resolveHost, nearestPartner } from "./import-parse";
import {
  planRegistryImport, commitRegistryImport,
  type ImportRow, type ImportPlan,
} from "./_import-actions";

const INK = "#1F2D43", MUTED = "#5C6B82", FAINT = "#8A98AD";
const ORANGE = "#E36410", LINE = "#E5E0D4", PANEL = "#FBFAF6";
const DANGER = "#B4232A", GREEN = "#2E7D5B";

// Mapped independently of the sheet's own column names.
const FIELDS = [
  "host", "slug", "destination",
  "partner", "promo", "loc", "size", "creative", "article",
  "utm_source", "utm_medium", "utm_campaign",
] as const;
type Field = (typeof FIELDS)[number];

// Reportable dimensions — lifted by the click logger into pixel_events.dimensions
// and recorded on the registry row.
const DIMENSION_FIELDS: Field[] = ["partner", "promo", "loc", "size", "creative", "article"];

// Campaign tagging. These are CHAPTER's own utm, landing in pixel_events.utm —
// a different column from dimensions, so they are set as params but deliberately
// NOT written into the registry row's dimensions.
//
// ⚠️ Not to be confused with a partner's own UTMs, which live INSIDE the
//    destination and ride through ?to= untouched. Setting utm_source here does
//    not alter the partner's URL.
const UTM_FIELDS: Field[] = ["utm_source", "utm_medium", "utm_campaign"];

type Mode = "none" | "const" | "col";
type Mapping = Record<Field, { mode: Mode; value: string }>;

const EMPTY_MAPPING = Object.fromEntries(
  FIELDS.map(f => [f, { mode: "none" as Mode, value: "" }]),
) as Mapping;

// Advisory, not a limit — the DB hard-stops at 128. Surfaced with a character
// count so the operator shortens by judgment rather than being forced to.
const ID_WARN_LEN = 70;
const ID_MAX_LEN = 128;

const inp: React.CSSProperties = {
  width: "100%", padding: "7px 9px", border: `1px solid ${LINE}`,
  borderRadius: 6, fontSize: 13, color: INK, background: "#fff",
};

export default function ImportBuilder({
  clientKey, hosts, slugs, knownPartners, defaultPattern,
}: {
  clientKey: string;
  hosts: string[];
  slugs: { slug: string; description: string | null; needs_to: boolean }[];
  knownPartners: string[];
  defaultPattern: string;
}) {
  const [raw, setRaw] = useState("");
  const [mapping, setMapping] = useState<Mapping>(EMPTY_MAPPING);
  const [pattern, setPattern] = useState(defaultPattern);
  const [crossCheckCol, setCrossCheckCol] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [overrides, setOverrides] = useState<Record<number, Partial<Record<Field, string>>>>({});
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [applyRow, setApplyRow] = useState<Record<string, boolean>>({});
  const [allowClear, setAllowClear] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const parsed = useMemo(() => parseSheet(raw), [raw]);

  function valueFor(rowIdx: number, f: Field): string {
    const o = overrides[rowIdx]?.[f];
    if (o !== undefined) return o;
    const m = mapping[f];
    if (m.mode === "const") return m.value.trim();
    if (m.mode === "col") {
      const i = parsed.headers.indexOf(m.value);
      return i >= 0 ? (parsed.rows[rowIdx]?.[i] ?? "").trim() : "";
    }
    return "";
  }

  // Derived, per the pattern. Same normalisation as Matrix so both surfaces
  // produce byte-identical ids for the same inputs.
  function linkIdFor(rowIdx: number): string {
    const pat = pattern.trim();
    if (!pat) return "";
    const host = valueFor(rowIdx, "host");
    const filled = pat.toLowerCase().replace(/\{([a-z0-9_]+)\}/g, (_m, key: string) => {
      if (key === "property") return host ? propertyToken(resolveHost(host, hosts)) : "";
      if (key === "placement" || key === "slug") return valueFor(rowIdx, "slug");
      return (FIELDS as readonly string[]).includes(key) ? valueFor(rowIdx, key as Field) : "";
    });
    return slugify(filled);
  }

  const built = useMemo(() => {
    return parsed.rows.map((_r, i) => {
      const host = resolveHost(valueFor(i, "host"), hosts);
      const slug = valueFor(i, "slug");
      const rule = slugs.find(s => s.slug === slug);
      const needsTo = rule ? rule.needs_to : true;
      const dest = normalizeDestination(valueFor(i, "destination"));
      const dims: Record<string, string> = {};
      for (const f of DIMENSION_FIELDS) { const v = valueFor(i, f); if (v) dims[f] = v; }
      const link_id = linkIdFor(i);

      const params = new URLSearchParams();
      if (needsTo && dest) params.set("to", dest);
      for (const f of DIMENSION_FIELDS) { const v = valueFor(i, f); if (v) params.set(f, v); }
      if (link_id) params.set("link", link_id);
      for (const f of UTM_FIELDS) { const v = valueFor(i, f); if (v) params.set(f, v); }
      const qs = params.toString();
      const url = host && slug ? `${host}/r/${clientKey}/${slug}${qs ? `?${qs}` : ""}` : "";

      return { i, host, slug, needsTo, dest, dims, link_id, url };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, mapping, overrides, pattern, hosts, slugs, clientKey]);

  const findings = useMemo(() => {
    const out: { row: number; level: "error" | "warn"; msg: string }[] = [];
    const idSeen = new Map<string, number>();
    const known = new Set(knownPartners.map(p => p.toLowerCase()));
    const ccIdx = crossCheckCol ? parsed.headers.indexOf(crossCheckCol) : -1;

    built.forEach(b => {
      const n = b.i + 2;
      if (!b.link_id) out.push({ row: n, level: "error", msg: "no link id — check the pattern and the fields it references" });
      else {
        if (idSeen.has(b.link_id)) out.push({ row: n, level: "error", msg: `duplicate link id "${b.link_id}" (also row ${idSeen.get(b.link_id)})` });
        else idSeen.set(b.link_id, n);
        if (b.link_id.length > ID_MAX_LEN) out.push({ row: n, level: "error", msg: `link id is ${b.link_id.length} characters — over the ${ID_MAX_LEN} limit` });
        else if (b.link_id.length > ID_WARN_LEN) out.push({ row: n, level: "warn", msg: `link id is ${b.link_id.length} characters — long, consider shortening` });
      }
      if (ccIdx >= 0) {
        const sheetId = (parsed.rows[b.i]?.[ccIdx] ?? "").trim().toLowerCase();
        if (sheetId && b.link_id && sheetId !== b.link_id)
          out.push({ row: n, level: "warn", msg: `sheet link id "${sheetId}" differs from derived "${b.link_id}"` });
      }
      if (!b.host) out.push({ row: n, level: "error", msg: "no link host" });
      if (!b.slug) out.push({ row: n, level: "error", msg: "no slug" });
      if (b.needsTo && !b.dest) out.push({ row: n, level: "error", msg: "this slug is a pass-through rule and needs a destination" });
      if (b.dest) {
        if (!/^https?:\/\//i.test(b.dest)) out.push({ row: n, level: "error", msg: `destination is not a valid URL: ${b.dest}` });
        else if (/^http:\/\//i.test(b.dest)) out.push({ row: n, level: "warn", msg: "destination is http:// — confirm it resolves (never rewritten for you)" });
        if (b.dest.includes("?")) out.push({ row: n, level: "warn", msg: "destination carries its own query string — encoded into ?to= automatically, but confirm the partner's params survive" });
      }
      const size = b.dims.size;
      if (size && !/^\d+x\d+$/i.test(size)) out.push({ row: n, level: "warn", msg: `size "${size}" is not WxH` });
      const p = (b.dims.partner ?? "").toLowerCase();
      if (p && !known.has(p)) {
        const near = nearestPartner(p, knownPartners);
        out.push({
          row: n, level: "warn",
          msg: near ? `partner "${p}" is new — did you mean "${near}"?`
                    : `partner "${p}" has never been used for this client — new advertiser, or typo?`,
        });
      }
    });
    return out;
  }, [built, knownPartners, crossCheckCol, parsed]);

  const errors = findings.filter(f => f.level === "error");
  const warns = findings.filter(f => f.level === "warn");

  function toRows(): ImportRow[] {
    return built.map(b => ({
      link_id: b.link_id, link_host: hostLabel(b.host), slug: b.slug,
      destination: b.needsTo ? (b.dest || null) : null,
      dimensions: b.dims, url: b.url || null,
    }));
  }

  async function runPlan() {
    setBusy(true); setStatus(null);
    try {
      const p = await planRegistryImport(clientKey, toRows());
      setPlan(p);
      const ar: Record<string, boolean> = {};
      for (const c of p.changes) ar[c.link_id] = true;
      setApplyRow(ar); setAllowClear({});
      setStatus(p.error ? `plan failed: ${p.error}` : null);
    } finally { setBusy(false); }
  }

  /** Re-apply the operator's keep-vs-clear decision before writing. */
  function mergedUpdate(c: ImportPlan["changes"][number]): ImportRow {
    const row: ImportRow = { ...c.incoming, dimensions: { ...c.incoming.dimensions } };
    if (allowClear[c.link_id]) return row;
    for (const f of c.fields) {
      if (!f.clears) continue;
      if (f.field.startsWith("dimensions.")) {
        const k = f.field.slice("dimensions.".length);
        if (f.from) row.dimensions[k] = f.from;
      } else if (f.field === "link_host") row.link_host = f.from;
      else if (f.field === "slug") row.slug = f.from ?? row.slug;
      else if (f.field === "destination") row.destination = f.from;
      else if (f.field === "url") row.url = f.from;
    }
    return row;
  }

  async function commit() {
    if (!plan) return;
    setBusy(true); setStatus(null);
    try {
      const updates = plan.changes.filter(c => applyRow[c.link_id]).map(mergedUpdate);
      const res = await commitRegistryImport(clientKey, plan.creates, updates);
      setStatus(res.error ? `register failed: ${res.error}`
        : `registered — ${res.inserted} created, ${res.updated} updated`);
      if (!res.error) await runPlan();
    } finally { setBusy(false); }
  }

  function downloadCsv() {
    const head = ["link_id", "link_host", "slug", "destination", "wrapped_url"];
    const body = built.map(b => [b.link_id, hostLabel(b.host), b.slug, b.dest, b.url]
      .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([`${head.join(",")}\n${body.join("\n")}\n`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chapter-links-${clientKey}-import.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  function setForSelection(f: Field, v: string) {
    if (sel.size === 0) return;
    setOverrides(prev => {
      const next = { ...prev };
      for (const i of sel) next[i] = { ...(next[i] ?? {}), [f]: v };
      return next;
    });
  }

  const [bulkField, setBulkField] = useState<Field>("promo");
  const [bulkValue, setBulkValue] = useState("");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <p style={{ margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.55, maxWidth: 760 }}>
        Paste rows straight from Sheets (or a CSV) when every link is bespoke — a rail of 50 partner
        logos, a batch of affiliate articles. Use <strong>Matrix</strong> instead when the links are a
        product of each other: one advertiser across five papers, or four banner sizes in one rail.
        <br />
        <strong>Link ids are derived from the pattern, never pasted.</strong> If your sheet still has
        its old link column, map it as a cross-check below — it is compared, never used.
      </p>

      {/* 1. Paste */}
      <Section n={1} title="Paste the sheet" sub="header row included · tab or comma separated">
        <p style={{ margin: "0 0 9px", fontSize: 12.5, color: MUTED, lineHeight: 1.55 }}>
          <strong style={{ color: INK }}>Column order and names don&apos;t matter</strong> — you map them
          to fields in step 2. Include a column only for what <em>varies</em>: anything the same on
          every row (host, slug, often loc) is set once as a constant, and a value that varies by
          group but has no column (three promo tiers, say) is set on a selection of rows.
          <br />
          You don&apos;t need a <code>link</code> column — ids are derived. Keep one only if your sheet
          already has hand-made ids you want cross-checked.
        </p>
        <textarea
          value={raw} onChange={e => { setRaw(e.target.value); setPlan(null); }}
          rows={6} placeholder={"destination\tpartner\tsize\tcreative\nhttps://example.com/\tacme_bank\t300x250\tacme_logo_rgb"}
          style={{ ...inp, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
        />
        {parsed.headers.length > 0 && (
          <p style={{ margin: "8px 0 0", fontSize: 12.5, color: MUTED }}>
            {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} · {parsed.headers.length} columns:{" "}
            <span style={{ fontFamily: "ui-monospace, monospace", color: INK }}>{parsed.headers.join(" · ")}</span>
          </p>
        )}
      </Section>

      {/* 2. Mapping */}
      {parsed.headers.length > 0 && (
        <Section n={2} title="Map the fields" sub="set once for every row, or point at a column">
          <div style={{ display: "grid", gap: 8 }}>
            {FIELDS.map(f => (
              <div key={f} style={{ display: "grid", gridTemplateColumns: "110px 190px 1fr", gap: 8, alignItems: "center" }}>
                <label style={{ fontSize: 12.5, color: INK, fontWeight: 600 }}>{f}</label>
                <select
                  value={mapping[f].mode}
                  onChange={e => { setMapping(m => ({ ...m, [f]: { mode: e.target.value as Mode, value: "" } })); setPlan(null); }}
                  style={inp}
                >
                  <option value="none">— not set —</option>
                  <option value="const">same for all rows</option>
                  <option value="col">from a column</option>
                </select>
                {mapping[f].mode === "col" ? (
                  <select value={mapping[f].value} onChange={e => { setMapping(m => ({ ...m, [f]: { ...m[f], value: e.target.value } })); setPlan(null); }} style={inp}>
                    <option value="">— pick a column —</option>
                    {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                ) : mapping[f].mode === "const" ? (
                  f === "host" ? (
                    <select value={mapping[f].value} onChange={e => { setMapping(m => ({ ...m, [f]: { ...m[f], value: e.target.value } })); setPlan(null); }} style={inp}>
                      <option value="">— pick a host —</option>
                      {hosts.map(h => <option key={h} value={h}>{hostLabel(h)}</option>)}
                    </select>
                  ) : f === "slug" ? (
                    <select value={mapping[f].value} onChange={e => { setMapping(m => ({ ...m, [f]: { ...m[f], value: e.target.value } })); setPlan(null); }} style={inp}>
                      <option value="">— pick a slug —</option>
                      {slugs.map(s => <option key={s.slug} value={s.slug}>{s.slug}</option>)}
                    </select>
                  ) : (
                    <input value={mapping[f].value} onChange={e => { setMapping(m => ({ ...m, [f]: { ...m[f], value: e.target.value } })); setPlan(null); }} style={inp} placeholder="value for every row" />
                  )
                ) : <span style={{ fontSize: 12, color: FAINT }}>—</span>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12.5, color: INK, fontWeight: 600 }}>Link ID pattern</label>
              <input value={pattern} onChange={e => { setPattern(e.target.value); setPlan(null); }} style={{ ...inp, fontFamily: "ui-monospace, monospace" }} />
              <p style={{ margin: "5px 0 0", fontSize: 11.5, color: FAINT, lineHeight: 1.5 }}>
                Built from what defines <em>which slot this is</em> — property, partner, promo, loc,
                article. Never from what occupies it: putting <code>creative</code> here splits a
                placement&apos;s click history every time the advertiser sends a new logo.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 12.5, color: INK, fontWeight: 600 }}>Cross-check against an existing id column</label>
              <select value={crossCheckCol} onChange={e => setCrossCheckCol(e.target.value)} style={inp}>
                <option value="">— none —</option>
                {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <p style={{ margin: "5px 0 0", fontSize: 11.5, color: FAINT, lineHeight: 1.5 }}>
                Compared to the derived id and flagged on mismatch. Never used as the id.
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* 3. Selection override */}
      {built.length > 0 && (
        <Section n={3} title="Set a field on selected rows" sub="for values that vary by group but have no column — e.g. three promo tiers">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: sel.size ? INK : FAINT }}>{sel.size} selected</span>
            <select value={bulkField} onChange={e => setBulkField(e.target.value as Field)} style={{ ...inp, width: 140 }}>
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="value" style={{ ...inp, width: 220 }} />
            <button
              onClick={() => { setForSelection(bulkField, bulkValue); setPlan(null); }}
              disabled={sel.size === 0 || !bulkValue.trim()}
              style={btn(sel.size > 0 && !!bulkValue.trim())}
            >Set on {sel.size} row{sel.size === 1 ? "" : "s"}</button>
            <button onClick={() => setSel(new Set(built.map(b => b.i)))} style={btn(true, true)}>Select all</button>
            <button onClick={() => setSel(new Set())} style={btn(true, true)}>Clear</button>
            {Object.keys(overrides).length > 0 && (
              <button onClick={() => { setOverrides({}); setPlan(null); }} style={btn(true, true)}>
                Reset {Object.keys(overrides).length} override{Object.keys(overrides).length === 1 ? "" : "s"}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* 4. Findings */}
      {built.length > 0 && (
        <Section n={4} title="Check" sub="advisory — warnings never block">
          <div style={{ display: "flex", gap: 20, fontSize: 13, marginBottom: 10 }}>
            <span><strong style={{ color: errors.length ? DANGER : GREEN }}>{errors.length}</strong> error{errors.length === 1 ? "" : "s"}</span>
            <span><strong style={{ color: warns.length ? ORANGE : INK }}>{warns.length}</strong> warning{warns.length === 1 ? "" : "s"}</span>
            <span style={{ color: MUTED }}>{built.length} rows</span>
          </div>
          {findings.length === 0
            ? <p style={{ margin: 0, fontSize: 13, color: GREEN }}>Nothing flagged.</p>
            : (
              <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${LINE}`, borderRadius: 6 }}>
                {findings.slice(0, 200).map((f, k) => (
                  <div key={k} style={{ display: "flex", gap: 10, padding: "6px 10px", borderBottom: `1px solid ${LINE}`, fontSize: 12.5 }}>
                    <span style={{ color: FAINT, minWidth: 54 }}>row {f.row}</span>
                    <span style={{ color: f.level === "error" ? DANGER : ORANGE, minWidth: 54, fontWeight: 600 }}>{f.level}</span>
                    <span style={{ color: INK }}>{f.msg}</span>
                  </div>
                ))}
              </div>
            )}
        </Section>
      )}

      {/* 5. Preview */}
      {built.length > 0 && (
        <Section n={5} title="Preview" sub={`showing ${showAll ? built.length : Math.min(built.length, 15)} of ${built.length}`}>
          <div style={{ overflowX: "auto", border: `1px solid ${LINE}`, borderRadius: 6 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: PANEL }}>
                <tr>
                  <th style={th}> </th><th style={th}>link id</th><th style={th}>host</th>
                  <th style={th}>slug</th><th style={th}>dimensions</th><th style={th}>wrapped url</th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? built : built.slice(0, 15)).map(b => (
                  <tr key={b.i} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td style={td}>
                      <input type="checkbox" checked={sel.has(b.i)} onChange={e => {
                        setSel(s => { const n = new Set(s); if (e.target.checked) n.add(b.i); else n.delete(b.i); return n; });
                      }} />
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: b.link_id ? INK : DANGER }}>
                      {b.link_id || "— none —"}
                      {b.link_id.length > ID_WARN_LEN && <span style={{ color: ORANGE, marginLeft: 6 }}>{b.link_id.length}</span>}
                    </td>
                    <td style={{ ...td, color: MUTED, fontSize: 12 }}>{hostLabel(b.host) || "—"}</td>
                    <td style={{ ...td, fontSize: 12 }}>{b.slug || "—"}</td>
                    <td style={{ ...td, fontSize: 11.5, color: MUTED }}>
                      {Object.entries(b.dims).map(([k, v]) => `${k}=${v}`).join(" · ") || "—"}
                    </td>
                    <td style={{ ...td, fontSize: 11, fontFamily: "ui-monospace, monospace", color: MUTED, maxWidth: 320, wordBreak: "break-all" }}>{b.url || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {built.length > 15 && (
            <button onClick={() => setShowAll(v => !v)} style={{ ...btn(true, true), marginTop: 8 }}>
              {showAll ? "Show first 15" : `Show all ${built.length}`}
            </button>
          )}
        </Section>
      )}

      {/* 6. Registry diff + commit */}
      {built.length > 0 && (
        <Section n={6} title="Check the registry, then register" sub="nothing is written until you confirm">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={runPlan} disabled={busy || errors.length > 0} style={btn(!busy && errors.length === 0)}>
              {busy ? "Working…" : "Check against registry"}
            </button>
            <button onClick={downloadCsv} style={btn(true, true)}>Download CSV</button>
            {errors.length > 0 && <span style={{ fontSize: 12.5, color: DANGER }}>fix {errors.length} error{errors.length === 1 ? "" : "s"} first</span>}
            {status && <span style={{ fontSize: 12.5, color: status.startsWith("registered") ? GREEN : DANGER }}>{status}</span>}
          </div>

          {plan && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", gap: 22, fontSize: 13, marginBottom: 10 }}>
                <span><strong style={{ color: GREEN }}>{plan.creates.length}</strong> new</span>
                <span><strong style={{ color: MUTED }}>{plan.unchanged.length}</strong> unchanged</span>
                <span><strong style={{ color: plan.changes.length ? ORANGE : MUTED }}>{plan.changes.length}</strong> changed</span>
                {plan.invalid.length > 0 && <span><strong style={{ color: DANGER }}>{plan.invalid.length}</strong> invalid</span>}
              </div>

              {plan.invalid.map(iv => (
                <div key={iv.link_id} style={{ fontSize: 12.5, color: DANGER, padding: "3px 0" }}>
                  {iv.link_id}: {iv.reason}
                </div>
              ))}

              {plan.changes.map(c => {
                const clears = c.fields.filter(f => f.clears);
                return (
                  <div key={c.link_id} style={{ border: `1px solid ${clears.length ? ORANGE : LINE}`, borderRadius: 6, padding: "9px 11px", marginBottom: 8, background: clears.length ? "#FFF6EF" : "#fff" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, fontWeight: 600, color: INK }}>
                      <input type="checkbox" checked={!!applyRow[c.link_id]} onChange={e => setApplyRow(a => ({ ...a, [c.link_id]: e.target.checked }))} />
                      <span style={{ fontFamily: "ui-monospace, monospace" }}>{c.link_id}</span>
                    </label>
                    {c.fields.map((f, k) => (
                      <div key={k} style={{ fontSize: 12, color: f.clears ? ORANGE : MUTED, paddingLeft: 24, marginTop: 3 }}>
                        {f.field}: <span style={{ color: INK }}>{f.from || "(blank)"}</span> → <span style={{ color: f.clears ? ORANGE : INK }}>{f.to || "(blank)"}</span>
                        {f.clears && " — would CLEAR"}
                      </div>
                    ))}
                    {clears.length > 0 && (
                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: ORANGE, paddingLeft: 24, marginTop: 6 }}>
                        <input type="checkbox" checked={!!allowClear[c.link_id]} onChange={e => setAllowClear(a => ({ ...a, [c.link_id]: e.target.checked }))} />
                        Clear {clears.length} blank field{clears.length === 1 ? "" : "s"} too — otherwise the existing value is kept
                      </label>
                    )}
                  </div>
                );
              })}

              {(plan.creates.length > 0 || plan.changes.some(c => applyRow[c.link_id])) && (
                <button onClick={commit} disabled={busy} style={{ ...btn(!busy), marginTop: 6 }}>
                  {busy ? "Writing…" : `Register ${plan.creates.length} new${plan.changes.filter(c => applyRow[c.link_id]).length ? ` + ${plan.changes.filter(c => applyRow[c.link_id]).length} changed` : ""}`}
                </button>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em",
  color: FAINT, fontWeight: 600, padding: "7px 10px", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { fontSize: 12.5, color: INK, padding: "7px 10px", verticalAlign: "top" };

function btn(enabled: boolean, secondary = false): React.CSSProperties {
  return {
    fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8,
    border: `1px solid ${secondary ? LINE : "transparent"}`,
    background: secondary ? "#fff" : enabled ? ORANGE : "#E3DED2",
    color: secondary ? INK : "#fff",
    cursor: enabled ? "pointer" : "not-allowed", opacity: enabled ? 1 : 0.7,
  };
}

function Section({ n, title, sub, children }: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "#fff", padding: "14px 16px" }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: ORANGE, marginRight: 8 }}>{n}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: FAINT, marginLeft: 8 }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}
