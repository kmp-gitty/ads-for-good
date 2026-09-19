"use client";

// Matrix builder — bulk Chapter Link generation across a campaign's dimensions.
//
// Exists because a publisher buy is not one link, it's a grid. A newsletter
// flight for one advertiser is (properties × banner positions × sends), which
// is hundreds of URLs that differ only in tracking params. Hand-building those
// in the single-URL builder is where typos and convention drift come from.
//
// SHAPE (settled with the operator, Sep 19):
//
//   rows = UNION over selected placements of
//            (selected properties × axis1 values × axis2 values)
//
//   NOT one big cartesian — each placement varies along DIFFERENT params
//   (display varies by slot, article by which article), so a single product
//   would emit meaningless cells like pos= on an article row.
//
// AXES ARE OPERATOR-NAMED, not hardcoded. `partner`/`article`/`pos` is ACJ's
// convention, not Chapter's — another tenant varies by `rid` or anything else.
// The param-name field seeds from params already seen in this client's own
// click history, so the convention is discoverable without being enforced.
//
// DESTINATIONS ARE PER-ROW. A real buy splits 10/2/2/1 across landing pages
// (usually by property — a bank's Bucks branch page vs its Montco one), so
// "one destination + exceptions" is the wrong model. Set-all and
// set-selected keep that from being miserable to type.

import { useMemo, useState } from "react";
import { normalizeDestination } from "./UrlBuilder";

export type MatrixSlug = { slug: string; description: string | null; needs_to: boolean };

// Params the matrix must never offer as an axis: either reserved by the
// redirect itself, or already owned by a dedicated field on this form.
// `rh`/`rid`/`re` are identity hints stripped before the destination, and a
// rule keyed on them can never fire — offering them would build dead links.
export const RESERVED_PARAMS = new Set([
  "to", "partner", "rh", "rid", "re", "chid", "jid",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
]);

type Block = {
  on: boolean;
  a1Param: string;
  a1Values: string;
  a2Param: string;
  a2Values: string;
};

const EMPTY_BLOCK: Block = { on: false, a1Param: "", a1Values: "", a2Param: "", a2Values: "" };

type Row = {
  id: string;
  host: string;
  slug: string;
  needsTo: boolean;
  a1Param: string;
  a1Value: string;
  a2Param: string;
  a2Value: string;
};

function splitValues(raw: string): string[] {
  const out = raw
    .split(/[\n,]/)
    .map(v => v.trim())
    .filter(Boolean);
  // De-dupe but keep operator order — a pasted list often has repeats and we
  // do NOT want the same URL emitted twice in a CSV someone will paste into a
  // scheduler.
  return [...new Set(out)];
}

function hostLabel(h: string): string {
  return h.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function csvCell(v: string): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export default function MatrixBuilder({
  clientKey,
  hosts,
  slugs,
  knownPartners = [],
  knownParams = [],
}: {
  clientKey: string;
  hosts: string[];
  slugs: MatrixSlug[];
  knownPartners?: string[];
  knownParams?: string[];
}) {
  // Properties default to ALL — a network buy is the common case, and
  // unchecking two is less work than checking three.
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set(hosts));
  const [blocks, setBlocks] = useState<Record<string, Block>>({});
  const [partner, setPartner] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  // Keyed by row id, NOT by index — so adding a property or a send later
  // doesn't shuffle destinations onto the wrong rows. This is the whole reason
  // row ids are content-derived rather than positional.
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fillValue, setFillValue] = useState("");
  const [copied, setCopied] = useState(false);

  const block = (slug: string): Block => blocks[slug] ?? EMPTY_BLOCK;

  function setBlock(slug: string, patch: Partial<Block>) {
    setBlocks(b => ({ ...b, [slug]: { ...block(slug), ...patch } }));
  }

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const orderedHosts = hosts.filter(h => selectedHosts.has(h));

    for (const s of slugs) {
      const b = blocks[s.slug] ?? EMPTY_BLOCK;
      if (!b.on) continue;

      // A blank axis contributes exactly one empty combo rather than zero
      // rows — "newsletter, all five papers, no sub-axis" must still produce
      // five links.
      const a1 = b.a1Param.trim() ? splitValues(b.a1Values) : [];
      const a2 = b.a2Param.trim() ? splitValues(b.a2Values) : [];
      const a1List = a1.length ? a1 : [""];
      const a2List = a2.length ? a2 : [""];

      for (const host of orderedHosts) {
        for (const v1 of a1List) {
          for (const v2 of a2List) {
            out.push({
              id: [host, s.slug, v1, v2].join("|"),
              host,
              slug: s.slug,
              needsTo: s.needs_to,
              a1Param: b.a1Param.trim(),
              a1Value: v1,
              a2Param: b.a2Param.trim(),
              a2Value: v2,
            });
          }
        }
      }
    }
    return out;
    // Reads `blocks` directly rather than via the block() helper: calling the
    // helper here makes the React compiler infer `block` as the dependency,
    // which it can't reconcile with the manual list.
  }, [blocks, selectedHosts, hosts, slugs]);

  function urlFor(r: Row): string {
    const params = new URLSearchParams();
    const dest = destinations[r.id] ?? "";
    // Only pass-through rules consume ?to=. On a rule-supplied slug the
    // destination comes from destination_template, and sending ?to= anyway
    // would be ignored at best and confusing in the click log at worst.
    if (r.needsTo && dest.trim()) params.set("to", normalizeDestination(dest));
    if (partner.trim()) params.set("partner", partner.trim());
    if (r.a1Param && r.a1Value) params.set(r.a1Param, r.a1Value);
    if (r.a2Param && r.a2Value) params.set(r.a2Param, r.a2Value);
    if (utmSource.trim()) params.set("utm_source", utmSource.trim());
    if (utmMedium.trim()) params.set("utm_medium", utmMedium.trim());
    if (utmCampaign.trim()) params.set("utm_campaign", utmCampaign.trim());
    const qs = params.toString();
    return `${r.host}/r/${clientKey}/${r.slug}${qs ? `?${qs}` : ""}`;
  }

  // A row is incomplete when its rule needs a ?to= and no usable destination
  // has been entered. Surfaced as a count so a 240-row grid doesn't require
  // scrolling to find the three blanks.
  const incomplete = rows.filter(r => {
    if (!r.needsTo) return false;
    const d = normalizeDestination(destinations[r.id] ?? "");
    if (!d) return true;
    try {
      const u = new URL(d);
      return !(u.protocol === "http:" || u.protocol === "https:");
    } catch {
      return true;
    }
  });

  function applyFill(ids: string[]) {
    const v = fillValue.trim();
    if (!v) return;
    setDestinations(d => {
      const next = { ...d };
      for (const id of ids) {
        const row = rows.find(r => r.id === id);
        if (row && !row.needsTo) continue; // never fill a rule-supplied row
        next[id] = v;
      }
      return next;
    });
  }

  function toggleHost(h: string) {
    setSelectedHosts(s => {
      const next = new Set(s);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(rows.map(urlFor).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  }

  function downloadCsv() {
    const header = "property,placement,partner,axis_1,axis_2,destination,url";
    const body = rows
      .map(r =>
        [
          csvCell(hostLabel(r.host)),
          csvCell(r.slug),
          csvCell(partner.trim()),
          csvCell(r.a1Param ? `${r.a1Param}=${r.a1Value}` : ""),
          csvCell(r.a2Param ? `${r.a2Param}=${r.a2Value}` : ""),
          csvCell(r.needsTo ? normalizeDestination(destinations[r.id] ?? "") : "(from rule)"),
          csvCell(urlFor(r)),
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chapter-links-matrix-${clientKey}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <datalist id="matrix-partners">
        {knownPartners.map(p => <option key={p} value={p} />)}
      </datalist>
      <datalist id="matrix-params">
        {knownParams.map(p => <option key={p} value={p} />)}
      </datalist>

      {/* Properties */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
            Properties <span className="ml-1 font-normal normal-case tracking-normal text-neutral-400">link host per row</span>
          </h3>
          <div className="flex gap-2 text-xs">
            <button type="button" className={linkBtn} onClick={() => setSelectedHosts(new Set(hosts))}>All</button>
            <button type="button" className={linkBtn} onClick={() => setSelectedHosts(new Set())}>None</button>
          </div>
        </div>
        {hosts.length === 1 && (
          <p className="mt-2 text-xs text-neutral-500">
            This tenant has one link host, so every row is built on it.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {hosts.map(h => {
            const on = selectedHosts.has(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => toggleHost(h)}
                className={`rounded-full border px-3 py-1.5 font-mono text-xs ${
                  on
                    ? "border-orange-500 bg-orange-50 text-neutral-900"
                    : "border-neutral-300 bg-white text-neutral-500"
                }`}
              >
                {on ? "✓ " : ""}{hostLabel(h)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Placements + axes */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
          Placements <span className="ml-1 font-normal normal-case tracking-normal text-neutral-400">each varies along its own params</span>
        </h3>
        <div className="mt-3 space-y-3">
          {slugs.map(s => {
            const b = block(s.slug);
            return (
              <div key={s.slug} className={`rounded-md border p-3 ${b.on ? "border-orange-200 bg-orange-50/40" : "border-neutral-200 bg-neutral-50"}`}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={b.on} onChange={() => setBlock(s.slug, { on: !b.on })} />
                  <span className="font-mono text-sm font-semibold text-neutral-900">{s.slug}</span>
                  {!s.needs_to && (
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600">
                      destination from rule
                    </span>
                  )}
                  {s.description && <span className="truncate text-xs text-neutral-500">{s.description}</span>}
                </label>

                {b.on && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {([1, 2] as const).map(n => (
                      <div key={n} className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                          Vary by {n === 2 && <span className="font-normal normal-case text-neutral-400">(optional)</span>}
                        </span>
                        <input
                          className={inputCls}
                          list="matrix-params"
                          placeholder={n === 1 ? "pos" : "send"}
                          value={n === 1 ? b.a1Param : b.a2Param}
                          onChange={e => setBlock(s.slug, n === 1 ? { a1Param: e.target.value } : { a2Param: e.target.value })}
                        />
                        <textarea
                          className={`${inputCls} font-mono text-xs`}
                          rows={3}
                          placeholder={n === 1 ? "top\nsidebar\nfooter" : "bucksco_weekly.email_12"}
                          value={n === 1 ? b.a1Values : b.a2Values}
                          onChange={e => setBlock(s.slug, n === 1 ? { a1Values: e.target.value } : { a2Values: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Constants */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
          Applied to every row
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Partner</span>
            <input className={`${inputCls} mt-1`} list="matrix-partners" value={partner} onChange={e => setPartner(e.target.value)} placeholder="firstrust" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">utm_source</span>
            <input className={`${inputCls} mt-1`} value={utmSource} onChange={e => setUtmSource(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">utm_medium</span>
            <input className={`${inputCls} mt-1`} value={utmMedium} onChange={e => setUtmMedium(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">utm_campaign</span>
            <input className={`${inputCls} mt-1`} value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} />
          </label>
        </div>
      </section>

      {/* Grid */}
      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="text-sm">
            <span className="font-semibold text-neutral-900">{rows.length}</span>
            <span className="text-neutral-500"> link{rows.length === 1 ? "" : "s"}</span>
            {incomplete.length > 0 && (
              <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                {incomplete.length} need a destination
              </span>
            )}
            {selected.size > 0 && (
              <span className="ml-2 text-xs text-neutral-500">{selected.size} selected</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${inputCls} !w-64`}
              placeholder="firstrust.com/bucks"
              value={fillValue}
              onChange={e => setFillValue(e.target.value)}
            />
            <button type="button" className={btn} disabled={!fillValue.trim() || rows.length === 0} onClick={() => applyFill(rows.map(r => r.id))}>
              Set all
            </button>
            <button type="button" className={btn} disabled={!fillValue.trim() || selected.size === 0} onClick={() => applyFill([...selected])}>
              Set selected
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-500">
            Pick at least one property and turn on a placement to generate rows.
          </p>
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))}
                    />
                  </th>
                  <th className="px-3 py-2">Property</th>
                  <th className="px-3 py-2">Placement</th>
                  <th className="px-3 py-2">Axes</th>
                  <th className="px-3 py-2">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map(r => {
                  const dest = destinations[r.id] ?? "";
                  const bad = r.needsTo && incomplete.some(i => i.id === r.id);
                  return (
                    <tr key={r.id} className={selected.has(r.id) ? "bg-orange-50/50" : undefined}>
                      <td className="px-3 py-1.5 align-middle">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-neutral-700">{hostLabel(r.host)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-neutral-700">{r.slug}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-neutral-500">
                        {[r.a1Param && r.a1Value ? `${r.a1Param}=${r.a1Value}` : "", r.a2Param && r.a2Value ? `${r.a2Param}=${r.a2Value}` : ""]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        {r.needsTo ? (
                          <input
                            className={`w-full rounded border px-2 py-1 font-mono text-xs ${
                              bad ? "border-red-300 bg-red-50 text-neutral-900" : "border-neutral-200 bg-white text-neutral-900"
                            }`}
                            value={dest}
                            placeholder="firstrust.com/bucks"
                            onChange={e => setDestinations(d => ({ ...d, [r.id]: e.target.value }))}
                            onBlur={e => {
                              const v = normalizeDestination(e.target.value);
                              setDestinations(d => ({ ...d, [r.id]: v }));
                            }}
                          />
                        ) : (
                          <span className="text-neutral-400">from rule</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 px-4 py-3">
            <button type="button" className={btnPrimary} onClick={copyAll}>
              {copied ? "Copied" : `Copy ${rows.length} URLs`}
            </button>
            <button type="button" className={btn} onClick={downloadCsv}>
              Download CSV
            </button>
            {incomplete.length > 0 && (
              <span className="text-xs text-red-700">
                {incomplete.length} row{incomplete.length === 1 ? "" : "s"} will fall through to the client default until a destination is set.
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

const btn =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-40";

const btnPrimary =
  "rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";

const linkBtn = "text-neutral-500 underline underline-offset-2";
