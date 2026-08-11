import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DaysToggle from "./DaysToggle";
import { resolveDays, type LinksOverview } from "./types";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export const dynamic = "force-dynamic";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const TEAL = "#2E7D5B";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

export default async function LinkAnalyticsOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientKey: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { clientKey } = await params;
  const { key, pDays, label } = resolveDays((await searchParams).days);

  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("smart_links_overview", { p_client_key: clientKey, p_days: pDays });
  const overview = (data ?? null) as LinksOverview | null;

  const th: React.CSSProperties = {
    textAlign: "right",
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: ".06em",
    color: FAINT,
    fontWeight: 600,
    padding: "8px 12px",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = { textAlign: "right", fontSize: 13, color: INK, padding: "10px 12px", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <Link href={`/internal/redirect-rules/${clientKey}`} style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
            ← Rules
          </Link>
          <h2 style={{ margin: "8px 0 4px", fontSize: 20, fontWeight: 700, color: INK }}>Link Analytics</h2>
          <p style={{ margin: 0, fontSize: 13.5, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {clientKey}
          </p>
        </div>
        <DaysToggle dayKey={key} />
      </div>

      {error ? (
        <div style={{ border: "1px solid #E7C9C6", background: "#FDECEA", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
          Failed to load analytics: {error.message}
        </div>
      ) : !overview || overview.links.length === 0 ? (
        <div style={{ border: `1px dashed ${LINE}`, background: PANEL, borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No clicks in this window</div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto", maxWidth: 380, lineHeight: 1.5 }}>
            Once links start getting clicks, per-link clicks, sources, geo, device, and click&rarr;purchase land here.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "white", padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: FAINT, fontWeight: 600 }}>
                Clicks · {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>{overview.totals.clicks.toLocaleString()}</div>
            </div>
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "white", padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: FAINT, fontWeight: 600 }}>
                Active links
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>{overview.totals.links.toLocaleString()}</div>
            </div>
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "white", padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: FAINT, fontWeight: 600 }}>
                Scanner / bot
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: overview.totals.scanner > 0 ? ORANGE : INK }}>
                {overview.totals.scanner.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, background: "white", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: PANEL, borderBottom: `1px solid ${LINE}` }}>
                    <th style={{ ...th, textAlign: "left" }}>Link</th>
                    <th style={th}>Clicks</th>
                    <th style={th}>Unique</th>
                    <th style={th}>Purchased</th>
                    <th style={th}>Lead/prompt</th>
                    <th style={th}>Scanner</th>
                    <th style={th}>All-time</th>
                    <th style={{ ...th, textAlign: "left" }}>Top destination</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.links.map((l) => (
                    <tr key={l.slug} style={{ borderBottom: `1px solid ${LINE}` }}>
                      <td style={{ ...td, textAlign: "left" }}>
                        <Link
                          href={`/internal/redirect-rules/${clientKey}/analytics/${encodeURIComponent(l.slug)}?days=${key}`}
                          style={{ color: ORANGE, fontWeight: 600, textDecoration: "none", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                        >
                          {l.slug}
                        </Link>
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>{l.clicks.toLocaleString()}</td>
                      <td style={td}>{l.unique.toLocaleString()}</td>
                      <td style={{ ...td, color: l.purchased > 0 ? TEAL : FAINT, fontWeight: l.purchased > 0 ? 600 : 400 }}>
                        {l.purchased.toLocaleString()}
                      </td>
                      <td style={{ ...td, color: l.converted > 0 ? TEAL : FAINT }}>{l.converted.toLocaleString()}</td>
                      <td style={{ ...td, color: l.scanner > 0 ? ORANGE : FAINT }}>{l.scanner.toLocaleString()}</td>
                      <td style={{ ...td, color: MUTED }}>{l.all_time.toLocaleString()}</td>
                      <td style={{ ...td, textAlign: "left", color: FAINT, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {l.top_destination ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: FAINT, margin: 0 }}>
            Click a link for full breakdowns (sources, ad platforms, geo, device, new vs returning). Scanner/bot clicks excluded from Clicks/Unique.
          </p>
        </>
      )}
    </div>
  );
}
