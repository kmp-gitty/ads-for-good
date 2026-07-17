"use client";

// Outreach Tracker — read-only visualization of prospect touchpoint activity.
// Aggregation happens server-side in page.tsx; this component handles filters,
// sort, and rendering. Any mutation flows (add prospect / log touchpoint /
// confirm meeting) live in the existing sibling components.

import { useMemo, useState } from "react";
import {
  deriveOutreachStatus,
  OUTREACH_STATUS_LABEL,
  type OutreachStatus,
} from "./status";

export type OutreachRow = {
  prospect_id: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  stage: string | null;
  total_touchpoints: number;
  sent: number;
  received: number;
  last_outbound_at: string | null;
  last_inbound_at: string | null;
  last_touch_at: string | null;
  has_meeting: boolean;
  channels_used: string[];
};

export type ActivityEntry = {
  id: string;
  occurred_at: string;
  direction: "outbound" | "inbound" | string;
  channel: string;
  subject: string | null;
  prospect_id: string;
  business_name: string | null;
  contact_name: string | null;
};

const STATUSES: OutreachStatus[] = [
  "meeting_booked",
  "replied",
  "followup_due",
  "stale",
  "awaiting_reply",
  "no_activity",
];

const NORMAL_STATUSES = STATUSES.filter((s) => s !== "no_activity");

function daysBetween(from: string | null, to: Date): number | null {
  if (!from) return null;
  const ms = to.getTime() - new Date(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours === 0) return "just now";
    if (hours === 1) return "1h ago";
    return `${hours}h ago`;
  }
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function statusPillClasses(s: OutreachStatus): string {
  switch (s) {
    case "meeting_booked":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "replied":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "awaiting_reply":
      return "bg-neutral-100 text-neutral-700 border-neutral-200";
    case "followup_due":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "stale":
      return "bg-red-100 text-red-800 border-red-300";
    case "no_activity":
      return "bg-neutral-50 text-neutral-500 border-neutral-200";
  }
}

function stagePillClasses(stage: string | null): string {
  if (!stage) return "bg-neutral-100 text-neutral-500 border-neutral-200";
  const s = stage.toLowerCase();
  if (s === "new") return "bg-slate-100 text-slate-700 border-slate-200";
  if (s.includes("qualified")) return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (s.includes("meeting")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "closed" || s.includes("won")) return "bg-green-100 text-green-800 border-green-200";
  if (s === "lost" || s.includes("dead")) return "bg-neutral-100 text-neutral-500 border-neutral-200";
  return "bg-neutral-100 text-neutral-700 border-neutral-200";
}

export default function OutreachTracker({
  rows,
  activity,
}: {
  rows: OutreachRow[];
  activity: ActivityEntry[];
}) {
  const now = useMemo(() => new Date(), []);
  const [search, setSearch] = useState("");
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<OutreachStatus>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [showNoActivity, setShowNoActivity] = useState(false);
  const [focusedProspect, setFocusedProspect] = useState<string | null>(null);

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const daysSinceLastOutbound = daysBetween(r.last_outbound_at, now);
      const daysSinceLastTouch = daysBetween(r.last_touch_at, now);
      const status = deriveOutreachStatus({
        hasOutbound: r.sent > 0,
        hasInbound: r.received > 0,
        hasMeeting: r.has_meeting,
        daysSinceLastOutbound,
      });
      return { ...r, status, daysSinceLastOutbound, daysSinceLastTouch };
    });
  }, [rows, now]);

  const distinctStages = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.stage).filter(Boolean))) as string[];
  }, [rows]);

  const distinctChannels = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) for (const ch of r.channels_used) s.add(ch);
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return enriched
      .filter((r) => {
        if (r.status === "no_activity" && !showNoActivity) return false;
        if (selectedStages.size > 0 && !selectedStages.has(r.stage ?? "")) return false;
        if (selectedStatuses.size > 0 && !selectedStatuses.has(r.status)) return false;
        if (selectedChannels.size > 0 && !r.channels_used.some((c) => selectedChannels.has(c))) {
          return false;
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const hit =
            (r.business_name ?? "").toLowerCase().includes(q) ||
            (r.contact_name ?? "").toLowerCase().includes(q) ||
            (r.email ?? "").toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Stalest first: null last_touch goes last; higher daysSinceLastTouch first
        const aD = a.daysSinceLastTouch ?? -Infinity;
        const bD = b.daysSinceLastTouch ?? -Infinity;
        return bD - aD;
      });
  }, [enriched, showNoActivity, selectedStages, selectedStatuses, selectedChannels, search]);

  const focusedActivity = useMemo(() => {
    if (!focusedProspect) return activity;
    return activity.filter((a) => a.prospect_id === focusedProspect);
  }, [activity, focusedProspect]);

  // Header stats (30d)
  const stats = useMemo(() => {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const withOutbound = new Set<string>();
    const withInbound = new Set<string>();
    for (const r of rows) {
      if (r.sent > 0) withOutbound.add(r.prospect_id);
      if (r.received > 0) withInbound.add(r.prospect_id);
    }
    const totalSent30d = activity.filter(
      (a) => a.direction === "outbound" && new Date(a.occurred_at) >= thirtyDaysAgo,
    ).length;
    const responseRate = withOutbound.size > 0
      ? withInbound.size / withOutbound.size
      : null;
    const followUpsDue = enriched.filter(
      (r) => r.status === "followup_due" || r.status === "stale",
    ).length;
    return {
      prospectsReached: withOutbound.size,
      totalSent30d,
      responseRate,
      followUpsDue,
    };
  }, [rows, activity, enriched, now]);

  function toggleSet<T>(setState: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setState((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Prospects reached" value={stats.prospectsReached} />
        <MiniStat label="Sent (30d)" value={stats.totalSent30d} />
        <MiniStat
          label="Response rate"
          value={
            stats.responseRate === null
              ? "—"
              : `${(stats.responseRate * 100).toFixed(0)}%`
          }
          sub="distinct-inbound / distinct-outbound"
        />
        <MiniStat label="Follow-ups due" value={stats.followUpsDue} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search business, contact, or email…"
          className="min-w-[240px] flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm placeholder-neutral-400"
        />
        <FilterMultiSelect
          label="Stage"
          options={distinctStages}
          selected={selectedStages}
          onToggle={(v) => toggleSet(setSelectedStages, v)}
        />
        <FilterMultiSelect
          label="Status"
          options={NORMAL_STATUSES.map((s) => s)}
          renderLabel={(s) => OUTREACH_STATUS_LABEL[s as OutreachStatus]}
          selected={selectedStatuses as unknown as Set<string>}
          onToggle={(v) => toggleSet(setSelectedStatuses, v as OutreachStatus)}
        />
        <FilterMultiSelect
          label="Channel"
          options={distinctChannels}
          selected={selectedChannels}
          onToggle={(v) => toggleSet(setSelectedChannels, v)}
        />
        <label className="flex items-center gap-2 text-xs text-neutral-700">
          <input
            type="checkbox"
            checked={showNoActivity}
            onChange={(e) => setShowNoActivity(e.target.checked)}
          />
          Include prospects with no activity
        </label>
        {(search ||
          selectedStages.size > 0 ||
          selectedStatuses.size > 0 ||
          selectedChannels.size > 0 ||
          focusedProspect) && (
          <button
            onClick={() => {
              setSearch("");
              setSelectedStages(new Set());
              setSelectedStatuses(new Set());
              setSelectedChannels(new Set());
              setFocusedProspect(null);
            }}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Focused-prospect banner */}
      {focusedProspect && (
        <div className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-800">
          Showing activity for{" "}
          <span className="font-semibold">
            {rows.find((r) => r.prospect_id === focusedProspect)?.business_name ??
              "selected prospect"}
          </span>{" "}
          only.{" "}
          <button
            onClick={() => setFocusedProspect(null)}
            className="underline decoration-dotted"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Main table + activity feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left">Business / Contact</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-right">Touches</th>
                <th className="px-3 py-2 text-right">↑↓</th>
                <th className="px-3 py-2 text-left">Last out</th>
                <th className="px-3 py-2 text-left">Last in</th>
                <th className="px-3 py-2 text-right">Days idle</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm text-neutral-500"
                  >
                    No prospects match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const idleClass =
                    r.daysSinceLastTouch === null
                      ? ""
                      : r.daysSinceLastTouch >= 14
                        ? "bg-red-50"
                        : r.daysSinceLastTouch >= 7
                          ? "bg-amber-50"
                          : "";
                  return (
                    <tr
                      key={r.prospect_id}
                      className={`border-t border-neutral-100 hover:bg-neutral-50 ${idleClass}`}
                    >
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setFocusedProspect(r.prospect_id)}
                          className="text-left"
                        >
                          <div className="font-semibold text-neutral-900">
                            {r.business_name ?? "(unnamed)"}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {r.contact_name ?? r.email ?? "—"}
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {r.stage ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${stagePillClasses(r.stage)}`}
                          >
                            {r.stage}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-neutral-700">
                        {r.total_touchpoints}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-neutral-500">
                        {r.sent}/{r.received}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {relativeDate(r.last_outbound_at)}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {r.last_inbound_at ? (
                          relativeDate(r.last_inbound_at)
                        ) : (
                          <span className="text-neutral-400">no reply</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-neutral-700">
                        {r.daysSinceLastTouch === null ? "—" : `${r.daysSinceLastTouch}d`}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClasses(r.status)}`}
                        >
                          {OUTREACH_STATUS_LABEL[r.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Activity feed */}
        <aside className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Recent Activity
          </div>
          <ul className="divide-y divide-neutral-100">
            {focusedActivity.length === 0 ? (
              <li className="px-3 py-8 text-center text-xs text-neutral-500">
                No recent activity for this filter.
              </li>
            ) : (
              focusedActivity.slice(0, 50).map((a) => {
                const arrow = a.direction === "outbound" ? "→" : "←";
                return (
                  <li key={a.id} className="px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setFocusedProspect(a.prospect_id)}
                        className="truncate text-left font-semibold text-neutral-900 hover:text-orange-700"
                      >
                        You {arrow} {a.contact_name ?? a.business_name ?? "(unknown)"}
                      </button>
                      <span className="whitespace-nowrap text-neutral-400">
                        {relativeDate(a.occurred_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-neutral-600">
                      {a.channel}
                      {a.subject ? ` · ${a.subject}` : ""}
                    </div>
                    {a.business_name && a.contact_name && (
                      <div className="text-[10px] text-neutral-400">
                        {a.business_name}
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-[10px] text-neutral-500">{sub}</div> : null}
    </div>
  );
}

function FilterMultiSelect({
  label,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  renderLabel?: (value: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        {label}
        {selected.size > 0 && (
          <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700">
            {selected.size}
          </span>
        )}
        <span className="text-neutral-400">▾</span>
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-transparent"
          />
          <div className="absolute left-0 top-full z-40 mt-1 max-h-64 min-w-[180px] overflow-auto rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
            {options.length === 0 ? (
              <div className="px-2 py-1 text-xs text-neutral-500">No options</div>
            ) : (
              options.map((opt) => {
                const isOn = selected.has(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => onToggle(opt)}
                    className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs ${isOn ? "bg-orange-50 text-orange-900" : "hover:bg-neutral-50 text-neutral-700"}`}
                  >
                    <span>{renderLabel ? renderLabel(opt) : opt}</span>
                    {isOn && <span className="text-orange-600">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
