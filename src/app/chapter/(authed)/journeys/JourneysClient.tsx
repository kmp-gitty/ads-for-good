"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { PathRender } from "../../_components/ChannelChip";
import { useChapter } from "../../_components/ChapterContext";
import { fmtMoney, fmtNum } from "../../_components/format";
import { CHANNELS, type ChannelKey } from "../../_components/mockdata";
import type {
  JourneysStatsRow, JourneysListRow,
  JourneyDetailChapterRow, JourneyDetailEventRow, JourneyDetailAliasRow,
} from "../../_lib/dashboard-rpc";

type Props = {
  stats:             JourneysStatsRow | null;
  list:              JourneysListRow[];
  selectedIdentity:  string | null;
  chapters:          JourneyDetailChapterRow[];
  events:            JourneyDetailEventRow[];
  aliases:           JourneyDetailAliasRow[];
  clientKey:         string;
  range:             string;
  action:            string;  // 'all' | 'identify' | 'add_to_cart' | ...
  outcome:           string;  // 'all' | 'converted' | 'open'
  boundaryEvent:     string;  // from chapter_config.clients (e.g. 'purchase' or 'lead_submission')
};

// Curated action filter — matches user-friendly labels to underlying event_name
// values that lifecycle_chapters_snapshot exposes. Order follows the natural
// top-to-bottom funnel a marketer thinks in. The boundary action row is
// per-client (e.g. 'purchase' for ecommerce; 'lead_submission' for B2B).
function buildActionOptions(boundaryEvent: string): { value: string; label: string }[] {
  const labelize = (ev: string) =>
    ev.split(/[_\s]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  return [
    { value: "all",          label: "All actions" },
    { value: "page_view",    label: "Page view" },
    { value: "add_to_cart",  label: "Add to cart" },
    { value: "view_cart",    label: "Cart View" },
    { value: "identify",     label: "Identify / form fill" },
    { value: boundaryEvent,  label: labelize(boundaryEvent) },
  ];
}

function buildOutcomeOptions(boundaryEvent: string): { value: string; label: string }[] {
  const friendly = boundaryEvent.replace(/_/g, " ");
  return [
    { value: "all",       label: "All outcomes" },
    { value: "converted", label: "Converted" },
    { value: "open",      label: `Open (no ${friendly} yet)` },
  ];
}

// Truncate canonical_identity_key for display so operators don't accidentally
// memorize/screenshot full hashes. Keeps prefix + first 8 chars of hash.
function truncateIdentity(key: string): string {
  if (key.length <= 24) return key;
  const colonIdx = key.indexOf(":");
  if (colonIdx === -1) return key.slice(0, 16) + "…";
  const prefix = key.slice(0, colonIdx + 1);
  const tail   = key.slice(colonIdx + 1);
  return `${prefix}${tail.slice(0, 8)}…`;
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTimeShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Compact human duration between two ISO timestamps (e.g. "2m", "45s", "1h").
function fmtCompactSpan(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return "—";
  if (ms < 60_000)       return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000)    return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000)   return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

// Collapse consecutive same-event runs into single grouped rows so the
// timeline doesn't blow up with 50+ near-identical page_view entries.
// Purchases (is_boundary) always stay as their own row.
type EventRun = {
  event_name: string;
  count: number;
  first_ts: string;
  last_ts: string;
  is_boundary: boolean;
};

function runLengthEvents(events: JourneyDetailEventRow[]): EventRun[] {
  const runs: EventRun[] = [];
  for (const e of events) {
    const prev = runs[runs.length - 1];
    if (prev && prev.event_name === e.event_name && !prev.is_boundary && !e.is_boundary) {
      prev.count += 1;
      prev.last_ts = e.event_ts;
    } else {
      runs.push({
        event_name: e.event_name,
        count: 1,
        first_ts: e.event_ts,
        last_ts: e.event_ts,
        is_boundary: e.is_boundary,
      });
    }
  }
  return runs;
}

// Map event_name → human label for the timeline
const EVENT_LABEL: Record<string, string> = {
  page_view:   "Page view",
  add_to_cart: "Add to cart",
  view_cart:   "Cart View",
  identify:    "Identify / form fill",
  purchase:    "Purchase",
};

// Pick a chip color for each event_name. Falls back to neutral gray.
const EVENT_COLOR: Record<string, string> = {
  page_view:   "#6F86A8",
  identify:    "#BFAE85",
  add_to_cart: "#5C8B6F",
  view_cart:   "#9B7BB8",
  purchase:    "#E36410",
};

export default function JourneysClient({
  stats, list, selectedIdentity, chapters, events, aliases,
  clientKey: _clientKey, range: _range, action, outcome, boundaryEvent,
}: Props) {
  const { client } = useChapter();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const ACTION_OPTIONS  = buildActionOptions(boundaryEvent);
  const OUTCOME_OPTIONS = buildOutcomeOptions(boundaryEvent);

  // ── URL update helper. Preserves existing params, replaces one key.
  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "all") next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }
  function selectIdentity(id: string) {
    updateParam("identity", id);
  }

  const selectedRow = list.find(r => r.canonical_identity_key === selectedIdentity);

  // Per-chapter expand state. Default = all collapsed (just header summary).
  // Resets when the selected identity changes so we don't carry stale ids over.
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  useEffect(() => { setExpandedChapters(new Set()); }, [selectedIdentity]);
  const toggleChapter = (chId: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chId)) next.delete(chId);
      else next.add(chId);
      return next;
    });
  };
  const allChaptersExpanded = chapters.length > 0 && chapters.every(c => expandedChapters.has(c.chapter_id));
  const toggleAllChapters = () => {
    if (allChaptersExpanded) setExpandedChapters(new Set());
    else setExpandedChapters(new Set(chapters.map(c => c.chapter_id)));
  };
  const actionLabel  = ACTION_OPTIONS.find(a => a.value === action)?.label  ?? "All actions";
  const outcomeLabel = OUTCOME_OPTIONS.find(o => o.value === outcome)?.label ?? "All outcomes";

  // Group events by chapter for the timeline
  const eventsByChapter = new Map<number, JourneyDetailEventRow[]>();
  for (const e of events) {
    if (!eventsByChapter.has(e.chapter_id)) eventsByChapter.set(e.chapter_id, []);
    eventsByChapter.get(e.chapter_id)!.push(e);
  }

  const isEmpty = list.length === 0;

  return (
    <>
      <TopBar
        title="Customer Journeys"
        subtitle={`Identity-resolved customer cohorts · ${client.name}`}
      />
      <div className="content compact">
        {/* ── Summary stats card ─────────────────────────────────────────── */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
            <SummaryStat label="Identities matching" value={stats?.total_identities != null ? fmtNum(Number(stats.total_identities)) : "—"} foot={actionLabel === "All actions" ? "in selected window" : `did "${actionLabel.toLowerCase()}"`} />
            <SummaryStat label="Converted" value={stats?.converted_count != null ? fmtNum(Number(stats.converted_count)) : "—"} foot={stats?.pct_converted != null ? `${Number(stats.pct_converted).toFixed(1)}% of cohort` : "—"} />
            <SummaryStat label="Total LTV" value={stats?.total_ltv != null ? fmtMoney(Number(stats.total_ltv)) : "—"} foot="lifetime revenue · cohort" />
            <SummaryStat label="Avg LTV" value={stats?.avg_ltv != null ? fmtMoney(Number(stats.avg_ltv)) : "—"} foot="per identity, including $0" />
            <SummaryStat label="Median LTV" value={stats?.median_ltv != null ? fmtMoney(Number(stats.median_ltv)) : "—"} foot="50% above / 50% below" />
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div className="filter-bar" style={{ justifyContent: "space-between" }}>
          <div className="filter-bar">
            <Dropdown align="left" width={240} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Action</span>
                <span style={{ fontWeight: 500 }}>{actionLabel}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  <div className="dd-label">Action performed in window</div>
                  {ACTION_OPTIONS.map(opt => (
                    <button key={opt.value} className={`dd-item ${action === opt.value ? "active" : ""}`} onClick={() => { updateParam("action", opt.value); close(); }}>
                      <span>{opt.label}</span>
                      {action === opt.value && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
            <Dropdown align="left" width={240} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Outcome</span>
                <span style={{ fontWeight: 500 }}>{outcomeLabel}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  <div className="dd-label">Conversion status</div>
                  {OUTCOME_OPTIONS.map(opt => (
                    <button key={opt.value} className={`dd-item ${outcome === opt.value ? "active" : ""}`} onClick={() => { updateParam("outcome", opt.value); close(); }}>
                      <span>{opt.label}</span>
                      {outcome === opt.value && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {list.length} identities · top 50 by LTV
          </div>
        </div>

        {/* ── Two-col layout ─────────────────────────────────────────────── */}
        <div className="journeys-layout">
          {/* Left: identity list */}
          <div className="card flush" style={{ maxHeight: 720, overflow: "auto" }}>
            {isEmpty ? (
              <div style={{ padding: 30, textAlign: "center", color: "var(--ink-3)" }}>
                No identities match these filters. Try widening the timeframe or changing the action.
              </div>
            ) : (
              <table className="t">
                <thead style={{ position: "sticky", top: 0, background: "var(--panel)", zIndex: 1 }}>
                  <tr>
                    <th>Identity</th>
                    <th className="num">LTV</th>
                    <th className="num">Chapters</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r.canonical_identity_key}
                        style={{ cursor: "pointer", background: selectedIdentity === r.canonical_identity_key ? "var(--bg-2)" : "transparent" }}
                        onClick={() => selectIdentity(r.canonical_identity_key)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span className={`role-pill ${r.outcome === "converted" ? "closer" : "opener"}`} style={{ fontSize: 9 }}>
                            {r.outcome}
                          </span>
                          {Number(r.matching_events ?? 0) > 0 && action !== "all" && (
                            <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
                              ×{Number(r.matching_events)} in window
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="hash" title={r.canonical_identity_key} style={{ fontSize: 11 }}>
                            {truncateIdentity(r.canonical_identity_key)}
                          </span>
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          Last activity · {fmtDateShort(r.last_activity_ts)}
                        </div>
                      </td>
                      <td className="num">{fmtMoney(Number(r.lifetime_value ?? 0))}</td>
                      <td className="num">{fmtNum(Number(r.lifetime_chapters ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Right: detail panel */}
          <div className="card" style={{ padding: "22px 26px" }}>
            {!selectedIdentity || !selectedRow ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
                Select an identity from the list to see their full journey.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <div className="eyebrow">Canonical identity</div>
                    <h3 style={{ margin: "4px 0 4px", fontSize: 15, fontWeight: 600, letterSpacing: "-.01em", display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="hash" title={selectedIdentity} style={{ fontSize: 12 }}>
                        {truncateIdentity(selectedIdentity)}
                      </span>
                      <span className={`role-pill ${selectedRow.outcome === "converted" ? "closer" : "opener"}`} style={{ fontSize: 10 }}>
                        {selectedRow.outcome}
                      </span>
                    </h3>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {chapters[0] && <>First seen {fmtDateShort(chapters[0].first_ts)}</>}
                      {selectedRow.last_purchase_ts && <> · Last purchase {fmtDateShort(selectedRow.last_purchase_ts)}</>}
                    </div>
                  </div>
                </div>

                <div className="role-stats" style={{ paddingTop: 0, borderTop: "none", gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 22 }}>
                  <div><div className="role-stat-label">Chapters</div><div className="role-stat-val">{fmtNum(chapters.length)}</div></div>
                  <div><div className="role-stat-label">Events</div><div className="role-stat-val">{fmtNum(events.length)}</div></div>
                  <div><div className="role-stat-label">LTV</div><div className="role-stat-val">{fmtMoney(Number(selectedRow.lifetime_value ?? 0))}</div></div>
                  <div><div className="role-stat-label">Stitched IDs</div><div className="role-stat-val">{aliases.length}</div></div>
                </div>

                {/* Event timeline by chapter */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div className="h-section" style={{ marginBottom: 0 }}>
                      Event timeline · {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
                    </div>
                    {chapters.length > 0 && (
                      <button
                        type="button"
                        className="toolbar-btn compact"
                        onClick={toggleAllChapters}
                        style={{ fontSize: 11, padding: "3px 10px" }}
                      >
                        {allChaptersExpanded ? "Collapse all" : "Expand all"}
                      </button>
                    )}
                  </div>
                  {chapters.length === 0 ? (
                    <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>
                      No converting chapters yet — this identity is open (no purchase).
                    </div>
                  ) : (
                    <div className="journey-events">
                      {chapters.map(ch => {
                        const chEvents = eventsByChapter.get(ch.chapter_id) ?? [];
                        const pathParts = ch.channel_path.split(" → ") as ChannelKey[];
                        const isExpanded = expandedChapters.has(ch.chapter_id);
                        return (
                          <div key={ch.chapter_id} className="journey-chap">
                            <button
                              type="button"
                              onClick={() => toggleChapter(ch.chapter_id)}
                              style={{
                                width: "100%", textAlign: "left", background: "transparent",
                                border: "none", padding: 0, cursor: "pointer", color: "inherit",
                                display: "block",
                              }}
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? "Collapse" : "Expand"} chapter ${ch.chapter_id}`}
                            >
                              <div className="journey-chap-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div className="journey-chap-title">
                                    Chapter {ch.chapter_id} · {chEvents.length} event{chEvents.length === 1 ? "" : "s"}
                                  </div>
                                  <div className="journey-chap-meta">
                                    {fmtDateTimeShort(ch.first_ts)} — {fmtDateTimeShort(ch.boundary_ts)}
                                    {ch.revenue != null && <> · Closed at <span className="em">{fmtMoney(Number(ch.revenue))}</span></>}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    display: "inline-flex", alignItems: "center", color: "var(--ink-3)",
                                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                    transition: "transform 120ms ease",
                                    flexShrink: 0, marginTop: 2,
                                  }}
                                >
                                  <Icon name="chev" size={14} />
                                </span>
                              </div>
                              <div style={{ marginTop: 6, marginBottom: isExpanded ? 6 : 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <PathRender channels={pathParts} mode="raw" />
                                <span className="arrow" style={{ color: "var(--ink-4)" }}>→</span>
                                <span
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    padding: "2px 8px", borderRadius: 999,
                                    background: "rgba(227,100,16,0.12)",
                                    color: "var(--accent)", fontSize: 11, fontWeight: 600,
                                  }}
                                >
                                  <span style={{ fontSize: 10 }}>★</span>
                                  <span>Purchase</span>
                                  {ch.revenue != null && <span style={{ color: "var(--accent-2)" }}>+{fmtMoney(Number(ch.revenue))}</span>}
                                </span>
                              </div>
                            </button>
                            {isExpanded && chEvents.length > 0 && (() => {
                              const runs = runLengthEvents(chEvents);
                              return (
                                <div className="journey-evt-list" style={{ marginTop: 4 }}>
                                  {runs.map((r, i) => {
                                    const ev = EVENT_LABEL[r.event_name] ?? r.event_name;
                                    const color = EVENT_COLOR[r.event_name] ?? "#9CA0A8";
                                    const isRun = r.count > 1;
                                    const span = isRun ? fmtCompactSpan(r.first_ts, r.last_ts) : null;
                                    return (
                                      <div
                                        key={i}
                                        className={`journey-evt ${r.is_boundary ? "boundary" : ""}`}
                                        style={{ padding: "4px 0", fontSize: 12 }}
                                      >
                                        <div className="journey-evt-day" style={{ fontSize: 11 }}>
                                          {fmtDateTimeShort(r.first_ts)}
                                        </div>
                                        <div
                                          className={`journey-evt-marker ${r.is_boundary ? "boundary" : ""}`}
                                          style={{ background: color, width: 18, height: 18, fontSize: 10 }}
                                        >
                                          {r.is_boundary ? "★" : ev[0]}
                                        </div>
                                        <div className="journey-evt-label">
                                          {isRun && <span style={{ color: "var(--ink-3)", marginRight: 4 }}>{r.count}×</span>}
                                          <span className="em">{ev}</span>
                                          {isRun && span && (
                                            <span style={{ color: "var(--ink-3)", marginLeft: 6, fontSize: 11 }}>
                                              over {span}
                                            </span>
                                          )}
                                        </div>
                                        <div className="journey-evt-amount">
                                          {r.is_boundary && ch.revenue != null ? "+" + fmtMoney(Number(ch.revenue)) : ""}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Identity resolution panel */}
                <div style={{ marginTop: 22 }}>
                  <div className="h-section">Identity resolution</div>
                  <div style={{ marginTop: 10, padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line-2)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {aliases.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          No stitched aliases — this canonical is a single un-stitched identity.
                        </div>
                      ) : aliases.map(a => (
                        <div key={a.alias_key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 50, background: a.is_deterministic ? "var(--accent)" : "#9B7BB8" }}></span>
                          <span className="mono" title={a.alias_key}>{truncateIdentity(a.alias_key)}</span>
                          <span className="muted">{a.method}</span>
                          {a.first_seen_ts && <span className="muted">· {fmtDateShort(a.first_seen_ts)}</span>}
                          {!a.is_deterministic && <span className="muted">· {a.confidence}% confidence</span>}
                        </div>
                      ))}
                    </div>
                    <div className="callout" style={{ marginTop: 12, fontSize: 12 }}>
                      {aliases.length} raw identit{aliases.length === 1 ? "y" : "ies"} stitched into this canonical via {[...new Set(aliases.map(a => a.method))].join(" + ")} matching.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryStat({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div style={{ padding: "0 16px", borderRight: "1px solid var(--line-2)" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--ink-3)", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em", marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{foot}</div>
    </div>
  );
}
