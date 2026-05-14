"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { useChapter } from "../../_components/ChapterContext";
import { OBSERVATIONS, Observation } from "../../_components/mockdata";

function ObservationCard({ obs, onJump }: { obs: Observation; onJump: (o: Observation) => void }) {
  const sevLabel = obs.severity === "high" ? "High" : obs.severity === "med" ? "Medium" : "Low";
  const stateLabel = obs.state === "new" ? "New this week" : obs.state === "changed" ? "Changed" : "Standing";
  const stateClass = obs.state === "new" ? "new" : "state-inv";
  return (
    <div className="obs-card">
      <div className={`rail ${obs.severity}`}></div>
      <div className="obs-body">
        <div className="obs-meta">
          <span className={`obs-tag sev-${obs.severity}`}>{sevLabel} severity</span>
          <span className="obs-tag">{obs.category}</span>
          <span className={`obs-tag ${stateClass}`}>{stateLabel}</span>
        </div>
        <h3 className="obs-headline">{obs.headline}</h3>
        {obs.data && (
          <div className="obs-data">
            {obs.data.map((d, i) => (
              <div className="d" key={i}>
                <div className="d-label">{d.label}</div>
                <div className="d-val">{d.value}</div>
              </div>
            ))}
          </div>
        )}
        <div className="obs-action">
          <div className="obs-action-kicker">
            {obs.actionType === "mechanical" ? "Suggested next step"
            : obs.actionType === "analytical" ? "Worth investigating"
            : "Suggested investigation"}
          </div>
          {obs.action}
        </div>
        <div className="obs-foot">
          <span>{obs.timestamp}</span>
          <button className="card-link" onClick={() => onJump(obs)}>
            Show me where this came from → {obs.pageLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ObservationsPage() {
  const { client, pinObservation } = useChapter();
  const router = useRouter();
  const [view, setView] = useState<"current" | "history">("current");
  const [sevFilter, setSevFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [popup, setPopup] = useState<Observation | null>(null);

  const filtered = OBSERVATIONS.filter(o => {
    if (sevFilter !== "all" && o.severity !== sevFilter) return false;
    if (catFilter !== "all" && o.category !== catFilter) return false;
    if (actionFilter !== "all" && o.actionType !== actionFilter) return false;
    return true;
  });

  const categories = ["all", ...Array.from(new Set(OBSERVATIONS.map(o => o.category)))];

  const navigateToObs = (obs: Observation) => {
    pinObservation(obs);
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
        <div className="card" style={{ background: "var(--navy)", color: "white", border: "none", padding: "22px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18 }}>
            <div style={{ maxWidth: 720 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>
                How this page works
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                Chapter generates observations by running a fixed library of questions against your data each week. Findings are sorted by severity. Each card pairs the finding with a suggested investigation — never a directive. <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>About the question library →</a>
                <button type="button" className="hero-pill">
                  <Icon name="plus" size={11} />
                  <span>Submit a question for observation</span>
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>3</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>New this week</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>4</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>High severity</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>20</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(255,255,255,0.55)" }}>Active questions</div>
              </div>
            </div>
          </div>
        </div>

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
                  {[["all", "All severities"], ["high", "High"], ["med", "Medium"], ["low", "Low"]].map(([k, l]) => (
                    <button key={k} className={`dd-item ${sevFilter === k ? "active" : ""}`} onClick={() => { setSevFilter(k); close(); }}>
                      <span>{l}</span>{sevFilter === k && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
            <Dropdown align="left" width={220} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Category</span>
                <span style={{ fontWeight: 500 }}>{catFilter === "all" ? "All" : catFilter}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  {categories.map(c => (
                    <button key={c} className={`dd-item ${catFilter === c ? "active" : ""}`} onClick={() => { setCatFilter(c); close(); }}>
                      <span>{c === "all" ? "All categories" : c}</span>{catFilter === c && <span className="check"><Icon name="check" size={14}/></span>}
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
                  {[["all", "All"], ["mechanical", "Mechanical"], ["analytical", "Analytical"], ["strategic_prompting", "Strategic prompting"]].map(([k, l]) => (
                    <button key={k} className={`dd-item ${actionFilter === k ? "active" : ""}`} onClick={() => { setActionFilter(k); close(); }}>
                      <span>{l}</span>{actionFilter === k && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Showing {filtered.length} of {OBSERVATIONS.length} observations{view === "current" ? " for week of Nov 17" : ""}
          </div>
        </div>

        {view === "history" ? (
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">Observations history</h3>
              <div className="card-sub" style={{ marginTop: 3 }}>Click any row to view the full observation</div>
            </div>
            <div className="row-list" style={{ marginTop: 8 }}>
              <div className="lrow head" style={{ gridTemplateColumns: "120px 1fr 160px 110px" }}>
                <div>Severity</div>
                <div>Observation</div>
                <div>Category</div>
                <div>Week</div>
              </div>
              {["Week of Nov 17", "Week of Nov 10", "Week of Nov 3", "Week of Oct 27"].flatMap((wk, wi) => (
                OBSERVATIONS.slice(wi * 2, wi * 2 + 3).map(o => (
                  <div key={o.id + wi} className="lrow click" style={{ gridTemplateColumns: "120px 1fr 160px 110px" }} onClick={() => setPopup(o)}>
                    <div><span className={`obs-tag sev-${o.severity}`}>{o.severity === "high" ? "High" : o.severity === "med" ? "Medium" : "Low"}</span></div>
                    <div style={{ fontSize: 13 }}>{o.headline}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{o.category}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{wk.replace("Week of ", "")}</div>
                  </div>
                ))
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map(o => <ObservationCard key={o.id} obs={o} onJump={navigateToObs} />)}
            {filtered.length === 0 && (
              <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
                No observations match these filters.
              </div>
            )}
          </div>
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
                    <span className="obs-tag">{popup.category}</span>
                    {popup.state === "new"
                      ? <span className="obs-tag new">New this week</span>
                      : <span className="obs-tag">{popup.state === "changed" ? "Changed" : "Standing"}</span>}
                  </div>
                </div>
                <button className="toolbar-btn icon-only" onClick={() => setPopup(null)}><Icon name="x" size={14}/></button>
              </div>
              <div className="drawer-body">
                <h3 className="obs-headline">{popup.headline}</h3>
                {popup.data && (
                  <div className="obs-data">
                    {popup.data.map((d, i) => (
                      <div className="d" key={i}>
                        <div className="d-label">{d.label}</div>
                        <div className="d-val">{d.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="obs-action">
                  <div className="obs-action-kicker">
                    {popup.actionType === "mechanical" ? "Suggested next step"
                    : popup.actionType === "analytical" ? "Worth investigating"
                    : "Suggested investigation"}
                  </div>
                  {popup.action}
                </div>
                <div className="obs-foot">
                  <span>{popup.timestamp}</span>
                  <button className="card-link" onClick={() => { setPopup(null); navigateToObs(popup); }}>
                    Show me where this came from → {popup.pageLabel}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
