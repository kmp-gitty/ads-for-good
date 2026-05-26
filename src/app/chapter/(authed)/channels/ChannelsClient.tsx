"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Move } from "../../_components/Move";
import { Dropdown } from "../../_components/Dropdown";
import { RoleBar } from "../../_components/RoleBar";
import { useChapter } from "../../_components/ChapterContext";
import { fmtMoney, fmtNum } from "../../_components/format";
import { CHANNELS, type ChannelKey, type Kpi } from "../../_components/mockdata";
import type { ChannelRoleRow, ChannelAffinityRow } from "../../_lib/dashboard-rpc";

const CHANNEL_FALLBACK = { name: "Unknown", color: "#9CA0A8", short: "—" };

type Props = {
  roles: ChannelRoleRow[];
  rolesPrior: ChannelRoleRow[];
  affinity: ChannelAffinityRow[];
  summary: {
    total_orders:    number | null;
    total_revenue:   number | null;
    avg_order_value: number | null;
  } | null;
  journey: {
    total_journeys:      number | null;
    identified_journeys: number | null;
    pct_identified:      number | null;
  } | null;
  priorSummary: {
    total_orders:    number | null;
    total_revenue:   number | null;
    avg_order_value: number | null;
  } | null;
  priorJourney: {
    total_journeys:      number | null;
    identified_journeys: number | null;
    pct_identified:      number | null;
  } | null;
  clientKey: string;
  range: string;
};

type Dominant = "Closer" | "Opener" | "Middle" | "Generalist" | "Solo";

type ChannelView = {
  key: string;
  channel: { name: string; color: string; short: string };
  dist: { only: number; open: number; mid: number; close: number };
  dominant: Dominant;
  sentence: string;
  presence_pct: number;
  presence_move: number;
  revenue_touched: number;
  revenue_move: number;
  chapters: number;
  chapters_move: number;
  acquisition_pct: number;   // % of this channel's appearances in first-time-purchase chapters
  retention_pct: number;     // % in repeat-purchase chapters
};

function pctDelta(c: number, p: number): number {
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return 0;
  return ((c - p) / p) * 100;
}
function pctDeltaN(c: number | null | undefined, p: number | null | undefined): number | null {
  if (c == null || p == null) return null;
  const cN = Number(c), pN = Number(p);
  if (!Number.isFinite(cN) || !Number.isFinite(pN) || pN === 0) return null;
  return ((cN - pN) / pN) * 100;
}

// Decide the channel's dominant role label from its distribution.
//   - Solo:       only ≥ 60% (channel mostly converts alone)
//   - Generalist: spread between opener/mid/closer ≤ 12pp (no clear lead)
//   - else:       whichever of opener/mid/closer is highest
function dominantLabel(only: number, opener: number, mid: number, closer: number): Dominant {
  if (only >= 60) return "Solo";
  const triad = [opener, mid, closer];
  const max = Math.max(...triad), min = Math.min(...triad);
  if (max - min <= 12) return "Generalist";
  if (closer === max) return "Closer";
  if (opener === max) return "Opener";
  return "Middle";
}

// Hand-written role sentence for the card view. Uses the dominant label so it
// stays in sync. Adds a "solo" clause when Only ≥ 25% (significant single-touch
// share that would otherwise be invisible in the dominant-role sentence).
const SOLO_CLAUSE_THRESHOLD = 25;

function soloClause(only: number): string {
  if (only < SOLO_CLAUSE_THRESHOLD) return "";
  if (only >= 50) return ` It's also the only touchpoint a striking ${only}% of the time.`;
  if (only >= 35) return ` That said, it's the only channel in the path a notable ${only}% of the time.`;
  return ` It also acts as the sole channel ${only}% of the time.`;
}

function roleSentence(channelName: string, dom: Dominant, dist: ChannelView["dist"]): string {
  switch (dom) {
    case "Solo":
      return `${channelName} converts on its own ${dist.only}% of the time — most chapters where it appears have no other channel in the path.`;
    case "Closer":
      return `${channelName} closes ${dist.close}% of paths it appears in — most often the last touch before purchase.${soloClause(dist.only)}`;
    case "Opener":
      return `${channelName} opens ${dist.open}% of paths it appears in — frequently the first session a customer takes.${soloClause(dist.only)}`;
    case "Middle":
      return `${channelName} sits in middle positions ${dist.mid}% of the time, assisting conversions more than opening or closing them.${soloClause(dist.only)}`;
    case "Generalist":
      return `${channelName} plays multiple roles — opening (${dist.open}%), assisting (${dist.mid}%), and closing (${dist.close}%) in roughly equal share.${soloClause(dist.only)}`;
  }
}

// Co-occurrence affinity grid. Cell = "% of chapters with row channel that
// ALSO contain col channel". Asymmetric by design — direct ⇄ email differ
// because direct has many solo chapters but email rarely appears alone.
function AffinityMatrix({
  affinity, sortedChannels,
}: {
  affinity: ChannelAffinityRow[];
  sortedChannels: ChannelView[];
}) {
  // Use channel order from the sorted main table for visual consistency.
  const channels = sortedChannels.map(c => c.key);
  const lookup = new Map<string, number>();
  for (const r of affinity) {
    lookup.set(`${r.src}|${r.dst}`, Number(r.affinity_pct ?? 0));
  }
  // Pick cell background color intensity by affinity value (0–100). Uses the
  // accent color at varying alpha; gives the grid a clear visual hot-spot read.
  const cellBg = (pct: number) => {
    if (pct === 0) return "transparent";
    const alpha = Math.min(0.65, 0.08 + (pct / 100) * 0.6);
    return `rgba(63, 102, 153, ${alpha})`; // navy-ish
  };
  const cellTextColor = (pct: number) => pct > 50 ? "#fff" : "var(--ink)";

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Channel co-occurrence affinity</h3>
          <div className="card-sub">Read as: <em>“of all chapters where ROW appears, what % also contain COLUMN?”</em> Asymmetric — direct→email and email→direct differ because direct has many solo chapters but email rarely appears alone.</div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="t" style={{ tableLayout: "fixed", minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ width: 220, textAlign: "left", fontWeight: 500, color: "var(--ink-3)", fontSize: 11, textTransform: "none", letterSpacing: 0, borderBottom: "2px solid #000", borderRight: "2px solid #000" }}>
                When <span style={{ color: "#C2691E", fontWeight: 600 }}>[row]</span> channel appears, <span style={{ color: "#6B7280", fontWeight: 600 }}>[column]</span> channel appears…
              </th>
              {channels.map(k => {
                const cv = sortedChannels.find(c => c.key === k)!;
                return (
                  <th key={k} className="num" style={{ minWidth: 80, background: "#F3F4F6", borderBottom: "2px solid #000" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 18, height: 18, background: cv.channel.color, color: "white", display: "grid", placeItems: "center", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                        {cv.channel.short}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500, textAlign: "center", color: "#4B5563" }}>{cv.channel.name}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {channels.map(srcKey => {
              const srcView = sortedChannels.find(c => c.key === srcKey)!;
              return (
                <tr key={srcKey}>
                  <td style={{ background: "#FDF1E6", borderRight: "2px solid #000" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 18, height: 18, background: srcView.channel.color, color: "white", display: "grid", placeItems: "center", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                        {srcView.channel.short}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#9A4F15" }}>{srcView.channel.name}</span>
                    </div>
                  </td>
                  {channels.map(dstKey => {
                    if (srcKey === dstKey) {
                      return (
                        <td key={dstKey} className="num" style={{ background: "var(--bg-2)", color: "var(--ink-4)" }}>—</td>
                      );
                    }
                    const pct = lookup.get(`${srcKey}|${dstKey}`) ?? 0;
                    return (
                      <td key={dstKey} className="num"
                          style={{ background: cellBg(pct), color: cellTextColor(pct), fontWeight: pct >= 50 ? 600 : 400 }}
                          title={`${srcView.channel.name} → ${sortedChannels.find(c => c.key === dstKey)?.channel.name}: ${pct.toFixed(1)}% co-occurrence`}>
                        {pct > 0 ? `${pct.toFixed(0)}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ChannelsClient({
  roles, rolesPrior, affinity, summary, journey, priorSummary, priorJourney,
  clientKey: _clientKey, range: _range,
}: Props) {
  const { client } = useChapter();
  const sp = useSearchParams();
  const showDelta = (sp.get("compare") || "prior") !== "none";

  const [sortBy, setSortBy] = useState<"presence" | "revenue" | "movement">("presence");
  const [view, setView] = useState<"cards" | "matrix">("cards");

  // Build O(1) prior lookup by channel key
  const priorByKey = useMemo(() => {
    const m = new Map<string, ChannelRoleRow>();
    for (const r of rolesPrior) m.set(r.channel, r);
    return m;
  }, [rolesPrior]);

  const data: ChannelView[] = useMemo(() => roles.map(r => {
    const ch    = CHANNELS[r.channel as ChannelKey] ?? { ...CHANNEL_FALLBACK, name: r.channel };
    const prior = priorByKey.get(r.channel);

    const only   = Math.round(Number(r.only_pct   ?? 0));
    const open   = Math.round(Number(r.opener_pct ?? 0));
    const mid    = Math.round(Number(r.mid_pct    ?? 0));
    const close  = Math.round(Number(r.closer_pct ?? 0));
    const dist   = { only, open, mid, close };

    const presence  = Number(r.presence_pct    ?? 0);
    const revenue   = Number(r.revenue_touched ?? 0);
    const chapters  = Number(r.chapters        ?? 0);

    const presence_move = prior ? Number(r.presence_pct ?? 0) - Number(prior.presence_pct ?? 0) : 0;
    const revenue_move  = prior ? pctDelta(revenue, Number(prior.revenue_touched ?? 0))         : 0;
    const chapters_move = prior ? pctDelta(chapters, Number(prior.chapters ?? 0))               : 0;

    const dom = dominantLabel(only, open, mid, close);

    const acq = Number(r.acquisition_chapters ?? 0);
    const ret = Number(r.retention_chapters   ?? 0);
    const totalAcqRet = acq + ret;
    const acquisition_pct = totalAcqRet > 0 ? (acq / totalAcqRet) * 100 : 0;
    const retention_pct   = totalAcqRet > 0 ? (ret / totalAcqRet) * 100 : 0;

    return {
      key: r.channel,
      channel: ch,
      dist,
      dominant: dom,
      sentence: roleSentence(ch.name, dom, dist),
      presence_pct: presence,
      presence_move,
      revenue_touched: revenue,
      revenue_move,
      chapters,
      chapters_move,
      acquisition_pct,
      retention_pct,
    };
  }), [roles, priorByKey]);

  const sorted = useMemo(() => {
    const arr = [...data];
    if (sortBy === "presence") arr.sort((a, b) => b.presence_pct    - a.presence_pct);
    if (sortBy === "revenue")  arr.sort((a, b) => b.revenue_touched - a.revenue_touched);
    if (sortBy === "movement") arr.sort((a, b) => Math.abs(b.presence_move) - Math.abs(a.presence_move));
    return arr;
  }, [data, sortBy]);

  // KPI strip
  const ordersDisplay   = summary?.total_orders    != null ? fmtNum(Number(summary.total_orders))            : "—";
  const revenueDisplay  = summary?.total_revenue   != null ? fmtMoney(Number(summary.total_revenue))          : "—";
  const aovDisplay      = summary?.avg_order_value != null ? "$" + Number(summary.avg_order_value).toFixed(2) : "—";
  const journeysDisplay = journey?.total_journeys  != null ? fmtNum(Number(journey.total_journeys))           : "—";
  const identifiedPct   = journey?.pct_identified  != null ? (Number(journey.pct_identified) * 100).toFixed(1) + "%" : "—";
  const moveOrders     = pctDeltaN(summary?.total_orders,    priorSummary?.total_orders);
  const moveRevenue    = pctDeltaN(summary?.total_revenue,   priorSummary?.total_revenue);
  const moveAov        = pctDeltaN(summary?.avg_order_value, priorSummary?.avg_order_value);
  const moveJourneys   = pctDeltaN(journey?.total_journeys,  priorJourney?.total_journeys);
  const moveIdentified = pctDeltaN(journey?.pct_identified,  priorJourney?.pct_identified);
  const kpis: Kpi[] = [
    { label: "Orders",       value: ordersDisplay,    move: moveOrders     ?? 0, good: moveOrders     != null && moveOrders     >= 0, semantic: "up-good" },
    { label: "Revenue",      value: revenueDisplay,   move: moveRevenue    ?? 0, good: moveRevenue    != null && moveRevenue    >= 0, semantic: "up-good" },
    { label: "AOV",          value: aovDisplay,       move: moveAov        ?? 0, good: moveAov        != null && moveAov        >= 0, semantic: "up-good" },
    { label: "Journeys",     value: journeysDisplay,  move: moveJourneys   ?? 0, good: null, semantic: "neutral" },
    { label: "% Identified", value: identifiedPct,    move: moveIdentified ?? 0, good: moveIdentified != null && moveIdentified >= 0, semantic: "up-good" },
  ];

  const empty = sorted.length === 0;

  return (
    <>
      <TopBar
        title="Channel Roles"
        subtitle={`What each channel does in your converting paths · ${client.name}`}
        kpis={kpis}
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
                  {([
                    ["presence", "Presence", "% of converting chapters this channel appears in"],
                    ["revenue",  "Revenue touched", "Total revenue across chapters where it appears"],
                    ["movement", "Movement", "Largest period-over-period change in presence"],
                  ] as const).map(([k, l, desc]) => (
                    <button key={k} className={`dd-item ${sortBy === k ? "active" : ""}`} onClick={() => { setSortBy(k); close(); }} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "10px 10px" }}>
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
          </div>
          <div className="role-legend">
            <span><span className="sw" style={{ background: "var(--navy)" }}></span>Only-touch</span>
            <span><span className="sw" style={{ background: "#6F86A8" }}></span>Opener</span>
            <span><span className="sw" style={{ background: "#BFAE85" }}></span>Mid</span>
            <span><span className="sw" style={{ background: "var(--accent)" }}></span>Closer</span>
          </div>
        </div>

        {empty ? (
          <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 40 }}>
            No channel data in this window. Try a longer date range.
          </div>
        ) : view === "cards" ? (
          <div className="role-grid">
            {sorted.map(r => {
              const pillClass =
                r.dominant === "Closer"    ? "closer"
                : r.dominant === "Opener"  ? "opener"
                : r.dominant === "Middle"  ? "middle"
                : r.dominant === "Solo"    ? "closer"
                : "generalist";
              return (
                <div key={r.key} className="role-card">
                  <div className="top">
                    <div className="ch">
                      <span className="sw" style={{ background: r.channel.color }}>{r.channel.short}</span>
                      <div>
                        <h4>{r.channel.name}</h4>
                        <div className="sub">{r.presence_pct.toFixed(1)}% of converting chapters</div>
                      </div>
                    </div>
                    <span className={`role-pill ${pillClass}`}>
                      {r.dominant === "Closer"     ? "Primarily a closer"
                       : r.dominant === "Opener"   ? "Primarily an opener"
                       : r.dominant === "Middle"   ? "Primarily a middle channel"
                       : r.dominant === "Solo"     ? "Solo channel"
                       : "Generalist"}
                    </span>
                  </div>

                  <div>
                    <RoleBar dist={r.dist} showTooltip={true} />
                    <div className="role-legend" style={{ marginTop: 8, justifyContent: "space-between" }}>
                      <span><span className="sw" style={{ background: "var(--navy)" }}></span>Only {r.dist.only}%</span>
                      <span><span className="sw" style={{ background: "#6F86A8" }}></span>Opener {r.dist.open}%</span>
                      <span><span className="sw" style={{ background: "#BFAE85" }}></span>Mid {r.dist.mid}%</span>
                      <span><span className="sw" style={{ background: "var(--accent)" }}></span>Closer {r.dist.close}%</span>
                    </div>
                  </div>

                  <div className="role-sentence">{r.sentence}</div>

                  <div className="role-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    <div>
                      <div className="role-stat-label">Presence</div>
                      <div className="role-stat-val" style={{ fontSize: 13 }}>
                        {r.presence_pct.toFixed(1)}%
                        {showDelta && <Move value={r.presence_move} semantic="up-good" />}
                      </div>
                    </div>
                    <div>
                      <div className="role-stat-label">Revenue</div>
                      <div className="role-stat-val" style={{ fontSize: 13 }}>
                        {fmtMoney(r.revenue_touched)}
                        {showDelta && <Move value={r.revenue_move} semantic="up-good" />}
                      </div>
                    </div>
                    <div>
                      <div className="role-stat-label">Chapters</div>
                      <div className="role-stat-val" style={{ fontSize: 13 }}>
                        {fmtNum(r.chapters)}
                        {showDelta && <Move value={r.chapters_move} semantic="up-good" />}
                      </div>
                    </div>
                    <div>
                      <div className="role-stat-label">New · Ret</div>
                      <div className="role-stat-val" style={{ fontSize: 13, lineHeight: 1.3 }}>
                        <span style={{ color: "var(--accent)" }}>{r.acquisition_pct.toFixed(0)}%</span>
                        <span style={{ color: "var(--ink-4)", margin: "0 3px" }}>/</span>
                        <span style={{ color: "var(--ink-2)" }}>{r.retention_pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
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
                    <th className="num">Revenue touched</th>
                    {showDelta && <th className="num">Move</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => (
                    <tr key={r.key}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 22, height: 22, background: r.channel.color, color: "white", display: "grid", placeItems: "center", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{r.channel.short}</span>
                          <span style={{ fontWeight: 500 }}>{r.channel.name}</span>
                        </div>
                      </td>
                      <td style={{ minWidth: 180 }}><RoleBar dist={r.dist} showTooltip={true} /></td>
                      <td className="num">{r.dist.only}%</td>
                      <td className="num">{r.dist.open}%</td>
                      <td className="num">{r.dist.mid}%</td>
                      <td className="num">{r.dist.close}%</td>
                      <td className="num">{r.presence_pct.toFixed(1)}%</td>
                      <td className="num">{fmtMoney(r.revenue_touched)}</td>
                      {showDelta && <td className="num"><Move value={r.presence_move} semantic="up-good" /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AffinityMatrix affinity={affinity} sortedChannels={sorted} />
          </>
        )}
      </div>
    </>
  );
}
