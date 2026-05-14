"use client";

import React, { useState } from "react";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { useChapter } from "../../_components/ChapterContext";
import {
  LIFT_CORRELATION, LIFT_INCREMENTALITY, LIFT_CAUSATION,
  CHANNELS,
  LiftCorrelation, LiftIncrementality, LiftCausation,
} from "../../_components/mockdata";

type Tab = "correlation" | "incrementality" | "causation";

function MethodRail({ active }: { active: Tab }) {
  const steps = [
    { key: "correlation"    as Tab, label: "Correlation",    sub: "Observational",      note: "What we see in the data" },
    { key: "incrementality" as Tab, label: "Incrementality", sub: "Randomized holdout", note: "What changes under test" },
    { key: "causation"      as Tab, label: "Causation",      sub: "Matched cohorts",    note: "What holds for like audiences" },
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

function CorrelationCard({ f }: { f: LiftCorrelation }) {
  const ch = CHANNELS[f.channel];
  return (
    <div className="lift-card">
      <div className="lift-card-head">
        <div className="lift-card-head-left">
          <span className="lift-chip" style={{ background: ch.color }}>{ch.short}</span>
          <div>
            <div className="lift-card-eyebrow">{ch.name} · {f.metric}</div>
            <h3 className="lift-card-headline">{f.headline}</h3>
          </div>
        </div>
        <span className="lift-method-tag obs">Observational</span>
      </div>

      <div className="lift-stat-row">
        <div className="lift-stat">
          <div className="lift-stat-label">AOV</div>
          <div className="lift-stat-pair">
            <div className="with">${f.with.aov.toFixed(2)}<span className="tag">with</span></div>
            <div className="without">${f.without.aov.toFixed(2)}<span className="tag">without</span></div>
          </div>
          <div className={`lift-stat-delta ${f.lift.aov >= 0 ? "up" : "down"}`}>
            {f.lift.aov >= 0 ? "+" : ""}{f.lift.aov.toFixed(1)}%
          </div>
        </div>
        <div className="lift-stat">
          <div className="lift-stat-label">Conv. rate</div>
          <div className="lift-stat-pair">
            <div className="with">{f.with.conv.toFixed(1)}%<span className="tag">with</span></div>
            <div className="without">{f.without.conv.toFixed(1)}%<span className="tag">without</span></div>
          </div>
          <div className={`lift-stat-delta ${f.lift.conv >= 0 ? "up" : "down"}`}>
            {f.lift.conv >= 0 ? "+" : ""}{f.lift.conv.toFixed(1)}%
          </div>
        </div>
        <div className="lift-stat">
          <div className="lift-stat-label">Revenue / chapter</div>
          <div className="lift-stat-pair">
            <div className="with">${f.with.revPer.toLocaleString()}<span className="tag">with</span></div>
            <div className="without">${f.without.revPer.toLocaleString()}<span className="tag">without</span></div>
          </div>
          <div className={`lift-stat-delta ${f.lift.revPer >= 0 ? "up" : "down"}`}>
            {f.lift.revPer >= 0 ? "+" : ""}{f.lift.revPer.toFixed(1)}%
          </div>
        </div>
        <div className="lift-stat">
          <div className="lift-stat-label">Sample</div>
          <div className="lift-stat-pair">
            <div className="with">{f.with.n.toLocaleString()}<span className="tag">with</span></div>
            <div className="without">{f.without.n.toLocaleString()}<span className="tag">without</span></div>
          </div>
          <div className="lift-stat-delta neutral">chapters</div>
        </div>
      </div>

      <div className="lift-caveat">
        <Icon name="info" size={13} />
        <span>{f.caveat}</span>
      </div>
    </div>
  );
}

function IncrementalityCard({ f }: { f: LiftIncrementality }) {
  const ch = CHANNELS[f.channel];
  const unit = f.test.unit || "";
  const fmt = (v: number) => unit === "%" ? `${v.toFixed(2)}%` : `$${v.toFixed(2)}`;
  return (
    <div className={`lift-card ${f.significant ? "" : "ns"}`}>
      <div className="lift-card-head">
        <div className="lift-card-head-left">
          <span className="lift-chip" style={{ background: ch.color }}>{ch.short}</span>
          <div>
            <div className="lift-card-eyebrow">{ch.name} · {f.metric}</div>
            <h3 className="lift-card-headline">{f.headline}</h3>
          </div>
        </div>
        <div className="lift-stat-tags">
          <span className={`lift-method-tag ${f.significant ? "sig" : "ns"}`}>
            {f.significant ? "Statistically significant" : "Not significant"}
          </span>
          <span className="lift-pval">p = {f.pvalue.toFixed(3)}</span>
        </div>
      </div>

      <CompareStat
        leftLabel="Test group" rightLabel="Holdout"
        leftValue={fmt(f.test.aov)} rightValue={fmt(f.ctrl.aov)}
        leftN={f.test.n} rightN={f.ctrl.n}
        deltaPct={f.lift}
      />

      <div className="lift-ci-section">
        <div className="lift-ci-head">
          <span>Lift estimate with 95% confidence interval</span>
          <span className="lift-power">Power: {(f.power * 100).toFixed(0)}%</span>
        </div>
        <CiBar ci={f.ci} point={f.lift} domain={[-15, 25]} sig={f.significant} />
      </div>

      <div className="lift-method-block">
        <div className="lift-method-row">
          <span className="lift-method-key">Method</span>
          <span className="lift-method-val">{f.method}</span>
        </div>
        <div className="lift-method-row">
          <span className="lift-method-key">Design</span>
          <span className="lift-method-val">{f.design}</span>
        </div>
      </div>

      <div className="lift-caveat">
        <Icon name="info" size={13} />
        <span>{f.caveat}</span>
      </div>
    </div>
  );
}

function CausationCard({ f }: { f: LiftCausation }) {
  const ch = CHANNELS[f.channel];
  const unit = f.treated.unit || "";
  const fmt = (v: number) => unit === "%" ? `${v.toFixed(2)}%` : `$${v.toFixed(2)}`;
  return (
    <div className="lift-card">
      <div className="lift-card-head">
        <div className="lift-card-head-left">
          <span className="lift-chip" style={{ background: ch.color }}>{ch.short}</span>
          <div>
            <div className="lift-card-eyebrow">{ch.name} · {f.metric}</div>
            <h3 className="lift-card-headline">{f.headline}</h3>
          </div>
        </div>
        <div className="lift-stat-tags">
          <span className="lift-method-tag causal">Causal estimate</span>
          <span className="lift-match-q">Match q: <strong>{f.matchQuality.toFixed(2)}</strong></span>
        </div>
      </div>

      <CompareStat
        leftLabel="Treated (channel-present)" rightLabel="Matched control"
        leftValue={fmt(f.treated.aov)} rightValue={fmt(f.control.aov)}
        leftN={f.treated.n} rightN={f.control.n}
        deltaPct={f.lift}
      />

      <div className="lift-ci-section">
        <div className="lift-ci-head">
          <span>Lift estimate with 95% confidence interval</span>
        </div>
        <CiBar ci={f.ci} point={f.lift} domain={[-10, 25]} sig={f.ci[0] > 0} />
      </div>

      <div className="lift-method-block">
        <div className="lift-method-row">
          <span className="lift-method-key">Method</span>
          <span className="lift-method-val">{f.method}</span>
        </div>
        <div className="lift-method-row">
          <span className="lift-method-key">Matched on</span>
          <span className="lift-method-val">{f.matchedOn.join(", ")}</span>
        </div>
      </div>

      <div className="lift-caveat">
        <Icon name="info" size={13} />
        <span>{f.caveat}</span>
      </div>
    </div>
  );
}

export default function LiftPage() {
  const { client } = useChapter();
  const [tab, setTab] = useState<Tab>("correlation");

  const tabMeta = {
    correlation: {
      title: "Correlation",
      sub: "Observational comparison",
      body: "We compare converting chapters that contain a channel against those that don't. This is a description of what's in your data — not an estimate of what would change if you turned the channel off. Self-selection (engaged customers subscribe to email) and audience overlap (Meta-targeted users skew mobile) are not controlled for.",
      claim: "When [channel] is present in paths, we see [X]% higher [metric].",
      count: LIFT_CORRELATION.length,
    },
    incrementality: {
      title: "Incrementality",
      sub: "Randomized holdout testing",
      body: "We randomly suppress a channel for a portion of an eligible audience, run for a fixed window, and compare outcomes. The randomization neutralizes self-selection within the eligible population. Significance reported at α = 0.05 with power calculated against the realized effect size.",
      claim: "When tested via randomized holdout, [channel] presence yields [X]% higher [metric] (p = [p]).",
      count: LIFT_INCREMENTALITY.length,
    },
    causation: {
      title: "Causation",
      sub: "Matched-cohort analysis",
      body: "We pair customers with channel exposure to similar customers without it, matched on observable traits (device, recency, prior LTV, acquisition channel). The lift is the average outcome difference within the matched support. Causal under the standard assumptions (no unmeasured confounders, common support).",
      claim: "For like-audience comparison, [channel] presence shows [X]% lift in [metric].",
      count: LIFT_CAUSATION.length,
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

        <div className="filter-bar" style={{ justifyContent: "space-between" }}>
          <div className="toggle-group lift-tabs">
            <button className={tab === "correlation" ? "active" : ""} onClick={() => setTab("correlation")}>Correlation</button>
            <button className={tab === "incrementality" ? "active" : ""} onClick={() => setTab("incrementality")}>Incrementality</button>
            <button className={tab === "causation" ? "active" : ""} onClick={() => setTab("causation")}>Causation</button>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Showing {m.count} {m.title.toLowerCase()} findings
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
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tab === "correlation" && LIFT_CORRELATION.map(f => <CorrelationCard key={f.id} f={f} />)}
          {tab === "incrementality" && LIFT_INCREMENTALITY.map(f => <IncrementalityCard key={f.id} f={f} />)}
          {tab === "causation" && LIFT_CAUSATION.map(f => <CausationCard key={f.id} f={f} />)}
        </div>
      </div>
    </>
  );
}
