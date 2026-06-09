// Server component for /chapter/journeys.
//
// Reads URL params:
//   ?client    = client_key
//   ?range     = window (inherited from page-level filter)
//   ?action    = event_name filter (identify | add_to_cart | view_cart | purchase | page_view)
//   ?outcome   = converted | open
//   ?identity  = canonical_identity_key (which detail panel to render)
//
// Fetches in parallel:
//   - journeys_overview_stats (summary card)
//   - journeys_overview_list (left identity list)
//   - if ?identity present → journey_detail_chapters + events + aliases (right panel)
//
// Audit logging: when ?identity is set we call logPiiView() — this is the
// load-bearing privacy compliance hook (see CLAUDE.md May 26 Completed Fix).
//
// The chapter_auth cookie value is hashed to form the viewer_session. Until
// per-user Supabase auth is wired, this is the coarse-grained operator handle.

import { cookies, headers } from "next/headers";
import JourneysClient from "./JourneysClient";
import { rangeToWindow } from "../../_components/format";
import {
  bucketedNow,
  cachedJourneysStats,
  cachedJourneysList,
  cachedJourneyDetailChapters,
  cachedJourneyDetailEvents,
  cachedJourneyDetailAliases,
  cachedClientConfig,
} from "../../_lib/dashboard-rpc";
import { logPiiView, hashSecret } from "@/app/lib/audit/pii-views";
import { hashIp, getClientIp } from "@/app/lib/audit/auth";

type SearchParams = Promise<{
  client?:   string;
  range?:    string;
  action?:   string;
  outcome?:  string;
  identity?: string;
}>;

export default async function JourneysPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clientKey = (params.client && params.client.trim()) || "eos_fabrics";
  const range     = (params.range  && params.range.trim())  || "30d";
  const action    = (params.action && params.action.trim() && params.action !== "all")  ? params.action : null;
  const outcome   = (params.outcome && params.outcome.trim() && params.outcome !== "all") ? params.outcome : null;
  const identity  = (params.identity && params.identity.trim()) || null;

  // Fetch per-client config first — needed for tz-aware date math.
  // Subsequent unstable_cache hit makes this near-free for repeat visits.
  const clientConfig = await cachedClientConfig(clientKey);
  const { start, end } = rangeToWindow(range, bucketedNow(), clientConfig.display_tz);
  const filterArgs = {
    p_client_key: clientKey,
    p_start_ts: start.toISOString(),
    p_end_ts:   end.toISOString(),
    p_action:   action,
    p_outcome:  outcome,
  };

  // Fetch list + summary in parallel. Detail RPCs fire only when an identity
  // is selected.
  const [statsRows, listRows] = await Promise.all([
    cachedJourneysStats(filterArgs),
    cachedJourneysList({ ...filterArgs, p_limit: 50 }),
  ]);

  const stats = statsRows[0] ?? null;

  // Default detail = ?identity if provided AND in list, else first list row.
  const selectedIdentity =
    identity && listRows.some(r => r.canonical_identity_key === identity)
      ? identity
      : listRows[0]?.canonical_identity_key ?? null;

  let chapters: Awaited<ReturnType<typeof cachedJourneyDetailChapters>> = [];
  let events:   Awaited<ReturnType<typeof cachedJourneyDetailEvents>>   = [];
  let aliases:  Awaited<ReturnType<typeof cachedJourneyDetailAliases>>  = [];

  if (selectedIdentity) {
    const detailArgs = {
      p_client_key: clientKey,
      p_canonical_identity_key: selectedIdentity,
    };
    [chapters, events, aliases] = await Promise.all([
      cachedJourneyDetailChapters(detailArgs),
      cachedJourneyDetailEvents(detailArgs),
      cachedJourneyDetailAliases(detailArgs),
    ]);

    // ── Audit-log this detail view. Non-blocking; failures are logged but
    //    never break the page render. Only logs when the user EXPLICITLY
    //    navigated to a specific identity (?identity in URL) — not on the
    //    default first-row auto-selection — to avoid noise.
    if (identity === selectedIdentity) {
      const h = await headers();
      const c = await cookies();
      const authCookie = c.get("chapter_auth")?.value ?? null;
      const ip = getClientIp({ headers: { get: (n: string) => h.get(n) } });
      const ua = h.get("user-agent");
      // Fire-and-forget — do not await; never block page render.
      void logPiiView({
        page: "/chapter/journeys",
        client_key: clientKey,
        viewed_identity: selectedIdentity,
        viewer_session: hashSecret(authCookie),
        ip_hash: hashIp(ip),
        user_agent_snippet: ua,
        request_id: h.get("x-request-id"),
      });
    }
  }

  return (
    <JourneysClient
      stats={stats}
      list={listRows}
      selectedIdentity={selectedIdentity}
      chapters={chapters}
      events={events}
      aliases={aliases}
      clientKey={clientKey}
      range={range}
      action={action ?? "all"}
      outcome={outcome ?? "all"}
      boundaryEvent={clientConfig.boundary_event_name}
    />
  );
}
