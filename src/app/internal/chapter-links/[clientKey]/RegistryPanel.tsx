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
  valid_to: string | null;
  created_at: string;
  clicks: number;
  last_click: string | null;
};

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
}: {
  clientKey: string;
  daysKey?: string;
}) {
  const win = REGISTRY_WINDOWS.find(w => w.key === daysKey) ?? REGISTRY_WINDOWS[1];

  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("link_registry_overview", { p_client_key: clientKey, p_days: win.days });
  const rows = ((data ?? []) as Row[]).filter(r => !r.valid_to);

  const withClicks = rows.filter(r => r.clicks > 0).length;
  const zero = rows.length - withClicks;
  const disabled = rows.filter(r => r.disabled_at).length;

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
  const groups = Array.from(bySlug.entries())
    .map(([slug, list]) => ({
      slug,
      list: [...list].sort((a, b) => b.clicks - a.clicks || a.link_id.localeCompare(b.link_id)),
      clicks: list.reduce((n, r) => n + r.clicks, 0),
      zero: list.filter(r => r.clicks === 0).length,
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
            href={`/internal/chapter-links/${clientKey}?tab=registry&days=${w.key}`}
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

      {!error && rows.length === 0 && (
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

      {rows.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 22, marginBottom: 14, fontSize: 13, color: MUTED }}>
            <span>
              <strong style={{ color: INK }}>{rows.length}</strong> registered across{" "}
              <strong style={{ color: INK }}>{groups.length}</strong> placement{groups.length === 1 ? "" : "s"}
            </span>
            <span><strong style={{ color: TEAL }}>{withClicks}</strong> with clicks</span>
            <span><strong style={{ color: zero > 0 ? ORANGE : INK }}>{zero}</strong> at zero</span>
            {disabled > 0 && <span><strong style={{ color: INK }}>{disabled}</strong> disabled</span>}
          </div>

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
                        {g.list.length} link{g.list.length === 1 ? "" : "s"}
                        {" · "}
                        <strong style={{ color: g.clicks > 0 ? INK : MUTED, fontWeight: 600 }}>{g.clicks}</strong> click{g.clicks === 1 ? "" : "s"}
                        {g.zero > 0 && (
                          <>
                            {" · "}
                            <strong style={{ color: ORANGE, fontWeight: 600 }}>{g.zero}</strong> at zero
                          </>
                        )}
                      </span>
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
