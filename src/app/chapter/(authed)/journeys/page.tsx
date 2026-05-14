"use client";

import React, { useState } from "react";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { ChannelChip } from "../../_components/ChannelChip";
import { useChapter } from "../../_components/ChapterContext";
import { JOURNEYS, JOURNEY_DETAIL, CHANNELS, JourneyEvent } from "../../_components/mockdata";

function ChapterEventList({ events }: { events: JourneyEvent[] }) {
  const chapters: Record<number, JourneyEvent[]> = {};
  events.forEach(e => {
    if (!chapters[e.chapter]) chapters[e.chapter] = [];
    chapters[e.chapter].push(e);
  });

  return (
    <div className="journey-events">
      {Object.entries(chapters).map(([ci, evts]) => {
        const start = evts[0].day;
        const end = evts[evts.length - 1].day;
        const duration = end - start;
        const closed = evts.some(e => e.boundary);
        const value = evts.find(e => e.boundary)?.value;
        return (
          <div key={ci} className="journey-chap">
            <div className="journey-chap-head">
              <div className="journey-chap-title">Chapter {ci} · {evts.length} events</div>
              <div className="journey-chap-meta">
                Day <span className="em">{start}</span> — Day <span className="em">{end}</span> · {duration} day span
                {closed && value && <> · Closed at <span className="em">${value.toFixed(2)}</span></>}
                {!closed && <> · Open</>}
              </div>
            </div>
            <div className="journey-evt-list">
              {evts.map((e, i) => {
                const c = CHANNELS[e.channel];
                return (
                  <div key={i} className={`journey-evt ${e.identify ? "identify" : ""}`}>
                    <div className="journey-evt-day">Day {e.day}</div>
                    <div className={`journey-evt-marker ${e.boundary ? "boundary" : ""}`} style={{ background: c.color }}>
                      {e.boundary ? "★" : c.short[0]}
                    </div>
                    <div className="journey-evt-label">
                      <span className="em">{c.name}</span>
                      <span className="journey-evt-type">· {e.label}</span>
                    </div>
                    <div className="journey-evt-amount">
                      {e.boundary && e.value ? "+$" + e.value.toFixed(2) : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function JourneysPage() {
  const { client } = useChapter();
  const [selected, setSelected] = useState("j1");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "converted" | "open" | "stalled">("all");
  const [query, setQuery] = useState("");

  const filtered = JOURNEYS.filter(j => {
    if (outcomeFilter !== "all" && j.outcome !== outcomeFilter) return false;
    if (query && !j.identity.includes(query)) return false;
    return true;
  });

  const detail = JOURNEY_DETAIL;

  return (
    <>
      <TopBar
        title="Customer Journeys"
        subtitle={`Identity-resolved receipts for the patterns above · ${client.name}`}
      />
      <div className="content compact">
        <div className="filter-bar" style={{ justifyContent: "space-between" }}>
          <div className="filter-bar">
            <input className="input search" placeholder="Search by identity key, customer ID, journey ID" value={query} onChange={e => setQuery(e.target.value)} />
            <Dropdown align="left" width={200} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Outcome</span>
                <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{outcomeFilter === "all" ? "All" : outcomeFilter}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  {(["all", "converted", "open", "stalled"] as const).map(k => (
                    <button key={k} className={`dd-item ${outcomeFilter === k ? "active" : ""}`} onClick={() => { setOutcomeFilter(k); close(); }}>
                      <span style={{ textTransform: "capitalize" }}>{k === "all" ? "All outcomes" : k}</span>
                      {outcomeFilter === k && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
            <button className="toolbar-btn"><Icon name="filter" size={13}/> More filters</button>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{filtered.length} identities</div>
        </div>

        <div className="journeys-layout">
          <div className="card flush" style={{ maxHeight: 720, overflow: "auto" }}>
            <table className="t">
              <thead style={{ position: "sticky", top: 0, background: "var(--panel)", zIndex: 1 }}>
                <tr>
                  <th>Identity</th>
                  <th className="num">Chapters</th>
                  <th className="num">Touches</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(j => (
                  <tr key={j.id}
                      style={{ cursor: "pointer", background: selected === j.id ? "var(--bg-2)" : "transparent" }}
                      onClick={() => setSelected(j.id)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className={`role-pill ${j.outcome === "converted" ? "closer" : j.outcome === "open" ? "opener" : "middle"}`} style={{ fontSize: 9 }}>
                          {j.outcome}
                        </span>
                      </div>
                      <div>
                        <span className="hash">{j.identity}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Last activity · {j.last}</div>
                    </td>
                    <td className="num">{j.chapters}</td>
                    <td className="num">{j.touches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: "22px 26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div className="eyebrow">Canonical identity</div>
                <h3 style={{ margin: "4px 0 4px", fontSize: 18, fontWeight: 600, letterSpacing: "-.01em", display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="hash" style={{ fontSize: 13 }}>{detail.identity}</span>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>Customer <span className="mono">{detail.customerId}</span></span>
                </h3>
                <div className="muted" style={{ fontSize: 12 }}>
                  First seen {detail.firstSeen} · Identified {detail.resolved}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="toolbar-btn"><Icon name="receipt" size={13}/> Export receipt</button>
              </div>
            </div>

            <div className="role-stats" style={{ paddingTop: 0, borderTop: "none", gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 22 }}>
              <div><div className="role-stat-label">Chapters</div><div className="role-stat-val">{detail.chapters}</div></div>
              <div><div className="role-stat-label">Events</div><div className="role-stat-val">{detail.totalEvents}</div></div>
              <div><div className="role-stat-label">Outcome</div><div className="role-stat-val" style={{ color: "var(--good)" }}>{detail.outcome}</div></div>
              <div><div className="role-stat-label">Stitched IDs</div><div className="role-stat-val">{detail.stitched.length}</div></div>
            </div>

            <div>
              <div className="h-section" style={{ marginBottom: 12 }}>Event timeline · 68 days · 3 chapters</div>
              <ChapterEventList events={detail.events} />
            </div>

            <div className="journeys-detail-grid">
              <div>
                <div className="h-section">Attribution under each model</div>
                <div className="row-list" style={{ marginTop: 10 }}>
                  {[
                    { model: "First Touch",      ch: "meta"   as const, pct: 100, rev: 494.50 },
                    { model: "Last Touch",       ch: "direct" as const, pct: 100, rev: 494.50 },
                    { model: "Linear",           ch: "split"  as const, pct: null, rev: 494.50 },
                    { model: "J-Shape (custom)", ch: "split"  as const, pct: null, rev: 494.50 },
                  ].map((row, i) => (
                    <div key={i} className="lrow" style={{ gridTemplateColumns: "140px 1fr 80px" }}>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>{row.model}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                        {row.ch === "split" ? "Distributed across 5 channels"
                        : <><ChannelChip ch={row.ch} /> {row.pct ? `${row.pct}%` : ""}</>}
                      </div>
                      <div className="lrow-num" style={{ textAlign: "right" }}>${row.rev.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="h-section">Identity resolution</div>
                <div style={{ marginTop: 10, padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line-2)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {detail.stitched.map((id, i) => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 50, background: "var(--accent)" }}></span>
                        <span className="mono">{id}</span>
                        {i === 0 && <span className="muted">first seen Sep 14</span>}
                        {i === 1 && <span className="muted">device match Sep 16</span>}
                        {i === 2 && <span className="muted">identified Sep 17</span>}
                      </div>
                    ))}
                  </div>
                  <div className="callout" style={{ marginTop: 12, fontSize: 12 }}>
                    Three raw identities stitched into one canonical identity using deterministic identifier match + cross-device probabilistic match.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
