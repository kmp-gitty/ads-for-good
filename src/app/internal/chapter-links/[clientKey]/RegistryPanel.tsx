// Link registry — the generation log, rendered as a tab on the workbench.
//
// Click history only ever records DEMAND: a link that shipped and drew nothing
// is invisible in it. The registry records SUPPLY, so a placement sitting at
// zero is visible as a fact rather than as an absence.
//
// Lives as a component (not its own route) so it sits beside Generate URLs and
// Matrix — the two surfaces that write to it.

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const TEAL = "#2E7D5B";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

type Row = {
  link_id: string;
  slug: string;
  link_host: string | null;
  destination: string | null;
  url: string | null;
  dimensions: Record<string, string> | null;
  disabled_at: string | null;
  created_at: string;
  clicks: number;
  last_click: string | null;
  total_matching: number;
};

type SlugSummary = {
  slug: string;
  links: number;
  with_clicks: number;
  zero: number;
  disabled: number;
  clicks: number;
};

// ⚠️ THE REGISTRY IS NEVER READ WHOLE. PostgREST caps a response at 1,000 rows
//    and says nothing when it truncates. This panel used to fetch one row per
//    link and count them in JS, which was fine at 67 links and silently wrong
//    at 19,132: it showed the top 1,000 and reported "1,000 registered".
//
//    So totals come from link_registry_summary (aggregated in SQL over every
//    row) and the table from link_registry_rows (always bounded). Never derive
//    a count from rows.length here.
const PER_SLUG = 25;   // overview: top links shown per placement
const PAGE_SIZE = 200; // filtered view: rows per page

export const REGISTRY_WINDOWS = [
  { key: "30", days: 30, label: "30 days" },
  { key: "90", days: 90, label: "90 days" },
  { key: "365", days: 365, label: "12 months" },
];

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function RegistryPanel({
  clientKey,
  daysKey,
  slug: slugProp,
  q: qProp,
  page: pageProp,
  basePath: basePathProp,
}: {
  clientKey: string;
  daysKey?: string;
  slug?: string;
  q?: string;
  page?: string;
  /** URL the workbench renders at — operator or the client's own dashboard. */
  basePath?: string;
}) {
  const basePath = basePathProp ?? `/internal/chapter-links/${clientKey}`;
  const win = REGISTRY_WINDOWS.find(w => w.key === daysKey) ?? REGISTRY_WINDOWS[1];
  const slug = (slugProp ?? "").trim();
  const q = (qProp ?? "").trim();
  const filtered = !!slug || !!q;
  const page = Math.max(1, parseInt(pageProp ?? "1", 10) || 1);

  const [sumRes, rowRes] = await Promise.all([
    supabase.schema("chapter_reporting")
      .rpc("link_registry_summary", { p_client_key: clientKey, p_days: win.days }),
    supabase.schema("chapter_reporting")
      .rpc("link_registry_rows", {
        p_client_key: clientKey, p_days: win.days,
        p_slug: slug || null, p_q: q || null,
        p_per_slug: PER_SLUG, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE,
      }),
  ]);
  const error = sumRes.error ?? rowRes.error;
  const summary = ((sumRes.data ?? []) as SlugSummary[]).map(s => ({
    ...s, links: Number(s.links), with_clicks: Number(s.with_clicks), zero: Number(s.zero),
    disabled: Number(s.disabled), clicks: Number(s.clicks),
  }));
  const rows = ((rowRes.data ?? []) as Row[]).map(r => ({ ...r, clicks: Number(r.clicks) }));

  // Whole-registry totals, from SQL — independent of how many rows are shown.
  const total = summary.reduce((n, s) => n + s.links, 0);
  const withClicks = summary.reduce((n, s) => n + s.with_clicks, 0);
  const zero = summary.reduce((n, s) => n + s.zero, 0);
  const disabled = summary.reduce((n, s) => n + s.disabled, 0);
  const matching = filtered ? Number(rows[0]?.total_matching ?? 0) : 0;
  const lastPage = Math.max(1, Math.ceil(matching / PAGE_SIZE));

  const href = (o: { slug?: string; q?: string; page?: number; days?: string }) => {
    const p = new URLSearchParams({ tab: "registry", days: o.days ?? win.key });
    if (o.slug) p.set("rslug", o.slug);
    if (o.q) p.set("rq", o.q);
    if (o.page && o.page > 1) p.set("rpage", String(o.page));
    return `${basePath}?${p}`;
  };

  // Group by slug — the placement. A slug is the unit an operator reasons
  // about ("how is internal_lead doing?"), and a flat all-slugs list makes
  // that question a visual scan instead of an answer.
  //
  // One table with full-width group header rows rather than a table per
  // group: columns stay aligned across groups, which is the whole point of
  // comparing links to each other.
  const bySlug = new Map<string, Row[]>();
  for (const r of rows) {
    const list = bySlug.get(r.slug) ?? [];
    list.push(r);
    bySlug.set(r.slug, list);
  }
  const sumBySlug = new Map(summary.map(s => [s.slug, s]));
  // Subtotals come from the summary, never from the rows on screen: a group
  // showing 25 of 18,580 must still say 18,580.
  const groups = (filtered ? Array.from(bySlug.keys()) : summary.map(s => s.slug))
    .map(name => ({
      slug: name,
      list: bySlug.get(name) ?? [],
      links: sumBySlug.get(name)?.links ?? 0,
      clicks: sumBySlug.get(name)?.clicks ?? 0,
      zero: sumBySlug.get(name)?.zero ?? 0,
    }))
    // Busiest placement first; ties broken by name so the order is stable
    // between loads rather than depending on Map insertion.
    .sort((a, b) => b.clicks - a.clicks || a.slug.localeCompare(b.slug));

  const th: React.CSSProperties = {
    textAlign: "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em",
    color: FAINT, fontWeight: 600, padding: "8px 12px", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = { fontSize: 13, color: INK, padding: "10px 12px", verticalAlign: "top" };

  return (
    <div>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: MUTED, lineHeight: 1.5, maxWidth: 760 }}>
        Every link <em>generated</em> for this client, not just the ones that got clicked. A link
        sitting at zero is a placement that shipped and drew nothing — which click history alone can
        never show you, because it only ever records demand.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "0 0 16px" }}>
        {REGISTRY_WINDOWS.map(w => (
          <Link
            key={w.key}
            href={href({ slug, q, days: w.key })}
            style={{
              fontSize: 12, padding: "5px 11px", borderRadius: 999, textDecoration: "none",
              border: `1px solid ${w.key === win.key ? ORANGE : LINE}`,
              color: w.key === win.key ? ORANGE : MUTED,
              background: w.key === win.key ? "#FFF6EF" : "#fff",
            }}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "#B4232A" }}>Could not load the registry: {error.message}</p>
      )}

      {!error && total === 0 && (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, background: PANEL, padding: "28px 20px" }}>
          <p style={{ margin: 0, fontSize: 14, color: INK, fontWeight: 600 }}>No links registered yet.</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 620 }}>
            A link registers when you set a <strong>Link ID</strong> on the Generate URLs tab, or a{" "}
            <strong>Link ID pattern</strong> on the Matrix tab, and then copy or download. Until then
            the links still work and still report their dimensions — but only the ones that get
            clicked will ever appear anywhere.
          </p>
        </div>
      )}

      {total > 0 && (
        <>
          <div style={{ display: "flex", gap: 22, marginBottom: 14, fontSize: 13, color: MUTED }}>
            <span>
              <strong style={{ color: INK }}>{total.toLocaleString()}</strong> registered across{" "}
              <strong style={{ color: INK }}>{summary.length}</strong> placement{summary.length === 1 ? "" : "s"}
            </span>
            <span><strong style={{ color: TEAL }}>{withClicks.toLocaleString()}</strong> with clicks</span>
            <span><strong style={{ color: zero > 0 ? ORANGE : INK }}>{zero.toLocaleString()}</strong> at zero</span>
            {disabled > 0 && <span><strong style={{ color: INK }}>{disabled.toLocaleString()}</strong> disabled</span>}
          </div>

          {/* Plain GET form: a server component, so no client JS is needed. */}
          <form method="get" action={basePath}
                style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <input type="hidden" name="tab" value="registry" />
            <input type="hidden" name="days" value={win.key} />
            <select name="rslug" defaultValue={slug}
                    style={{ fontSize: 13, padding: "6px 8px", border: `1px solid ${LINE}`, borderRadius: 6, color: INK, background: "#fff" }}>
              <option value="">All placements</option>
              {summary.map(s => (
                <option key={s.slug} value={s.slug}>{s.slug} ({s.links.toLocaleString()})</option>
              ))}
            </select>
            <input type="search" name="rq" defaultValue={q}
                   placeholder="Find by link id, article, creative or destination"
                   style={{ fontSize: 13, padding: "6px 10px", border: `1px solid ${LINE}`, borderRadius: 6, minWidth: 320, color: INK }} />
            <button type="submit"
                    style={{ fontSize: 13, padding: "6px 14px", borderRadius: 6, border: `1px solid ${INK}`, background: INK, color: "#fff", cursor: "pointer" }}>
              Search
            </button>
            {filtered && <Link href={href({})} style={{ fontSize: 12.5, color: MUTED }}>Clear</Link>}
          </form>

          {filtered ? (
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 10, fontSize: 12.5, color: MUTED }}>
              <span>
                {matching === 0 ? "No links match." : (
                  <>
                    Showing <strong style={{ color: INK }}>{((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{((page - 1) * PAGE_SIZE + rows.length).toLocaleString()}</strong>{" "}
                    of <strong style={{ color: INK }}>{matching.toLocaleString()}</strong> matching, most-clicked first
                  </>
                )}
              </span>
              {page > 1 && <Link href={href({ slug, q, page: page - 1 })} style={{ color: ORANGE }}>← Previous</Link>}
              {page < lastPage && <Link href={href({ slug, q, page: page + 1 })} style={{ color: ORANGE }}>Next →</Link>}
              {lastPage > 1 && <span>Page {page} of {lastPage.toLocaleString()}</span>}
            </div>
          ) : (
            <p style={{ margin: "0 0 10px", fontSize: 12.5, color: MUTED }}>
              Showing the top {PER_SLUG} links of each placement. Subtotals cover every link; open a
              placement or search to see the rest.
            </p>
          )}

          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: PANEL }}>
                  <tr>
                    <th style={th}>Link ID</th>
                    <th style={th}>Property</th>
                    <th style={th}>Dimensions</th>
                    <th style={th}>Destination</th>
                    <th style={th}>Wrapped URL</th>
                    <th style={{ ...th, textAlign: "right" }}>Clicks</th>
                    <th style={th}>Last click</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                {groups.map(g => (
                <tbody key={g.slug}>
                  <tr style={{ borderTop: `1px solid ${LINE}`, background: "#F4F1E8" }}>
                    <th colSpan={8} style={{ textAlign: "left", padding: "9px 12px", fontWeight: 600 }}>
                      <span style={{ fontSize: 13, color: INK, fontFamily: "ui-monospace, monospace" }}>
                        {g.slug}
                      </span>
                      <span style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginLeft: 10 }}>
                        {g.links.toLocaleString()} link{g.links === 1 ? "" : "s"}
                        {" · "}
                        <strong style={{ color: g.clicks > 0 ? INK : MUTED, fontWeight: 600 }}>{g.clicks}</strong> click{g.clicks === 1 ? "" : "s"}
                        {g.zero > 0 && (
                          <>
                            {" · "}
                            <strong style={{ color: ORANGE, fontWeight: 600 }}>{g.zero.toLocaleString()}</strong> at zero
                          </>
                        )}
                      </span>
                      {!filtered && g.links > g.list.length && (
                        <Link href={href({ slug: g.slug })}
                              style={{ fontSize: 12, fontWeight: 400, marginLeft: 12, color: ORANGE }}>
                          showing top {g.list.length} — view all {g.links.toLocaleString()} →
                        </Link>
                      )}
                    </th>
                  </tr>
                  {g.list.map(r => {
                    const dead = r.clicks === 0;
                    return (
                      <tr key={r.link_id} style={{ borderTop: `1px solid ${LINE}`, background: dead ? "#FFFBF7" : "#fff" }}>
                        <td style={{ ...td, fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>{r.link_id}</td>
                        <td style={{ ...td, color: MUTED, fontSize: 12.5 }}>{r.link_host ?? "—"}</td>
                        <td style={td}>
                          {r.dimensions && Object.keys(r.dimensions).length > 0 ? (
                            <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {Object.entries(r.dimensions).map(([k, v]) => (
                                <span key={k} style={{
                                  fontSize: 11, padding: "1px 7px", borderRadius: 999,
                                  background: PANEL, border: `1px solid ${LINE}`, color: MUTED,
                                  whiteSpace: "nowrap",
                                }}>
                                  {k}: <span style={{ color: INK }}>{v}</span>
                                </span>
                              ))}
                            </span>
                          ) : <span style={{ color: FAINT }}>—</span>}
                        </td>
                        <td style={{ ...td, maxWidth: 240, color: MUTED, fontSize: 12, wordBreak: "break-all" }}>
                          {r.destination ?? <span style={{ color: FAINT }}>(from rule)</span>}
                        </td>
                        <td style={{ ...td, maxWidth: 300, fontSize: 11.5, fontFamily: "ui-monospace, monospace", color: MUTED, wordBreak: "break-all" }}>
                          {r.url
                            ? <span title={r.url}>{r.url}</span>
                            : <span style={{ color: FAINT, fontFamily: "inherit" }}>
                                — re-export to capture
                              </span>}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 600, color: dead ? ORANGE : INK }}>
                          {r.clicks}
                        </td>
                        <td style={{ ...td, color: MUTED, fontSize: 12.5 }}>{fmtDate(r.last_click)}</td>
                        <td style={td}>
                          {r.disabled_at ? (
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#FDECEC", color: "#B4232A" }}>
                              disabled
                            </span>
                          ) : dead ? (
                            <span style={{ fontSize: 11, color: ORANGE }}>no clicks yet</span>
                          ) : (
                            <span style={{ fontSize: 11, color: TEAL }}>live</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                ))}
              </table>
            </div>
          </div>

          <p style={{ marginTop: 10, fontSize: 11.5, color: FAINT, lineHeight: 1.6, maxWidth: 760 }}>
            Clicks exclude traffic tagged as scanner or bot. A disabled link still routes the reader —
            to the paper they were on, via the host default — rather than returning a 404, and that can
            take up to 5 minutes to take effect after you change it.
          </p>
        </>
      )}
    </div>
  );
}
