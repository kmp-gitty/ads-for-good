"use client";

// Lagged Impact — v1 client component (lightweight tier, channel pair).
//
// Single pair card with N lag-window rows (one per default lag that fits in
// the lookforward room). 3-state honesty gate from Correlation/Incrementality:
//   • below_n_floor → grayed "need n ≥ 30"
//   • within_noise  → grayed "within noise"  (CI on abs diff crosses zero)
//   • ok            → colored confident result
//
// No "best lag" headline — spec §6 mandates showing all defaults so users
// can't lag-shop a finding.

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TopBar } from "../../../_components/TopBar";
import { Icon } from "../../../_components/Icon";
import { Dropdown } from "../../../_components/Dropdown";
import { ChannelChip } from "../../../_components/ChannelChip";
import { ChannelKey } from "../../../_components/mockdata";
import type { LaggedImpactRow, LaggedImpactSeriesRow } from "../../../_lib/dashboard-rpc";

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: "(direct)",       label: "Direct" },
  { value: "email",          label: "Email" },
  { value: "organic search", label: "Organic Search" },
  { value: "paid search",    label: "Paid Search" },
  { value: "organic social", label: "Organic Social" },
  { value: "paid social",    label: "Paid Social" },
  { value: "referral",       label: "Referral" },
];

function channelLabel(v: string): string {
  return CHANNEL_OPTIONS.find(o => o.value === v)?.label ?? v;
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  return (Number(n) * 100).toFixed(digits) + "%";
}

function fmtPp(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  const v = Number(n);
  return (v >= 0 ? "+" : "") + v.toFixed(digits) + "pp";
}

function fmtRelLift(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  const v = Number(n);
  return (v >= 0 ? "+" : "") + v.toFixed(digits) + "%";
}

function fmtRange(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type GateStatus = "ok" | "within_noise" | "below_n_floor";

function gateBadge(status: GateStatus): React.ReactNode {
  if (status === "ok") {
    return <span className="pill" style={{ background: "rgba(46,125,91,0.15)", color: "var(--good)", textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10 }}>Confident</span>;
  }
  if (status === "within_noise") {
    return <span className="pill" style={{ background: "var(--bg-2)", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10 }}>Within noise</span>;
  }
  return <span className="pill" style={{ background: "var(--bg-2)", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10 }}>Need n ≥ 30</span>;
}

const DIVIDER  = "1px solid var(--line)";
const CELL_PAD = 10;

const cellDivided = (firstCell: boolean): React.CSSProperties => ({
  paddingLeft:  firstCell ? 0        : CELL_PAD,
  paddingRight: firstCell ? CELL_PAD : CELL_PAD,
  borderLeft:   firstCell ? undefined : DIVIDER,
});

// 7 columns: lag · treated rate · baseline rate · abs lift · rel lift · CI · gate
const GRID = "60px 100px 100px 90px 90px minmax(120px,1fr) 130px";

function HeaderCell({ top, bottom, firstCell = false, align = "center" }: {
  top?: string; bottom: string; firstCell?: boolean; align?: "left" | "center" | "right";
}) {
  return (
    <div style={{
      ...cellDivided(firstCell),
      textAlign: align,
      whiteSpace: "nowrap",
      display: "flex",
      flexDirection: "column",
      alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
      gap: 2,
      lineHeight: 1.1,
    }}>
      <span style={{ color: "var(--ink-4)", fontWeight: 500 }}>{top ?? " "}</span>
      <span>{bottom}</span>
    </div>
  );
}

function LagRow({ lagDays, row, index }: { lagDays: number; row: LaggedImpactRow | null; index: number }) {
  const stripe = index % 2 === 1 ? "rgba(15,23,34,0.025)" : "transparent";

  if (!row) {
    return (
      <div className="lrow" style={{ gridTemplateColumns: GRID, columnGap: 0, alignItems: "center", padding: "12px 16px", borderBottom: DIVIDER, background: stripe }}>
        <div style={{ ...cellDivided(true), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{lagDays}d</div>
        <div style={{ ...cellDivided(false), gridColumn: "2 / -1", textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
          Lag exceeds available lookforward window — skipped
        </div>
      </div>
    );
  }

  const status = row.cell_gate_status;
  const isOk = status === "ok";
  const dim: React.CSSProperties = isOk ? {} : { color: "var(--ink-3)", opacity: 0.85 };

  return (
    <div className="lrow" style={{ gridTemplateColumns: GRID, columnGap: 0, alignItems: "center", padding: "12px 16px", borderBottom: DIVIDER, background: stripe }}>
      <div style={{ ...cellDivided(true), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{lagDays}d</div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", ...dim }}>
        {fmtPct(row.treated_return_rate)}
        <div style={{ fontSize: 10, color: "var(--ink-4)" }}>n={row.treated_n}</div>
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", ...dim }}>
        {fmtPct(row.baseline_return_rate)}
        <div style={{ fontSize: 10, color: "var(--ink-4)" }}>n={row.baseline_n}</div>
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: isOk ? (Number(row.abs_lift_pp) > 0 ? "var(--good)" : "var(--bad)") : "var(--ink-3)" }}>
        {fmtPp(row.abs_lift_pp)}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", ...dim }}>
        {fmtRelLift(row.rel_lift_pct)}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", fontSize: 11, color: "var(--ink-3)" }}>
        [{fmtPp(row.abs_lift_ci_low)} → {fmtPp(row.abs_lift_ci_high)}]
      </div>
      <div style={{ ...cellDivided(false), display: "flex", justifyContent: "center" }}>
        {gateBadge(status)}
      </div>
    </div>
  );
}

// Inline SVG overlay of channel A + B journey volumes across the analysis
// window. Per spec §4: evidence for the identity-level claim above, not a
// competing claim. A vertical band marks the treatment window so operators
// can see how A's activity in the treatment window relates to B's in the
// lookforward window. No interactivity for v1 — it's a static chart.
function SeriesChart({
  series, channelA, channelB, treatmentStart, treatmentEnd,
}: {
  series:         LaggedImpactSeriesRow[];
  channelA:       string;
  channelB:       string;
  treatmentStart: string;
  treatmentEnd:   string;
}) {
  if (!series || series.length === 0) {
    return <div style={{ padding: "16px", fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>No series data available.</div>;
  }

  // Layout
  const W = 720;
  const H = 180;
  const padL = 44, padR = 16, padT = 12, padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Numeric values
  const aValues = series.map(r => Number(r.channel_a_journeys));
  const bValues = series.map(r => Number(r.channel_b_journeys));
  const yMax = Math.max(1, ...aValues, ...bValues);

  // X scale: index → pixel
  const xAt = (i: number) => padL + (i / Math.max(1, series.length - 1)) * plotW;
  const yAt = (v: number) => padT + (1 - v / yMax) * plotH;

  const pathA = aValues.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
  const pathB = bValues.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");

  // Treatment-window band: shade x-range covering [treatmentStart, treatmentEnd]
  const t0 = new Date(treatmentStart).getTime();
  const tE = new Date(treatmentEnd).getTime();
  const s0 = new Date(series[0].bucket_start).getTime();
  const sE = new Date(series[series.length - 1].bucket_end).getTime();
  const bandX0 = padL + ((t0 - s0) / (sE - s0)) * plotW;
  const bandX1 = padL + ((tE - s0) / (sE - s0)) * plotW;

  // Y-axis labels: 0, max
  const fmtCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);

  // X-axis: first, middle, last bucket dates
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const tickIndices = [0, Math.floor(series.length / 2), series.length - 1];

  const COL_A = "#E36410"; // accent (orange) for channel A
  const COL_B = "#1F2D43"; // navy for channel B
  const COL_BAND = "rgba(15,23,34,0.05)";
  const COL_GRID = "var(--line)";
  const COL_LABEL = "var(--ink-3)";

  return (
    <div style={{ padding: "16px 18px" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ maxHeight: H }}>
        {/* Treatment window band */}
        <rect x={bandX0} y={padT} width={Math.max(0, bandX1 - bandX0)} height={plotH} fill={COL_BAND} />
        {/* Y axis line */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={COL_GRID} strokeWidth={1} />
        {/* X axis line */}
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={COL_GRID} strokeWidth={1} />
        {/* Y ticks */}
        <text x={padL - 6} y={padT + 4} fontSize={10} fill={COL_LABEL} textAnchor="end">{fmtCount(yMax)}</text>
        <text x={padL - 6} y={padT + plotH + 3} fontSize={10} fill={COL_LABEL} textAnchor="end">0</text>
        {/* X ticks */}
        {tickIndices.map(i => (
          <text key={i} x={xAt(i)} y={padT + plotH + 16} fontSize={10} fill={COL_LABEL} textAnchor="middle">
            {fmtDate(series[i].bucket_start)}
          </text>
        ))}
        {/* Lines */}
        <path d={pathA} stroke={COL_A} strokeWidth={2} fill="none" />
        <path d={pathB} stroke={COL_B} strokeWidth={2} fill="none" strokeDasharray="4 3" />
        {/* Data points (small dots) */}
        {aValues.map((v, i) => (
          <circle key={`a${i}`} cx={xAt(i)} cy={yAt(v)} r={2.5} fill={COL_A} />
        ))}
        {bValues.map((v, i) => (
          <circle key={`b${i}`} cx={xAt(i)} cy={yAt(v)} r={2.5} fill={COL_B} />
        ))}
      </svg>

      {/* Legend + treatment-window callout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: 11, color: "var(--ink-2)" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 18, height: 2, background: COL_A, display: "inline-block" }} />
            {channelLabel(channelA)} (Channel A)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 18, height: 2, background: COL_B, display: "inline-block", borderTop: "2px dashed " + COL_B }} />
            {channelLabel(channelB)} (Channel B)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-3)" }}>
            <span style={{ width: 14, height: 12, background: COL_BAND, display: "inline-block", border: "1px solid var(--line)" }} />
            Treatment window
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>16 buckets across the analysis window · journey counts</div>
      </div>

      {/* Honesty footnote — spec §4: evidence, not a competing claim */}
      <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
        <strong style={{ color: "var(--ink-2)" }}>Evidence, not claim.</strong> These are channel-volume time series for the same analysis window — context for the identity-level finding above. A coincident spike doesn&apos;t prove {channelLabel(channelA)} caused {channelLabel(channelB)}; both could be moving with calendar effects, paid spend, or campaigns we can&apos;t see. For a measured comparison against a no-A baseline, see the rows above.
      </div>
    </div>
  );
}

function LagTableHeader() {
  return (
    <div className="lrow head" style={{
      gridTemplateColumns: GRID,
      columnGap: 0,
      padding: "10px 16px",
      borderBottom: DIVIDER,
      background: "rgba(15,23,34,0.04)",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: ".05em",
      color: "var(--ink-3)",
      fontWeight: 600,
    }}>
      <HeaderCell                       bottom="Lag"          firstCell align="left" />
      <HeaderCell top="A → B"           bottom="Treated rate" />
      <HeaderCell top="¬A → B"          bottom="Baseline rate" />
      <HeaderCell top="Abs"             bottom="Lift (pp)" />
      <HeaderCell top="Rel"             bottom="Lift (%)" />
      <HeaderCell top="95% CI"          bottom="(abs diff)" />
      <HeaderCell                       bottom="Status" />
    </div>
  );
}

export default function LaggedImpactClient({
  clientKey, range, channelA, channelB, treatmentStart, treatmentEnd, lookforwardDays, results, allLagDays, series,
}: {
  clientKey:        string;
  range:            string;
  channelA:         string;
  channelB:         string;
  treatmentStart:   string;
  treatmentEnd:     string;
  lookforwardDays:  number;
  results:          { lagDays: number; row: LaggedImpactRow | null }[];
  allLagDays:       number[];
  series:           LaggedImpactSeriesRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (val == null) next.delete(key);
    else next.set(key, val);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const [showWorkOpen, setShowWorkOpen] = useState(false);

  const swapAB = () => {
    const next = new URLSearchParams(sp.toString());
    next.set("channel_a", channelB);
    next.set("channel_b", channelA);
    router.replace(`${pathname}?${next.toString()}`);
  };

  // Surface the result map across all default lags, marking skipped ones.
  const resultMap = new Map(results.map(r => [r.lagDays, r.row]));
  const allRows = allLagDays.map(d => ({ lagDays: d, row: resultMap.has(d) ? (resultMap.get(d) ?? null) : null, skipped: !resultMap.has(d) }));

  const anyConfident = results.some(r => r.row?.cell_gate_status === "ok");

  return (
    <>
      <TopBar
        title="Lagged Impact"
        subtitle={<span>Does touching one channel make people more likely to come back via another later — beyond what comparable untouched people did? Measured cousin to <em>Cross-Source Influence</em>.</span>}
        showCompare={false}
      />
      <div className="content">
        {/* How-this-page-works hero */}
        <div className="card" style={{ background: "var(--navy)", color: "white", border: "none", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", maxWidth: 760 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>
                How this page works
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                Pick a channel pair (A → B). The page splits the analysis range into a <strong>treatment window</strong> (when A could occur — first third) and a <strong>lookforward window</strong> (when we count B returns — remaining two-thirds). For each default lag (7 / 14 / 30 / 60 / 90 days), we compare the B-return rate of identities touched by A against comparable identities who weren't touched by A — neither cohort had touched B during the treatment window. <strong>Default lags are shown together so a "best lag" can't be cherry-picked.</strong>
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)" }}>
              <Icon name="lagged" size={28} />
            </div>
          </div>
        </div>

        {/* Data-depth disclosure */}
        <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, background: "rgba(227,100,16,0.06)", border: "1px solid rgba(227,100,16,0.18)" }}>
          <div style={{ color: "var(--accent)", marginTop: 2 }}><Icon name="info" size={16} /></div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
            <strong>EOS data depth caveat.</strong> Canonical data starts April 2026, so at current depth (~8 weeks) most lag cells will land below the n ≥ 30 floor or within noise. Results below should be read as directional, not definitive. Seasonality controls activate once 6+ months of data are available — until then, calendar effects we cannot yet model may influence results.
          </div>
        </div>

        {/* Pair picker */}
        <div className="filter-bar" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <Dropdown align="left" width={220} trigger={
            <button className="toolbar-btn">
              <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Channel A</span>
              <span style={{ fontWeight: 500 }}>{channelLabel(channelA)}</span>
              <span className="chev"><Icon name="chev" size={12}/></span>
            </button>
          }>
            {(close) => (
              <>
                {CHANNEL_OPTIONS.filter(o => o.value !== channelB).map(o => (
                  <button
                    key={o.value}
                    className={`dd-item ${channelA === o.value ? "active" : ""}`}
                    onClick={() => { setParam("channel_a", o.value); close(); }}
                  >
                    <span>{o.label}</span>
                    {channelA === o.value && <span className="check"><Icon name="check" size={14}/></span>}
                  </button>
                ))}
              </>
            )}
          </Dropdown>

          <button className="toolbar-btn icon-only" onClick={swapAB} title="Swap A and B">
            <Icon name="compare" size={14} />
          </button>

          <Dropdown align="left" width={220} trigger={
            <button className="toolbar-btn">
              <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Channel B</span>
              <span style={{ fontWeight: 500 }}>{channelLabel(channelB)}</span>
              <span className="chev"><Icon name="chev" size={12}/></span>
            </button>
          }>
            {(close) => (
              <>
                {CHANNEL_OPTIONS.filter(o => o.value !== channelA).map(o => (
                  <button
                    key={o.value}
                    className={`dd-item ${channelB === o.value ? "active" : ""}`}
                    onClick={() => { setParam("channel_b", o.value); close(); }}
                  >
                    <span>{o.label}</span>
                    {channelB === o.value && <span className="check"><Icon name="check" size={14}/></span>}
                  </button>
                ))}
              </>
            )}
          </Dropdown>

          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>
            Treatment: <strong style={{ color: "var(--ink-2)" }}>{fmtRange(treatmentStart)} → {fmtRange(treatmentEnd)}</strong>
            <span style={{ marginLeft: 12 }}>Lookforward: <strong style={{ color: "var(--ink-2)" }}>{lookforwardDays}d</strong></span>
          </div>
        </div>

        {/* Pair card */}
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div className="card-head" style={{ padding: "16px 18px", borderBottom: DIVIDER }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ChannelChip ch={channelA as ChannelKey} />
              <span style={{ color: "var(--ink-3)", fontSize: 18 }}>→</span>
              <ChannelChip ch={channelB as ChannelKey} />
              <span style={{ marginLeft: 12, fontSize: 12, color: "var(--ink-3)" }}>
                Does touching {channelLabel(channelA)} lead to a later return via {channelLabel(channelB)}?
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 680 }}>
              <LagTableHeader />
              <div>
                {allRows.map((r, i) => <LagRow key={r.lagDays} lagDays={r.lagDays} row={r.row} index={i} />)}
              </div>
            </div>
          </div>

          {!anyConfident && (
            <div style={{ padding: "14px 18px", borderTop: DIVIDER, fontSize: 12, color: "var(--ink-3)" }}>
              No lag window cleared the confidence gate for this pair. At current data depth this is expected for most channel combinations.
            </div>
          )}

          {/* Show-your-work expander — spec §4: time-series overlay as
              evidence for the identity-level finding above. Collapsed by
              default so it doesn't compete visually with the headline rows. */}
          <div style={{ borderTop: DIVIDER }}>
            <button
              onClick={() => setShowWorkOpen(v => !v)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--ink-2)",
                fontWeight: 500,
                textAlign: "left",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Icon name="chart" size={14} />
                {showWorkOpen ? "Hide channel-volume series" : "Show your work — channel-volume series across the window"}
              </span>
              <span style={{ transition: "transform 120ms", transform: showWorkOpen ? "rotate(180deg)" : "none" }}>
                <Icon name="chev" size={12} />
              </span>
            </button>
            {showWorkOpen && (
              <div style={{ borderTop: DIVIDER, background: "rgba(15,23,34,0.015)" }}>
                <SeriesChart
                  series={series}
                  channelA={channelA}
                  channelB={channelB}
                  treatmentStart={treatmentStart}
                  treatmentEnd={treatmentEnd}
                />
              </div>
            )}
          </div>
        </div>

        {/* Foot — cross-reference + caveat */}
        <div className="card" style={{ padding: "14px 18px", fontSize: 12, color: "var(--ink-3)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <strong style={{ color: "var(--ink-2)" }}>Observational lagged-lift, not RCT.</strong> Treated/baseline cohorts are not randomized — they self-select via behaviour. Heavyweight tier (propensity-matched baseline + seasonality covariates) unlocks once shared infrastructure is in place.
          </div>
          <div>
            Looking for descriptive co-occurrence instead? → <a href={`/chapter/connections/influence?client=${clientKey}&range=${range}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Cross-Source Influence →</a>
          </div>
        </div>
      </div>
    </>
  );
}
