// Server component for /chapter/connections/influence (Cross-Source Influence).
//
// v1 anchor types supported: channel, page.
// Campaign / Person / Cohort still parked.

import InfluenceClient from "./InfluenceClient";
import { rangeToWindow } from "../../../_components/format";
import {
  bucketedNow,
  cachedClientConfig,
  cachedConnectionsAnchorResolve,
  cachedConnectionsPanel,
  cachedConnectionsPageOptions,
  cachedConnectionsCampaignOptions,
  cachedConnectionsCohortOptions,
  cachedConnectionsSelfRecurrence,
  type ConnectionsAnchorPayload,
  type ConnectionsAnchorType,
  type ConnectionsConnectionType,
  type ConnectionsPageOption,
  type ConnectionsCampaignOption,
  type ConnectionsCohortOption,
} from "../../../_lib/dashboard-rpc";

type SearchParams = Promise<{
  client?:              string;
  range?:               string;
  anchor_type?:         string;
  anchor_channel?:      string;
  anchor_page_path?:    string;
  anchor_campaign_id?:  string;
  anchor_cohort_id?:    string;
  window_days?:         string;
  outcome_window_days?: string;
  connection_type?:     string;
}>;

const DEFAULT_CHANNEL             = "email";
const DEFAULT_PAGE_PATH_FALLBACK  = "/";
const DEFAULT_WINDOW_DAYS         = 30;
const DEFAULT_OUTCOME_WINDOW_DAYS = 30;
const DEFAULT_RANGE               = "90d";

export default async function CrossSourceInfluencePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey   = (params.client && params.client.trim()) || "eos_fabrics";
  const range       = (params.range && params.range.trim()) || DEFAULT_RANGE;
  const rawType     = (params.anchor_type && params.anchor_type.trim()) || "channel";
  const anchorType: ConnectionsAnchorType =
    rawType === "page"     ? "page" :
    rawType === "campaign" ? "campaign" :
    rawType === "cohort"   ? "cohort" :
    "channel";
  const channel     = (params.anchor_channel && params.anchor_channel.trim()) || DEFAULT_CHANNEL;
  const windowDays  = Math.max(1, Math.min(180, parseInt(params.window_days || "", 10) || DEFAULT_WINDOW_DAYS));
  const outcomeWindowDays = Math.max(1, Math.min(180, parseInt(params.outcome_window_days || "", 10) || DEFAULT_OUTCOME_WINDOW_DAYS));

  // Connections-view default depends on anchor type: when the anchor is a
  // page / campaign / cohort, page-to-page is the more interesting question;
  // when the anchor is a channel, channel-to-channel stays the default.
  const rawConnType   = (params.connection_type && params.connection_type.trim()) || "";
  const connectionType: ConnectionsConnectionType = rawConnType === "page"
    ? "page"
    : rawConnType === "channel"
    ? "channel"
    : (anchorType === "channel" ? "channel" : "page");

  const clientConfig = await cachedClientConfig(clientKey);
  const { start, end } = rangeToWindow(range, bucketedNow(), clientConfig.display_tz);

  // Always fetch picker option lists so each anchor-type's dropdown has data
  // ready (cached per window). Cheap independent calls.
  const [pageOptions, campaignOptions, cohortOptions]: [
    ConnectionsPageOption[],
    ConnectionsCampaignOption[],
    ConnectionsCohortOption[],
  ] = await Promise.all([
    cachedConnectionsPageOptions({
      p_client_key: clientKey, p_start_ts: start.toISOString(), p_end_ts: end.toISOString(), p_limit: 30,
    }),
    cachedConnectionsCampaignOptions({
      p_client_key: clientKey, p_start_ts: start.toISOString(), p_end_ts: end.toISOString(), p_limit: 30,
    }),
    cachedConnectionsCohortOptions({
      p_client_key: clientKey, p_limit: 30,
    }),
  ]);

  // Anchor identifier defaults: page → top by views; campaign → most recent;
  // cohort → most recently uploaded.
  const pagePath = (params.anchor_page_path && params.anchor_page_path.trim())
    || pageOptions[0]?.page_path
    || DEFAULT_PAGE_PATH_FALLBACK;
  const campaignId = (params.anchor_campaign_id && params.anchor_campaign_id.trim())
    || campaignOptions[0]?.campaign_id
    || "";
  // Validate the URL cohort_id against the picker list — drops legacy
  // synthetic "system:*" ids from before cohorts were materialized, and
  // gracefully falls back if a cohort was deleted.
  const urlCohortId = (params.anchor_cohort_id && params.anchor_cohort_id.trim()) || "";
  const cohortId = cohortOptions.some(c => c.cohort_id === urlCohortId)
    ? urlCohortId
    : (cohortOptions[0]?.cohort_id || "");

  // Build the anchor payload.
  const anchorPayload: ConnectionsAnchorPayload =
    anchorType === "page"
      ? { page_path:   pagePath,   start_ts: start.toISOString(), end_ts: end.toISOString() }
    : anchorType === "campaign"
      ? { campaign_id: campaignId, start_ts: start.toISOString(), end_ts: end.toISOString() }
    : anchorType === "cohort"
      ? { cohort_id:   cohortId,   start_ts: start.toISOString(), end_ts: end.toISOString() }
      : { channel:     channel,    start_ts: start.toISOString(), end_ts: end.toISOString() };

  // Self-repetition strip per spec §4.3a: only meaningful when the connection
  // type matches the anchor type. Channel anchor + channel connections → strip
  // the anchor channel. Page anchor + page connections → strip the anchor page.
  // Cross-type combos (e.g. Page anchor + channel connections) need no strip.
  const excludeChannels = (anchorType === "channel" && connectionType === "channel") ? [channel]  : [];
  const excludePages    = (anchorType === "page"    && connectionType === "page")    ? [pagePath] : [];

  const [resolveRows, upstreamRows, downstreamRows, selfRecurrenceRows] = await Promise.all([
    cachedConnectionsAnchorResolve({
      p_client_key:     clientKey,
      p_anchor_type:    anchorType,
      p_anchor_payload: anchorPayload,
    }),
    cachedConnectionsPanel({
      p_client_key:           clientKey,
      p_anchor_type:          anchorType,
      p_anchor_payload:       anchorPayload,
      p_direction:            "upstream",
      p_window_days:          windowDays,
      p_outcome_window_days:  outcomeWindowDays,
      p_exclude_channels:     excludeChannels,
      p_connection_type:      connectionType,
      p_exclude_pages:        excludePages,
    }),
    cachedConnectionsPanel({
      p_client_key:           clientKey,
      p_anchor_type:          anchorType,
      p_anchor_payload:       anchorPayload,
      p_direction:            "downstream",
      p_window_days:          windowDays,
      p_outcome_window_days:  outcomeWindowDays,
      p_exclude_channels:     excludeChannels,
      p_connection_type:      connectionType,
      p_exclude_pages:        excludePages,
    }),
    // Self-recurrence tile — only meaningful for channel anchor in v1 but the
    // RPC is safe to call for any anchor type (returns zeros for others).
    cachedConnectionsSelfRecurrence({
      p_client_key:     clientKey,
      p_anchor_type:    anchorType,
      p_anchor_payload: anchorPayload,
    }),
  ]);

  const resolve         = resolveRows[0] ?? null;
  const selfRecurrence  = selfRecurrenceRows[0] ?? null;

  return (
    <InfluenceClient
      clientKey={clientKey}
      range={range}
      anchorType={anchorType}
      anchorChannel={channel}
      anchorPagePath={pagePath}
      anchorCampaignId={campaignId}
      anchorCohortId={cohortId}
      pageOptions={pageOptions}
      campaignOptions={campaignOptions}
      cohortOptions={cohortOptions}
      windowDays={windowDays}
      outcomeWindowDays={outcomeWindowDays}
      connectionType={connectionType}
      resolve={resolve}
      selfRecurrence={selfRecurrence}
      upstream={upstreamRows}
      downstream={downstreamRows}
    />
  );
}
