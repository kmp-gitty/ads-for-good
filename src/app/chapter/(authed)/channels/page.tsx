"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Move } from "../../_components/Move";
import { Dropdown } from "../../_components/Dropdown";
import { RoleBar } from "../../_components/RoleBar";
import { useChapter } from "../../_components/ChapterContext";
import { CHANNEL_ROLES, CHANNELS, ChannelRole } from "../../_components/mockdata";

function ChannelRoleCard({ role }: { role: ChannelRole }) {
  const c = CHANNELS[role.key];
  const pillClass =
    role.dominant === "Closer" ? "closer"
    : role.dominant === "Opener" ? "opener"
    : role.dominant === "Middle" ? "middle"
    : "generalist";
  return (
    <div className="role-card">
      <div className="top">
        <div className="ch">
          <span className="sw" style={{ background: c.color }}>{c.short}</span>
          <div>
            <h4>{c.name}</h4>
            <div className="sub">{role.presence.value} of converting chapters</div>
          </div>
        </div>
        <span className={`role-pill ${pillClass}`}>Primarily a {role.dominant}</span>
      </div>

      <div>
        <RoleBar dist={role.role} showTooltip={true} />
        <div className="role-legend" style={{ marginTop: 8, justifyContent: "space-between" }}>
          <span><span className="sw" style={{ background: "var(--navy)" }}></span>Only {role.role.only}%</span>
          <span><span className="sw" style={{ background: "#6F86A8" }}></span>Opener {role.role.open}%</span>
          <span><span className="sw" style={{ background: "#BFAE85" }}></span>Mid {role.role.mid}%</span>
          <span><span className="sw" style={{ background: "var(--accent)" }}></span>Closer {role.role.close}%</span>
        </div>
      </div>

      <div className="role-sentence">{role.sentence}</div>

      <div className="role-stats">
        <div>
          <div className="role-stat-label">Presence</div>
          <div className="role-stat-val">{role.presence.value} <Move value={role.presence.move} semantic="up-good" /></div>
        </div>
        <div>
          <div className="role-stat-label">Revenue touched</div>
          <div className="role-stat-val">{role.revenue.value} <Move value={role.revenue.move} semantic="up-good" /></div>
        </div>
        <div>
          <div className="role-stat-label">Chapters</div>
          <div className="role-stat-val">{role.chapters.value} <Move value={role.chapters.move} semantic="up-good" /></div>
        </div>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  const { client } = useChapter();
  const [sortBy, setSortBy] = useState<"presence" | "revenue" | "movement">("presence");
  const [view, setView] = useState<"cards" | "matrix">("cards");

  const sorted = useMemo(() => {
    const arr = [...CHANNEL_ROLES];
    if (sortBy === "presence") arr.sort((a, b) => parseFloat(b.presence.value) - parseFloat(a.presence.value));
    if (sortBy === "revenue") arr.sort((a, b) => parseFloat(b.revenue.value.replace(/[^0-9.]/g, "")) - parseFloat(a.revenue.value.replace(/[^0-9.]/g, "")));
    if (sortBy === "movement") arr.sort((a, b) => b.presence.move - a.presence.move);
    return arr;
  }, [sortBy]);

  return (
    <>
      <TopBar
        title="Channel Roles"
        subtitle={`What each channel does in your converting paths · ${client.name}`}
        showModel={true}
      />
      <div className="content">
        <div className="filter-bar" style={{ justifyContent: "space-between" }}>
          <div className="filter-bar">
            <div className="toggle-group">
              <button className={view === "cards" ? "active" : ""} onClick={() => setView("cards")}>Cards</button>
              <button className={view === "matrix" ? "active" : ""} onClick={() => setView("matrix")}>Matrix</button>
            </div>
            <Dropdown align="left" width={280} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Sort</span>
                <span style={{ fontWeight: 500 }}>{sortBy === "presence" ? "Presence" : sortBy === "revenue" ? "Revenue touched" : "Movement"}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  <div className="dd-label">Sort channels by</div>
                  {[
                    ["presence", "Presence", "% of converting chapters this channel appears in"],
                    ["revenue", "Revenue touched", "Total revenue across chapters where it appears"],
                    ["movement", "Movement", "Largest period-over-period change in presence"],
                  ].map(([k, l, desc]) => (
                    <button key={k} className={`dd-item ${sortBy === k ? "active" : ""}`} onClick={() => { setSortBy(k as any); close(); }} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "10px 10px" }}>
                      <span style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                        <span style={{ fontWeight: 500 }}>{l}</span>
                        {sortBy === k && <span className="check"><Icon name="check" size={14}/></span>}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{desc}</span>
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
            <button className="toolbar-btn"><Icon name="filter" size={13}/> Filter</button>
          </div>
          <div className="role-legend">
            <span><span className="sw" style={{ background: "var(--navy)" }}></span>Only-touch</span>
            <span><span className="sw" style={{ background: "#6F86A8" }}></span>Opener</span>
            <span><span className="sw" style={{ background: "#BFAE85" }}></span>Mid</span>
            <span><span className="sw" style={{ background: "var(--accent)" }}></span>Closer</span>
          </div>
        </div>

        {view === "cards" ? (
          <div className="role-grid">
            {sorted.map(r => <ChannelRoleCard key={r.key} role={r} />)}
          </div>
        ) : (
          <div className="card flush">
            <table className="t">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Role distribution</th>
                  <th className="num">Only</th>
                  <th className="num">Opener</th>
                  <th className="num">Mid</th>
                  <th className="num">Closer</th>
                  <th className="num">Presence</th>
                  <th className="num">Revenue</th>
                  <th className="num">Move</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const c = CHANNELS[r.key];
                  return (
                    <tr key={r.key}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 22, height: 22, background: c.color, color: "white", display: "grid", placeItems: "center", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{c.short}</span>
                          <span style={{ fontWeight: 500 }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ minWidth: 180 }}><RoleBar dist={r.role} showTooltip={true} /></td>
                      <td className="num">{r.role.only}%</td>
                      <td className="num">{r.role.open}%</td>
                      <td className="num">{r.role.mid}%</td>
                      <td className="num">{r.role.close}%</td>
                      <td className="num">{r.presence.value}</td>
                      <td className="num">{r.revenue.value}</td>
                      <td className="num"><Move value={r.presence.move} semantic="up-good" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
