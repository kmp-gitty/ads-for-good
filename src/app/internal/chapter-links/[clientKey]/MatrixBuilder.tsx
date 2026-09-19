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
//            (selected properties × axis¹ × axis² × … × axisⁿ)
//
//   NOT one big cartesian — each placement varies along DIFFERENT params
//   (display varies by slot, article by which article), so a single product
//   would emit meaningless cells like pos= on an article row.
//
// AXES ARE UNBOUNDED AND OPERATOR-NAMED. The count was capped at 2 initially;
// that was arbitrary and a display buy varying by slot AND article AND
// creative hit it immediately. `partner`/`article`/`pos` is ACJ's convention,
// not Chapter's — another tenant varies by `rid` or anything else — so the
// param field seeds from params already seen in this client's own click
// history rather than offering a fixed menu.
//
// DESTINATIONS ARE PER-ROW. A real buy splits 10/2/2/1 across landing pages
// (usually by property — a bank's Bucks branch page vs its Montco one), so
// "one destination + exceptions" is the wrong model. Set-all and
// set-selected keep that from being miserable to type.

import { useMemo, useState } from "react";
import { normalizeDestination } from "./UrlBuilder";

export type MatrixSlug = { slug: string; description: string | null; needs_to: boolean };

type Axis = { param: string; values: string };
type Block = { on: boolean; axes: Axis[] };

const EMPTY_AXIS: Axis = { param: "", values: "" };
// Two empty slots is just a starting shape, not a limit — "+ Add axis" grows it.
const EMPTY_BLOCK: Block = { on: false, axes: [{ ...EMPTY_AXIS }, { ...EMPTY_AXIS }] };

type Row = {
  id: string;
  host: string;
  slug: string;
  needsTo: boolean;
  cells: { param: string; value: string }[];
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

// Cartesian product over N lists. [] -> [[]] (one empty combo) so a block with
// no axes still produces exactly one row per property rather than zero.
function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>(
    (acc, list) => acc.flatMap(prefix => list.map(v => [...prefix, v])),
    [[]],
  );
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
  // Properties AND placements both default to ALL — an ACJ buy routinely spans
  // every paper and every placement type, so unchecking is less work than
  // checking. With no axis values yet this shows the baseline grid
  // (properties × placements) immediately, which is also the clearest
  // demonstration of what the tool does.
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set(hosts));
  const [blocks, setBlocks] = useState<Record<string, Block>>(() =>
    Object.fromEntries(
      slugs.map(s => [s.slug, { on: true, axes: [{ ...EMPTY_AXIS }, { ...EMPTY_AXIS }] }]),
    ),
  );
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
  // Which copy affordance last fired — "urls" | "tsv" | a row id.
  const [copied, setCopied] = useState<string | null>(null);

  const block = (slug: string): Block => blocks[slug] ?? EMPTY_BLOCK;

  function setBlock(slug: string, patch: Partial<Block>) {
    setBlocks(b => ({ ...b, [slug]: { ...block(slug), ...patch } }));
  }

  function setAxis(slug: string, i: number, patch: Partial<Axis>) {
    const b = block(slug);
    const axes = b.axes.map((a, j) => (j === i ? { ...a, ...patch } : a));
    setBlock(slug, { axes });
  }

  // A param name typed fresh becomes a NEW reporting dimension — `position`
  // next to an existing `pos` fragments exactly the way `Firstrust` next to
  // `firstrust` does, one level up. Warn, never block: a genuinely new axis is
  // a legitimate thing to do, and this is only a signal that it IS new.
  // Silent when the client has no param history to compare against.
  function unknownParam(name: string): boolean {
    const v = name.trim();
    return v.length > 0 && knownParams.length > 0 && !knownParams.includes(v);
  }

  // Two axes in one block sharing a param name is always a mistake, and a
  // SILENT one: URLSearchParams.set() overwrites, so the second axis vanishes
  // from the URL while still multiplying the row count. Caught live on the
  // article block (Sep 19) where `placement` was entered twice.
  function duplicateParam(slug: string, i: number): boolean {
    const axes = block(slug).axes;
    const name = axes[i].param.trim();
    if (!name) return false;
    return axes.some((a, j) => j !== i && a.param.trim() === name);
  }

  // `placement` is the SLUG, already in the path (/r/<client>/<slug>). Carrying
  // it again as a query param gives two competing fields for one fact.
  function redundantParam(name: string): boolean {
    return ["placement", "slug", "property", "link_host", "host"].includes(name.trim().toLowerCase());
  }

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const orderedHosts = hosts.filter(h => selectedHosts.has(h));

    for (const s of slugs) {
      const b = blocks[s.slug] ?? EMPTY_BLOCK;
      if (!b.on) continue;

      // Only named axes participate. A named axis with no values contributes
      // one empty value so the row still exists — "newsletter, all five
      // papers, nothing filled in yet" must still show five links.
      const named = b.axes.filter(a => a.param.trim());
      const lists = named.map(a => {
        const vs = splitValues(a.values);
        return vs.length ? vs : [""];
      });

      for (const host of orderedHosts) {
        for (const combo of cartesian(lists)) {
          out.push({
            id: [host, s.slug, ...combo].join("|"),
            host,
            slug: s.slug,
            needsTo: s.needs_to,
            cells: named.map((a, i) => ({ param: a.param.trim(), value: combo[i] })),
          });
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
    for (const c of r.cells) if (c.param && c.value) params.set(c.param, c.value);
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

  // One column per distinct param actually used, blank where it doesn't apply
  // to that row. Generic axis_1/axis_2 columns holding "pos=top" would be
  // unsortable and unpivotable in a spreadsheet, which is the whole point of
  // handing someone a CSV.
  function buildTable(): { header: string[]; body: string[][] } {
    const paramCols: string[] = [];
    for (const r of rows) {
      for (const c of r.cells) {
        if (c.param && c.value && !paramCols.includes(c.param)) paramCols.push(c.param);
      }
    }
    const header = ["property", "placement", "partner", ...paramCols, "destination", "url"];
    const body = rows.map(r => {
      const cells = [hostLabel(r.host), r.slug, partner.trim()];
      for (const col of paramCols) {
        cells.push(r.cells.find(c => c.param === col)?.value ?? "");
      }
      cells.push(r.needsTo ? normalizeDestination(destinations[r.id] ?? "") : "(from rule)");
      cells.push(urlFor(r));
      return cells;
    });
    return { header, body };
  }

  // TSV pastes into Sheets/Excel as real columns. Tabs and newlines inside a
  // value would silently shift every following cell, so they're stripped —
  // none of these fields should contain either.
  async function copyTsv() {
    const { header, body } = buildTable();
    const clean = (v: string) => v.replace(/[\t\r\n]+/g, " ");
    const text = [header, ...body].map(r => r.map(clean).join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied("tsv");
      setTimeout(() => setCopied(null), 1800);
    } catch { /* noop */ }
  }

  function downloadCsv() {
    const { header, body } = buildTable();
    const lines = [header.map(csvCell).join(","), ...body.map(r => r.map(csvCell).join(","))];
    const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chapter-links-matrix-${clientKey}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

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
      setCopied("urls");
      setTimeout(() => setCopied(null), 1800);
    } catch { /* noop */ }
  }

  // Per-row copy is the workflow that actually happens: paste THIS url into
  // THAT slot of THAT send. Copying all 240 and hunting for one is worse.
  async function copyRow(r: Row) {
    try {
      await navigator.clipboard.writeText(urlFor(r));
      setCopied(r.id);
      setTimeout(() => setCopied(null), 1400);
    } catch { /* noop */ }
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
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
          An axis is any query param you want to vary. The name is free text — the dropdown only
          suggests params this client&apos;s links have used before. Values are one per line.
        </p>
        <div className="mt-3 space-y-3">
          {slugs.map(s => {
            const b = block(s.slug);
            const propCount = selectedHosts.size;
            const comboCount = b.axes
              .filter(a => a.param.trim())
              .reduce((n, a) => n * Math.max(1, splitValues(a.values).length), 1);
            const blockRows = b.on ? propCount * comboCount : 0;

            return (
              <div key={s.slug} className={`rounded-md border p-3 ${b.on ? "border-orange-200 bg-orange-50/40" : "border-neutral-200 bg-neutral-50"}`}>
                <label className="flex cursor-pointer flex-wrap items-center gap-2">
                  <input type="checkbox" checked={b.on} onChange={() => setBlock(s.slug, { on: !b.on })} />
                  <span className="font-mono text-sm font-semibold text-neutral-900">{s.slug}</span>
                  {!s.needs_to && (
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600">
                      destination from rule
                    </span>
                  )}
                  {s.description && <span className="truncate text-xs text-neutral-500">{s.description}</span>}
                  {b.on && (
                    <span className="ml-auto text-[11px] text-neutral-500">
                      {propCount} × {comboCount} = <span className="font-semibold text-neutral-700">{blockRows}</span> rows
                    </span>
                  )}
                </label>

                {b.on && (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {b.axes.map((a, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                              Vary by {i > 0 && <span className="font-normal normal-case text-neutral-400">(optional)</span>}
                            </span>
                            {b.axes.length > 1 && (
                              <button
                                type="button"
                                className="text-[11px] text-neutral-400 underline underline-offset-2"
                                onClick={() => setBlock(s.slug, { axes: b.axes.filter((_, j) => j !== i) })}
                              >
                                remove
                              </button>
                            )}
                          </div>
                          <input
                            className={inputCls}
                            list="matrix-params"
                            placeholder={i === 0 ? "pos" : "send"}
                            value={a.param}
                            onChange={e => setAxis(s.slug, i, { param: e.target.value })}
                          />
                          {duplicateParam(s.slug, i) && (
                            <p className="text-[11px] leading-snug text-red-700">
                              Already used as another axis in this placement. Both would write the same
                              query param and the later one wins — one axis would multiply your row count
                              while vanishing from the URL.
                            </p>
                          )}
                          {redundantParam(a.param) && (
                            <p className="text-[11px] leading-snug text-amber-700">
                              Already in the URL path as the slug ({s.slug}). Carrying it again as a param
                              gives two competing fields for one fact in reporting.
                            </p>
                          )}
                          {unknownParam(a.param) && !duplicateParam(s.slug, i) && (
                            <p className="text-[11px] leading-snug text-amber-700">
                              New param — this client&apos;s links have used{" "}
                              <span className="font-mono">{knownParams.slice(0, 4).join(", ")}</span>. Fine if
                              intentional; a typo here becomes a separate dimension in reporting.
                            </p>
                          )}
                          <textarea
                            className={`${inputCls} font-mono text-xs`}
                            rows={3}
                            placeholder={i === 0 ? "top\nsidebar\nfooter" : "bucksco_weekly.email_12"}
                            value={a.values}
                            onChange={e => setAxis(s.slug, i, { values: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-orange-700 underline underline-offset-2"
                      onClick={() => setBlock(s.slug, { axes: [...b.axes, { ...EMPTY_AXIS }] })}
                    >
                      + Add axis
                    </button>
                  </>
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
                  <th className="px-3 py-2">URL</th>
                  <th className="w-10 px-3 py-2" />
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
                        {r.cells.filter(c => c.param && c.value).map(c => `${c.param}=${c.value}`).join(" · ") || "—"}
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
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-neutral-500">
                        {urlFor(r)}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          className="rounded border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600"
                          onClick={() => copyRow(r)}
                        >
                          {copied === r.id ? "✓" : "Copy"}
                        </button>
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
              {copied === "urls" ? "Copied" : `Copy ${rows.length} URLs`}
            </button>
            <button type="button" className={btn} onClick={copyTsv}>
              {copied === "tsv" ? "Copied" : "Copy as table"}
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
