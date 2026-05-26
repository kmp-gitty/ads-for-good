"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { useChapter } from "../../_components/ChapterContext";
import {
  CHANNELS,
  type ChannelKey,
} from "../../_components/mockdata";
import { fmtMoney } from "../../_components/format";
import type {
  CorrelationChannelRow,
  IncrementalityRow, IncrementalityAxis,
  IncrementalityAxisMetadataRow,
  ContributionChannelRow,
} from "../../_lib/dashboard-rpc";

type Tab = "correlation" | "incrementality" | "contribution";

type Props = {
  correlation:    CorrelationChannelRow[];
  incrementality: Record<IncrementalityAxis, IncrementalityRow[]>;
  axisMetadata:   IncrementalityAxisMetadataRow | null;
  contribution:   ContributionChannelRow[];
  clientKey:      string;
  range:          string;
};

// ────────────────────────────────────────────────────────────────────────────
// Noise gate (per spec §4)
// ────────────────────────────────────────────────────────────────────────────

type MetricKey = "conv_rate" | "aov" | "days" | "touches";
type MetricState = "hidden" | "noise" | "confident";

type MetricGate = {
  key:           MetricKey;
  label:         string;
  unit:          "%" | "$" | "days" | "touches";
  mean_with:     number | null;
  mean_without:  number | null;
  n_with:        number;
  n_without:     number;
  /** Absolute delta in the metric's native units. For conv_rate this is
   *  percentage POINTS (e.g. 4.2pp); for AOV it is dollars; etc. */
  delta_abs:     number | null;
  /** Relative delta as percentage of "without" baseline. Used for headline
   *  selection (largest |delta_rel| wins). */
  delta_rel:     number | null;
  /** Standard error of the delta. */
  se:            number | null;
  /** |delta| / SE (z-like). Used to classify state. */
  z:             number | null;
  state:         MetricState;
};

const MIN_N_FOR_GATE = 30;
const Z_CONFIDENT = 2; // |delta| ≥ 2·SE for confident

/** SE for a proportion difference (conv rate). */
function seProportion(p_pooled: number, n_w: number, n_wo: number): number {
  if (n_w === 0 || n_wo === 0) return Infinity;
  return Math.sqrt(p_pooled * (1 - p_pooled) * (1 / n_w + 1 / n_wo));
}

/** SE for a continuous mean difference (Welch). */
function seMeanDiff(sd_w: number, n_w: number, sd_wo: number, n_wo: number): number {
  if (n_w === 0 || n_wo === 0) return Infinity;
  return Math.sqrt((sd_w * sd_w) / n_w + (sd_wo * sd_wo) / n_wo);
}

function classify(n_w: number, n_wo: number, z: number | null): MetricState {
  if (Math.min(n_w, n_wo) < MIN_N_FOR_GATE) return "hidden";
  if (z == null || !Number.isFinite(z))     return "hidden";
  return z >= Z_CONFIDENT ? "confident" : "noise";
}

function buildGates(row: CorrelationChannelRow): Record<MetricKey, MetricGate> {
  // ── Conversion rate (identity-level)
  const n_w_id  = Number(row.ids_with    ?? 0);
  const n_wo_id = Number(row.ids_without ?? 0);
  const c_w     = Number(row.conv_ids_with    ?? 0);
  const c_wo    = Number(row.conv_ids_without ?? 0);
  const p_w     = n_w_id  > 0 ? c_w  / n_w_id  : null;
  const p_wo    = n_wo_id > 0 ? c_wo / n_wo_id : null;
  const p_pool  = (n_w_id + n_wo_id) > 0 ? (c_w + c_wo) / (n_w_id + n_wo_id) : 0;
  const conv_delta_abs = p_w != null && p_wo != null ? (p_w - p_wo) * 100 : null; // pp
  const conv_delta_rel = p_w != null && p_wo != null && p_wo > 0 ? ((p_w - p_wo) / p_wo) * 100 : null;
  const conv_se        = seProportion(p_pool, n_w_id, n_wo_id) * 100; // in pp
  const conv_z         = conv_delta_abs != null && conv_se > 0 ? Math.abs(conv_delta_abs) / conv_se : null;

  const conv: MetricGate = {
    key: "conv_rate", label: "Conversion rate", unit: "%",
    mean_with: p_w != null ? p_w * 100 : null,
    mean_without: p_wo != null ? p_wo * 100 : null,
    n_with: n_w_id, n_without: n_wo_id,
    delta_abs: conv_delta_abs, delta_rel: conv_delta_rel,
    se: conv_se, z: conv_z,
    state: classify(n_w_id, n_wo_id, conv_z),
  };

  // ── Continuous metrics (chapter-level, converters only)
  const n_w_ch  = Number(row.chapters_with    ?? 0);
  const n_wo_ch = Number(row.chapters_without ?? 0);
  const buildContinuous = (
    key: MetricKey, label: string, unit: MetricGate["unit"],
    mean_w: number | null, sd_w: number | null,
    mean_wo: number | null, sd_wo: number | null,
  ): MetricGate => {
    const da = mean_w != null && mean_wo != null ? mean_w - mean_wo : null;
    const dr = mean_w != null && mean_wo != null && mean_wo !== 0
      ? ((mean_w - mean_wo) / mean_wo) * 100
      : null;
    const se = sd_w != null && sd_wo != null ? seMeanDiff(sd_w, n_w_ch, sd_wo, n_wo_ch) : null;
    const z  = da != null && se != null && se > 0 ? Math.abs(da) / se : null;
    return {
      key, label, unit,
      mean_with: mean_w, mean_without: mean_wo,
      n_with: n_w_ch, n_without: n_wo_ch,
      delta_abs: da, delta_rel: dr, se, z,
      state: classify(n_w_ch, n_wo_ch, z),
    };
  };

  const aov     = buildContinuous("aov",     "AOV",            "$",
    row.aov_with     != null ? Number(row.aov_with)     : null, row.aov_sd_with     != null ? Number(row.aov_sd_with)     : null,
    row.aov_without  != null ? Number(row.aov_without)  : null, row.aov_sd_without  != null ? Number(row.aov_sd_without)  : null);
  const days    = buildContinuous("days",    "Time to close",  "days",
    row.days_with    != null ? Number(row.days_with)    : null, row.days_sd_with    != null ? Number(row.days_sd_with)    : null,
    row.days_without != null ? Number(row.days_without) : null, row.days_sd_without != null ? Number(row.days_sd_without) : null);
  const touches = buildContinuous("touches", "Touches",        "touches",
    row.touches_with    != null ? Number(row.touches_with)    : null, row.touches_sd_with    != null ? Number(row.touches_sd_with)    : null,
    row.touches_without != null ? Number(row.touches_without) : null, row.touches_sd_without != null ? Number(row.touches_sd_without) : null);

  return { conv_rate: conv, aov, days, touches };
}

/** Pick the headline metric per spec §3: largest |delta_rel| that clears the
 *  noise gate. Default to conv_rate if nothing clears. */
function pickHeadline(gates: Record<MetricKey, MetricGate>): MetricKey {
  const confident = (Object.values(gates) as MetricGate[])
    .filter(g => g.state === "confident" && g.delta_rel != null)
    .sort((a, b) => Math.abs(b.delta_rel!) - Math.abs(a.delta_rel!));
  if (confident.length > 0) return confident[0].key;
  return "conv_rate";
}

function isCardHidden(gates: Record<MetricKey, MetricGate>): boolean {
  // Hide the entire card if EVERY metric is hidden (no data anywhere)
  return (Object.values(gates) as MetricGate[]).every(g => g.state === "hidden");
}

// ────────────────────────────────────────────────────────────────────────────
// Display helpers
// ────────────────────────────────────────────────────────────────────────────

function formatMetricValue(g: MetricGate, value: number | null): string {
  if (value == null) return "—";
  switch (g.unit) {
    case "%":       return `${value.toFixed(1)}%`;
    case "$":       return `$${value.toFixed(2)}`;
    case "days":    return `${value.toFixed(1)}d`;
    case "touches": return `${value.toFixed(1)}`;
  }
}

function formatDelta(g: MetricGate): string {
  if (g.delta_rel == null) return "—";
  const sign = g.delta_rel >= 0 ? "+" : "";
  return `${sign}${g.delta_rel.toFixed(1)}%`;
}

function formatChannelName(channel: string): string {
  // Map "(direct)" → "Direct", "organic search" → "Organic Search" etc.
  const ch = CHANNELS[channel as ChannelKey];
  if (ch) return ch.name;
  return channel.replace(/[()]/g, "").replace(/\b\w/g, c => c.toUpperCase());
}

function channelColor(channel: string): string {
  const ch = CHANNELS[channel as ChannelKey];
  return ch?.color ?? "#9CA0A8";
}

function channelShort(channel: string): string {
  const ch = CHANNELS[channel as ChannelKey];
  return ch?.short ?? channel.slice(0, 2).toUpperCase();
}

// ────────────────────────────────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────────────────────────────────

function MethodRail({ active }: { active: Tab }) {
  const steps = [
    { key: "correlation"    as Tab, label: "Correlation",    sub: "Observational",      note: "What we see in the data" },
    { key: "incrementality" as Tab, label: "Incrementality", sub: "Matched cohorts",            note: "What holds for like audiences" },
    { key: "contribution"   as Tab, label: "Contribution",   sub: "Footprint + projection",     note: "What's safe to cut, and what isn't" },
  ];
  return (
    <div className="lift-rail">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className={`lift-rail-step ${s.key === active ? "active" : ""}`}>
            <div className="lift-rail-dot">{i + 1}</div>
            <div className="lift-rail-text">
              <div className="lift-rail-label">{s.label}</div>
              <div className="lift-rail-sub">{s.sub}</div>
              <div className="lift-rail-note">{s.note}</div>
            </div>
          </div>
          {i < steps.length - 1 && <div className="lift-rail-link"></div>}
        </React.Fragment>
      ))}
    </div>
  );
}

function CorrelationCard({ row }: { row: CorrelationChannelRow }) {
  const gates = buildGates(row);
  const channelName = formatChannelName(row.channel);
  const color = channelColor(row.channel);
  const short = channelShort(row.channel);

  if (isCardHidden(gates)) {
    return (
      <div className="lift-card" style={{ opacity: 0.7 }}>
        <div className="lift-card-head">
          <div className="lift-card-head-left">
            <span className="lift-chip" style={{ background: color }}>{short}</span>
            <div>
              <div className="lift-card-eyebrow">{channelName}</div>
              <h3 className="lift-card-headline">Not enough data yet — need ≥30 samples with and without this channel.</h3>
            </div>
          </div>
          <span className="lift-method-tag obs">Observational</span>
        </div>
      </div>
    );
  }

  // Dynamic headline per §3
  const headlineKey = pickHeadline(gates);
  const headlineGate = gates[headlineKey];
  const headlineDelta = headlineGate.delta_rel;
  const headlineMetricLabel = headlineGate.label.toLowerCase();
  const headlineText =
    headlineGate.state === "confident" && headlineDelta != null
      ? `When ${channelName} is present in paths, we see ${headlineDelta >= 0 ? "+" : ""}${headlineDelta.toFixed(1)}% ${headlineMetricLabel}.`
      : `${channelName} shows no statistically distinguishable signal versus paths without it at current sample size.`;

  // Contextual caveat — channel-specific observational note
  const caveat = (() => {
    if (row.channel === "email") return "Email subscribers are typically more engaged than non-subscribers. This is correlation, not a causal estimate.";
    if (row.channel === "(direct)") return "Direct traffic skews toward returning customers — they're predisposed to buy regardless of channel.";
    if (row.channel === "organic search") return "Search-arriving customers self-select for intent. Comparison reflects who they are, not what search did.";
    if (row.channel === "referral") return "Referral users come from third-party trust signals. Audience composition is part of the effect.";
    return "This is a description of what's in your data — not a causal estimate. Self-selection and audience overlap are not controlled for.";
  })();

  // 4 metric stat blocks — render with per-metric gate state
  const metricsToRender: MetricKey[] = ["conv_rate", "aov", "days", "touches"];

  return (
    <div className="lift-card">
      <div className="lift-card-head">
        <div className="lift-card-head-left">
          <span className="lift-chip" style={{ background: color }}>{short}</span>
          <div>
            <div className="lift-card-eyebrow">{channelName} · {headlineGate.label}</div>
            <h3 className="lift-card-headline">{headlineText}</h3>
          </div>
        </div>
        <span className="lift-method-tag obs">Observational</span>
      </div>

      <div className="lift-stat-row">
        {metricsToRender.map(k => {
          const g = gates[k];
          const isHeadline = k === headlineKey;
          const deltaText = formatDelta(g);
          const cls =
            g.state === "hidden"     ? "neutral"
            : g.state === "noise"    ? "neutral"
            : g.delta_rel != null && g.delta_rel >= 0 ? "up" : "down";
          return (
            <div key={k} className="lift-stat" style={{ opacity: g.state === "hidden" ? 0.4 : 1 }}>
              <div className="lift-stat-label">
                {g.label}
                {isHeadline && g.state === "confident" && (
                  <span style={{ marginLeft: 6, fontSize: 9, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>headline</span>
                )}
              </div>
              <div className="lift-stat-pair">
                <div className="with">{formatMetricValue(g, g.mean_with)}<span className="tag">with</span></div>
                <div className="without">{formatMetricValue(g, g.mean_without)}<span className="tag">without</span></div>
              </div>
              {g.state === "hidden" ? (
                <div className="lift-stat-delta neutral">need n ≥ 30</div>
              ) : g.state === "noise" ? (
                <div className="lift-stat-delta neutral" style={{ color: "var(--ink-4)" }} title={`Δ = ${deltaText}, but within statistical noise (|Δ|/SE = ${g.z?.toFixed(2)}, threshold 2.0)`}>
                  {deltaText} <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.8 }}>within noise</span>
                </div>
              ) : (
                <div className={`lift-stat-delta ${cls}`} title={`|Δ|/SE = ${g.z?.toFixed(2)} ≥ 2.0`}>
                  {deltaText}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="lift-stat-row" style={{ marginTop: 8 }}>
        <div className="lift-stat" style={{ flex: 1 }}>
          <div className="lift-stat-label">Sample</div>
          <div className="lift-stat-pair">
            <div className="with">
              {gates.conv_rate.n_with.toLocaleString()} <span className="tag">identities with</span>
              {" · "}
              {gates.aov.n_with.toLocaleString()} <span className="tag">chapters with</span>
            </div>
            <div className="without">
              {gates.conv_rate.n_without.toLocaleString()} <span className="tag">without</span>
              {" · "}
              {gates.aov.n_without.toLocaleString()} <span className="tag">without</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lift-caveat">
        <Icon name="info" size={13} />
        <span>{caveat}</span>
      </div>
    </div>
  );
}

function CiBar({ ci, point, domain, sig = true }: {
  ci: [number, number]; point: number; domain: [number, number]; sig?: boolean;
}) {
  const [lo, hi] = ci;
  const [dMin, dMax] = domain;
  const span = dMax - dMin;
  const pct = (v: number) => ((v - dMin) / span) * 100;
  const zeroPct = pct(0);
  const barLeft = pct(lo);
  const barWidth = pct(hi) - pct(lo);
  const pointPct = pct(point);
  return (
    <div className="ci-bar-wrap">
      <div className="ci-axis">
        <span style={{ left: "0%" }}>{dMin > 0 ? "+" : ""}{dMin}%</span>
        <span style={{ left: `${zeroPct}%`, transform: "translateX(-50%)" }}>0</span>
        <span style={{ right: "0%" }}>+{dMax}%</span>
      </div>
      <div className="ci-track">
        <div className="ci-zero" style={{ left: `${zeroPct}%` }}></div>
        <div className={`ci-band ${sig ? "sig" : "ns"}`} style={{ left: `${barLeft}%`, width: `${barWidth}%` }}></div>
        <div className={`ci-point ${sig ? "sig" : "ns"}`} style={{ left: `${pointPct}%` }}></div>
      </div>
      <div className="ci-foot">
        <span>95% CI: {lo > 0 ? "+" : ""}{lo}% to {hi > 0 ? "+" : ""}{hi}%</span>
        <span className="ci-foot-est">Estimate: <strong>{point > 0 ? "+" : ""}{point}%</strong></span>
      </div>
    </div>
  );
}

function CompareStat({
  leftLabel, rightLabel, leftValue, rightValue, leftN, rightN, unit, deltaPct,
}: {
  leftLabel: string; rightLabel: string;
  leftValue: string; rightValue: string;
  leftN: number; rightN: number;
  unit?: string; deltaPct: number;
}) {
  const positive = deltaPct >= 0;
  return (
    <div className="lift-compare">
      <div className="lift-compare-side">
        <div className="lift-compare-side-label">{leftLabel}</div>
        <div className="lift-compare-side-value">{leftValue}{unit ? <span className="unit">{unit}</span> : null}</div>
        <div className="lift-compare-side-n">n = {leftN.toLocaleString()}</div>
      </div>
      <div className={`lift-compare-mid ${positive ? "pos" : "neg"}`}>
        <div className="lift-compare-arrow">{positive ? "↑" : "↓"}</div>
        <div className="lift-compare-delta">{positive ? "+" : ""}{deltaPct.toFixed(1)}%</div>
        <div className="lift-compare-delta-label">{positive ? "higher" : "lower"}</div>
      </div>
      <div className="lift-compare-side">
        <div className="lift-compare-side-label">{rightLabel}</div>
        <div className="lift-compare-side-value">{rightValue}{unit ? <span className="unit">{unit}</span> : null}</div>
        <div className="lift-compare-side-n">n = {rightN.toLocaleString()}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Incrementality tab — regression-adjusted lift (per spec §6)
// ────────────────────────────────────────────────────────────────────────────

type IncMetricKey = "conv_rate" | "aov" | "days";
type IncMetricGate = {
  key:        IncMetricKey;
  label:      string;
  unit:       "%" | "$" | "days";
  /** Raw lift (relative %) — what's in the data without controlling for path length. */
  raw_lift:   number | null;
  /** Lin's-adjusted lift (relative %) — uses metric-appropriate covariate
   *  (pre-channel touch count for conv_rate + aov; recency for days). */
  adj_lift:   number | null;
  /** ±2·SE band on the adjusted lift in relative-% units. */
  ci_low:     number | null;
  ci_high:    number | null;
  /** Display values for the WITH vs WITHOUT face of the card. */
  mean_with:     number | null;
  mean_without:  number | null;
  /** Sample sizes — each metric has its own n. Time-to-close uses a STRICT
   *  subset (chapter_id ≥ 1 with non-null recency), so its n is typically
   *  smaller than AOV's. */
  n_with:     number;
  n_without:  number;
  state:      "hidden" | "noise" | "confident";
};

/** Lin's-style covariate-adjusted lift + ±2·SE CI on the adjustment.
 *  Returns adj_lift_pct as a RELATIVE % change vs WITHOUT-arm baseline.
 *
 *  Inputs are per-bucket sufficient statistics from the RPC. We solve a single
 *  partial-regression slope adjustment:
 *    adj_diff = (y_with - y_without) - β · (x_with - x_without)
 *  where β is the pooled regr_slope from the RPC, and SE uses the regression
 *  residual variance approximation:
 *    SE(adj_diff) ≈ sqrt((1 - r²) · s_y_pool² · (1/n_w + 1/n_wo))
 *  with s_y_pool² estimated from the per-arm sample stddevs.
 */
function adjustedLift(
  n_w: number, n_wo: number,
  y_w: number | null, y_wo: number | null,
  sd_w: number | null, sd_wo: number | null,
  x_w: number | null, x_wo: number | null,
  slope: number | null, r2: number | null,
): { raw_lift: number | null; adj_lift: number | null; ci_low: number | null; ci_high: number | null } {
  if (y_w == null || y_wo == null || y_wo === 0) {
    return { raw_lift: null, adj_lift: null, ci_low: null, ci_high: null };
  }
  const raw_diff = y_w - y_wo;
  const raw_lift = (raw_diff / y_wo) * 100;
  const adj_diff = slope != null && x_w != null && x_wo != null
    ? raw_diff - slope * (x_w - x_wo)
    : raw_diff;
  const adj_lift = (adj_diff / y_wo) * 100;

  if (sd_w == null || sd_wo == null || n_w === 0 || n_wo === 0) {
    return { raw_lift, adj_lift, ci_low: null, ci_high: null };
  }
  // Pooled sample variance (Welch-style — both arms separately weighted)
  const s2_pool = ((n_w - 1) * sd_w * sd_w + (n_wo - 1) * sd_wo * sd_wo) / Math.max(n_w + n_wo - 2, 1);
  // Residual variance under the regression model
  const resid_var = Math.max(0, 1 - (r2 ?? 0)) * s2_pool;
  const se_diff   = Math.sqrt(resid_var * (1 / n_w + 1 / n_wo));
  const se_pct    = (se_diff / Math.abs(y_wo)) * 100;
  return {
    raw_lift,
    adj_lift,
    ci_low:  adj_lift - 2 * se_pct,
    ci_high: adj_lift + 2 * se_pct,
  };
}

function gateState(n_w: number, n_wo: number, ci_low: number | null, ci_high: number | null): IncMetricGate["state"] {
  if (Math.min(n_w, n_wo) < 30) return "hidden";
  if (ci_low == null || ci_high == null) return "hidden";
  // Confident iff CI does NOT straddle 0
  return (ci_low > 0 || ci_high < 0) ? "confident" : "noise";
}

function buildIncGates(row: IncrementalityRow): Record<IncMetricKey, IncMetricGate> {
  const num = (v: number | null) => v != null ? Number(v) : null;

  // ── Conv rate (identity-level). NULL ids_with means RPC returned no
  //    identity-level data for this bucket — happens on value_band axis by
  //    design — gate state will be "hidden".
  const ids_w  = Number(row.ids_with    ?? 0);
  const ids_wo = Number(row.ids_without ?? 0);
  const c_w    = Number(row.conv_ids_with    ?? 0);
  const c_wo   = Number(row.conv_ids_without ?? 0);
  const have_conv_data = row.ids_with != null && row.ids_without != null;
  const p_w    = ids_w  > 0 ? c_w  / ids_w  : null;
  const p_wo   = ids_wo > 0 ? c_wo / ids_wo : null;
  const p_pool = (ids_w + ids_wo) > 0 ? (c_w + c_wo) / (ids_w + ids_wo) : 0;
  const conv_raw_abs = p_w != null && p_wo != null ? (p_w - p_wo) * 100 : null;
  const conv_raw_rel = p_w != null && p_wo != null && p_wo > 0 ? ((p_w - p_wo) / p_wo) * 100 : null;
  const conv_se      = have_conv_data && ids_w > 0 && ids_wo > 0
    ? Math.sqrt(p_pool * (1 - p_pool) * (1 / ids_w + 1 / ids_wo)) * 100
    : Infinity;
  const conv_ci_abs_low  = conv_raw_abs != null ? conv_raw_abs - 2 * conv_se : null;
  const conv_ci_abs_high = conv_raw_abs != null ? conv_raw_abs + 2 * conv_se : null;
  // Convert pp CI to relative-% CI for display consistency with AOV / days
  const conv_ci_low  = conv_ci_abs_low  != null && p_wo != null && p_wo > 0 ? (conv_ci_abs_low  / (p_wo * 100)) * 100 : null;
  const conv_ci_high = conv_ci_abs_high != null && p_wo != null && p_wo > 0 ? (conv_ci_abs_high / (p_wo * 100)) * 100 : null;
  const conv_state: IncMetricGate["state"] = !have_conv_data || Math.min(ids_w, ids_wo) < 30
    ? "hidden"
    : (conv_ci_low != null && conv_ci_high != null && (conv_ci_low > 0 || conv_ci_high < 0)
       ? "confident" : "noise");

  const convGate: IncMetricGate = {
    key: "conv_rate", label: "Conversion rate", unit: "%",
    raw_lift: conv_raw_rel, adj_lift: conv_raw_rel,
    ci_low: conv_ci_low, ci_high: conv_ci_high,
    mean_with: p_w != null ? p_w * 100 : null,
    mean_without: p_wo != null ? p_wo * 100 : null,
    n_with: ids_w, n_without: ids_wo,
    state: conv_state,
  };

  // ── AOV (chapter-level, pre-channel touch covariate)
  const n_w  = Number(row.n_with    ?? 0);
  const n_wo = Number(row.n_without ?? 0);
  const aovAdj = adjustedLift(
    n_w, n_wo,
    num(row.aov_with),     num(row.aov_without),
    num(row.aov_sd_with),  num(row.aov_sd_without),
    num(row.aov_cov_with), num(row.aov_cov_without),
    num(row.aov_slope),    num(row.aov_r2),
  );
  const aovGate: IncMetricGate = {
    key: "aov", label: "AOV", unit: "$",
    raw_lift: aovAdj.raw_lift, adj_lift: aovAdj.adj_lift,
    ci_low: aovAdj.ci_low, ci_high: aovAdj.ci_high,
    mean_with: num(row.aov_with), mean_without: num(row.aov_without),
    n_with: n_w, n_without: n_wo,
    state: gateState(n_w, n_wo, aovAdj.ci_low, aovAdj.ci_high),
  };

  // ── Time to close (STRICT subset: chapter_id ≥ 1 with non-null recency).
  //    Uses recency (days since prior purchase) as the covariate — matches the
  //    time-units principle of spec v2 §12 Change 3. Note v2 §12 Change 4:
  //    selection bias persists past this adjustment, so the UI demotes this
  //    metric visually.
  const days_n_w  = Number(row.days_n_with    ?? 0);
  const days_n_wo = Number(row.days_n_without ?? 0);
  const daysAdj = adjustedLift(
    days_n_w, days_n_wo,
    num(row.days_with),     num(row.days_without),
    num(row.days_sd_with),  num(row.days_sd_without),
    num(row.days_cov_with), num(row.days_cov_without),
    num(row.days_slope),    num(row.days_r2),
  );
  const daysGate: IncMetricGate = {
    key: "days", label: "Time to close", unit: "days",
    raw_lift: daysAdj.raw_lift, adj_lift: daysAdj.adj_lift,
    ci_low: daysAdj.ci_low, ci_high: daysAdj.ci_high,
    mean_with: num(row.days_with), mean_without: num(row.days_without),
    n_with: days_n_w, n_without: days_n_wo,
    state: gateState(days_n_w, days_n_wo, daysAdj.ci_low, daysAdj.ci_high),
  };

  return { conv_rate: convGate, aov: aovGate, days: daysGate };
}

function pickIncHeadline(gates: Record<IncMetricKey, IncMetricGate>): IncMetricKey {
  // Per spec v2 §12 Change 4: Time-to-close is structurally the weakest
  // adjusted metric. Exclude it from headline candidacy so the standout chip
  // doesn't land on a value the user shouldn't trust most.
  const confident = (Object.values(gates) as IncMetricGate[])
    .filter(g => g.state === "confident" && g.adj_lift != null && g.key !== "days")
    .sort((a, b) => Math.abs(b.adj_lift!) - Math.abs(a.adj_lift!));
  if (confident.length > 0) return confident[0].key;
  // Fallback: AOV if conv-rate hidden (e.g. value_band axis), else conv_rate
  return gates.conv_rate.state === "hidden" ? "aov" : "conv_rate";
}

function formatIncValue(g: IncMetricGate, value: number | null): string {
  if (value == null) return "—";
  switch (g.unit) {
    case "%":    return `${value.toFixed(1)}%`;
    case "$":    return `$${value.toFixed(2)}`;
    case "days": return `${value.toFixed(1)}d`;
  }
}

function formatPct(v: number | null): string {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

// Group RPC rows by channel for card-per-channel rendering. Returns map of
// channel → bucketed rows (preserves bucket order from SQL).
function groupByChannel(rows: IncrementalityRow[]): Map<string, IncrementalityRow[]> {
  const m = new Map<string, IncrementalityRow[]>();
  for (const r of rows) {
    if (!m.has(r.channel)) m.set(r.channel, []);
    m.get(r.channel)!.push(r);
  }
  return m;
}

// Filter buckets to render per spec §5 — email card cohort = subscribers only
// when subscriber axis is selected. Other channels show all available buckets.
function bucketsForChannel(channel: string, axis: IncrementalityAxis, buckets: IncrementalityRow[]): IncrementalityRow[] {
  if (channel === "email" && axis === "subscriber") {
    return buckets.filter(b => b.bucket === "subscriber");
  }
  return buckets;
}

function NewIncrementalityCard({ channel, buckets, axis }: {
  channel:  string;
  buckets:  IncrementalityRow[];
  axis:     IncrementalityAxis;
}) {
  const channelName = (() => {
    const ch = CHANNELS[channel as ChannelKey];
    if (ch) return ch.name;
    return channel.replace(/[()]/g, "").replace(/\b\w/g, c => c.toUpperCase());
  })();
  const color = CHANNELS[channel as ChannelKey]?.color ?? "#9CA0A8";
  const short = CHANNELS[channel as ChannelKey]?.short ?? channel.slice(0, 2).toUpperCase();

  // Build gates per bucket. Find the standout bucket (largest |adj_lift| in any
  // confident metric) to surface as the headline.
  const bucketGates = buckets.map(b => ({
    bucket: b.bucket,
    bucket_label: b.bucket_label,
    gates: buildIncGates(b),
  }));

  const allConfident = bucketGates.flatMap(bg =>
    (Object.values(bg.gates) as IncMetricGate[])
      .filter(g => g.state === "confident" && g.adj_lift != null)
      .map(g => ({ bucket: bg.bucket_label, gate: g })),
  );
  const standout = allConfident.length > 0
    ? allConfident.sort((a, b) => Math.abs(b.gate.adj_lift!) - Math.abs(a.gate.adj_lift!))[0]
    : null;

  const headlineText = standout
    ? `${channelName} ${standout.gate.adj_lift! >= 0 ? "lift" : "drag"} concentrated in ${standout.bucket} (${formatPct(standout.gate.adj_lift)} ${standout.gate.label.toLowerCase()}, adjusted)`
    : `${channelName} shows no statistically distinguishable adjusted lift in this cohort at current volume.`;

  const allHidden = bucketGates.every(bg =>
    (Object.values(bg.gates) as IncMetricGate[]).every(g => g.state === "hidden")
  );

  if (allHidden || bucketGates.length === 0) {
    return (
      <div className="lift-card" style={{ opacity: 0.7 }}>
        <div className="lift-card-head">
          <div className="lift-card-head-left">
            <span className="lift-chip" style={{ background: color }}>{short}</span>
            <div>
              <div className="lift-card-eyebrow">{channelName}</div>
              <h3 className="lift-card-headline">Not enough data yet — need ≥30 chapters per arm in any bucket of this cohort.</h3>
            </div>
          </div>
          <span className="lift-method-tag obs">Adjusted observational</span>
        </div>
      </div>
    );
  }

  const caveat = channel === "email"
    ? "Cohort restricted to email subscribers so we're comparing apples-to-apples. Lift is adjusted for pre-channel path length so it measures the channel, not just busier journeys."
    : "Lift is adjusted for pre-channel path length — we're measuring the channel's effect, not just busier journeys.";

  return (
    <div className="lift-card">
      <div className="lift-card-head">
        <div className="lift-card-head-left">
          <span className="lift-chip" style={{ background: color }}>{short}</span>
          <div>
            <div className="lift-card-eyebrow">{channelName} · adjusted for pre-channel activity</div>
            <h3 className="lift-card-headline">{headlineText}</h3>
          </div>
        </div>
        <span className="lift-method-tag obs">Adjusted observational</span>
      </div>

      {/* Stacked buckets — each shows WITH vs WITHOUT for each metric with its gate state */}
      {bucketGates.map(bg => {
        const headlineKey = pickIncHeadline(bg.gates);
        const allBucketHidden = (Object.values(bg.gates) as IncMetricGate[]).every(g => g.state === "hidden");
        return (
          <div key={bg.bucket} style={{ borderTop: "1px solid var(--line-2)", paddingTop: 14, marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                {bg.bucket_label}
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>
                  n={bg.gates.aov.n_with} with / {bg.gates.aov.n_without} without
                </span>
              </div>
              {allBucketHidden && (
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}>insufficient n in this bucket</span>
              )}
            </div>
            {!allBucketHidden && (
              <div className="lift-stat-row">
                {(["conv_rate", "aov", "days"] as const).map(k => {
                  const g = bg.gates[k];
                  const isHeadline = k === headlineKey && g.state === "confident";
                  // Time-to-close is the structurally weakest metric per spec
                  // v2 §12 Change 4 — visually demoted regardless of state.
                  const isDemoted = k === "days";
                  // For conv_rate hidden due to value_band axis (no identity
                  // data), show a tailored "n/a for this axis" instead of the
                  // generic "need n≥30" message.
                  const isConvHiddenByAxis = k === "conv_rate" && g.n_with === 0 && g.n_without === 0;
                  const cls =
                    g.state === "hidden"     ? "neutral"
                    : g.state === "noise"    ? "neutral"
                    : g.adj_lift != null && g.adj_lift >= 0 ? "up" : "down";
                  // The "confidence threshold" — the minimum |Δ| magnitude
                  // the metric would need to hit to clear the noise gate.
                  // Derives from the CI half-width: ci_high - adj_lift = 2·SE.
                  // Surfaces what "almost there" means in concrete numbers.
                  const threshold = g.ci_high != null && g.adj_lift != null
                    ? g.ci_high - g.adj_lift
                    : null;
                  return (
                    <div key={k} className="lift-stat" style={{
                      opacity: g.state === "hidden" ? 0.7 : (isDemoted ? 0.95 : 1),
                    }}>
                      <div className="lift-stat-label" style={isDemoted ? { color: "var(--ink-2)" } : undefined}>
                        {g.label}
                        {isDemoted && (
                          <span title="Selection bias persists past adjustment — interpret carefully. See 'How we calculated this'."
                                style={{ marginLeft: 6, fontSize: 9, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>
                            weakest
                          </span>
                        )}
                        {isHeadline && (
                          <span style={{ marginLeft: 6, fontSize: 9, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>headline</span>
                        )}
                      </div>
                      <div className="lift-stat-pair">
                        <div className="with">{formatIncValue(g, g.mean_with)}<span className="tag">with</span></div>
                        <div className="without">{formatIncValue(g, g.mean_without)}<span className="tag">without</span></div>
                      </div>
                      {g.state === "hidden" ? (
                        <div className="lift-stat-delta neutral" style={{ color: "var(--ink-2)" }}>
                          {isConvHiddenByAxis ? "n/a for value-band axis" : "need n ≥ 30"}
                        </div>
                      ) : g.state === "noise" ? (
                        <div className="lift-stat-delta neutral" style={{ color: "var(--ink-2)" }}
                          title={`Adjusted lift ${formatPct(g.adj_lift)} · 95% CI [${formatPct(g.ci_low)}, ${formatPct(g.ci_high)}] — straddles 0`}>
                          {formatPct(g.adj_lift)}
                          <span style={{ marginLeft: 4, fontSize: 10, color: "var(--ink-3)" }}>within noise</span>
                        </div>
                      ) : (
                        <div className={`lift-stat-delta ${cls}`}
                          title={`Raw lift ${formatPct(g.raw_lift)} · adjusted ${formatPct(g.adj_lift)} · 95% CI [${formatPct(g.ci_low)}, ${formatPct(g.ci_high)}]`}>
                          {formatPct(g.adj_lift)}
                        </div>
                      )}
                      {/* Threshold line — surfaces the confidence gate magnitude
                          on its own line for visual scanability. Hidden state
                          doesn't have a meaningful threshold (no stats yet). */}
                      {threshold != null && g.state !== "hidden" && (
                        <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.3 }}>
                          {g.state === "noise"
                            ? <>need ±{Math.abs(threshold).toFixed(1)}% for confident</>
                            : <>gate ±{Math.abs(threshold).toFixed(1)}%</>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <details style={{ marginTop: 16, fontSize: 12 }}>
        <summary style={{ cursor: "pointer", color: "var(--ink-2)", fontWeight: 500 }}>How we calculated this</summary>
        <div style={{ marginTop: 8, color: "var(--ink-3)", lineHeight: 1.55 }}>
          We compare similar audiences ({axis === "subscriber" ? "subscriber status" : axis === "value_band" ? "purchase-value band" : "region"}) with and without {channelName} in the chapter&apos;s path. Because longer or older customer relationships have more conversion opportunity, each metric is adjusted with a covariate appropriate to its units — so the reported lift measures {channelName}&apos;s effect, not just baseline differences in the people who use it.
          <br /><br />
          <strong>Conversion rate</strong> and <strong>AOV</strong> are adjusted for <strong>pre-channel touch count</strong> (engagement that happened BEFORE {channelName} first appeared in the path). Math: adjusted Δ = (mean<sub>with</sub> − mean<sub>without</sub>) − β · (touches<sub>with</sub> − touches<sub>without</sub>), where β is the pooled slope of outcome on pre-channel touches.
          <br /><br />
          <strong>Time to close</strong> uses a TIME-units covariate: <strong>days since the customer&apos;s prior purchase</strong> (recency at chapter start). Same Lin&apos;s-style formula with recency replacing touches. <em>Only chapters where the customer has at least one prior purchase</em> are included in this metric — first-ever chapters have no recency to control for and are excluded (n shown reflects this subset).
          <br /><br />
          <strong>Weakest metric flag on Time to Close:</strong> The covariate adjustment shrinks confounding from journey length, but it does not eliminate SELECTION bias. Channel-present chapters disproportionately come from customers with structurally different browsing habits (return customers shop leisurely; first-time buyers convert fast). A lift here partly reflects WHO uses the channel, not just what the channel did to them. Interpret carefully — this metric is descriptively true but causally weakest on this tab.
          <br /><br />
          <strong>Confidence gate:</strong> 30 chapters per arm per bucket minimum; lift renders in color when the 95% CI excludes 0, grayed &quot;within noise&quot; otherwise. CI from residual variance of the regression.
          {axis === "value_band" && (
            <>
              <br /><br />
              <strong>Why Conversion Rate is hidden on the value-band axis:</strong> value buckets are computed from purchase amount, so non-converters cannot be bucketed. The conv-rate denominator would degenerate. Switch to Subscriber or Region axis to see conversion-rate analysis.
            </>
          )}
        </div>
      </details>

      <div className="lift-caveat">
        <Icon name="info" size={13} />
        <span>{caveat}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Contribution tab (Tab 3) — Measure A (Incremental Loss) + Measure B
// (Contribution Index) + 2×2 portfolio plot. Per contribution_tab_spec.md.
//
// Anti-screenshot discipline: Measure A NEVER renders as a bare point number,
// always a RANGE + MECHANISM clause. Measure B is labeled "footprint /
// involvement" — never "causal."
// ────────────────────────────────────────────────────────────────────────────

type ContribComputed = {
  channel: string;
  channelName: string;
  color: string;
  short: string;
  // Touched volume (chapter-level)
  touched_chapters: number;
  touched_revenue: number;
  // Measure A — Incremental Loss
  incremental_rate: number | null;       // 0-1
  incremental_se: number | null;          // standard error (relative)
  incremental_ci_low: number | null;      // 0-1
  incremental_ci_high: number | null;     // 0-1
  projected_loss_low: number | null;      // chapters
  projected_loss_high: number | null;     // chapters
  incremental_gate: "hidden" | "noise" | "confident";
  // Measure B — Contribution Index
  participation_rate: number;     // 0-1
  fractional_revenue: number;
  recurrence_score: number;       // 0-1
  // After normalization (filled in TS, 0-1 per channel set):
  participation_norm: number;
  fractional_norm: number;
  recurrence_norm: number;
  contribution_index: number;     // 0-1 average
  // 2×2 quadrant assigned after median split
  quadrant: "core_driver" | "connective_tissue" | "niche_punchy" | "safe_to_cut" | "unscored";
};

function computeContribution(rows: ContributionChannelRow[]): ContribComputed[] {
  if (rows.length === 0) return [];

  // 1. Pull raw signals + apply normalizations against the channel set.
  //    Per spec §3 + decision: equal-weight average of normalized signals.
  const maxParticipation = Math.max(...rows.map(r => Number(r.participation_rate ?? 0)), 0.0001);
  const maxFractional    = Math.max(...rows.map(r => Number(r.fractional_revenue ?? 0)), 0.0001);
  const maxRecurrence    = Math.max(...rows.map(r => Number(r.recurrence_score ?? 0)), 0.0001);

  const partial: Omit<ContribComputed, "quadrant">[] = rows.map(r => {
    const ch = CHANNELS[r.channel as ChannelKey];
    const channelName = ch?.name ?? r.channel.replace(/[()]/g, "").replace(/\b\w/g, c => c.toUpperCase());
    const color = ch?.color ?? "#9CA0A8";
    const short = ch?.short ?? r.channel.slice(0, 2).toUpperCase();

    const inc_rate = r.incremental_rate != null ? Number(r.incremental_rate) : null;
    const inc_var  = r.incremental_rate_variance != null ? Number(r.incremental_rate_variance) : null;
    const inc_se   = inc_var != null && inc_var > 0 ? Math.sqrt(inc_var) : null;
    const inc_ci_low  = inc_rate != null && inc_se != null ? inc_rate - 2 * inc_se : null;
    const inc_ci_high = inc_rate != null && inc_se != null ? inc_rate + 2 * inc_se : null;

    const touched = Number(r.touched_chapters ?? 0);
    const projected_loss_low  = inc_ci_low  != null ? Math.max(0, touched * Math.max(0, inc_ci_low))  : null;
    const projected_loss_high = inc_ci_high != null ? Math.max(0, touched * Math.max(0, inc_ci_high)) : null;

    // Gate state for the incremental measure (mirrors Incrementality tab logic)
    const buckets_n = Number(r.incremental_buckets_n ?? 0);
    let incremental_gate: ContribComputed["incremental_gate"] = "hidden";
    if (buckets_n > 0 && inc_rate != null && inc_ci_low != null && inc_ci_high != null) {
      incremental_gate = (inc_ci_low > 0 || inc_ci_high < 0) ? "confident" : "noise";
    }

    const participation = Number(r.participation_rate ?? 0);
    const fractional    = Number(r.fractional_revenue ?? 0);
    const recurrence    = Number(r.recurrence_score   ?? 0);

    const participation_norm = participation / maxParticipation;
    const fractional_norm    = fractional / maxFractional;
    const recurrence_norm    = recurrence / maxRecurrence;
    const contribution_index = (participation_norm + fractional_norm + recurrence_norm) / 3;

    return {
      channel: r.channel,
      channelName, color, short,
      touched_chapters: touched,
      touched_revenue: Number(r.touched_revenue ?? 0),
      incremental_rate: inc_rate,
      incremental_se: inc_se,
      incremental_ci_low: inc_ci_low,
      incremental_ci_high: inc_ci_high,
      projected_loss_low,
      projected_loss_high,
      incremental_gate,
      participation_rate: participation,
      fractional_revenue: fractional,
      recurrence_score: recurrence,
      participation_norm, fractional_norm, recurrence_norm, contribution_index,
    };
  });

  // 2. Median split for quadrant assignment. Channels with no incremental data
  //    get 'unscored'.
  const incScored = partial.filter(c => c.incremental_rate != null);
  const sortedInc = [...incScored].map(c => c.incremental_rate!).sort((a, b) => a - b);
  const sortedCon = [...partial].map(c => c.contribution_index).sort((a, b) => a - b);
  const medianInc = sortedInc.length > 0 ? sortedInc[Math.floor(sortedInc.length / 2)] : 0;
  const medianCon = sortedCon.length > 0 ? sortedCon[Math.floor(sortedCon.length / 2)] : 0;

  return partial.map(c => {
    let quadrant: ContribComputed["quadrant"] = "unscored";
    if (c.incremental_rate != null) {
      const hiInc = c.incremental_rate >= medianInc;
      const hiCon = c.contribution_index >= medianCon;
      quadrant = hiInc && hiCon ? "core_driver"
        : !hiInc && hiCon ? "connective_tissue"
        : hiInc && !hiCon ? "niche_punchy"
        : "safe_to_cut";
    }
    return { ...c, quadrant };
  });
}

const QUADRANT_LABELS: Record<ContribComputed["quadrant"], { title: string; verdict: string }> = {
  core_driver:       { title: "Core driver",       verdict: "Protect — both incremental AND deeply embedded." },
  connective_tissue: { title: "Connective tissue", verdict: "DO NOT CUT despite low incremental — heavily embedded in the customer base." },
  niche_punchy:      { title: "Closing spark",     verdict: "Rarely appears, but converts when it does." },
  safe_to_cut:       { title: "Coasting",          verdict: "Low incremental + low embedded footprint." },
  unscored:          { title: "Insufficient data", verdict: "Not enough samples to score this channel." },
};

function ContributionCard({ c }: { c: ContribComputed }) {
  const fmtPctRange = (lo: number | null, hi: number | null) =>
    lo != null && hi != null
      ? `${(lo * 100).toFixed(1)}%–${(hi * 100).toFixed(1)}%`
      : "—";
  const fmtRange = (lo: number | null, hi: number | null) =>
    lo != null && hi != null
      ? `${Math.round(lo)}–${Math.round(hi)}`
      : "—";

  const measureAHeadline = c.incremental_gate === "hidden" || c.projected_loss_low == null
    ? `Not enough data to project an honest range for ${c.channelName.toLowerCase()}.`
    : c.incremental_gate === "noise"
      ? `If ${c.channelName} disappeared, projected order loss is ${fmtRange(c.projected_loss_low, c.projected_loss_high)} (${fmtPctRange(c.incremental_ci_low, c.incremental_ci_high)} of ${c.touched_chapters} touched chapters). Range straddles zero — matched comparison suggests most touched buyers would convert via other channels.`
      : `If ${c.channelName} disappeared, projected order loss is ${fmtRange(c.projected_loss_low, c.projected_loss_high)} chapters (${fmtPctRange(c.incremental_ci_low, c.incremental_ci_high)} of ${c.touched_chapters} touched). The rest would likely substitute via other channels.`;

  const qd = QUADRANT_LABELS[c.quadrant];

  return (
    <div className="lift-card">
      <div className="lift-card-head">
        <div className="lift-card-head-left">
          <span className="lift-chip" style={{ background: c.color }}>{c.short}</span>
          <div>
            <div className="lift-card-eyebrow">{c.channelName} · contribution view</div>
            <h3 className="lift-card-headline" style={{ fontSize: 15, lineHeight: 1.4 }}>{measureAHeadline}</h3>
          </div>
        </div>
        <span className={`lift-method-tag ${c.quadrant === "connective_tissue" ? "causal" : "obs"}`}>{qd.title}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16, alignItems: "stretch" }}>
        {/* Measure A — Incremental Loss */}
        <div style={{ padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 8 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--ink-3)", fontWeight: 600, marginBottom: 6 }}>
            Incremental Loss · projection
          </div>
          {c.incremental_gate === "hidden" ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Insufficient sample — need ≥30 in both arms across at least one cohort bucket.</div>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.incremental_gate === "confident" ? "var(--accent)" : "var(--ink)", marginBottom: 4 }}>
                {fmtRange(c.projected_loss_low, c.projected_loss_high)} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>chapters</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>
                Range = {fmtPctRange(c.incremental_ci_low, c.incremental_ci_high)} of {c.touched_chapters} touched
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {c.incremental_gate === "noise"
                  ? "Within statistical noise — CI straddles 0."
                  : "Outside the noise gate — confident."}
              </div>
            </>
          )}
        </div>

        {/* Measure B — Contribution Index */}
        <div style={{ padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 8 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--ink-3)", fontWeight: 600, marginBottom: 6 }}>
            Contribution Index · footprint (not causal)
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            {(c.contribution_index * 100).toFixed(0)}
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}> / 100</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.4 }}>
            <div>Participation: <strong style={{ color: "var(--ink-2)" }}>{(c.participation_rate * 100).toFixed(1)}%</strong> <span style={{ opacity: 0.7 }}>of converting chapters</span></div>
            <div>Recurrence: <strong style={{ color: "var(--ink-2)" }}>{(c.recurrence_score * 100).toFixed(1)}%</strong> <span style={{ opacity: 0.7 }}>of returning-customer chapters</span></div>
            <div>Linear credit: <strong style={{ color: "var(--ink-2)" }}>{fmtMoney(c.fractional_revenue)}</strong></div>
          </div>
        </div>
      </div>

      <div className="lift-caveat" style={{ marginTop: 14 }}>
        <Icon name="info" size={13} />
        <span><strong>{qd.title}:</strong> {qd.verdict}</span>
      </div>

      <details style={{ marginTop: 12, fontSize: 12 }}>
        <summary style={{ cursor: "pointer", color: "var(--ink-2)", fontWeight: 500 }}>How we calculated this</summary>
        <div style={{ marginTop: 8, color: "var(--ink-3)", lineHeight: 1.55 }}>
          <strong>Incremental Loss</strong> = touched chapters × matched-cohort incremental rate (from the Incrementality engine, subscriber-bucket-summed). The range is the 95% CI on that rate × the touched volume. We stop at the matched-control rate — we do NOT model which OTHER channel absorbs substituting buyers (v2).
          <br /><br />
          <strong>Contribution Index</strong> is an equal-weight average of three signals, each normalized 0-1 across this client&apos;s channel set: <em>participation</em> (% converting chapters where channel appears), <em>linear credit</em> (this channel&apos;s share of attributed revenue), and <em>recurrence</em> (for returning customers, average fraction of their chapters containing the channel). It&apos;s a footprint measure — describes embeddedness, not causality.
          <br /><br />
          <strong>Quadrant</strong> is assigned by median-split of the channel set on both axes. With only {/* dynamic count placeholder */}a handful of channels, the median can shift as channels enter/leave the data.
        </div>
      </details>
    </div>
  );
}

// 2×2 portfolio plot — channels as positioned chips on incremental × contribution
// axes with quadrant backgrounds + labels. Inline SVG, no chart library.
function ContributionMatrix({ channels }: { channels: ContribComputed[] }) {
  if (channels.length === 0) return null;
  const scored = channels.filter(c => c.incremental_rate != null);
  if (scored.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 30 }}>
        Not enough data to plot the 2×2. Need at least one channel with sufficient cohort sample.
      </div>
    );
  }

  // Axis ranges: x = incremental (clamp visible to -30..50%), y = contribution (0..100)
  const w = 760, h = 380, pad = { l: 60, r: 24, t: 24, b: 50 };
  const xMin = -0.3, xMax = 0.5;
  const yMin = 0,    yMax = 1;
  const sortedInc = scored.map(c => c.incremental_rate!).sort((a, b) => a - b);
  const sortedCon = channels.map(c => c.contribution_index).sort((a, b) => a - b);
  const medianInc = sortedInc[Math.floor(sortedInc.length / 2)];
  const medianCon = sortedCon[Math.floor(sortedCon.length / 2)];

  const xs = (v: number) => pad.l + ((v - xMin) / (xMax - xMin)) * (w - pad.l - pad.r);
  const ys = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (h - pad.t - pad.b);

  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ marginBottom: 8 }}>
        <h3 className="card-title">Channel Value Matrix</h3>
        <div className="card-sub">
          <strong style={{ color: "#E36410" }}>Bottom-right</strong> = the connective-tissue warning a ROAS-only tool would mis-cut.
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Quadrant backgrounds (median split lines) */}
        <rect x={pad.l} y={pad.t} width={xs(medianInc) - pad.l} height={ys(medianCon) - pad.t}
              fill="#E36410" opacity="0.04" />
        <rect x={xs(medianInc)} y={pad.t} width={(w - pad.r) - xs(medianInc)} height={ys(medianCon) - pad.t}
              fill="#2E7D5B" opacity="0.05" />
        <rect x={pad.l} y={ys(medianCon)} width={xs(medianInc) - pad.l} height={(h - pad.b) - ys(medianCon)}
              fill="#9CA0A8" opacity="0.04" />
        <rect x={xs(medianInc)} y={ys(medianCon)} width={(w - pad.r) - xs(medianInc)} height={(h - pad.b) - ys(medianCon)}
              fill="#6F86A8" opacity="0.05" />

        {/* Median split lines */}
        <line x1={xs(medianInc)} x2={xs(medianInc)} y1={pad.t} y2={h - pad.b} stroke="var(--line-2)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={pad.l} x2={w - pad.r} y1={ys(medianCon)} y2={ys(medianCon)} stroke="var(--line-2)" strokeWidth="1" strokeDasharray="3 3" />

        {/* Quadrant corner labels (small, top-anchor of each quadrant) */}
        <text x={pad.l + 8}            y={pad.t + 14}  fontSize="10" fill="var(--ink-3)" fontWeight="600">Connective tissue</text>
        <text x={w - pad.r - 8}        y={pad.t + 14}  fontSize="10" fill="var(--ink-3)" fontWeight="600" textAnchor="end">Core driver</text>
        <text x={pad.l + 8}            y={h - pad.b - 6} fontSize="10" fill="var(--ink-3)" fontWeight="600">Coasting</text>
        <text x={w - pad.r - 8}        y={h - pad.b - 6} fontSize="10" fill="var(--ink-3)" fontWeight="600" textAnchor="end">Closing spark</text>

        {/* Axes */}
        <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} stroke="var(--ink-4)" strokeWidth="1" />
        <line x1={pad.l} x2={pad.l}     y1={pad.t}     y2={h - pad.b} stroke="var(--ink-4)" strokeWidth="1" />

        {/* X-axis ticks (incremental rate %) */}
        {[-0.3, -0.15, 0, 0.15, 0.3, 0.45].map(t => (
          <g key={t}>
            <line x1={xs(t)} x2={xs(t)} y1={h - pad.b} y2={h - pad.b + 4} stroke="var(--ink-4)" />
            <text x={xs(t)} y={h - pad.b + 18} fontSize="10" fill="var(--ink-3)" textAnchor="middle">
              {t > 0 ? "+" : ""}{(t * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        <text x={(pad.l + w - pad.r) / 2} y={h - 6} fontSize="11" fill="var(--ink-2)" fontWeight="500" textAnchor="middle">
          Incrementality (matched-cohort)
        </text>

        {/* Y-axis ticks (contribution index 0-100) */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={t}>
            <line x1={pad.l - 4} x2={pad.l} y1={ys(t)} y2={ys(t)} stroke="var(--ink-4)" />
            <text x={pad.l - 8} y={ys(t) + 3} fontSize="10" fill="var(--ink-3)" textAnchor="end">{(t * 100).toFixed(0)}</text>
          </g>
        ))}
        <text x={16} y={(pad.t + h - pad.b) / 2} fontSize="11" fill="var(--ink-2)" fontWeight="500"
              textAnchor="middle" transform={`rotate(-90 16 ${(pad.t + h - pad.b) / 2})`}>
          Contribution Index
        </text>

        {/* Channel chips */}
        {scored.map(c => {
          const x = xs(Math.max(xMin, Math.min(xMax, c.incremental_rate!)));
          const y = ys(Math.max(yMin, Math.min(yMax, c.contribution_index)));
          return (
            <g key={c.channel}>
              <circle cx={x} cy={y} r="9" fill={c.color} stroke="white" strokeWidth="2" />
              <text x={x + 14} y={y + 4} fontSize="11" fill="var(--ink)" fontWeight="500">{c.channelName}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────

export default function LiftClient({ correlation, incrementality, axisMetadata, contribution, clientKey: _clientKey, range }: Props) {
  const { client } = useChapter();
  const [tab, setTab] = useState<Tab>("correlation");
  const [incAxis, setIncAxis] = useState<IncrementalityAxis>("subscriber");
  void fmtMoney; void range; // imported for potential future use; quiet linter

  const correlationCount = correlation.length;

  // Group the active incrementality axis's rows by channel for card-per-channel render
  const incByChannel = useMemo(() => groupByChannel(incrementality[incAxis] ?? []), [incrementality, incAxis]);
  const incChannels = Array.from(incByChannel.keys());
  const incCount = incChannels.length;

  const incAxisLabel: Record<IncrementalityAxis, string> = {
    subscriber: "Subscriber status",
    value_band: "Purchase-value band",
    location:   "Region",
  };

  // Dynamic axis-definition copy for the description box. Uses live metadata
  // from the RPC (band cutoffs, top region list, subscriber count). Trimmed
  // for compact horizontal fit alongside the cohort picker.
  const axisDescription = (axis: IncrementalityAxis): React.ReactNode => {
    const m = axisMetadata;
    switch (axis) {
      case "subscriber":
        return (
          <>
            <strong>Subscribers</strong> = identities sent any Mailchimp campaign
            {m?.subscriber_count != null && <> ({m.subscriber_count.toLocaleString()} all-time)</>}.{" "}
            <strong>Non-subscribers</strong> = converters with no email engagement. Comparisons stay within each bucket.
          </>
        );
      case "value_band":
        return (
          <>
            Auto <strong>terciles</strong> of order revenue across {m?.value_band_n ?? "—"} chapters:{" "}
            <strong>Low</strong> ≤ ${m?.value_band_p33 ?? "—"} · <strong>Mid</strong> ${m?.value_band_p33 ?? "—"}–${m?.value_band_p67 ?? "—"} · <strong>High</strong> &gt; ${m?.value_band_p67 ?? "—"}. Recomputes per window.
          </>
        );
      case "location":
        return (
          <>
            <strong>Top 5 regions</strong> by chapter count + <strong>Other</strong>
            {m?.total_regions != null && <> ({m.total_regions} total)</>}.{" "}
            {m?.top_regions && m.top_regions.length > 0 && (
              <>Top 5: <strong>{m.top_regions.join(" · ")}</strong>. </>
            )}
            From each identity&apos;s most recent journey.
          </>
        );
    }
  };

  const tabMeta = {
    correlation: {
      title: "Correlation",
      sub: "Observational comparison",
      body: "We compare converting chapters that contain a channel against those that don't. This is a description of what's in your data — not an estimate of what would change if you turned the channel off. Self-selection (engaged customers subscribe to email) and audience overlap (Meta-targeted users skew mobile) are not controlled for.",
      claim: "When [channel] is present in paths, we see [X]% higher [metric].",
      count: correlationCount,
    },
    incrementality: {
      title: "Incrementality",
      sub: "Stratified audience-controlled lift",
      body: "We compare similar audiences (grouped by the cohort axis you select) with and without a channel in the chapter path. Because longer journeys naturally have more chances to convert, we adjust for pre-channel path activity — so we're measuring the channel's effect, not just busier journeys. This is NOT a randomized holdout (Chapter does not control channel delivery); it's an observational estimate with named adjustments.",
      claim: "Among [cohort], chapters where [channel] appeared show [X]% higher [metric], adjusted for pre-channel activity.",
      count: incCount,
    },
    contribution: {
      title: "Contribution",
      sub: "Footprint + projected loss",
      body: "Two clearly-separated measures per channel: (1) Incremental Loss — if the channel disappeared, projected order loss is a RANGE not a point, because matched comparison says most touched buyers would substitute via other channels. (2) Contribution Index — how embedded the channel is in the customer base (participation, linear credit, recurrence). Footprint, NOT a causal claim. The 2×2 plot reconciles them: low-incremental + high-contribution = connective tissue; do not cut.",
      claim: "If [channel] disappeared, projected order loss is N–M (~X% of touched). Contribution Index: [score]/100 (footprint, not causal).",
      count: contribution.length,
    },
  } as const;

  const m = tabMeta[tab];

  return (
    <>
      <TopBar
        title="Lift & Incrementality"
        subtitle={`Does this channel actually contribute? Three methodologies, ascending rigor · ${client.name}`}
      />
      <div className="content">
        <div className="card lift-hero">
          <div className="lift-hero-top">
            <div className="lift-hero-text">
              <div className="lift-hero-eyebrow">How this page works</div>
              <div className="lift-hero-body">
                Three methodologies answer the same question — <em>does this channel actually contribute?</em> — at ascending rigor. Pick a tab to see findings under that methodology. Each finding flags its caveats so you don&apos;t over-claim a correlation as causal.
              </div>
            </div>
          </div>
          <MethodRail active={tab} />
        </div>

        {/* Combined header: 3-column flex.
              Left:  tabs stacked over cohort-axis picker (Incrementality only)
              Mid:   definition box (Incrementality only) — top-aligned with tabs
              Right: "Showing N findings" — anchored top-right
            The definition box's TOP lines up with the tabs because it lives in
            the same flex row as the left column, at flex-start. */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          {/* Left column — tabs + cohort picker stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <div className="toggle-group lift-tabs">
              <button className={tab === "correlation" ? "active" : ""} onClick={() => setTab("correlation")}>Correlation</button>
              <button className={tab === "incrementality" ? "active" : ""} onClick={() => setTab("incrementality")}>Incrementality</button>
              <button className={tab === "contribution" ? "active" : ""} onClick={() => setTab("contribution")}>Contribution</button>
            </div>
            {tab === "incrementality" && (
              <Dropdown align="left" width={300} trigger={
                <button className="toolbar-btn" style={{ width: 290, justifyContent: "space-between" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Cohort axis:</span>
                    <span style={{ fontWeight: 500 }}>{incAxisLabel[incAxis]}</span>
                  </span>
                  <span className="chev"><Icon name="chev" size={12}/></span>
                </button>
              }>
                {(close) => (
                  <>
                    <div className="dd-label">Group audience by</div>
                    {(["subscriber", "value_band", "location"] as const).map(a => (
                      <button key={a} className={`dd-item ${incAxis === a ? "active" : ""}`} onClick={() => { setIncAxis(a); close(); }}>
                        <span>{incAxisLabel[a]}</span>
                        {incAxis === a && <span className="check"><Icon name="check" size={14}/></span>}
                      </button>
                    ))}
                  </>
                )}
              </Dropdown>
            )}
          </div>

          {/* Middle: definition box — top-aligned with tabs because it's a
              sibling in the same flex row */}
          {tab === "incrementality" && (
            <div style={{
              flex: "1 1 320px",
              maxWidth: 640,
              padding: "8px 12px",
              background: "var(--bg-2)",
              border: "1px solid var(--line-2)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--ink-2)",
              lineHeight: 1.45,
            }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>
                {incAxisLabel[incAxis]} definition
              </div>
              {axisDescription(incAxis)}
            </div>
          )}

          {/* Right: finding count — pushed to the right edge */}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)", flexShrink: 0, paddingTop: 4 }}>
            Showing {m.count} {m.title.toLowerCase()} {m.count === 1 ? "finding" : "findings"}
          </div>
        </div>

        <div className="card lift-method-explainer">
          <div className="lift-method-explainer-head">
            <div>
              <div className="lift-method-explainer-eyebrow">{m.sub}</div>
              <h3 className="lift-method-explainer-title">{m.title}</h3>
            </div>
            <div className="lift-method-explainer-claim">
              <div className="lift-method-explainer-claim-label">Claim shape</div>
              <div className="lift-method-explainer-claim-body">&quot;{m.claim}&quot;</div>
            </div>
          </div>
          <div className="lift-method-explainer-body">{m.body}</div>
          {tab === "correlation" && (
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-3)" }}>
              Confidence gate: a delta renders in color when |Δ|/SE ≥ 2 (~95% confidence). Below that threshold it shows grayed as &quot;within noise.&quot; If either arm has fewer than 30 samples, that metric is hidden entirely.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tab === "correlation" && (
            correlation.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
                No channels detected in this window. Try a longer date range.
              </div>
            ) : (
              correlation.map(row => <CorrelationCard key={row.channel} row={row} />)
            )
          )}
          {tab === "incrementality" && (
            incChannels.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
                No channels detected in this window for the {incAxisLabel[incAxis].toLowerCase()} cohort.
              </div>
            ) : (
              incChannels.map(ch => (
                <NewIncrementalityCard
                  key={ch}
                  channel={ch}
                  buckets={bucketsForChannel(ch, incAxis, incByChannel.get(ch) ?? [])}
                  axis={incAxis}
                />
              ))
            )
          )}
          {tab === "contribution" && (
            contribution.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
                No channels detected in this window for the contribution view.
              </div>
            ) : (() => {
              const computed = computeContribution(contribution);
              return (
                <>
                  <ContributionMatrix channels={computed} />
                  {computed.map(c => <ContributionCard key={c.channel} c={c} />)}
                </>
              );
            })()
          )}
        </div>
      </div>
    </>
  );
}
