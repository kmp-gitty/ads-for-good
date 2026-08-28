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
  cachedConnectionsReturnLoop,
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
// Anchor window follows the top Date Range selector (?range=, written by
// setDateRange). Default MUST match the global TopBar/context default ("30d")
// so the "Anchor window" readout agrees with the selector on first load —
// otherwise the top shows "Last 30 days" while this page silently used 90d.
const DEFAULT_RANGE               = "30d";

// force-dynamic: analytics pages read searchParams + navigate via router.replace;
// without this Next 16 caches the RSC and soft nav (row click / sort) shows stale
// until a hard refresh. Dynamic classification -> Router Cache staleTime 0 -> refetch.
export const dynamic = "force-dynamic";

export default async function CrossSourceInfluencePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey   = (params.client && params.client.trim()) || "eos_fabrics";
  const range       = (params.range && params.range.trim()) || DEFAULT_RANGE;
  const rawType     = (params.anchor_type && params.anchor_type.trim()) || "channel";
  // 9.4 — Cohort removed as an anchor (a cohort is a property of people, not a
  // timed touchpoint, so "what did it feed?" isn't well-posed). Will return as
  // a filter across the other anchor types. Backend (connections_cohorts,
  // uploads, RPC cohort path) is preserved; a bookmarked ?anchor_type=cohort
  // now falls back to channel.
  const anchorType: ConnectionsAnchorType =
    rawType === "page"     ? "page" :
    rawType === "campaign" ? "campaign" :
    "channel";
  const channel     = (params.anchor_channel && params.anchor_channel.trim()) || DEFAULT_CHANNEL;
  const windowDays  = Math.max(1, Math.min(180, parseInt(params.window_days || "", 10) || DEFAULT_WINDOW_DAYS));
  const outcomeWindowDays = Math.max(1, Math.min(180, parseInt(params.outcome_window_days || "", 10) || DEFAULT_OUTCOME_WINDOW_DAYS));

  // 9.3 — connection VIEW. Default is "all": a single mixed panel that unions
  // channel + page + campaign connections and ranks them by lift, so the most
  // influential connection surfaces regardless of type. The explicit type
  // toggles (Channels / Pages / Campaigns) still narrow to one dimension.
  const rawConnType   = (params.connection_type && params.connection_type.trim()) || "";
  const connectionView: "all" | ConnectionsConnectionType =
    rawConnType === "page"     ? "page" :
    rawConnType === "channel"  ? "channel" :
    rawConnType === "campaign" ? "campaign" :
    "all";

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
      : { channel:     channel,    start_ts: start.toISOString(), end_ts: end.toISOString() }; // cohort anchor removed (9.4)

  // Self-repetition strip per spec §4.3a: strip the anchor's own identity from
  // the connection list. A channel anchor strips its channel from channel
  // connections; a page anchor strips its page from page connections. Campaign
  // self-exclusion is handled inside the RPC (campaign branch). Each dimension's
  // RPC only applies the exclude array it understands, so passing both is safe.
  const excludeChannels = anchorType === "channel" ? [channel]  : [];
  const excludePages    = anchorType === "page"    ? [pagePath] : [];

  // 9.3 — dimensions to fetch. "all" unions channel + page + campaign; a
  // specific view fetches just that one. Each dimension is its own snapshot-
  // backed RPC call, so the merge stays fast; the client ranks the union by
  // lift and tags each row with its dimension (connected_thing_type).
  const dims: ConnectionsConnectionType[] =
    connectionView === "all" ? ["channel", "page", "campaign"] : [connectionView];

  const fetchPanel = (direction: "upstream" | "downstream") =>
    Promise.all(
      dims.map((dim) =>
        cachedConnectionsPanel({
          p_client_key:          clientKey,
          p_anchor_type:         anchorType,
          p_anchor_payload:      anchorPayload,
          p_direction:           direction,
          p_window_days:         windowDays,
          p_outcome_window_days: outcomeWindowDays,
          p_exclude_channels:    excludeChannels,
          p_connection_type:     dim,
          p_exclude_pages:       excludePages,
        }),
      ),
    ).then((lists) => lists.flat());

  const [resolveRows, upstreamRows, downstreamRows, selfRecurrenceRows, returnLoopRows] = await Promise.all([
    cachedConnectionsAnchorResolve({
      p_client_key:     clientKey,
      p_anchor_type:    anchorType,
      p_anchor_payload: anchorPayload,
    }),
    fetchPanel("upstream"),
    fetchPanel("downstream"),
    // Self-recurrence tile — only meaningful for channel anchor in v1 but the
    // RPC is safe to call for any anchor type (returns zeros for others).
    cachedConnectionsSelfRecurrence({
      p_client_key:     clientKey,
      p_anchor_type:    anchorType,
      p_anchor_payload: anchorPayload,
    }),
    // 9.5 — return-loop, channel anchor only (session-level table).
    anchorType === "channel"
      ? cachedConnectionsReturnLoop({
          p_client_key: clientKey,
          p_channel:    channel,
          p_start_ts:   start.toISOString(),
          p_end_ts:     end.toISOString(),
        })
      : Promise.resolve([]),
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
      connectionView={connectionView}
      resolve={resolve}
      selfRecurrence={selfRecurrence}
      returnLoop={returnLoopRows}
      upstream={upstreamRows}
      downstream={downstreamRows}
    />
  );
}
