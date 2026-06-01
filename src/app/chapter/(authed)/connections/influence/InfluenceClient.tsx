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

const ANCHOR_TYPES: { value: string; label: string; enabled: boolean }[] = [
  { value: "channel",  label: "Channel",  enabled: true },
  { value: "page",     label: "Page",     enabled: true },
  { value: "campaign", label: "Campaign", enabled: true },
  { value: "cohort",   label: "Cohort",   enabled: true },
];

function channelLabel(v: string): string {
  return CHANNEL_OPTIONS.find(o => o.value === v)?.label ?? v;
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

// Single source of truth for the panel grid layout. Tight on the right-hand
// numeric columns so the outcome % is always visible without horizontal
// scroll. Channel column is flexible + ellipsis-truncating. Column gap is
// zero — visual separation comes from vertical dividers + cell padding.
const PANEL_GRID    = "minmax(80px,1fr) 52px 62px 68px 92px";
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

function ConnectionRow({ row, index }: { row: ConnectionsPanelRow; index: number }) {
  const isPageRow = row.connected_thing_type === "page";
  const stripe = index % 2 === 1 ? "rgba(15,23,34,0.025)" : "transparent";
  return (
    <div
      className="lrow"
      style={{
        gridTemplateColumns: PANEL_GRID,
        columnGap: 0,
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: DIVIDER,
        background: stripe,
      }}
    >
      <div style={{ ...cellDivided(true), minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {isPageRow
          ? <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{row.connected_thing_label}</span>
          : <ChannelChip ch={row.connected_thing_id as ChannelKey} />}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
        {row.n_identities}
      </div>
      <div style={{ ...cellDivided(false), textAlign: "center", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)", fontSize: 12 }}>
        {fmtPct(row.pct_of_anchor)}
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
  top, bottom, firstCell = false,
}: { top?: string; bottom: string; firstCell?: boolean }) {
  return (
    <div
      style={{
        ...cellDivided(firstCell),
        textAlign: firstCell ? "left" : "center",
        whiteSpace: "nowrap",
        display: "flex",
        flexDirection: "column",
        alignItems: firstCell ? "flex-start" : "center",
        gap: 2,
        lineHeight: 1.1,
      }}
    >
      <span style={{ color: "var(--ink-4)", fontWeight: 500 }}>{top ?? " "}</span>
      <span>{bottom}</span>
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
      <HeaderCell                              bottom="Channel" firstCell />
      <HeaderCell                              bottom="People"  />
      <HeaderCell top="of"      bottom="Anchor" />
      <HeaderCell top="Median"  bottom="Lag"    />
      <HeaderCell top={`${outcomeWindowDays}d`} bottom="Outcome" />
    </div>
  );
}

function Panel({
  title, subtitle, rows, outcomeWindowDays, emptyText,
}: {
  title: string; subtitle: string;
  rows: ConnectionsPanelRow[];
  outcomeWindowDays: number;
  emptyText: string;
}) {
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
          <div style={{ minWidth: 380 }}>
            <PanelHeader outcomeWindowDays={outcomeWindowDays} />
            <div>
              {rows.map((r, i) => <ConnectionRow key={i} row={r} index={i} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Anchor-specific definition + example reading rendered in the navy hero.
// Picks the top downstream row (or upstream if no downstream) as a concrete
// example so the reading uses the operator's actual numbers.
function AnchorExplanation({
  anchorType, anchorChannelLabel, anchorPagePath, campaignName, campaignUniqueClickers,
  cohortName, cohortKind, cohortTotalUploaded, cohortTotalMatched,
  matchRate, nAnchor, windowDays, outcomeWindowDays, connectionsNoun,
  exampleRow, exampleDir,
}: {
  anchorType:           string;
  anchorChannelLabel:   string;
  anchorPagePath:       string;
  campaignName:         string | null | undefined;
  campaignUniqueClickers: number | null | undefined;
  cohortName:           string | null | undefined;
  cohortKind:           string | null | undefined;
  cohortTotalUploaded:  number | null | undefined;
  cohortTotalMatched:   number | null | undefined;
  matchRate:            number | null;
  nAnchor:              number;
  windowDays:           number;
  outcomeWindowDays:    number;
  connectionsNoun:      string;
  exampleRow:           ConnectionsPanelRow | null;
  exampleDir:           "upstream" | "downstream" | null;
}) {
  const para: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" };
  const sub: React.CSSProperties  = { fontSize: 12.5, lineHeight: 1.5, color: "rgba(255,255,255,0.70)", marginTop: 8 };
  const accent: React.CSSProperties = { color: "var(--accent)", fontWeight: 600 };

  let definition: React.ReactNode;
  let reading: React.ReactNode;

  if (anchorType === "channel") {
    definition = <>An anchor of <span style={accent}>Channel</span> is the session-<em>entry</em> channel of a journey — Email, Direct, Organic Search, etc. — for any session a person started during the anchor window.</>;
    reading = exampleRow
      ? <>E.g. of <strong>{nAnchor.toLocaleString()}</strong> identities anchored on {anchorChannelLabel}, <strong>{Number(exampleRow.n_identities).toLocaleString()}</strong> ({((Number(exampleRow.pct_of_anchor) || 0) * 100).toFixed(1)}%) also entered via <strong>{exampleRow.connected_thing_label}</strong> a median {fmtLag(exampleRow.median_lag_days)} ({exampleDir}); <strong>{((Number(exampleRow.outcome_rate) || 0) * 100).toFixed(0)}%</strong> of those went on to purchase within {outcomeWindowDays} days of that touch.</>
      : <>No connection rows surfaced yet — try a busier channel or widen the lag window.</>;
  } else if (anchorType === "page") {
    definition = <>An anchor of <span style={accent}>Page</span> is <em>any</em> page-view event matching the chosen path during the anchor window — not just session-entry. Same session, different session, doesn&apos;t matter — if they loaded that URL, they&apos;re in the set.</>;
    reading = exampleRow
      ? <>E.g. of <strong>{nAnchor.toLocaleString()}</strong> identities who viewed <strong>{anchorPagePath}</strong>, <strong>{Number(exampleRow.n_identities).toLocaleString()}</strong> ({((Number(exampleRow.pct_of_anchor) || 0) * 100).toFixed(1)}%) also touched <strong>{exampleRow.connected_thing_label}</strong> a median {fmtLag(exampleRow.median_lag_days)} ({exampleDir}); <strong>{((Number(exampleRow.outcome_rate) || 0) * 100).toFixed(0)}%</strong> of those purchased within {outcomeWindowDays} days of that {connectionsNoun === "pages" ? "page view" : "channel touch"}.</>
      : <>No connection rows surfaced yet — try a higher-traffic page or widen the lag window.</>;
  } else if (anchorType === "campaign") {
    const matchedPct = matchRate != null ? Math.round(Number(matchRate) * 100) : null;
    definition = <>An anchor of <span style={accent}>Campaign</span> is a <em>click event</em> from the ESP&apos;s records (Mailchimp Reports API) during the anchor window. Opens are excluded — too much bot noise. Recipients are resolved via email_sha256 against your identity graph; the unmatched are real clickers we&apos;ve just never seen on-site.</>;
    reading = exampleRow ? (
      <>E.g. of <strong>{campaignUniqueClickers != null ? Number(campaignUniqueClickers).toLocaleString() : "—"}</strong> total clickers, we resolved <strong>{nAnchor.toLocaleString()}</strong>{matchedPct != null ? <> ({matchedPct}%)</> : null} to identities. Of those, <strong>{Number(exampleRow.n_identities).toLocaleString()}</strong> touched <strong>{exampleRow.connected_thing_label}</strong> a median {fmtLag(exampleRow.median_lag_days)} ({exampleDir}); <strong>{((Number(exampleRow.outcome_rate) || 0) * 100).toFixed(0)}%</strong> of those purchased within {outcomeWindowDays} days.</>
    ) : <>No connection rows surfaced yet — at low resolved-clicker counts the gate (≥5 identities per row) may not clear.</>;
  } else {
    // cohort
    const isSystem = cohortKind === "system";
    definition = isSystem ? (
      <>An anchor of <span style={accent}>Cohort</span> (built-in) is a pre-defined identity set computed nightly from your data — e.g. tercile splits by lifetime purchase value, or all identities with a known email. For built-in cohorts the anchor moment is the midpoint of the analysis window, so upstream and downstream lag windows straddle it symmetrically.</>
    ) : (
      <>An anchor of <span style={accent}>Cohort</span> (uploaded) is a hashed email list you provided that we matched against your identity graph. Raw emails are never stored — SHA-256 only. Anchor moment is the upload timestamp (editable later to match the actual converge moment, e.g. a conference date).</>
    );
    reading = exampleRow ? (
      <>E.g. <strong>{cohortName || "this cohort"}</strong> resolves to <strong>{nAnchor.toLocaleString()}</strong> identities{!isSystem && cohortTotalUploaded ? <> ({Number(cohortTotalMatched ?? 0).toLocaleString()} of {Number(cohortTotalUploaded).toLocaleString()} uploaded matched)</> : null}. Of those, <strong>{Number(exampleRow.n_identities).toLocaleString()}</strong> ({((Number(exampleRow.pct_of_anchor) || 0) * 100).toFixed(1)}%) touched <strong>{exampleRow.connected_thing_label}</strong> a median {fmtLag(exampleRow.median_lag_days)} ({exampleDir}); <strong>{((Number(exampleRow.outcome_rate) || 0) * 100).toFixed(0)}%</strong> of those purchased within {outcomeWindowDays} days.</>
    ) : <>No connection rows surfaced yet — try widening the lag window, or this cohort may be too thin for ≥5-identity rows.</>;
  }

  return (
    <>
      <div style={para}>{definition}</div>
      <div style={sub}>{reading}</div>
    </>
  );
}

export default function InfluenceClient({
  clientKey, range, anchorType, anchorChannel, anchorPagePath, anchorCampaignId, anchorCohortId, pageOptions, campaignOptions, cohortOptions, windowDays, outcomeWindowDays, connectionType, resolve, upstream, downstream,
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
  connectionType:    ConnectionsConnectionType;
  resolve:           ConnectionsAnchorResolveRow | null;
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
  const connectionsNoun  = connectionType === "page" ? "pages" : "channels";

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
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                Anchor on a <strong>{anchorType === "channel" ? "channel" : anchorType === "page" ? "page" : anchorType === "campaign" ? "campaign" : "cohort"}</strong> above. The middle column shows the identity set selected. The two side panels show OTHER {connectionsNoun} those same identities touched within {windowDays} days before (left) or after (right) their anchor moment. <strong>This describes connections in your data — it does not estimate cause.</strong> The measured cousin lives at <em>Lagged Impact</em>.
              </div>
            </div>

            {/* RIGHT — anchor-specific definition + example reading */}
            <div style={{ flex: "1 1 360px", borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: 22 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--accent)", fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>About this anchor</span>
                <span style={{ color: "rgba(255,255,255,0.35)" }}><Icon name="influence" size={16} /></span>
              </div>
              <AnchorExplanation
                anchorType={anchorType}
                anchorChannelLabel={channelLabel(anchorChannel)}
                anchorPagePath={anchorPagePath}
                campaignName={selectedCampaign?.campaign_name || anchorCampaignId}
                campaignUniqueClickers={selectedCampaign?.unique_clickers}
                cohortName={selectedCohort?.name}
                cohortKind={selectedCohort?.kind}
                cohortTotalUploaded={selectedCohort?.total_uploaded}
                cohortTotalMatched={selectedCohort?.total_matched}
                matchRate={resolve?.match_rate ?? null}
                nAnchor={nAnchor}
                windowDays={windowDays}
                outcomeWindowDays={outcomeWindowDays}
                connectionsNoun={connectionsNoun}
                exampleRow={downstream[0] ?? upstream[0] ?? null}
                exampleDir={downstream[0] ? "downstream" : upstream[0] ? "upstream" : null}
              />
            </div>
          </div>
        </div>

        {/* Anchor picker bar */}
        <div className="filter-bar" style={{ alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          {/* Anchor type tabs */}
          <div className="toggle-group">
            {ANCHOR_TYPES.map(t => (
              <button
                key={t.value}
                className={anchorType === t.value ? "active" : ""}
                disabled={!t.enabled}
                onClick={() => t.enabled && setParam("anchor_type", t.value)}
                title={t.enabled ? undefined : "Coming soon"}
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

          {/* Connection type toggle — shown for Page / Campaign / Cohort
              anchors. Channel anchor stays single-view for now. */}
          {(anchorType === "page" || anchorType === "campaign" || anchorType === "cohort") && (
            <div className="toggle-group">
              <button
                className={connectionType === "page" ? "active" : ""}
                onClick={() => setParam("connection_type", "page")}
                title="Show what other pages they visited"
              >
                Pages
              </button>
              <button
                className={connectionType === "channel" ? "active" : ""}
                onClick={() => setParam("connection_type", "channel")}
                title="Show what channels brought them or returned them"
              >
                Channels
              </button>
            </div>
          )}

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

          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>
            Anchor window: <strong style={{ color: "var(--ink-2)" }}>{range}</strong>
          </div>
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
              subtitle={`${connectionsNoun === "pages" ? "Pages" : "Channels"} visited ${windowDays} days BEFORE the ${anchorDisplay} ${anchorTouchNoun}`}
              rows={upstream}
              outcomeWindowDays={outcomeWindowDays}
              emptyText={`No upstream ${connectionsNoun} meeting the 5-identity minimum within ${windowDays}d.`}
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
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                Bot-filtered · resolved across all sources
              </div>
            </div>

            {/* DOWNSTREAM (right) */}
            <Panel
              title="Downstream"
              subtitle={`${connectionsNoun === "pages" ? "Pages" : "Channels"} visited ${windowDays} days AFTER the ${anchorDisplay} ${anchorTouchNoun}`}
              rows={downstream}
              outcomeWindowDays={outcomeWindowDays}
              emptyText={`No downstream ${connectionsNoun} meeting the 5-identity minimum within ${windowDays}d.`}
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
            <strong style={{ color: "var(--ink-2)" }}>Descriptive only.</strong> Connections shown are co-occurrence + sequence — not causal estimates. <em>{outcomeWindowDays}d outcome</em> is the share of identities that reached a purchase within {outcomeWindowDays} days of the connection touch.
          </div>
          <div>
            Want to measure these relationships? → <a href={`/chapter/connections/lagged-impact?client=${clientKey}&range=${range}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Lagged Impact →</a>
          </div>
        </div>
      </div>
    </>
  );
}
