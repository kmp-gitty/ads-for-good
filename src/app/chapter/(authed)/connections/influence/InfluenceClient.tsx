"use client";

import { useState, useTransition } from "react";
import { createCohort, type CreateCohortResult } from "./_actions";

// Cross-Source Influence — v1 client component (channel anchor only).
//
// Layout: anchor picker bar at top → 3-column flex (Upstream | Anchor | Downstream).
// Each panel row shows a connected channel + n_identities + pct_of_anchor +
// median lag + outcome rate within 30d of the connection touch. The page is
// descriptive — no causal language, no SE gates. Lagged Impact (Connections #2)
// is the inferential cousin and is link-out'd from each row.

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TopBar } from "../../../_components/TopBar";
import { Icon } from "../../../_components/Icon";
import { Dropdown } from "../../../_components/Dropdown";
import { ChannelChip } from "../../../_components/ChannelChip";
import { ChannelKey } from "../../../_components/mockdata";
import type {
  ConnectionsAnchorResolveRow,
  ConnectionsPanelRow,
  ConnectionsPageOption,
  ConnectionsCampaignOption,
  ConnectionsCohortOption,
  ConnectionsConnectionType,
  ConnectionsSelfRecurrenceRow,
  ConnectionsReturnLoopRow,
} from "../../../_lib/dashboard-rpc";

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: "(direct)",       label: "Direct" },
  { value: "email",          label: "Email" },
  { value: "organic search", label: "Organic Search" },
  { value: "paid search",    label: "Paid Search" },
  { value: "organic social", label: "Organic Social" },
  { value: "paid social",    label: "Paid Social" },
  { value: "referral",       label: "Referral" },
];

const WINDOW_OPTIONS         = [7, 14, 30, 60, 90];
const OUTCOME_WINDOW_OPTIONS = [7, 14, 30, 60, 90];

// 9.4 — Cohort removed from the anchor selector (demote to a filter later; a
// cohort is a property of people, not a timed touchpoint). Cohort backend +
// the RPC's cohort path stay intact for the future filter build.
const ANCHOR_TYPES: { value: string; label: string; enabled: boolean; desc?: string }[] = [
  { value: "channel",  label: "Channel",  enabled: true, desc: "Anchor = the entry channel identities came in on (their journey's first session)." },
  { value: "page",     label: "Page",     enabled: true, desc: "Anchor = identities who viewed this page." },
  { value: "campaign", label: "Campaign", enabled: true, desc: "Anchor = identities who clicked this email campaign." },
];

function channelLabel(v: string): string {
  return CHANNEL_OPTIONS.find(o => o.value === v)?.label ?? v;
}

// ── Breadcrumb encoding ─────────────────────────────────────────────────────
// Trail format in URL: ?bc=<type>:<value>|<type>:<value>|…
// Each entry encodes one anchor that was previously selected before we hopped
// to the current one. Pipe + colon are URL-safe-enough for the values we emit
// (channel names are tokens, page paths get encodeURIComponent'd).

type BreadcrumbEntry = { anchorType: string; value: string };

function encodeBcEntry(e: BreadcrumbEntry): string {
  return `${e.anchorType}:${encodeURIComponent(e.value)}`;
}
function decodeBcEntry(s: string): BreadcrumbEntry | null {
  const colon = s.indexOf(":");
  if (colon === -1) return null;
  return { anchorType: s.slice(0, colon), value: decodeURIComponent(s.slice(colon + 1)) };
}
function encodeBcTrail(trail: BreadcrumbEntry[]): string {
  return trail.map(encodeBcEntry).join("|");
}
function decodeBcTrail(s: string | null): BreadcrumbEntry[] {
  if (!s) return [];
  return s.split("|").map(decodeBcEntry).filter((e): e is BreadcrumbEntry => e !== null);
}

// Breadcrumb display label per entry.
function bcEntryLabel(e: BreadcrumbEntry): string {
  if (e.anchorType === "channel") return channelLabel(e.value);
  if (e.anchorType === "page") return e.value;
  return e.value; // campaign/cohort use the raw id; the breadcrumb is back-button-flavored, not pretty-name
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  return (Number(n) * 100).toFixed(digits) + "%";
}

// Lag value is shown signed (e.g. "−4.0d" / "+15.1d"). The panel title already
// communicates BEFORE/AFTER direction, so this column stays compact — sign
// reinforces orientation without spelling it out.
function fmtLag(n: number | null | undefined): string {
  if (n == null) return "—";
  const v = Number(n);
  const abs = Math.abs(v).toFixed(1);
  if (v < 0) return `−${abs}d`;
  if (v > 0) return `+${abs}d`;
  return "0d";
}

// 9.1 — lift = pct_of_anchor / base_rate. Color-codes the row so parity (~1×)
// is visually distinct from a 5× at a glance (the whole point of the column).
function fmtLift(n: number | null | undefined): string {
  if (n == null) return "—";
  const v = Number(n);
  return (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + "×";
}
function liftColor(n: number | null | undefined): string {
  if (n == null) return "var(--ink-4)";
  const v = Number(n);
  if (v >= 2)   return "#1a7f5a"; // co-occurs 2x+ more than expected — the argument
  if (v >= 1.2) return "var(--ink)";
  if (v < 0.8)  return "var(--ink-4)"; // below its own base rate — de-emphasize
  return "var(--ink-2)";               // ~parity: unremarkable
}

// 9.2 — cell gate, mirroring lagged_impact_pair's reference implementation
// (n floor + 95% CI on the share difference). Order matters: the n-floor is
// checked FIRST because a tiny sample can produce a degenerate zero-variance
// CI (e.g. 6/6 = 100%) that would otherwise read as "confident".
type GateStatus = "ok" | "within_noise" | "below_n_floor";

// Floor derived from the anchor population, not a constant — a connection must
// appear for at least this many anchored identities to be shown at full weight.
// GREATEST(30, 5% of anchor pop): 30 matches the lagged_impact reference; the
// 5% term scales the demand up for large anchors.
function nFloor(anchorPop: number): number {
  return Math.max(30, Math.ceil(anchorPop * 0.05));
}

function gateStatus(row: ConnectionsPanelRow, anchorPop: number): GateStatus {
  const n = Number(row.n_identities ?? 0);
  if (anchorPop < 30 || n < nFloor(anchorPop)) return "below_n_floor";
  // Page rows carry no base_rate/lift yet (9.1 deferred) — no noise test
  // possible, so they pass on the n-floor alone.
  if (row.base_rate == null || row.lift == null) return "ok";
  const pObs = Number(row.pct_of_anchor);
  const pBase = Number(row.base_rate);
  if (!(anchorPop > 0) || !isFinite(pObs) || !isFinite(pBase)) return "below_n_floor";
  // SE of the observed share; base rate treated as a stable population rate
  // (large denominator), same simplification the reference makes on the
  // baseline arm. within_noise ⇔ the 95% CI on (observed − base) includes 0,
  // i.e. lift is indistinguishable from 1×.
  const se = Math.sqrt(Math.max(pObs * (1 - pObs), 0) / anchorPop);
  if (se === 0) return "within_noise"; // degenerate (0% or 100%): not established
  return Math.abs(pObs - pBase) <= 1.96 * se ? "within_noise" : "ok";
}

function gateLabel(g: GateStatus): string {
  return g === "below_n_floor" ? "below sample floor" : g === "within_noise" ? "within noise" : "";
}

const gateRank: Record<GateStatus, number> = { ok: 0, within_noise: 1, below_n_floor: 2 };

// Single source of truth for the panel grid layout. Tight on the right-hand
// numeric columns so the outcome % is always visible without horizontal
// scroll. Channel column is flexible + ellipsis-truncating. Column gap is
// zero — visual separation comes from vertical dividers + cell padding.
// 9.1 adds the Lift column (base rate shown as its sub-line).
const PANEL_GRID    = "minmax(76px,1fr) 44px 52px 64px 54px 82px";
const DIVIDER       = "1px solid var(--line)";
const CELL_PAD      = 10;

// Visual rhythm helpers: every non-first cell gets a left divider so columns
// are clearly delineated; alternate data rows get a faint background tint.
// Non-first cells use symmetric horizontal padding so centered content sits
// visually centered between the divider and the right edge.
const cellDivided = (firstCell: boolean): React.CSSProperties => ({
  paddingLeft:  firstCell ? 0         : CELL_PAD,
  paddingRight: firstCell ? CELL_PAD  : CELL_PAD,
  borderLeft:   firstCell ? undefined : DIVIDER,
});

// 9.3 — dimension badge for the mixed "All" panel so page + campaign rows read
// as distinct from channel rows (channels already carry their colored chip).
const DIM_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  page:     { bg: "rgba(45,122,201,0.12)", fg: "#2D7AC9", label: "page" },
  campaign: { bg: "rgba(142,93,168,0.14)", fg: "#8E5DA8", label: "email" },
};
function DimBadge({ kind }: { kind: string }) {
  const b = DIM_BADGE[kind];
  if (!b) return null;
  return (
    <span style={{
      flex: "0 0 auto", fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".06em",
      fontWeight: 700, color: b.fg, background: b.bg, padding: "1px 4px", borderRadius: 3,
    }}>
      {b.label}
    </span>
  );
}

function ConnectionRow({ row, index, onClick, gate }: { row: ConnectionsPanelRow; index: number; onClick?: (r: ConnectionsPanelRow) => void; gate: GateStatus }) {
  const stripe = index % 2 === 1 ? "rgba(15,23,34,0.025)" : "transparent";
  // 9.2 — only rows clearing both the n-floor and the noise gate render at full
  // weight. Gated rows stay visible (for a channel an operator is arguing about)
  // but de-emphasised so they can never be mistaken for an established finding.
  const gated = gate !== "ok";
  return (
    <div
      className="lrow"
      onClick={onClick ? () => onClick(row) : undefined}
      title={onClick ? "Click to re-anchor on this row" : undefined}
      style={{
        gridTemplateColumns: PANEL_GRID,
        columnGap: 0,
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: DIVIDER,
        background: stripe,
        cursor: onClick ? "pointer" : "default",
        opacity: gated ? 0.5 : 1,
      }}
    >
      <div style={{ ...cellDivided(true), display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {row.connected_thing_type === "channel" ? (
          <ChannelChip ch={row.connected_thing_id as ChannelKey} />
        ) : (
          <>
            <DimBadge kind={row.connected_thing_type} />
            <span style={{
              flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontSize: 12,
              fontFamily: row.connected_thing_type === "page" ? "ui-monospace, monospace" : undefined,
            }}>
              {row.connected_thing_label}
            </span>
          </>
        )}
        {gated && (
          <span style={{ flex: "0 0 auto", fontSize: 9.5, color: "var(--ink-4)", fontStyle: "italic", whiteSpace: "nowrap" }}>
            · {gateLabel(gate)}
          </span>
        )}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
           title={row.median_touch_count != null ? `Median ${Number(row.median_touch_count).toFixed(1)} touches per person` : undefined}>
        {row.n_identities}
        {/* 9.3 — median touch count, shown only when repeated (>1); a person who
            touched this 4× is different from one who touched it once. */}
        {row.median_touch_count != null && Number(row.median_touch_count) > 1 && (
          <div style={{ fontSize: 9, color: "var(--ink-4)", lineHeight: 1, fontWeight: 500 }}>
            ×{Number(row.median_touch_count).toFixed(1)}
          </div>
        )}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)", fontSize: 12 }}>
        {fmtPct(row.pct_of_anchor)}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums" }}
           title={row.lift == null
             ? "Base rate not available for page connections yet"
             : `Appears for ${fmtPct(row.base_rate)} of identities generally; here at ${fmtPct(row.pct_of_anchor)} — ${fmtLift(row.lift)} expected`}>
        {row.lift == null
          ? <span style={{ color: "var(--ink-4)" }}>—</span>
          : (
            <>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: liftColor(row.lift) }}>{fmtLift(row.lift)}</div>
              <div style={{ fontSize: 9, color: "var(--ink-4)", lineHeight: 1 }}>base {fmtPct(row.base_rate, 0)}</div>
            </>
          )}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)", fontSize: 12 }}>
        {fmtLag(row.median_lag_days)}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
        {fmtPct(row.outcome_rate, 0)}
      </div>
    </div>
  );
}

// Two-line header cell — short qualifier line over the primary noun. Makes
// each column visually distinct instead of reading as one continuous sentence.
function HeaderCell({
  top, bottom, firstCell = false, title,
}: { top?: string; bottom: string; firstCell?: boolean; title?: string }) {
  // Custom instant tooltip matching the Lifecycle Overview info box (navy fill,
  // white text, rounded, shadow) instead of the delayed gray native `title`.
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => title && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...cellDivided(firstCell),
        position: "relative",
        textAlign: firstCell ? "left" : "center",
        whiteSpace: "nowrap",
        display: "flex",
        flexDirection: "column",
        alignItems: firstCell ? "flex-start" : "center",
        gap: 2,
        lineHeight: 1.1,
        cursor: title ? "help" : undefined,
      }}
    >
      <span style={{ color: "var(--ink-4)", fontWeight: 500 }}>{top ?? " "}</span>
      <span>{bottom}</span>
      {title && hover && (
        <div style={{
          position: "absolute", top: "calc(100% + 9px)", left: "50%", transform: "translateX(-50%)",
          width: 240, background: "#1F2D43", color: "white", borderRadius: 8, padding: "9px 11px",
          fontSize: 11, lineHeight: 1.5, fontWeight: 400, letterSpacing: 0, textTransform: "none",
          whiteSpace: "normal", textAlign: "left",
          boxShadow: "0 8px 24px rgba(15,23,34,0.28)", zIndex: 30, pointerEvents: "none",
        }}>
          {title}
          <span aria-hidden style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            border: "5px solid transparent", borderBottomColor: "#1F2D43",
          }} />
        </div>
      )}
    </div>
  );
}

function PanelHeader({ outcomeWindowDays }: { outcomeWindowDays: number }) {
  return (
    <div
      className="lrow head"
      style={{
        gridTemplateColumns: PANEL_GRID,
        columnGap: 0,
        padding: "10px 16px",
        borderBottom: DIVIDER,
        background: "rgba(15,23,34,0.04)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: ".05em",
        color: "var(--ink-3)",
        fontWeight: 600,
      }}
    >
      <HeaderCell                              bottom="Connection" firstCell />
      <HeaderCell                              bottom="People"
        title="How many of the anchored identities also touched this connection." />
      <HeaderCell top="of"      bottom="Anchor"
        title="Share of the anchored identities that also touched this connection." />
      <HeaderCell top="vs base" bottom="Lift"
        title="How much more often this connection shows up among these identities than across all identities generally. 1× = no different from baseline; 2× = twice as common here." />
      <HeaderCell top="Median"  bottom="Lag"
        title="Median time between this connection touch and the anchor moment (before the anchor for upstream, after it for downstream)." />
      <HeaderCell top={`${outcomeWindowDays}d`} bottom="Outcome"
        title={`Of the identities in this row, the share that reached a purchase within ${outcomeWindowDays} days of the CONNECTION touch — not the anchor.`} />
    </div>
  );
}

function Panel({
  title, subtitle, rows, outcomeWindowDays, emptyText, onRowClick, anchorPop,
}: {
  title: string; subtitle: string;
  rows: ConnectionsPanelRow[];
  outcomeWindowDays: number;
  emptyText: string;
  onRowClick?: (r: ConnectionsPanelRow) => void;
  anchorPop: number;
}) {
  // 9.2 — gate each row, then rank ok → within_noise → below_floor, lift desc
  // within each band. Established findings sit on top at full weight.
  const pop = Number(anchorPop) || 0;
  const graded = rows.map((r) => ({ r, gate: gateStatus(r, pop) }));
  const anyOk = graded.some((g) => g.gate === "ok");
  return (
    <div className="card" style={{ flex: 1, minWidth: 0, padding: 0, display: "flex", flexDirection: "column" }}>
      <div className="card-head" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
        <h3 className="card-title">{title}</h3>
        <div className="card-sub" style={{ marginTop: 3 }}>{subtitle}</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: "32px 18px", color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 440 }}>
            <PanelHeader outcomeWindowDays={outcomeWindowDays} />
            <div>
              {/* 9.2 — established rows first (gate rank), then by lift; page rows
                  (null lift) fall within their band. 9.1's lift sort survives as
                  the intra-band tiebreak. */}
              {[...graded]
                .sort((a, b) =>
                  (gateRank[a.gate] - gateRank[b.gate]) ||
                  (Number(b.r.lift ?? -1) - Number(a.r.lift ?? -1)) ||
                  (Number(b.r.n_identities ?? 0) - Number(a.r.n_identities ?? 0)))
                .map((g, i) => <ConnectionRow key={i} row={g.r} index={i} onClick={onRowClick} gate={g.gate} />)}
            </div>
            {!anyOk && (
              <div style={{ padding: "8px 16px", fontSize: 10.5, color: "var(--ink-4)", lineHeight: 1.4, borderTop: DIVIDER }}>
                No connection here clears the sample floor (≥ {nFloor(pop)} of {pop.toLocaleString()} anchored identities) and the noise gate, so none is shown as established. This is expected while cross-channel identity coverage is still low.
              </div>
            )}
            {rows.some((r) => r.lift != null) && (
              <div style={{ padding: "8px 16px", fontSize: 10.5, color: "var(--ink-4)", lineHeight: 1.4, borderTop: DIVIDER }}>
                <strong style={{ color: "var(--ink-3)" }}>Lift</strong> = how often this appears here vs its <em>base rate</em> — the share of identities active in this window who touched it at all. 1× = no more than expected; 3× = three times its baseline.
                {" "}<strong style={{ color: "var(--ink-3)" }}>Gating:</strong> a row shows at full weight only if it clears the sample floor (≥ {nFloor(pop)} identities, derived from the anchor population) and its lift is distinguishable from its base rate at 95%. Faded rows are below floor or within noise. This tab tests many pairs and does <em>not</em> correct for multiple comparisons — treat faded rows as not established.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Anchor-specific definition + example reading rendered in the navy hero.
// Picks the top downstream row (or upstream if no downstream) as a concrete
// example so the reading uses the operator's actual numbers.
// Groups a cluster of filter controls under a shared uppercase label, with a
// horizontal bottom bracket ⎣___⎦ tying the controls together visually. Used to
// label the two filter clusters on the anchor bar.
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--ink-3)", fontWeight: 700, whiteSpace: "nowrap" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", paddingBottom: 10 }}>
        {children}
        <span aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 7, borderLeft: "2px solid var(--ink-4)", borderRight: "2px solid var(--ink-4)", borderBottom: "2px solid var(--ink-4)", borderRadius: "0 0 5px 5px", opacity: 0.5, pointerEvents: "none" }} />
      </div>
    </div>
  );
}

function AnchorExplanation({
  anchorType, anchorChannelLabel, anchorPagePath, campaignName, cohortName,
  nAnchor, windowDays, outcomeWindowDays,
  upstreamTop, downstreamTop,
}: {
  anchorType:         string;
  anchorChannelLabel: string;
  anchorPagePath:     string;
  campaignName:       string | null | undefined;
  cohortName:         string | null | undefined;
  nAnchor:            number;
  windowDays:         number;
  outcomeWindowDays:  number;
  upstreamTop:        ConnectionsPanelRow | null;
  downstreamTop:      ConnectionsPanelRow | null;
}) {
  const anchorLabel =
    anchorType === "channel"  ? anchorChannelLabel :
    anchorType === "page"     ? anchorPagePath :
    anchorType === "campaign" ? (campaignName || "this campaign") :
                                (cohortName || "this cohort");
  const anchorVerb =
    anchorType === "channel"  ? "entered via" :
    anchorType === "page"     ? "viewed" :
    anchorType === "campaign" ? "clicked" : "matched";
  // Verb for a CONNECTION row, based on that connection's own type.
  const connVerb = (t: string) =>
    t === "channel"  ? "entered via" :
    t === "page"     ? "viewed" :
    t === "campaign" ? "clicked" : "touched";

  const sideCol: React.CSSProperties = { flex: 1, minWidth: 0 };
  const termLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "white", marginBottom: 3 };
  const termDef: React.CSSProperties = { fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.70)" };

  return (
    <>
      {/* Dynamic worked example built from the current anchor + the top row of
          each side panel, so the reading tracks whatever the operator selects. */}
      <ul style={{ fontSize: 13.5, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        <li>
          <strong>Anchor: {anchorLabel}.</strong> {nAnchor.toLocaleString()} identities {anchorVerb} {anchorLabel} for the timeframe selected.
        </li>
        <li>
          <strong>Left:</strong>{" "}
          {upstreamTop
            ? <>{Number(upstreamTop.n_identities).toLocaleString()} people {connVerb(upstreamTop.connected_thing_type)} <strong>{upstreamTop.connected_thing_label}</strong> {windowDays} days before the {anchorLabel} touch</>
            : <span style={{ color: "rgba(255,255,255,0.6)" }}>no connections above the sample floor yet</span>}
        </li>
        <li>
          <strong>Right:</strong>{" "}
          {downstreamTop
            ? <>{Number(downstreamTop.n_identities).toLocaleString()} people {connVerb(downstreamTop.connected_thing_type)} <strong>{downstreamTop.connected_thing_label}</strong> {windowDays} days after the {anchorLabel} touch</>
            : <span style={{ color: "rgba(255,255,255,0.6)" }}>no connections above the sample floor yet</span>}
        </li>
      </ul>

      {/* Lag / Outcome window definitions, side by side. Current values shown so
          the definitions tie to the live settings. */}
      <div style={{ display: "flex", gap: 20, marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
        <div style={sideCol}>
          <div style={termLabel}>Lag Window <span style={{ color: "var(--accent)" }}>· {windowDays}d</span></div>
          <div style={termDef}>Timeframe of Left &amp; Right panel you want to see.</div>
        </div>
        <div style={sideCol}>
          <div style={termLabel}>Outcome Window <span style={{ color: "var(--accent)" }}>· {outcomeWindowDays}d</span></div>
          <div style={termDef}>Timeframe after a Connection to count a purchase.</div>
        </div>
      </div>
    </>
  );
}

export default function InfluenceClient({
  clientKey, range, anchorType, anchorChannel, anchorPagePath, anchorCampaignId, anchorCohortId, pageOptions, campaignOptions, cohortOptions, windowDays, outcomeWindowDays, connectionView, resolve, returnLoop, upstream, downstream,
}: {
  clientKey:         string;
  range:             string;
  anchorType:        string;
  anchorChannel:     string;
  anchorPagePath:    string;
  anchorCampaignId:  string;
  anchorCohortId:    string;
  pageOptions:       ConnectionsPageOption[];
  campaignOptions:   ConnectionsCampaignOption[];
  cohortOptions:     ConnectionsCohortOption[];
  windowDays:        number;
  outcomeWindowDays: number;
  connectionView:    "all" | ConnectionsConnectionType;
  resolve:           ConnectionsAnchorResolveRow | null;
  selfRecurrence:    ConnectionsSelfRecurrenceRow | null;
  returnLoop:        ConnectionsReturnLoopRow[];
  upstream:          ConnectionsPanelRow[];
  downstream:        ConnectionsPanelRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (val == null) next.delete(key);
    else next.set(key, val);
    router.replace(`${pathname}?${next.toString()}`);
  };

  // ── Breadcrumb state + handlers ────────────────────────────────────────
  const trail = decodeBcTrail(sp.get("bc"));

  // Push a row click → new anchor. Current anchor moves to the breadcrumb
  // trail. Uses router.push so browser back works.
  const rehomeOn = (row: ConnectionsPanelRow) => {
    const currentAnchorValue =
      anchorType === "channel"  ? anchorChannel    :
      anchorType === "page"     ? anchorPagePath   :
      anchorType === "campaign" ? anchorCampaignId :
      anchorType === "cohort"   ? anchorCohortId   : "";
    const newTrail = [...trail, { anchorType, value: currentAnchorValue }].slice(-6); // cap at 6 deep
    const next = new URLSearchParams(sp.toString());
    next.set("bc", encodeBcTrail(newTrail));

    if (row.connected_thing_type === "channel") {
      next.set("anchor_type",    "channel");
      next.set("anchor_channel", row.connected_thing_id);
      next.delete("anchor_page_path");
      next.delete("anchor_campaign_id");
      next.delete("anchor_cohort_id");
      // Switching to channel anchor → channel connections become the natural
      // default; clear connection_type so the server picks the right default.
      next.delete("connection_type");
    } else if (row.connected_thing_type === "page") {
      next.set("anchor_type",      "page");
      next.set("anchor_page_path", row.connected_thing_id);
      next.delete("anchor_channel");
      next.delete("anchor_campaign_id");
      next.delete("anchor_cohort_id");
      next.delete("connection_type");
    } else if (row.connected_thing_type === "campaign") {
      next.set("anchor_type",         "campaign");
      next.set("anchor_campaign_id",  row.connected_thing_id);
      next.delete("anchor_channel");
      next.delete("anchor_page_path");
      next.delete("anchor_cohort_id");
      next.delete("connection_type");
    }
    router.push(`${pathname}?${next.toString()}`);
  };

  // Click breadcrumb entry → restore THAT anchor; chop trail at that point.
  const rehomeToBreadcrumb = (idx: number) => {
    const entry = trail[idx];
    if (!entry) return;
    const newTrail = trail.slice(0, idx);
    const next = new URLSearchParams(sp.toString());
    if (newTrail.length === 0) next.delete("bc");
    else next.set("bc", encodeBcTrail(newTrail));
    next.set("anchor_type", entry.anchorType);
    next.delete("anchor_channel");
    next.delete("anchor_page_path");
    next.delete("anchor_campaign_id");
    next.delete("anchor_cohort_id");
    next.delete("connection_type");
    if (entry.anchorType === "channel")  next.set("anchor_channel",      entry.value);
    if (entry.anchorType === "page")     next.set("anchor_page_path",    entry.value);
    if (entry.anchorType === "campaign") next.set("anchor_campaign_id",  entry.value);
    if (entry.anchorType === "cohort")   next.set("anchor_cohort_id",    entry.value);
    router.push(`${pathname}?${next.toString()}`);
  };

  const clearTrail = () => {
    const next = new URLSearchParams(sp.toString());
    next.delete("bc");
    router.replace(`${pathname}?${next.toString()}`);
  };

  const nAnchor = resolve?.n_identities ?? 0;
  const anchorTooSmall = nAnchor > 0 && nAnchor < 20;
  const anchorEmpty    = nAnchor === 0;

  // Anchor-type-aware display helpers
  const isPageAnchor     = anchorType === "page";
  const isCampaignAnchor = anchorType === "campaign";
  const isCohortAnchor   = anchorType === "cohort";
  const selectedCampaign = campaignOptions.find(c => c.campaign_id === anchorCampaignId) ?? null;
  const selectedCohort   = cohortOptions.find(c => c.cohort_id === anchorCohortId) ?? null;
  const anchorTouchNoun  = isPageAnchor ? "view" : isCampaignAnchor ? "click" : isCohortAnchor ? "upload" : "touch";
  const anchorDisplay    = isPageAnchor
    ? anchorPagePath
    : isCampaignAnchor
    ? (selectedCampaign?.campaign_name || anchorCampaignId || "campaign")
    : isCohortAnchor
    ? (selectedCohort?.name || "cohort")
    : channelLabel(anchorChannel);
  const connectionsNoun  =
    connectionView === "page"     ? "pages" :
    connectionView === "campaign" ? "campaigns" :
    connectionView === "channel"  ? "channels" :
    "connections";
  // Capitalized noun for panel subtitles.
  const ConnectionsNoun  = connectionsNoun.charAt(0).toUpperCase() + connectionsNoun.slice(1);

  // Upload-cohort modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadPasted, setUploadPasted] = useState("");
  const [uploadResult, setUploadResult] = useState<CreateCohortResult | null>(null);
  const [uploadPending, startUpload] = useTransition();
  const submitUpload = () => {
    setUploadResult(null);
    startUpload(async () => {
      const res = await createCohort({ clientKey, name: uploadName, pasted: uploadPasted });
      setUploadResult(res);
      if (res.ok) {
        // Auto-select the freshly uploaded cohort and switch to cohort anchor.
        const next = new URLSearchParams(sp.toString());
        next.set("anchor_type", "cohort");
        next.set("anchor_cohort_id", res.cohort_id);
        router.replace(`${pathname}?${next.toString()}`);
        setUploadName("");
        setUploadPasted("");
      }
    });
  };

  return (
    <>
      <TopBar
        title="Cross-Source Influence"
        subtitle={<span>Pick something — currently a channel — and see what's connected to it across the identity graph. Descriptive co-occurrence + sequence, not cause.</span>}
        showCompare={false}
      />
      <div className="content">
        {/* How-this-page-works hero — two columns: general explanation (left)
            and anchor-specific definition + example reading (right). The
            reading uses the top row from the current panels as a concrete
            example so operators can see how to read their own data. */}
        <div className="card" style={{ background: "var(--navy)", color: "white", border: "none", padding: "20px 24px" }}>
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* LEFT — general framing */}
            <div style={{ flex: "1 1 360px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>
                How this page works
              </div>
              <ul style={{ fontSize: 13.5, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                <li><strong>Choose an Anchor:</strong> Channel, Page, or Campaign — identifies the session-entry channel of a journey.</li>
                <li>Middle column shows the identities for the selected anchor.</li>
                <li>Left &amp; Right panels show connections to the identities in the anchor.</li>
                <li>Left shows what those same identities touched <strong>{windowDays} days before</strong> the anchor.</li>
                <li>Right shows what those same identities touched <strong>{windowDays} days after</strong> the anchor.</li>
              </ul>
            </div>

            {/* RIGHT — anchor-specific definition + example reading */}
            <div style={{ flex: "1 1 360px", borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: 22 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--accent)", fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>How To Interpret</span>
                <span style={{ color: "rgba(255,255,255,0.35)" }}><Icon name="influence" size={16} /></span>
              </div>
              <AnchorExplanation
                anchorType={anchorType}
                anchorChannelLabel={channelLabel(anchorChannel)}
                anchorPagePath={anchorPagePath}
                campaignName={selectedCampaign?.campaign_name || anchorCampaignId}
                cohortName={selectedCohort?.name}
                nAnchor={nAnchor}
                windowDays={windowDays}
                outcomeWindowDays={outcomeWindowDays}
                upstreamTop={upstream[0] ?? null}
                downstreamTop={downstream[0] ?? null}
              />
            </div>
          </div>
          {/* Full-width caveat, centered across both columns — keeps the banner
              compact by not stacking under the left column. */}
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <strong>This describes connections in your data — it does not estimate cause.</strong> The measured cousin lives at <em>Lagged Impact</em>.
          </div>
        </div>

        {/* Breadcrumb trail — only renders when the operator has hopped at
            least once via click-to-rehome. Each entry takes them back to that
            anchor and chops the trail there. */}
        {trail.length > 0 && (
          <div className="card" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)", fontWeight: 600 }}>
              You came from
            </span>
            {trail.map((e, i) => (
              <React.Fragment key={i}>
                <button
                  onClick={() => rehomeToBreadcrumb(i)}
                  className="toolbar-btn"
                  style={{ fontSize: 11, padding: "4px 10px" }}
                  title={`Back to ${e.anchorType} · ${bcEntryLabel(e)}`}
                >
                  <span style={{ color: "var(--ink-3)", marginRight: 4 }}>{e.anchorType}</span>
                  <span style={{ fontWeight: 500 }}>{bcEntryLabel(e)}</span>
                </button>
                <span style={{ color: "var(--ink-4)", fontSize: 14 }}>→</span>
              </React.Fragment>
            ))}
            <span style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 500 }}>
              now: <strong>{anchorType} · {anchorDisplay}</strong>
            </span>
            <button
              onClick={clearTrail}
              className="toolbar-btn icon-only"
              style={{ marginLeft: "auto" }}
              title="Clear breadcrumb trail"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        )}

        {/* Anchor picker bar */}
        <div className="filter-bar" style={{ alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap", gap: 18 }}>
          <FilterGroup label="Anchor Filters">
          {/* Anchor type tabs */}
          <div className="toggle-group">
            {ANCHOR_TYPES.map(t => (
              <button
                key={t.value}
                className={anchorType === t.value ? "active" : ""}
                disabled={!t.enabled}
                onClick={() => t.enabled && setParam("anchor_type", t.value)}
                title={t.enabled ? t.desc : "Coming soon"}
                style={t.enabled ? undefined : { opacity: 0.4, cursor: "not-allowed" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Channel dropdown — only shown when anchor_type === channel */}
          {anchorType === "channel" && (
            <Dropdown align="left" width={220} trigger={
              <button className="toolbar-btn">
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Channel</span>
                <span style={{ fontWeight: 500 }}>{channelLabel(anchorChannel)}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  {CHANNEL_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      className={`dd-item ${anchorChannel === o.value ? "active" : ""}`}
                      onClick={() => { setParam("anchor_channel", o.value); close(); }}
                    >
                      <span>{o.label}</span>
                      {anchorChannel === o.value && <span className="check"><Icon name="check" size={14}/></span>}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
          )}

          {/* Cohort dropdown — lists this client's uploaded cohorts plus an
              "+ Upload new cohort" entry at the top. Browse-only: cohorts are
              identified by their operator-chosen name; raw emails never visible. */}
          {anchorType === "cohort" && (
            <Dropdown align="left" width={360} trigger={
              <button className="toolbar-btn" style={{ maxWidth: 340 }}>
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Cohort</span>
                <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedCohort?.name || (cohortOptions.length === 0 ? "No cohorts yet" : "Select a cohort")}
                </span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  <button
                    className="dd-item"
                    onClick={() => { setUploadOpen(true); close(); }}
                    style={{ color: "var(--accent)", fontWeight: 600 }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Icon name="plus" size={12} /> Upload new cohort
                    </span>
                  </button>
                  <div className="dd-divider" />
                  {cohortOptions.length === 0 ? (
                    <div className="dd-item" style={{ color: "var(--ink-3)", cursor: "default" }}>
                      No cohorts available yet.
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const sysCohorts = cohortOptions.filter(c => c.kind === "system");
                        const uploaded   = cohortOptions.filter(c => c.kind !== "system");
                        const renderRow = (c: ConnectionsCohortOption) => {
                          const isSystem = c.kind === "system";
                          return (
                            <button
                              key={c.cohort_id}
                              className={`dd-item ${anchorCohortId === c.cohort_id ? "active" : ""}`}
                              onClick={() => { setParam("anchor_cohort_id", c.cohort_id); close(); }}
                              style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2, paddingTop: 8, paddingBottom: 8 }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", minWidth: 0 }}>
                                  <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                                    {c.name}
                                  </span>
                                  {isSystem && (
                                    <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", padding: "2px 6px", borderRadius: 4, background: "rgba(46,125,91,0.15)", color: "var(--good)", fontWeight: 600 }}>
                                      Built-in
                                    </span>
                                  )}
                                </span>
                                {anchorCohortId === c.cohort_id && <span className="check"><Icon name="check" size={14}/></span>}
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-3)" }}>
                                {isSystem ? (
                                  <span>{Number(c.total_matched).toLocaleString()} identities · live</span>
                                ) : (
                                  <span>
                                    {Number(c.total_matched).toLocaleString()} of {Number(c.total_uploaded).toLocaleString()} matched
                                    {c.total_uploaded > 0 && ` · ${Math.round(100 * Number(c.total_matched) / c.total_uploaded)}%`}
                                  </span>
                                )}
                                {!isSystem && <span>{new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                              </div>
                            </button>
                          );
                        };
                        return (
                          <>
                            {sysCohorts.length > 0 && (
                              <>
                                <div className="dd-label">Built-in cohorts</div>
                                {sysCohorts.map(renderRow)}
                              </>
                            )}
                            {uploaded.length > 0 && (
                              <>
                                {sysCohorts.length > 0 && <div className="dd-divider" />}
                                <div className="dd-label">Uploaded</div>
                                {uploaded.map(renderRow)}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </>
              )}
            </Dropdown>
          )}

          {/* Campaign dropdown — only shown when anchor_type === campaign.
              Lists the most-recently-clicked campaigns from the picker RPC. */}
          {anchorType === "campaign" && (
            <Dropdown align="left" width={380} trigger={
              <button className="toolbar-btn" style={{ maxWidth: 360 }}>
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Campaign</span>
                <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedCampaign?.campaign_name || anchorCampaignId || "Select a campaign"}
                </span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  <div className="dd-label">Recently-clicked campaigns in window</div>
                  {campaignOptions.length === 0 ? (
                    <div className="dd-item" style={{ color: "var(--ink-3)", cursor: "default" }}>
                      No campaign clicks recorded in the selected window.
                    </div>
                  ) : (
                    campaignOptions.map(c => (
                      <button
                        key={c.campaign_id}
                        className={`dd-item ${anchorCampaignId === c.campaign_id ? "active" : ""}`}
                        onClick={() => { setParam("anchor_campaign_id", c.campaign_id); close(); }}
                        style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2, paddingTop: 8, paddingBottom: 8 }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260, fontWeight: 500 }}>
                            {c.campaign_name || c.campaign_id}
                          </span>
                          {anchorCampaignId === c.campaign_id && <span className="check"><Icon name="check" size={14}/></span>}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-3)" }}>
                          <span>{c.platform || "—"} · {Number(c.unique_clickers).toLocaleString()} clickers</span>
                          <span>{c.last_click_ts ? new Date(c.last_click_ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span>
                        </div>
                      </button>
                    ))
                  )}
                </>
              )}
            </Dropdown>
          )}

          {/* Page dropdown — only shown when anchor_type === page. Lists the
              top-N most-viewed paths in the current range from the server. */}
          {anchorType === "page" && (
            <Dropdown align="left" width={340} trigger={
              <button className="toolbar-btn" style={{ maxWidth: 320 }}>
                <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Page</span>
                <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{anchorPagePath}</span>
                <span className="chev"><Icon name="chev" size={12}/></span>
              </button>
            }>
              {(close) => (
                <>
                  <div className="dd-label">Top pages by views in window</div>
                  {pageOptions.length === 0 ? (
                    <div className="dd-item" style={{ color: "var(--ink-3)", cursor: "default" }}>
                      No page views in the selected window.
                    </div>
                  ) : (
                    pageOptions.map(o => (
                      <button
                        key={o.page_path}
                        className={`dd-item ${anchorPagePath === o.page_path ? "active" : ""}`}
                        onClick={() => { setParam("anchor_page_path", o.page_path); close(); }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{o.page_path}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{Number(o.views).toLocaleString()}</span>
                          {anchorPagePath === o.page_path && <span className="check"><Icon name="check" size={14}/></span>}
                        </span>
                      </button>
                    ))
                  )}
                </>
              )}
            </Dropdown>
          )}

          </FilterGroup>

          {/* 9.3 — connection dimension toggle. "All" unions channel + page +
              campaign connections into one lift-ranked panel; the others narrow
              to a single dimension. Shown for every anchor type. */}
          <FilterGroup label="Upstream / Downstream Connection Filters">
          <div className="toggle-group">
            <button
              className={connectionView === "all" ? "active" : ""}
              onClick={() => setParam("connection_type", "all")}
              title="Show the most influential connections of any type, ranked by lift"
            >
              All
            </button>
            <button
              className={connectionView === "channel" ? "active" : ""}
              onClick={() => setParam("connection_type", "channel")}
              title="Show only the channels that brought or returned them"
            >
              Channels
            </button>
            <button
              className={connectionView === "page" ? "active" : ""}
              onClick={() => setParam("connection_type", "page")}
              title="Show only the pages they visited"
            >
              Pages
            </button>
            <button
              className={connectionView === "campaign" ? "active" : ""}
              onClick={() => setParam("connection_type", "campaign")}
              title="Show only the email campaigns they clicked"
            >
              Campaigns
            </button>
          </div>

          </FilterGroup>

          {/* Lag + Outcome window dropdowns + anchor-window readout */}
          <FilterGroup label="Timing Window Filters">
          {/* Lag window dropdown — controls connection proximity to anchor */}
          <Dropdown align="left" width={180} trigger={
            <button className="toolbar-btn" title="How close to the anchor a connection must occur">
              <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Lag window</span>
              <span style={{ fontWeight: 500 }}>±{windowDays}d</span>
              <span className="chev"><Icon name="chev" size={12}/></span>
            </button>
          }>
            {(close) => (
              <>
                <div className="dd-label">How close to the anchor a connection must occur</div>
                {WINDOW_OPTIONS.map(w => (
                  <button
                    key={w}
                    className={`dd-item ${windowDays === w ? "active" : ""}`}
                    onClick={() => { setParam("window_days", String(w)); close(); }}
                  >
                    <span>±{w} days</span>
                    {windowDays === w && <span className="check"><Icon name="check" size={14}/></span>}
                  </button>
                ))}
              </>
            )}
          </Dropdown>

          {/* Outcome window dropdown — controls how long after the connection we count purchases */}
          <Dropdown align="left" width={180} trigger={
            <button className="toolbar-btn" title="How long after a connection touch to count purchases">
              <span className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Outcome window</span>
              <span style={{ fontWeight: 500 }}>{outcomeWindowDays}d</span>
              <span className="chev"><Icon name="chev" size={12}/></span>
            </button>
          }>
            {(close) => (
              <>
                <div className="dd-label">How long after a connection to count purchases</div>
                {OUTCOME_WINDOW_OPTIONS.map(w => (
                  <button
                    key={w}
                    className={`dd-item ${outcomeWindowDays === w ? "active" : ""}`}
                    onClick={() => { setParam("outcome_window_days", String(w)); close(); }}
                  >
                    <span>{w} days</span>
                    {outcomeWindowDays === w && <span className="check"><Icon name="check" size={14}/></span>}
                  </button>
                ))}
              </>
            )}
          </Dropdown>

          {/* Anchor window — read-only readout of the top Date Range selector,
              placed inside the timing bracket next to Lag/Outcome. */}
          <div style={{ fontSize: 12, color: "var(--ink-3)", cursor: "help", whiteSpace: "nowrap" }}
               title={"Three different windows on this page:\n• Anchor window (this) — the date range Chapter scans for anchor moments, set by the Range control at the top.\n• Lag window — how close to the anchor moment a connection touch must occur to count.\n• Outcome window — how long after a connection touch we keep watching for a purchase."}>
            Anchor window: <strong style={{ color: "var(--ink-2)" }}>{range}</strong>
          </div>
          </FilterGroup>
        </div>

        {anchorEmpty ? (
          <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 60 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No identities matched this anchor.</div>
            <div style={{ fontSize: 12 }}>Try a different channel or widen the anchor window above.</div>
          </div>
        ) : anchorTooSmall ? (
          <div className="card" style={{ textAlign: "center", color: "var(--ink-3)", padding: 60 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Anchor too small for meaningful connections.</div>
            <div style={{ fontSize: 12 }}>{nAnchor} identities matched · need at least 20.</div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 14, alignItems: "stretch", flexWrap: "wrap" }}>
            {/* UPSTREAM (left) */}
            <Panel
              title="Upstream"
              subtitle={`${ConnectionsNoun} seen ${windowDays} days BEFORE the ${anchorDisplay} ${anchorTouchNoun}`}
              rows={upstream}
              outcomeWindowDays={outcomeWindowDays}
              emptyText={`No upstream ${connectionsNoun} meeting the 5-identity minimum within ${windowDays}d.`}
              onRowClick={rehomeOn}
              anchorPop={nAnchor}
            />

            {/* ANCHOR (middle) — kept compact so side panels have room for all columns */}
            <div className="card" style={{ flex: "0 0 230px", padding: "20px 16px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--ink-3)", fontWeight: 600 }}>
                Anchor · {isPageAnchor ? "Page" : isCampaignAnchor ? "Campaign" : isCohortAnchor ? "Cohort" : "Channel"}
              </div>
              {isPageAnchor ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25, wordBreak: "break-all", padding: "0 4px" }}>
                  {anchorPagePath}
                </div>
              ) : isCampaignAnchor ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 4px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>
                    {selectedCampaign?.campaign_name || anchorCampaignId || "—"}
                  </div>
                  {selectedCampaign?.platform && (
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>
                      {selectedCampaign.platform}{selectedCampaign.last_click_ts ? " · " + new Date(selectedCampaign.last_click_ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                    </div>
                  )}
                </div>
              ) : isCohortAnchor ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 4px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>
                    {selectedCohort?.name || "—"}
                  </div>
                  {selectedCohort && (
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>
                      Uploaded {new Date(selectedCohort.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", lineHeight: 1.2 }}>
                    {channelLabel(anchorChannel)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <ChannelChip ch={anchorChannel as ChannelKey} />
                  </div>
                </>
              )}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                  {nAnchor.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>
                  Identities anchored
                </div>
              </div>
              {isCampaignAnchor && selectedCampaign && resolve?.match_rate != null && (
                <div style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.4 }}>
                  Resolved <strong style={{ color: "var(--ink-2)" }}>{Math.round(Number(resolve.match_rate) * 100)}%</strong> of {Number(selectedCampaign.unique_clickers).toLocaleString()} clickers
                </div>
              )}
              {isCohortAnchor && selectedCohort && (
                <div style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.4 }}>
                  Matched <strong style={{ color: "var(--ink-2)" }}>{Number(selectedCohort.total_matched).toLocaleString()}</strong> of {Number(selectedCohort.total_uploaded).toLocaleString()} uploads
                </div>
              )}
              {/* 9.5 — Return-to-anchor tile (Channel anchor only). Replaces the
                  self-recurrence tile: it counts the same returning customers but
                  ALSO shows the intervening channel they touched between anchor
                  entries — the loop last-click can never see. Hidden when no loop. */}
              {anchorType === "channel" && (() => {
                const total = Number(returnLoop[0]?.total_anchored ?? 0);
                const nRet  = Number(returnLoop[0]?.n_returned ?? 0);
                if (total === 0 || nRet === 0) return null;
                const pct = Math.round((nRet / total) * 100);
                const floor = nFloor(total);
                const interv = returnLoop
                  .filter(r => r.intervening_channel != null && Number(r.n_identities ?? 0) >= floor)
                  .map(r => ({ ch: r.intervening_channel as string, n: Number(r.n_identities ?? 0) }));
                return (
                  <div style={{ marginTop: 4, padding: "8px 10px", borderRadius: 6, background: "rgba(227,100,16,0.10)", border: "1px solid rgba(227,100,16,0.18)", textAlign: "center" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--accent)", fontWeight: 600 }}>
                      Return-to-anchor
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                      {pct}%
                      <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500, marginLeft: 4 }}>
                        ({nRet.toLocaleString()} of {total.toLocaleString()})
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.35 }}>
                      left, then re-entered via {channelLabel(anchorChannel)}
                      {interv.length > 0 && (
                        <> — touching {interv.map(x => `${channelLabel(x.ch)} (${x.n.toLocaleString()})`).join(", ")} in between</>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                Bot-filtered · resolved across all sources
              </div>
            </div>

            {/* DOWNSTREAM (right) */}
            <Panel
              title="Downstream"
              subtitle={`${ConnectionsNoun} seen ${windowDays} days AFTER the ${anchorDisplay} ${anchorTouchNoun}`}
              rows={downstream}
              outcomeWindowDays={outcomeWindowDays}
              emptyText={`No downstream ${connectionsNoun} meeting the 5-identity minimum within ${windowDays}d.`}
              onRowClick={rehomeOn}
              anchorPop={nAnchor}
            />
          </div>
        )}

        {/* Upload cohort modal */}
        {uploadOpen && (
          <>
            <div className="scrim" onClick={() => setUploadOpen(false)} />
            <div className="obs-popup" style={{ maxWidth: 540 }}>
              <div className="drawer-head">
                <div>
                  <div className="eyebrow">Upload</div>
                  <h3 className="obs-headline">New cohort</h3>
                </div>
                <button className="toolbar-btn icon-only" onClick={() => setUploadOpen(false)}><Icon name="x" size={14}/></button>
              </div>
              <div className="drawer-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                  Paste a list of emails (one per line, or comma-separated). They&apos;re hashed in-process; <strong>raw emails are never stored</strong>. Only the SHA-256 digest is persisted.
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Cohort name</span>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={e => setUploadName(e.target.value)}
                    placeholder="e.g. Spring 2026 conference attendees"
                    disabled={uploadPending}
                    style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", fontSize: 13 }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-3)" }}>Emails</span>
                  <textarea
                    value={uploadPasted}
                    onChange={e => setUploadPasted(e.target.value)}
                    placeholder={"jane@example.com\njohn@example.com\n…"}
                    disabled={uploadPending}
                    rows={10}
                    style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontFamily: "ui-monospace, monospace", resize: "vertical" }}
                  />
                </label>
                {uploadResult && uploadResult.ok === false && (
                  <div style={{ fontSize: 12, color: "var(--bad)", padding: "8px 10px", background: "rgba(204,82,82,0.08)", borderRadius: 6 }}>
                    {uploadResult.error}
                  </div>
                )}
                {uploadResult && uploadResult.ok === true && (
                  <div style={{ fontSize: 12, color: "var(--good)", padding: "8px 10px", background: "rgba(46,125,91,0.1)", borderRadius: 6 }}>
                    Uploaded · {uploadResult.total_matched.toLocaleString()} of {uploadResult.total_uploaded.toLocaleString()} matched on the identity graph.
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <button className="toolbar-btn" onClick={() => setUploadOpen(false)} disabled={uploadPending}>Cancel</button>
                  <button
                    className="toolbar-btn"
                    onClick={submitUpload}
                    disabled={uploadPending || !uploadName.trim() || !uploadPasted.trim()}
                    style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}
                  >
                    {uploadPending ? "Uploading…" : "Upload cohort"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Foot — descriptive-only disclaimer + Lagged Impact link */}
        <div className="card" style={{ padding: "14px 18px", fontSize: 12, color: "var(--ink-3)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <strong style={{ color: "var(--ink-2)" }}>Descriptive only.</strong> Connections shown are co-occurrence + sequence — not causal estimates. <em>{outcomeWindowDays}d outcome</em> is the share of identities that reached a purchase within {outcomeWindowDays} days of the connection touch. <em>Lift</em> compares each connection to a baseline: for channels, the rate across everyone active in the same window; for pages and campaigns, the share of all identities who touched it over the last 90 days — a stable long-run popularity rate, so page/campaign lift reads relative to that.
          </div>
          <div>
            Want to measure these relationships? → <a href={`/chapter/connections/lagged-impact?client=${clientKey}&range=${range}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Lagged Impact →</a>
          </div>
        </div>
      </div>
    </>
  );
}
