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

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TopBar } from "../../../_components/TopBar";
import { Icon } from "../../../_components/Icon";
import { Dropdown } from "../../../_components/Dropdown";
import { ChannelChip } from "../../../_components/ChannelChip";
import { ChannelKey } from "../../../_components/mockdata";
import type { LaggedImpactRow, LaggedImpactSeriesRow, LaggedImpactRankedRow } from "../../../_lib/dashboard-rpc";

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

function HeaderCell({ top, bottom, firstCell = false, align = "center", title }: {
  top?: string; bottom: string; firstCell?: boolean; align?: "left" | "center" | "right"; title?: string;
}) {
  // Instant navy info-box tooltip (matches the other dashboard pages) instead
  // of a delayed gray native title.
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => title && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...cellDivided(firstCell),
        position: "relative",
        textAlign: align,
        whiteSpace: "nowrap",
        display: "flex",
        flexDirection: "column",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        gap: 2,
        lineHeight: 1.1,
        cursor: title ? "help" : undefined,
      }}
    >
      <span style={{ color: "var(--ink-4)", fontWeight: 500 }}>{top ?? " "}</span>
      <span>{bottom}</span>
      {title && hover && (
        <div style={{
          position: "absolute", top: "calc(100% + 9px)", left: "50%", transform: "translateX(-50%)",
          width: 240, background: "#1F2D43", color: "white", borderRadius: 8, padding: "9px 11px",
          fontSize: 11, lineHeight: 1.5, fontWeight: 400, letterSpacing: 0, textTransform: "none",
          whiteSpace: "normal", textAlign: "left",
          boxShadow: "0 8px 24px rgba(15,23,34,0.28)", zIndex: 30, pointerEvents: "none",
        }}>
          {title}
          <span aria-hidden style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            border: "5px solid transparent", borderBottomColor: "#1F2D43",
          }} />
        </div>
      )}
    </div>
  );
}

// 95% CI on the absolute lift (percentage points), computed client-side from
// the returned counts using the SAME formula as lagged_impact_pair
// (se = sqrt(p_t(1-p_t)/n_t + p_b(1-p_b)/n_b), ±1.96·se), so the ranked table
// reconciles byte-for-byte with the per-pair drill-in.
function absLiftCiPp(treatedN: number, treatedReturnN: number, baselineN: number, baselineReturnN: number): { low: number; high: number } | null {
  if (!treatedN || !baselineN) return null;
  const pt = treatedReturnN / treatedN;
  const pb = baselineReturnN / baselineN;
  const absDiff = pt - pb;
  const se = Math.sqrt((pt * (1 - pt)) / treatedN + (pb * (1 - pb)) / baselineN);
  return { low: (absDiff - 1.96 * se) * 100, high: (absDiff + 1.96 * se) * 100 };
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
      <HeaderCell                       bottom="Lag"          firstCell align="left"
        title="Days after the A touch that we look for a later return via B." />
      <HeaderCell top="A → B"           bottom="Treated rate"
        title="Share of identities touched by A (during treatment) that later returned via B within the lag window. n = the treated cohort." />
      <HeaderCell top="¬A → B"          bottom="Baseline rate"
        title="Share of comparable identities NOT touched by A that returned via B in the same lag window — neither cohort had touched B during treatment. This is the counterfactual." />
      <HeaderCell top="Abs"             bottom="Lift (pp)"
        title="Treated rate minus baseline rate, in percentage points. Positive = touching A makes a later B-return more likely than baseline." />
      <HeaderCell top="Rel"             bottom="Lift (%)"
        title="Absolute lift as a percentage of the baseline rate — the proportional increase over the counterfactual." />
      <HeaderCell top="95% CI"          bottom="(abs diff)"
        title="95% confidence interval on the absolute lift. If it straddles 0, the effect is within noise; if it clears 0 (and n ≥ 30), it's confident." />
      <HeaderCell                       bottom="Status"
        title="Confidence gate: OK = n ≥ 30 on both cohorts and the CI excludes 0; within-noise = CI straddles 0; below floor = under the 30-identity minimum." />
    </div>
  );
}

// LI3 — ranked discovery table. Every ordered channel pair scored at one
// representative lag, so the operator sees which pairs actually drive returns
// instead of hand-picking A/B. Ranked positive-lift first among confident
// ('ok') pairs, then within-noise, then below-floor (faded). Numbers reconcile
// with the per-lag card below (same underlying math). Click a row to analyze it.
const RANKED_GRID = "minmax(150px,1.4fr) 100px 100px 80px 80px 132px 110px";

function RankedPairsTable({
  pairs, lagDays, channelA, channelB, onSelect,
}: {
  pairs:     LaggedImpactRankedRow[];
  lagDays:   number;
  channelA:  string;
  channelB:  string;
  onSelect:  (a: string, b: string) => void;
}) {
  const gateRank = (s: string) => (s === "ok" ? 0 : s === "within_noise" ? 1 : 2);
  const sorted = [...pairs].sort((x, y) => {
    const gr = gateRank(x.cell_gate_status) - gateRank(y.cell_gate_status);
    if (gr !== 0) return gr;
    // positive lift first (this page is about A making B MORE likely)
    return (Number(y.abs_lift_pp ?? -Infinity)) - (Number(x.abs_lift_pp ?? -Infinity));
  });

  if (sorted.length === 0) {
    return (
      <div style={{ padding: "16px 18px", fontSize: 12, color: "var(--ink-3)" }}>
        No channel pairs to rank in this window.
      </div>
    );
  }

  const okCount = sorted.filter(p => p.cell_gate_status === "ok").length;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 780 }}>
        {/* header */}
        <div style={{
          display: "grid", gridTemplateColumns: RANKED_GRID, columnGap: 0,
          padding: "10px 16px", borderBottom: DIVIDER, background: "rgba(15,23,34,0.04)",
          fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-3)", fontWeight: 600,
        }}>
          <HeaderCell            bottom="Channel pair (A → B)" firstCell align="left"
            title="The ordered pair — does touching A make a later return via B more likely? Ranked at one representative lag; click to see all lag windows." />
          <HeaderCell top="A → B"  bottom="Treated rate"
            title="Share of identities touched by A (during treatment) that later returned via B within the lag window. n = the treated cohort." />
          <HeaderCell top="¬A → B" bottom="Baseline rate"
            title="Share of comparable identities NOT touched by A that returned via B in the same window — neither cohort had touched B during treatment. The counterfactual." />
          <HeaderCell top="Abs"    bottom="Lift (pp)"
            title="Treated rate minus baseline rate, in percentage points. Positive = touching A makes a later B-return more likely than baseline." />
          <HeaderCell top="Rel"    bottom="Lift (%)"
            title="Absolute lift as a percentage of the baseline rate — the proportional increase over the counterfactual." />
          <HeaderCell top="95% CI"  bottom="(abs diff)"
            title="95% confidence interval on the absolute lift. If it straddles 0, the effect is within noise; if it clears 0 (and n ≥ 30), it's confident. Same formula as the per-pair drill-in." />
          <HeaderCell            bottom="Status"
            title="Confidence gate: OK = n ≥ 30 on both cohorts and the CI excludes 0; within-noise = CI straddles 0; below floor = under the 30-identity minimum." />
        </div>
        {/* rows */}
        {sorted.map((p, i) => {
          const isOk = p.cell_gate_status === "ok";
          const isSelected = p.channel_a === channelA && p.channel_b === channelB;
          const stripe = i % 2 === 1 ? "rgba(15,23,34,0.025)" : "transparent";
          const dim: React.CSSProperties = isOk ? {} : { color: "var(--ink-3)", opacity: 0.8 };
          return (
            <button
              key={`${p.channel_a}→${p.channel_b}`}
              onClick={() => onSelect(p.channel_a, p.channel_b)}
              title={`Analyze ${channelLabel(p.channel_a)} → ${channelLabel(p.channel_b)} across all lag windows`}
              style={{
                display: "grid", gridTemplateColumns: RANKED_GRID, columnGap: 0, width: "100%",
                alignItems: "center", padding: "11px 16px", borderBottom: DIVIDER, textAlign: "left",
                cursor: "pointer", border: "none", borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                background: isSelected ? "rgba(227,100,16,0.06)" : stripe, font: "inherit",
              }}
            >
              <div style={{ ...cellDivided(true), display: "flex", alignItems: "center", gap: 7, fontWeight: 500 }}>
                <ChannelChip ch={p.channel_a as ChannelKey} />
                <span style={{ color: "var(--ink-4)" }}>→</span>
                <ChannelChip ch={p.channel_b as ChannelKey} />
              </div>
              <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", ...dim }}>
                {fmtPct(p.treated_return_rate)}
                <div style={{ fontSize: 10, color: "var(--ink-4)" }}>n={p.treated_n}</div>
              </div>
              <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", ...dim }}>
                {fmtPct(p.baseline_return_rate)}
                <div style={{ fontSize: 10, color: "var(--ink-4)" }}>n={p.baseline_n}</div>
              </div>
              <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: isOk ? (Number(p.abs_lift_pp) > 0 ? "var(--good)" : "var(--bad)") : "var(--ink-3)" }}>
                {fmtPp(p.abs_lift_pp)}
              </div>
              <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", ...dim }}>
                {fmtRelLift(p.rel_lift_pct)}
              </div>
              <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", fontSize: 11, color: "var(--ink-3)" }}>
                {(() => {
                  const ci = absLiftCiPp(p.treated_n, p.treated_return_n, p.baseline_n, p.baseline_return_n);
                  return ci ? `[${fmtPp(ci.low)} → ${fmtPp(ci.high)}]` : "—";
                })()}
              </div>
              <div style={{ ...cellDivided(false), display: "flex", justifyContent: "center" }}>
                {gateBadge(p.cell_gate_status)}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ padding: "10px 16px", fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
        Ranked at a <strong style={{ color: "var(--ink-2)" }}>{lagDays}-day</strong> lag · {okCount} of {sorted.length} pair{sorted.length === 1 ? "" : "s"} clear the confidence gate.
        Click any pair to see all lag windows below. Rates and lift reconcile with the per-lag card once you select the same pair.
      </div>
    </div>
  );
}

export default function LaggedImpactClient({
  clientKey, range, channelA, channelB, treatmentStart, treatmentEnd, lookforwardDays, results, allLagDays, rankedPairs, rankedLagDays, series,
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
  rankedPairs:      LaggedImpactRankedRow[];
  rankedLagDays:    number;
  series:           LaggedImpactSeriesRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // 7.2: navigate + force a server re-fetch. router.replace alone can serve the
  // stale RSC segment from the App Router client cache on a query-only change
  // (symptom: URL updates, content doesn't, manual refresh fixes it). Wrapping
  // in a transition + router.refresh() busts the cached segment; isPending
  // drives a loading state so the re-fetch is legible. (Cache-key completeness
  // is not the issue — unstable_cache includes the RPC args in its key, and no
  // sibling tab shares this in-page-selector-drives-searchParams pattern.)
  const navigate = (next: URLSearchParams) => {
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
      router.refresh();
    });
  };

  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (val == null) next.delete(key);
    else next.set(key, val);
    navigate(next);
  };

  const [showWorkOpen, setShowWorkOpen] = useState(false);

  // Two tabs: "ranked" (the pre-baked pairs Chapter surfaces — the landing)
  // and "explore" (pick Channel A/B and dig into one pair). URL-driven via
  // ?view= so it's shareable and survives the pair-select navigation.
  const view = sp.get("view") === "explore" ? "explore" : "ranked";
  const setView = (v: "ranked" | "explore") => setParam("view", v);

  const swapAB = () => {
    const next = new URLSearchParams(sp.toString());
    next.set("channel_a", channelB);
    next.set("channel_b", channelA);
    navigate(next);
  };

  // LI3 — click a ranked pair → jump into the Explore tab anchored on it.
  const selectPair = (a: string, b: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("channel_a", a);
    next.set("channel_b", b);
    next.set("view", "explore");
    navigate(next);
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
      <div className="content" style={{ opacity: isPending ? 0.55 : 1, transition: "opacity 0.15s ease" }}>
        {/* How-this-page-works hero */}
        <div className="card" style={{ background: "var(--navy)", color: "white", border: "none", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", maxWidth: 760 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>
                How this page works
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                Pick a channel pair (A → B). The page splits the analysis range into a <strong>treatment window</strong> (when A could occur — first third) and a <strong>lookforward window</strong> (when we count B returns — remaining two-thirds). For each default lag (7 / 14 / 30 / 60 / 90 days), we compare the B-return rate of identities touched by A against comparable identities who weren&apos;t touched by A — neither cohort had touched B during the treatment window. <strong>Default lags are shown together so a &ldquo;best lag&rdquo; can&apos;t be cherry-picked.</strong> Touches too recent for their full lag window to have elapsed are excluded from each cell, so return rates aren&apos;t undercounted by activity we can&apos;t observe yet — larger lags therefore analyze a slightly earlier slice of the window.
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
            <strong>Data depth caveat.</strong> This workspace&rsquo;s canonical attribution history is still shallow, so most lag cells will land below the n ≥ 30 floor or within noise. Results below should be read as directional, not definitive. Seasonality controls activate once 6+ months of data are available — until then, calendar effects we cannot yet model may influence results.
          </div>
        </div>

        {/* Tab bar — land on the ranked pairs Chapter surfaces; Explore to pick your own A → B */}
        <div className="filter-bar" style={{ alignItems: "center", gap: 12 }}>
          <div className="toggle-group">
            <button className={view === "ranked" ? "active" : ""} onClick={() => setView("ranked")}>Ranked pairs</button>
            <button className={view === "explore" ? "active" : ""} onClick={() => setView("explore")}>Explore a pair</button>
          </div>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {view === "ranked"
              ? "Every pair Chapter sees, ranked by lagged return-lift — pick one to dig in."
              : "Choose Channel A → B and see how they relate across lag windows."}
          </span>
        </div>

        {/* Pair picker (Explore tab) */}
        {view === "explore" && (
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
        )}

        {/* LI3 — ranked discovery table: which pairs matter, at a glance (Ranked tab) */}
        {view === "ranked" && (
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          <div className="card-head" style={{ padding: "16px 18px", borderBottom: DIVIDER }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Which channel pairs drive later returns?</span>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                Every pair ranked by lagged return-lift — the strongest confident signals first. Pick one to dig into.
              </span>
            </div>
          </div>
          <RankedPairsTable
            pairs={rankedPairs}
            lagDays={rankedLagDays}
            channelA={channelA}
            channelB={channelB}
            onSelect={selectPair}
          />
        </div>
        )}

        {/* Pair card (Explore tab) */}
        {view === "explore" && (
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
        )}

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
