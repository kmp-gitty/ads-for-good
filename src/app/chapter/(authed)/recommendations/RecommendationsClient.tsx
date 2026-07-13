"use client";

// Recommendations — client component rendering findings from the engine
// (chapter_recommendations). Themes are stable scaffolding; rules grow over
// time. Each card pairs a synthesized story with evidence + a suggested
// next step — never a directive. Confidence reflects signal strength.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { useChapter } from "../../_components/ChapterContext";
import type { RecommendationFinding } from "../../_lib/dashboard-rpc";

type Theme = RecommendationFinding["theme"];
type Conf  = RecommendationFinding["confidence"];
type State = RecommendationFinding["state"];
type ActT  = RecommendationFinding["action_type"];

// 6 themes in display order — matches the spec scaffolding. Empty messages
// are deliberately careful: "no signals fired" is honest; "all clear" can be
// misleading when a rule was simply data-blocked.
const THEMES: { key: Theme; label: string; emptyMessage: string }[] = [
  { key: "data_integrity",    label: "Data Integrity & Trust",
    emptyMessage: "No data integrity issues flagged this week." },
  { key: "channel_value",     label: "Channel Value & Contribution",
    emptyMessage: "No channels flagged for weak lift or under-contribution." },
  { key: "channel_synergy",   label: "Channel Synergy",
    emptyMessage: "No notable inter-channel patterns this week." },
  { key: "lifecycle_health",  label: "Lifecycle Health",
    emptyMessage: "Lifecycle shape is steady — nothing trending out of band." },
  { key: "customer_quality",  label: "Customer Quality",
    emptyMessage: "Customer-quality signals are within normal range." },
  { key: "emerging_patterns", label: "Emerging Patterns",
    emptyMessage: "No new patterns surfacing this week." },
];

const SEVERITY_RANK:   Record<RecommendationFinding["severity_weight"], number> = { high: 0, medium: 1, low: 2 };
const CONFIDENCE_RANK: Record<Conf, number> = { strong: 0, moderate: 1, early_signal: 2 };

const CONF_LABEL: Record<Conf, string> = {
  strong:       "Strong signal",
  moderate:     "Moderate signal",
  early_signal: "Early signal",
};
const STATE_LABEL: Record<State, string> = {
  new:      "New",
  standing: "Standing",
  changed:  "Changed",
  resolved: "Resolved",
};
const ACTION_KICKER: Record<ActT, string> = {
  mechanical:           "Suggested next step",
  analytical:           "Worth investigating",
  strategic_prompting:  "Strategic prompt",
};

// A "current"-view collapsed row: one card per (rule_id, subject_key), showing
// the latest occurrence's copy + a chip counting how many weekly runs have
// fired the same rule for the same subject. History view still passes raw
// RecommendationFinding rows (weeksRunning=1, firstSeenAt=undefined).
type DisplayFinding = RecommendationFinding & {
  weeksRunning?: number;
  firstSeenAt?: string;
};

function RecommendationCard({ rec }: { rec: DisplayFinding }) {
  const sevClass = rec.severity_weight === "high" ? "high"
                 : rec.severity_weight === "medium" ? "med" : "low";
  const evidence: RecommendationFinding["evidence"] = Array.isArray(rec.evidence) ? rec.evidence : [];
  const weeksRunning = rec.weeksRunning ?? 1;

  return (
    <div className="rec-card">
      <div className={`rail ${sevClass}`} />
      <div className="rec-body">
        <div className="rec-meta">
          <span className={`rec-tag conf-${rec.confidence}`}>{CONF_LABEL[rec.confidence]}</span>
          <span className={`rec-tag state-${rec.state}`}>{STATE_LABEL[rec.state]}</span>
          {weeksRunning > 1 && (
            <span
              className="rec-tag"
              style={{
                background: "rgba(227,100,16,0.10)",
                color: "var(--accent)",
                border: "1px solid rgba(227,100,16,0.20)",
              }}
              title={
                rec.firstSeenAt
                  ? `First observed ${new Date(rec.firstSeenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                  : undefined
              }
            >
              {weeksRunning}w running
            </span>
          )}
          {rec.subject_key && <span className="rec-tag rec-subject">{rec.subject_key}</span>}
          <span className="rec-tag rec-rule">{rec.rule_id}</span>
          {rec.render_method === "fallback" && (
            <span className="rec-tag rec-fallback" title="Card text rendered via template substitution — Claude API was unavailable">
              Template rendering
            </span>
          )}
        </div>
        <h3 className="rec-headline">{rec.headline}</h3>
        {rec.story && <p className="rec-story">{rec.story}</p>}
        {evidence.length > 0 && (
          <div className="rec-evidence">
            <div className="rec-evidence-title">Evidence</div>
            <ul className="rec-evidence-list">
              {evidence.map((e, i) => (
                <li key={i}>
                  <Link href={e.deeplink} className="rec-evidence-link">
                    <span className="rec-evidence-source">{e.source}</span>
                    <span className="rec-evidence-fact">{e.fact}</span>
                    <span className="rec-evidence-chev"><Icon name="chev" size={10} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="rec-action">
          <div className="rec-action-kicker">{ACTION_KICKER[rec.action_type]}</div>
          {rec.action}
        </div>
        <div className="rec-foot">
          <span>{new Date(rec.generated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <span className="muted">
            Window: {new Date(rec.data_window_start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {" → "}
            {new Date(rec.data_window_end).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RecommendationsClient({
  clientKey, current, history,
}: {
  clientKey: string;
  current:   RecommendationFinding[];
  history:   RecommendationFinding[];
}) {
  // clientKey kept on props for parity with sibling pages even though
  // we read display via ChapterContext.
  void clientKey;

  const { client } = useChapter();
  const [view,         setView]         = useState<"current" | "history">("current");
  const [confFilter,   setConfFilter]   = useState<"all" | Conf>("all");
  const [stateFilter,  setStateFilter]  = useState<"all" | "new" | "standing" | "changed">("all");
  const [actionFilter, setActionFilter] = useState<"all" | ActT>("all");

  // Collapse "current" view by (rule_id, subject_key ?? "") so a rule that
  // fires the same subject week after week shows as ONE card with a "Nw
  // running" chip, instead of a stack of near-duplicates. History view stays
  // flat — it's a chronological log by design.
  const collapsedCurrent = useMemo<DisplayFinding[]>(() => {
    const groups = new Map<string, RecommendationFinding[]>();
    for (const r of current) {
      const key = `${r.rule_id}::${r.subject_key ?? ""}`;
      const arr = groups.get(key) ?? [];
      arr.push(r);
      groups.set(key, arr);
    }
    const out: DisplayFinding[] = [];
    for (const arr of groups.values()) {
      arr.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
      const latest = arr[0];
      const first = arr[arr.length - 1];
      out.push({
        ...latest,
        weeksRunning: arr.length,
        firstSeenAt: first.generated_at,
      });
    }
    return out;
  }, [current]);

  const dataset: DisplayFinding[] = view === "current" ? collapsedCurrent : history;

  const filtered = useMemo(() => {
    return dataset
      .filter(r => {
        if (confFilter !== "all" && r.confidence !== confFilter) return false;
        if (view === "current" && stateFilter !== "all" && r.state !== stateFilter) return false;
        if (actionFilter !== "all" && r.action_type !== actionFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const sev = SEVERITY_RANK[a.severity_weight] - SEVERITY_RANK[b.severity_weight];
        if (sev !== 0) return sev;
        const conf = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
        if (conf !== 0) return conf;
        return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
      });
  }, [dataset, confFilter, stateFilter, actionFilter, view]);

  const byTheme = useMemo(() => {
    const m = new Map<Theme, DisplayFinding[]>();
    for (const t of THEMES) m.set(t.key, []);
    for (const f of filtered) m.get(f.theme)?.push(f);
    return m;
  }, [filtered]);

  // Hero counts run off the collapsed set so a rule firing 4 weeks in a row
  // shows as 1 recommendation, not 4. "New this week" = groups whose LATEST
  // finding is state='new' (the rule fired here for the first time ever).
  const totalActive  = collapsedCurrent.length;
  const strongCount  = collapsedCurrent.filter(r => r.confidence === "strong").length;
  const newCount     = collapsedCurrent.filter(r => r.state === "new").length;
  const engineIsEmpty = current.length === 0 && history.length === 0;

  return (
    <>
      <TopBar
        title="Recommendations"
        subtitle={<span>Synthesizing this week&apos;s findings across the data Chapter is collecting for: <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{client.name}</span></span>}
        showCompare={false}
      />
      <div className="content">
        {/* Hero */}
        <div className="card" style={{ background: "var(--navy)", color: "white", border: "none", padding: "22px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 720, flex: "1 1 320px", minWidth: 0 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>
                How this page works
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                Each Monday Chapter evaluates a library of rules against your data and synthesizes findings into recommendations across six themes. Each card pairs the finding with evidence and a suggested next step — never a directive. Confidence reflects signal strength: strong findings have held across multiple periods.
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{totalActive}</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>Active</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{strongCount}</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>Strong signal</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{newCount}</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>New this week</div>
              </div>
            </div>
          </div>
        </div>

        {/* Engine-not-yet-fired banner — only when there's literally nothing. */}
        {engineIsEmpty && (
          <div className="card" style={{ padding: "14px 18px", background: "var(--bg-2)", color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="info" size={16} />
            <span style={{ fontSize: 13 }}>
              The Recommendations engine runs every Monday at 06:00 UTC. First findings will populate after the next scheduled run.
            </span>
          </div>
        )}

        {/* Filter bar */}
        <div className="filter-bar" style={{ justifyContent: "space-between" }}>
          <div className="filter-bar">
            <div className="toggle-group">
              <button className={view === "current" ? "active" : ""} onClick={() => setView("current")}>Current</button>
              <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>History · 28d</button>
            </div>
            <Dropdown align="left" width={200} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Confidence</span>
                <span style={{ fontWeight: 500 }}>{confFilter === "all" ? "All" : CONF_LABEL[confFilter]}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  {(["all","strong","moderate","early_signal"] as const).map(k => (
                    <button key={k} className={`dd-item ${confFilter === k ? "active" : ""}`} onClick={() => { setConfFilter(k); close(); }}>
                      <span>{k === "all" ? "All confidence levels" : CONF_LABEL[k]}</span>
                      {confFilter === k && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
            {view === "current" && (
              <Dropdown align="left" width={180} trigger={
                <button className="toolbar-btn">
                  <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>State</span>
                  <span style={{ fontWeight: 500 }}>{stateFilter === "all" ? "All" : STATE_LABEL[stateFilter]}</span>
                  <span className="chev"><Icon name="chev" size={12}/></span>
                </button>
              }>
                {(close) => (
                  <>
                    {(["all","new","standing","changed"] as const).map(k => (
                      <button key={k} className={`dd-item ${stateFilter === k ? "active" : ""}`} onClick={() => { setStateFilter(k); close(); }}>
                        <span>{k === "all" ? "All states" : STATE_LABEL[k]}</span>
                        {stateFilter === k && <span className="check"><Icon name="check" size={14}/></span>}
                      </button>
                    ))}
                  </>
                )}
              </Dropdown>
            )}
            <Dropdown align="left" width={220} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Action type</span>
                <span style={{ fontWeight: 500 }}>
                  {actionFilter === "all" ? "All"
                  : actionFilter === "mechanical" ? "Mechanical"
                  : actionFilter === "analytical" ? "Analytical"
                  : "Strategic"}
                </span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  {(["all","mechanical","analytical","strategic_prompting"] as const).map(k => (
                    <button key={k} className={`dd-item ${actionFilter === k ? "active" : ""}`} onClick={() => { setActionFilter(k); close(); }}>
                      <span>{k === "all" ? "All" : k === "mechanical" ? "Mechanical" : k === "analytical" ? "Analytical" : "Strategic prompting"}</span>
                      {actionFilter === k && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Showing {filtered.length} of {dataset.length} recommendations
          </div>
        </div>

        {/* History — flat list, no theme grouping */}
        {view === "history" ? (
          filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
              {history.length === 0
                ? "No history yet — findings will accumulate as the engine runs weekly."
                : "No recommendations match these filters."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filtered.map(r => <RecommendationCard key={r.id} rec={r} />)}
            </div>
          )
        ) : (
          // Current — themed sections with per-theme empty states
          <>
            {THEMES.map(t => {
              const items = byTheme.get(t.key) ?? [];
              return (
                <div key={t.key} className="rec-theme-section">
                  <div className="rec-theme-head">
                    <h2 className="rec-theme-title">{t.label}</h2>
                    <span className="rec-theme-count">
                      {items.length} {items.length === 1 ? "recommendation" : "recommendations"}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <div className="rec-empty">
                      <Icon name="check" size={14} />
                      <span>{t.emptyMessage}</span>
                    </div>
                  ) : (
                    <div className="rec-theme-list">
                      {items.map(r => <RecommendationCard key={r.id} rec={r} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
