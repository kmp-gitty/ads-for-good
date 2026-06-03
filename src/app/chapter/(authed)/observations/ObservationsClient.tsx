"use client";

// Observations — client component wired to real data from
// chapter_observations engine. Filters / view toggle / cards mirror the
// previously-mocked UI shell.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { useChapter } from "../../_components/ChapterContext";
import type {
  ObservationFinding,
  ObservationHistoryRow,
  DormantQuestion,
} from "../../_lib/dashboard-rpc";

function ObservationCard({ obs, onJump }: { obs: ObservationFinding; onJump: (o: ObservationFinding) => void }) {
  const sevLabel = obs.severity === "high" ? "High" : obs.severity === "med" ? "Medium" : "Low";
  const stateLabel = obs.current_state === "new" ? "New" : obs.current_state === "changed" ? "Changed" : "Standing";
  const stateClass = obs.current_state === "new" ? "new" : "state-inv";
  const data: { label: string; value: string }[] = Array.isArray(obs.data) ? obs.data : [];
  return (
    <div className="obs-card">
      <div className={`rail ${obs.severity}`}></div>
      <div className="obs-body">
        <div className="obs-meta">
          <span className={`obs-tag sev-${obs.severity}`}>{sevLabel} severity</span>
          <span className="obs-tag">{obs.category.replace("_", " ")}</span>
          <span className={`obs-tag ${stateClass}`}>{stateLabel}</span>
          {obs.gating_priority_active && (
            <span className="obs-tag" style={{ background: "rgba(204,82,82,0.15)", color: "var(--bad)" }}>
              Verify before acting on other findings
            </span>
          )}
          {obs.is_hero && <span className="obs-tag" style={{ background: "rgba(46,125,91,0.15)", color: "var(--good)" }}>Hero</span>}
        </div>
        <h3 className="obs-headline">{obs.headline}</h3>
        {data.length > 0 && (
          <div className="obs-data">
            {data.map((d, i) => (
              <div className="d" key={i}>
                <div className="d-label">{d.label}</div>
                <div className="d-val">{d.value}</div>
              </div>
            ))}
          </div>
        )}
        <div className="obs-action">
          <div className="obs-action-kicker">
            {obs.action_type === "mechanical" ? "Suggested next step"
            : obs.action_type === "analytical" ? "Worth investigating"
            : "Suggested investigation"}
          </div>
          {obs.action}
        </div>
        <div className="obs-foot">
          <span>{new Date(obs.last_fired_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          <button className="card-link" onClick={() => onJump(obs)}>
            Show me where this came from → {obs.page_label}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ObservationsClient({
  clientKey, findings, history, dormant,
}: {
  clientKey: string;
  findings:  ObservationFinding[];
  history:   ObservationHistoryRow[];
  dormant:   DormantQuestion[];
}) {
  const { client, pinObservation } = useChapter();
  const router = useRouter();
  const [view, setView] = useState<"current" | "history">("current");
  const [sevFilter, setSevFilter] = useState<"all" | "high" | "med" | "low">("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<"all" | "mechanical" | "analytical" | "strategic_prompting">("all");
  const [popup, setPopup] = useState<ObservationFinding | null>(null);
  const [showLow, setShowLow] = useState(false);

  // Hide LOW by default (spec §6). Filter toggle reveals them.
  const filtered = findings.filter(o => {
    if (!showLow && o.severity === "low" && sevFilter === "all") return false;
    if (sevFilter !== "all" && o.severity !== sevFilter) return false;
    if (catFilter !== "all" && o.category !== catFilter) return false;
    if (actionFilter !== "all" && o.action_type !== actionFilter) return false;
    return true;
  });

  const categories = ["all", ...Array.from(new Set(findings.map(o => o.category)))];
  const newThisWeek    = findings.filter(o => o.current_state === "new").length;
  const highSeverity   = findings.filter(o => o.severity === "high").length;
  const activeQuestions = new Set(findings.map(o => o.question_id)).size;
  const gatingActive   = findings.some(o => o.gating_priority_active);

  const navigateToObs = (obs: ObservationFinding) => {
    // The existing pinObservation context uses the old Observation type;
    // adapt the field names so the downstream Dashboard hint still works.
    pinObservation({
      id: obs.id,
      severity: obs.severity,
      state: obs.current_state === "changed" ? "changed" : obs.current_state === "standing" ? "standing" : "new",
      category: obs.category,
      actionType: obs.action_type,
      headline: obs.headline,
      data: obs.data,
      action: obs.action,
      timestamp: obs.last_fired_at,
      page: obs.page,
      pageLabel: obs.page_label,
    });
    router.push(`/chapter/${obs.page}`);
  };

  return (
    <>
      <TopBar
        title="Observations"
        subtitle={<span>Making sense and recommendations with the data Chapter is collecting for: <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{client.name}</span></span>}
        showCompare={false}
      />
      <div className="content">
        {/* Hero — How this page works */}
        <div className="card" style={{ background: "var(--navy)", color: "white", border: "none", padding: "22px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 720, flex: "1 1 320px", minWidth: 0 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>
                How this page works
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                Chapter generates observations by running a library of questions against your data continuously. Findings are sorted by severity. Each card pairs the finding with a suggested investigation — never a directive. At your current data depth, most findings land at MED/LOW confidence; statistical signal strengthens as data accumulates.
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{newThisWeek}</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>New this week</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{highSeverity}</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>High severity</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>{activeQuestions}</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>Active questions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Gating-priority banner (spec §1.5 + I-series gating) */}
        {gatingActive && view === "current" && (
          <div className="card" style={{ padding: "12px 18px", background: "rgba(204,82,82,0.08)", border: "1px solid rgba(204,82,82,0.25)", display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="info" size={16} />
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
              <strong>Data integrity issue active.</strong> Verify and resolve the gating-priority finding(s) below before acting on other observations — they may be based on incomplete or skewed data.
            </span>
          </div>
        )}

        {/* Filter bar */}
        <div className="filter-bar" style={{ justifyContent: "space-between" }}>
          <div className="filter-bar">
            <div className="toggle-group">
              <button className={view === "current" ? "active" : ""} onClick={() => setView("current")}>Current</button>
              <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>History</button>
            </div>
            <Dropdown align="left" width={180} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Severity</span>
                <span style={{ fontWeight: 500 }}>{sevFilter === "all" ? "All" : sevFilter === "high" ? "High" : sevFilter === "med" ? "Medium" : "Low"}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  {(["all","high","med","low"] as const).map(k => (
                    <button key={k} className={`dd-item ${sevFilter === k ? "active" : ""}`} onClick={() => { setSevFilter(k); close(); }}>
                      <span>{k === "all" ? "All severities" : k === "high" ? "High" : k === "med" ? "Medium" : "Low"}</span>
                      {sevFilter === k && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
            <Dropdown align="left" width={220} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Category</span>
                <span style={{ fontWeight: 500 }}>{catFilter === "all" ? "All" : catFilter.replace("_", " ")}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  {categories.map(c => (
                    <button key={c} className={`dd-item ${catFilter === c ? "active" : ""}`} onClick={() => { setCatFilter(c); close(); }}>
                      <span>{c === "all" ? "All categories" : c.replace("_", " ")}</span>
                      {catFilter === c && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
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
            {sevFilter === "all" && (
              <button
                className="toolbar-btn"
                onClick={() => setShowLow(v => !v)}
                title="Toggle low-severity findings (hidden by default per spec §6)"
              >
                <span style={{ fontSize: 11 }}>{showLow ? "Hide LOW" : "Show LOW"}</span>
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Showing {filtered.length} of {findings.length} observations
          </div>
        </div>

        {view === "history" ? (
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Observations history</h3>
              <div className="card-sub" style={{ marginTop: 3 }}>Last 28 days · {history.length} entries</div>
            </div>
            <div className="row-list" style={{ marginTop: 8 }}>
              <div className="lrow head" style={{ gridTemplateColumns: "120px 1fr 160px 110px" }}>
                <div>Severity</div>
                <div>Observation</div>
                <div>Category</div>
                <div>When</div>
              </div>
              {history.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)" }}>
                  No history yet — findings will accumulate as the engine runs daily.
                </div>
              )}
              {history.map((h, i) => (
                <div key={i} className="lrow" style={{ gridTemplateColumns: "120px 1fr 160px 110px" }}>
                  <div><span className={`obs-tag sev-${h.severity}`}>{h.severity === "high" ? "High" : h.severity === "med" ? "Medium" : "Low"}</span></div>
                  <div style={{ fontSize: 13 }}>{h.headline}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{h.category.replace("_", " ")}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{new Date(h.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {filtered.length === 0 && findings.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
                No active observations. The engine runs daily — findings will populate as data accumulates.
              </div>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
                No observations match these filters.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filtered.map(o => <ObservationCard key={o.id} obs={o} onJump={navigateToObs} />)}
              </div>
            )}

            {/* Collecting-data affordance — dormant questions */}
            {dormant.length > 0 && (
              <div className="card" style={{ padding: "16px 18px", background: "rgba(15,23,34,0.025)" }}>
                <div className="card-head" style={{ paddingBottom: 8 }}>
                  <h3 className="card-title" style={{ fontSize: 13 }}>Collecting data — {dormant.length} question{dormant.length === 1 ? "" : "s"} not yet active</h3>
                  <div className="card-sub" style={{ marginTop: 3 }}>
                    These activate as data depth or integrations land. The library is designed so something fires for any client past initial onset; depth-gated questions unlock specifically when their data is available.
                  </div>
                </div>
                <div className="row-list" style={{ marginTop: 4 }}>
                  {dormant.map(d => (
                    <div key={d.question_id} className="lrow" style={{ gridTemplateColumns: "60px 1fr 200px", padding: "8px 14px", fontSize: 12 }}>
                      <div className="muted">{d.question_id}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{d.name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{d.reason}</div>
                      </div>
                      <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}>{d.category.replace("_", " ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {popup && (
          <>
            <div className="scrim" onClick={() => setPopup(null)}></div>
            <div className="obs-popup">
              <div className="drawer-head">
                <div>
                  <div className="eyebrow">Observation</div>
                  <div className="obs-meta" style={{ marginTop: 6 }}>
                    <span className={`obs-tag sev-${popup.severity}`}>{popup.severity === "high" ? "High" : popup.severity === "med" ? "Medium" : "Low"} severity</span>
                    <span className="obs-tag">{popup.category.replace("_", " ")}</span>
                  </div>
                </div>
                <button className="toolbar-btn icon-only" onClick={() => setPopup(null)}><Icon name="x" size={14}/></button>
              </div>
              <div className="drawer-body">
                <h3 className="obs-headline">{popup.headline}</h3>
                <div className="obs-action">{popup.action}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
