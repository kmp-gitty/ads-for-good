import { decodeGeo, type Breakdown, type LinkStats } from "./types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const TEAL = "#2E7D5B";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "white", padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: FAINT, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ?? INK, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Sparkline({ data }: { data: { day: string; clicks: number }[] }) {
  if (data.length === 0) return null;
  const w = 640;
  const h = 60;
  const max = Math.max(...data.map((d) => d.clicks), 1);
  const bw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 60, display: "block" }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = (d.clicks / max) * (h - 6);
        return <rect key={i} x={i * bw + 0.5} y={h - bh} width={Math.max(bw - 1, 1)} height={bh} fill={ORANGE} opacity={0.75} />;
      })}
    </svg>
  );
}

function BarList({
  title,
  rows,
  decode,
}: {
  title: string;
  rows: Breakdown[];
  decode?: boolean;
}) {
  const max = Math.max(...rows.map((r) => r.clicks), 1);
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "white", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: FAINT, fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: FAINT }}>No data</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: "0 0 42%", minWidth: 0, fontSize: 12.5, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {decode ? decodeGeo(r.label) : r.label}
              </div>
              <div style={{ flex: 1, height: 8, background: PANEL, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(r.clicks / max) * 100}%`, height: "100%", background: ORANGE, opacity: 0.7 }} />
              </div>
              <div style={{ flex: "0 0 auto", fontSize: 12.5, fontWeight: 600, color: MUTED, minWidth: 34, textAlign: "right" }}>
                {r.clicks.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function pct(n: number, d: number): string {
  if (d <= 0) return "—";
  return ((n / d) * 100).toFixed(1) + "%";
}

export default function LinkStatsPanel({ stats, windowLabel }: { stats: LinkStats; windowLabel: string }) {
  const t = stats.totals;
  const purchaseRate = pct(stats.fulfillment.purchased, stats.fulfillment.visitors);
  const convRate = pct(stats.fulfillment.converted, stats.fulfillment.visitors);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Headline tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <StatTile label={`Clicks · ${windowLabel}`} value={t.clicks.toLocaleString()} sub={`${t.clicks_all_time.toLocaleString()} all-time`} />
        <StatTile label="Unique visitors" value={t.unique.toLocaleString()} />
        <StatTile label="Ad clicks" value={t.ad_clicks.toLocaleString()} sub={`${pct(t.ad_clicks, t.clicks)} of clicks`} />
        <StatTile label="Scanner / bot" value={t.scanner.toLocaleString()} sub={t.scanner > 0 ? "excluded" : "none"} accent={t.scanner > 0 ? ORANGE : undefined} />
        <StatTile label="Purchased" value={stats.fulfillment.purchased.toLocaleString()} sub={`${purchaseRate} of visitors`} accent={stats.fulfillment.purchased > 0 ? TEAL : undefined} />
        <StatTile label="Lead / prompt" value={stats.fulfillment.converted.toLocaleString()} sub={`${convRate} of visitors`} accent={stats.fulfillment.converted > 0 ? TEAL : undefined} />
      </div>

      {/* Trend */}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "white", padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: FAINT, fontWeight: 600 }}>
            Daily clicks
          </div>
          <div style={{ fontSize: 11.5, color: MUTED }}>
            New {stats.new_returning.new.toLocaleString()} · Returning {stats.new_returning.returning.toLocaleString()}
          </div>
        </div>
        <Sparkline data={stats.timeseries} />
      </div>

      {/* Destination split (the smart-routing story) */}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, background: "white", padding: "12px 14px" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: FAINT, fontWeight: 600, marginBottom: 8 }}>
          Where clicks routed (by rule)
        </div>
        {stats.by_destination.length === 0 ? (
          <div style={{ fontSize: 12.5, color: FAINT }}>No data</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.by_destination.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: d.is_default ? MUTED : INK }}>
                    {d.rule_label}
                    {d.is_default && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: FAINT, fontWeight: 500 }}>default</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: FAINT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    → {d.destination}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{d.clicks.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdowns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        <BarList title="Source" rows={stats.by_source} />
        <BarList title="Ad platform" rows={stats.by_ad_platform} />
        <BarList title="Device" rows={stats.by_device} />
        <BarList title="OS" rows={stats.by_os} />
        <BarList title="Country" rows={stats.by_country} />
        <BarList title="Region" rows={stats.by_region} decode />
        <BarList title="City" rows={stats.by_city} decode />
      </div>

      <p style={{ fontSize: 11.5, color: FAINT, lineHeight: 1.5, margin: 0 }}>
        Scanner/bot clicks are excluded from all figures above. &ldquo;Purchased&rdquo; = unique visitors who clicked this link and later
        completed a purchase/booking (matched through the identity graph); &ldquo;Lead / prompt&rdquo; = later submitted a captured lead or
        prompt. New vs returning is identity-key level (a cross-device returner can read as new).
      </p>
    </div>
  );
}
