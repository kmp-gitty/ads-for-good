# CLAUDE.md — Chapter Project Context
> This file is the living source of truth for Claude Code sessions.
> Updated at the end of each working session. Do not modify manually.
> Last updated: June 9, 2026

---

## 🗂 What This Repo Is

This is a **single Next.js (App Router) repo** that contains two things:

1. **Ads for Good** — an agency website (the majority of `src/app/`)
2. **Chapter** — a lifecycle attribution and identity infrastructure platform built on top of Supabase + Next.js

They share one repo, one Vercel deployment. Be careful not to break agency pages when working on Chapter.

**Agency pages (DO NOT TOUCH unless explicitly asked):**
- `src/app/about`
- `src/app/contact`
- `src/app/for-businesses`
- `src/app/for-clients`
- `src/app/for-good`
- `src/app/for-people`
- `src/app/network`
- `src/app/page.tsx` (homepage — agency)

---

## 🏗 Chapter Architecture

### Stack
- **Frontend / API:** Next.js App Router (TypeScript)
- **Database:** Supabase (Postgres) — project ID `bvvmmhekdgskeilczeuy`, region `us-west-2`
- **Deployment:** Vercel

### Chapter API Endpoints (all in `src/app/api/`)
| Folder | Purpose |
|--------|---------|
| `pixel/` | Serves the client-side pixel script (pixel.js) |
| `chapter/collect` | Receives all pixel events → writes to `chapter_ingest.pixel_events` |
| `purchase/` | Server-side purchase ingestion → `chapter_ingest.purchase_events` |
| `conversion/` | Non-purchase conversions → `chapter_ingest.conversion_events` |
| `consent/` | Consent state tracking → `chapter_ingest.consent_events` |
| `identify/` | Identity stitching → `chapter_identity.identity_aliases` |
| `alias/` | Identity alias management |
| `offline/` | Offline milestones + identity seeds |
| `inquiry/` | Agency contact/lead form (NOT Chapter) |

### Pixel Files
- **`src/app/api/chapter/pixel.js/route.ts`** — serves the pixel.js script to clients (returns the JS as a string in the GET handler, `Cache-Control: no-store` so clients always pull the latest)
- **`src/app/api/pixel/route.ts`** — server-side ingest helper (NOT the script-serving file; CLAUDE.md previously documented this incorrectly)
- **`src/app/api/chapter/collect/route.ts`** (or similar) — receives events server-side

---

## 🗄 Supabase Schema Overview

### Data Flow
```
chapter_ingest (raw events)
   ↓
chapter_identity (identity resolution)
   ↓
chapter_journey (session grouping)
   ↓
chapter_model (unified events + lifecycle chapters)
   ↓
chapter_attribution (paths + attribution + reporting)
   ↓
chapter_reporting (dashboard outputs — EOS-specific for now)
```

### Schemas
| Schema | Purpose |
|--------|---------|
| `chapter_ingest` | Raw event intake — pixel, purchase, conversion, offline, consent |
| `chapter_identity` | Identity graph — aliases, canonical resolution, links |
| `chapter_journey` | Session/journey containers |
| `chapter_model` | Unified event stream, timeline, lifecycle chapters |
| `chapter_attribution` | Channel paths, attribution models (first/last/linear) |
| `chapter_reporting` | Dashboard-ready outputs (generalizing per-tile; new tables drop the `eos_` prefix) |
| `chapter_analysis` | Experimental, QA, debug objects — not production |
| `chapter_config` | Per-client config — `clients` (PK config: storefront_domain / boundary_event_name / display_tz), `client_secrets`, `shopify_webhook_secrets`, `email_campaigns`, `email_engagement_events`, `connections_cohorts` + `connections_cohort_members` |
| `chapter_observations` | Observations engine — `questions` catalog, `findings` state machine, `runs` audit (added June 2, 2026) |
| `chapter_audit` | Auth-attempt + PII-view audit logs (added Fix #26 part 4) |

### Critical Tables
- `chapter_ingest.pixel_events` — primary behavioral feed
- `chapter_ingest.purchase_events` — primary revenue signal (contains `raw` Shopify JSON with `browser_ip`)
- `chapter_ingest.conversion_events` — non-purchase conversions
- `chapter_ingest.offline_milestones` — offline event feed
- `chapter_ingest.offline_identity_seeds` — CRM/offline identity bridge
- `chapter_identity.identity_aliases` — core identity graph edges
- `chapter_identity.identity_canon` — fast canonical identity lookup
- `chapter_identity.identity_canonical` — recursive resolution engine (VIEW)
- `chapter_identity.identity_links` — journey ↔ identity bridge
- `chapter_journey.journeys` — session containers (has `country`, `city`, `user_agent`, `region`)
- `chapter_model.lifecycle_chapters` — attribution boundary events (VIEW)
- `chapter_model.unified_events_v2` — canonical event stream (VIEW)

### Active Clients (as of June 9, 2026)
- **EOS Fabrics** (`client_key = 'eos_fabrics'`, shop `emmaonesock.myshopify.com`, storefront `eosfabrics.com`) — primary client since April 2026. Full dashboard + Observations + cohorts live.
- **Projectagram Reels** (`client_key = 'projectagram_reels'`, shop `projectagram.myshopify.com`, storefront `projectagram.com`) — onboarded May 12, 2026. Same Shopify 3P pattern as EOS. Ingest is live; dashboard renders against the multi-tenant RPC layer (no `eos_*` hardcoding remains on the live-wired pages).
- **adsforgood_prod** (`client_key = 'adsforgood_prod'`) — agency-internal smoke-test client; used for cross-tenant isolation validation and connection-test endpoints. Not a paying client.
- **Barbershop (TBD client_key, onboarding this week June 9–13, 2026)** — first B2C personal services client. Signed + paying. Booking platform: Square Appointments. Cross-domain pattern: marketing site has Chapter pixel; booking flow on Square's hosted domain. Identity stitched via customer email captured in Square webhook payload. boundary_event_name = `appointment_booked`. Sprint 2 is dedicated to this onboarding (see Priority 1).
- The remaining EOS-specific `chapter_reporting.eos_*` snapshot tables are still EOS-only and being generalized incrementally per the May 14 strategy. New RPCs (cohorts, Connections, Observations) all read multi-tenant from day one.

### Known Data Gaps
- Identity cookie was not persistent before **April 1, 2026 17:00 UTC** (new identities per event)
- Journey cookie was not persistent before **April 14, 2026 18:15 UTC** (new journeys per event)
- Data before these dates should be treated with caution for identity/journey analysis
- `purchase_items` table not populated for EOS yet

---

## 📊 Chapter Dashboard (agency-operator surface)

**URL:** `/chapter/*` — agency-operator dashboard, sees all clients via top-of-sidebar switcher. **First-paint default:** `/chapter/observations`.

**Future:** `/chapter/[client_key]/*` — client-scoped surface, one dashboard per client_key with scoped auth. **Deferred** until agency surface is data-wired. Today's URL/code structure is compatible (page components read `client_key` from context, not hardcoded) so adding the route group later is additive. Constraint: `client_key` always contains an underscore by convention (e.g. `eos_fabrics`, `projectagram_reels`, future `lift_agency`) so it can never collide with the static page slugs (`observations`, `overview`, etc.).

### Auth (stopgap until Supabase auth)
- Env var `CHAPTER_DASH_TOKEN` (random secret) compared verbatim against a `chapter_auth` cookie set by `POST /api/chapter-auth`
- Middleware at root `middleware.ts` gates `/chapter/*` except `/chapter/login` + `/api/chapter-auth`
- 14-day cookie session; fail-closed if env var is unset (returns 503)
- **Migration path:** when Supabase auth is wired, the cookie+middleware logic gets replaced by Supabase's middleware helpers; UI for login swaps; rest of the app reads `user` from server-side auth instead of cookie.

### File layout
- `src/app/chapter/layout.tsx` — minimal pass-through (lets login render without chrome)
- `src/app/chapter/(authed)/layout.tsx` — sidebar + topbar chrome + ChapterProvider + PinnedObservation
- `src/app/chapter/(authed)/<page>/page.tsx` — one per nav item (8 pages: observations, overview, channels, paths, lift, attribution, journeys, raw)
- `src/app/chapter/login/page.tsx` — password form
- `src/app/chapter/chapter.css` — design tokens scoped to `.chapter-app` wrapper so they cannot leak into agency Tailwind
- `src/app/chapter/_components/*` — 13 reusable primitives (Icon, Move, Lcm, Dropdown, RoleBar, PathRender, ChannelChip, Sidebar, TopBar, KpiStrip, PinnedObservation, ChapterContext, mockdata, format)
- `src/app/api/chapter-auth/route.ts` — login POST handler

### Data fetching pattern (locked May 15, 2026)
- Dashboard is a **trusted agency-operator surface** → queries use `service_role` with explicit `WHERE client_key = $selected` in every WHERE clause
- NOT `chapter_app` + `SET ROLE` — that's the ingest-layer defense-in-depth (Fix #26 Part 2). Dashboard's defense-in-depth is the password gate.
- Per-page split:
  - `<page>/page.tsx` — **server component**, reads `searchParams`, runs Supabase queries, passes data + params via props
  - `<page>/<Page>Client.tsx` — **client component**, holds interactive state (filters/drawers), receives data via props
- Each existing all-`"use client"` page gets split during its wiring session; ~20–40 LOC of refactor per page (no new logic, just relocation).

### State persistence (URL query params)
- **Selected client** → `?client=eos_fabrics` (fallback to cookie, fallback to first client in CLIENTS list)
- **Date range** → `?range=30d` (other accepted values: `7d` / `14d` / `90d` / `mtd` / `qtd` / `ytd` / custom-as-ISO-pair)
- **Compare mode** → `?compare=prior|yoy|none`
- **Attribution model** → `?model=first|last|linear|custom`
- Server components read from `searchParams` in `page.tsx`. Client components read same via `useSearchParams()`. Updates write back via `router.replace()` (no history pollution per click).
- Middleware preserves the full path + query string when redirecting unauthenticated users to login, so a bookmarked URL like `/chapter/raw?client=eos_fabrics&range=90d` survives the auth round-trip.
- Rationale: shareable/bookmarkable URLs; server-side fetching gets params natively; fewer client-state syncing bugs than a separate global store.

### Reporting generalization strategy (decided May 14, 2026)
- New tables live in `chapter_reporting.*` **alongside** existing `eos_*` tables — no schema rename, no big-bang migration.
- Naming: drop the `eos_` prefix. `chapter_reporting.eos_traffic_overview_snapshot` → `chapter_reporting.traffic_overview_snapshot_v1`.
- **Per-tile recipe** when wiring a dashboard tile:
  1. If an `eos_*` analog exists, use its loader SQL as the template
  2. Strip the `client_key = 'eos_fabrics'` filter + any other EOS hardcoding
  3. Add `client_key` to the output column list if missing
  4. Add an index on `(client_key, ...)` per the multi-tenant pattern (Fix #26 Part 1)
  5. Run the new loader populating all active clients
  6. **Verify the new table against the existing `eos_*` equivalent** — `WHERE client_key='eos_fabrics'` row counts + values match
  7. **Also verify against an external truth source** — Shopify Admin reports, Google Analytics, the platform's own analytics — to catch logic the `eos_*` loader inherited that may be quietly wrong (or that may diverge by definition; document divergences)
  8. Wire the dashboard tile to the new generic table
- Old `eos_*` tables remain live indefinitely. No drop until we've operated for ~weeks on the new ones with confidence (cleanup is a future session).
- **Scope discipline:** only generalize tables the dashboard actually consumes. The 51-object `chapter_reporting` set (audit `chapter-scripts/audit-chapter-reporting.js`) has many intermediate/deprecated entries. Don't touch what's not consumed.

### Tier-based feature stripping
- All clients see the full feature set in v1. When tier-based stripping is needed, gate sections/tiles by `client.tier` (`Starter` / `Mid` / `Top`). The sidebar already shows a lock pill for Starter on the Observations item — extend this pattern to per-page lockouts rather than designing for tier-stripping from scratch.

### Mobile responsiveness
- Sidebar collapses to off-canvas drawer (hamburger toggle in topbar) below 1024px
- KPI strip → 2 cols on phone; lifecycle hero metrics same
- Tables: horizontal scroll inside their card, never the page
- Top bar: title row + dropdown row stack; subtitle clamped to 1 line; "Compare" dropdown hidden on phone
- `/chapter/journeys`: detail panel **hidden on phone** (event timeline + sub-grids don't render usefully on small screens). Identity list is the mobile view.
- `.chapter-app { overflow-x: hidden; max-width: 100vw }` is the hard guarantee against dark-body bleed-through from any rogue child element.

---

## ✅ Completed Fixes (as of June 9, 2026)

### Sprint 1 perf sprint + cron parallelism + boundary-event Phase 2 (June 8–9, 2026)
- **Scope:** late-night Sprint 1 push driven by a real prod observation — "every dashboard page click was 10–20+ seconds cold." Three major wins shipped: (a) connections_panel SQL + pre-aggregated MV chain for Cross-Source Influence's heaviest RPCs, (b) bounded-concurrency cron parallelism so the attribution chain scales past ~4 clients, (c) Phase 2 of the per-client boundary-event wiring (11 of 13 dashboard RPCs). Total Cross-Source Influence cold load went **24s → 4s (6× speedup)**.
- **Diagnostic methodology** (worth documenting because we'll re-use it): suspecting cold-cache issues, added `console.log` timing instrumentation around every RPC call in `influence/page.tsx`. Deployed, refreshed page, read Vercel runtime logs filtered by `influence-perf` tag. That gave per-RPC numbers (`pageOptions: 16,447ms` was the smoking gun) instead of theoretical SQL timings from `EXPLAIN`. **The Vercel-logs approach gives REAL prod numbers** — MCP `EXPLAIN ANALYZE` hits primary and has warm buffers; the dashboard reads from the replica which has different (often colder) buffer state. Use Vercel logs for any future page-perf debugging.

#### Sprint 1.5 — Cross-Source Influence cold-cache fix
- **`connections_panel` SQL fix:** the `valid_journey` CTE had NO date filter — it materialized all 915k EOS journeys via a 4-way join (`journey_entry_channel_v1 + journey_entry_channel_overrides + journey_bot_classification_v1 + journeys + identity_canon`) before downstream filters trimmed to a few hundred. Fix: (1) push a date-bounded filter into the CTE using `v_anchor_start - GREATEST(window_days, outcome_window_days) days` to `v_anchor_end + GREATEST(...)`, (2) add btree index on `journey_entry_channel_v1(client_key, entry_ts)` so the range scan is cheap. Result: 8.0s → 2.8s primary; ~7s → ~3s on replica.
- **`pageOptions` MV (the 16-second villain):** the dashboard's "popular pages" picker dropdown was running `SELECT page_path, COUNT(*) GROUP BY page_path` against `chapter_ingest.pixel_events` filtered to `event_name = 'page_view'` for 90d. EOS has **84,890 distinct page_paths** (URL variant bloat — query strings, fragments, UTM combos) across ~3M page_view events in 90d. The GROUP BY spills to disk (HashAggregate Disk Usage: 7016kB). Fix: pre-aggregated MV `chapter_reporting.connections_top_pages_90d_v1` with `ROW_NUMBER() OVER (PARTITION BY client_key ORDER BY view_count DESC)` filtered to `view_count > 1` (drops one-off URL variants). The picker function `connections_page_options` becomes a bounded index scan + LIMIT. Result: **16,447ms → 246ms in prod cold load (67× speedup)**.
- **`campaignOptions` MV:** same pattern for `connections_top_campaigns_90d_v1` aggregating `chapter_config.email_engagement_events` (12k+ click events × hundreds of campaigns × distinct emails). The slowness was `COUNT(DISTINCT email_sha256) PER campaign GROUP`. Pre-aggregate once nightly. **Result: 3,803ms → 340ms (11×).**
- **Daily-aggregated `connections_top_pages_v1` MV** built alongside the 90d summary, for future analytical use (per-day per-page breakdown). Not currently consumed by any RPC but cheap to maintain in the cron.
- **All 3 MVs wired into `refresh-dashboard-mvs` cron** (04:00 UTC). Refreshed via `REFRESH MATERIALIZED VIEW CONCURRENTLY` so reads aren't blocked.
- **Net page-load impact** (validated with prod instrumentation):
  - **BATCH1 (3 RPCs in parallel):** 16,449ms → **368ms** (45× — bounded by `pageOptions` previously)
  - **BATCH2 (4 RPCs in parallel):** 7,614ms → **3,599ms** (2.1× — partly from `connections_panel` SQL fix, partly because BATCH1 finishing fast left the replica's buffer cache warmer for BATCH2)
  - **PAGE total:** 24,064ms → **3,967ms** (6×)
- **Architectural pattern established + locked as a Forward Rule:** every new dashboard RPC scanning >100k rows MUST ship with a pre-aggregated MV/snapshot from day 1, wired into `refresh-dashboard-mvs` cron. No exceptions. The Cross-Source Influence work proves: with the right pre-aggregation, dashboard cold-load lives at hundreds of ms regardless of underlying data size. The wrong way (raw-event scans during page render) does not scale.
- **Replica cold-buffer disparity observed:** my `EXPLAIN ANALYZE` via MCP showed `connections_panel` at 2.8s, but prod logs showed ~7s. The replica has its own buffer cache that warms independently from primary's. Implication: any future SQL timing measured via MCP is a primary number; multiply by ~2–3× for cold replica reality.

#### Sprint 1.1 — Cron parallelism for `/api/internal/cron/refresh-attribution-chain`
- **Math:** at 10 clients × ~130s per `refresh_full_attribution_chain` call, the sequential `for` loop = 1,300s — well past Vercel's 600s `maxDuration`. Mathematical certainty before scaling past ~4 clients.
- **Pattern:** bounded-concurrency worker pool. `CONCURRENCY = 5` workers pull from a shared queue until empty. Postgres connection pool sized to match (`max: 5`) so workers run truly in parallel. Each worker calls `refresh_full_attribution_chain(client_key)` and pushes to either `summary` or `errors`.
- **Scaling envelope:** 3 clients today → all 3 run in parallel in ~130s. 10 clients → 2 waves of 5 ≈ 5 min. ~22 clients before maxDuration would matter again.
- **Why CONCURRENCY=5 not 10:** balances throughput vs Supabase connection load. Each client's chain runs 3 stages × maybe 200k rows of inserts; 5 simultaneous = bounded DB load that won't compete with daily ingest traffic.

#### Sprint 1.3 — Boundary-event Phase 2 (11 of 13 dashboard RPCs)
- **Wired through `chapter_config.boundary_event(p_client_key)`:** `channel_roles_overview`, `channel_affinity_overview`, `channel_performance_overview`, `path_combinations_overview`, `path_length_trend`, `correlation_channel_overview`, `contribution_overview`, `incrementality_channel_overview`, `incrementality_axis_metadata`, `observations_dormant_questions`, `journey_detail_events`.
- **Pattern:** SQL functions get inline `chapter_config.boundary_event(p_client_key)` in WHERE clauses (no plpgsql DECLARE needed since they're STABLE SQL functions). The helper is itself STABLE so the planner folds it; cheap to call inline.
- **2 deferred to Sprint 2.4** (B2C personal services / vertical-fit work): `funnel_overview` and `connections_panel`. Their `'purchase'` references aren't on `boundary_event_name` — they're raw `event_name = 'purchase'` scans against `chapter_ingest.purchase_events` (the outcome-side calc). For a B2C personal services or B2B client, the outcome event lives in a different table (`appointments`, `leads`, `opportunities`) — this is vertical-fit refactor territory, not a simple boundary-event swap.
- **EOS regression check (load-bearing):** all 8 rewritten RPCs return identical row counts to before the swap (6 `channel_roles` rows, 14 `channel_affinity` rows, 8 `channel_performance` rows, 15 `path_combinations`, 12 `path_length_trend` buckets, 6 `correlation_channel`, 1 `incrementality_axis`, 27 `observations_dormant`). Pure behavior-preserving swap because `chapter_config.boundary_event('eos_fabrics') = 'purchase'`.
- **Net unlock:** every dashboard RPC the barbershop's onboarding will touch is now configured-by-client. Set `chapter_config.clients.boundary_event_name = 'appointment_booked'` and the Observations engine + 11 dashboard RPCs Just Work without code changes.

#### Sprint reorganization (June 9, 2026)
- **Sprint 2 repurposed from B2B → B2C personal services.** First real new-client onboard is a barbershop (signed, onboarding this week), not the hypothetical B2B prospect. Sprint 2 sub-items adjusted:
  - 2.1 Onboard barbershop end-to-end (boundary_event_name = `appointment_booked`)
  - 2.2 Tune Observation thresholds for personal-services norms (higher returning-customer band — repeat haircuts; local-geo concentration; lower order-counts-per-identity initially)
  - 2.3 Square Appointments webhook adapter (NOT a CRM adapter) + phone-first identity stitching as v2 if needed
  - 2.4 Personal-services dashboard copy + taxonomy (action filter: `appointment_booked` not `purchase`; funnel reshape from Add-to-cart→Purchase to Service-selected→Confirmed)
- **3 items promoted from Future Work into active sprints:**
  - Sprint 4 — Tier 1 first-party redirect domain. Ranked AFTER barbershop onboarding because client is signed + ready to onboard now; Tier 1 retrofits after we learn what they actually need. (Note: Tier 1 would meaningfully improve barbershop attribution since their booking flow is cross-domain to Square's hosted pages — strong upsell wedge post-launch.)
  - Sprint 5 — `/chapter/[client_key]/*` client-scoped surface with per-user auth. Today's `/chapter/*` is a shared agency-operator surface gated by one `CHAPTER_DASH_TOKEN` cookie; Sprint 5 adds Supabase Auth + per-user → client_key mapping + middleware that gates per-route. Roughly 2–3 days for the auth layer, half-day for the route group. Agency operators retain global access via `role='agency_operator'`.
  - Sprint 6 — Offline attribution expansion (Pack D / online+offline via `offline_milestones`).
- **L&I heavyweight tier (holdout assignment + suppression + p-value/power + propensity-score matching + covariate storage) explicitly left in Future Work.** The L&I PAGE is live with all 3 tabs (Correlation, Incrementality v2, Contribution); what's missing is the lift-TEST infrastructure (running a real controlled experiment). Build when first client demands it.
- **Sprint 1.2 (onboarding script) deferred** until after the barbershop's manual onboarding. Script the playbook AFTER doing it once start-to-finish — easier to codify a path we've walked than to predict it.

#### Barbershop intake (locked decisions)
- **Booking platform:** Square Appointments (REST API + webhooks for `appointment.created`, `appointment.updated`, `appointment.canceled`; HMAC-signed payloads with customer email + phone).
- **Cross-domain pattern:** marketing site has a Chapter pixel installed → captures journey up to "Book Now" click → customer goes to Square's hosted booking page (no pixel visibility) → Square webhook fires on appointment creation with customer email/phone → stitched back via `identity_canon` to the pixel-tracked identity. For v1: email-based stitching only. Phone-first stitching (`phone_sha256:` analog of `email_sha256:`) is v2 if their customers email-skip.
- **Client stage:** signed + onboarding this week. Critical path = adapter + ingest + dashboard verification. Manual onboarding (Sprint 1.2 deferred).
- **Still needed from user before provisioning starts:** shop name (→ `client_key`), storefront domain, Square OAuth credentials, whether their booking form reliably captures email, boundary event semantics (`appointment.created` vs `appointment.completed` — default recommend `appointment.created` since most attribution use cases want "booked").

---

### Pre-demo validation + dashboard anonymization (June 5, 2026 late night)
- **Validation pass before tomorrow's demo:**
  - `chapter_observations.run_engine('eos_fabrics')` ran clean: 27 catalog total → 11 executed (data-depth + capability gates), 16 dormant, 8 emitted findings, status='ok', no errors.
  - `chapter_reporting.refresh_full_attribution_chain('eos_fabrics')` ran clean: lifecycle 17,941 rows / canonical_v1 742 / canonical_v2 855, all 'ok'.
  - **The production Vercel cron at 03:30 UTC fired for the first time tonight and succeeded across all 3 clients** (`adsforgood_prod`: 0/0/0 rows — correct, no data; `eos_fabrics`: 17,941 / 742 / 855; `projectagram_reels`: 327 / 4 / 15). All 9 stage runs `status='ok'`, zero errors. End-to-end production attribution chain is healthy.
  - `chapter_config` PostgREST exposure verified via existing prod code paths (`client_secrets`, `shopify_webhook_secrets` already read from it).
- **Dashboard client-name anonymization for tomorrow's demo** [src/app/chapter/_components/mockdata.ts:222-224](src/app/chapter/_components/mockdata.ts#L222-L224) — `CLIENTS` array now reads "Client A / Client B / Client C" (mapped to `eos_fabrics` / `projectagram_reels` / `adsforgood_prod`). Only changes the sidebar dropdown label; underlying `client_key` stays the same so all RPCs + URL params + auth unchanged.
- **Sidebar foot block removed** [src/app/chapter/_components/Sidebar.tsx:128-135](src/app/chapter/_components/Sidebar.tsx#L128-L135) — placeholder "Jordan R. / Agency operator" user identity removed pending real per-user auth.
- **Other agency surfaces unchanged:** `/for-clients/EOS-Fabrics/*` portal pages and other agency-public paths intentionally keep the real EOS branding — only the Chapter dashboard surface (`/chapter/*`) is anonymized.

---

### Per-client boundary event wiring — Phase 1 (June 5, 2026)
- **Scope:** the explicit B2B blocker called out in CLAUDE.md was that every Observations question + every dashboard RPC hardcoded `boundary_event_name = 'purchase'`. For a B2B client whose conversion event is `lead_submission`, every finding + every "Converted" count + every "no-purchase-yet" copy string was wrong. **Phase 1 closes the highest-leverage surfaces** (Observations engine + Journeys page + Lifecycle Overview). Lower-leverage surfaces (channel/path/contribution/correlation/incrementality RPCs) are catalogued as Phase 2; B2B pitches today are unblocked on the Observations + Journeys claim.
- **New helper `chapter_config.boundary_event(p_client_key) RETURNS text`** — STABLE SQL function with `COALESCE(..., 'purchase')` fallback. Cheap; safe to call inline. Every wired RPC opens with `v_boundary_event text := chapter_config.boundary_event(p_client_key);` and replaces the literal `'purchase'` with the variable.
- **Wired (15 SQL functions):**
  - `chapter_observations._snapshot_now`, `chapter_observations.run_engine`, all 13 `chapter_observations.run_question_*` functions (A1/A2/A3/A4, R1, C4, M3/M4, S1, I1/I3/I4) — capability-detection week count, snapshot anchor, and every boundary-event filter now per-client.
  - `chapter_reporting.lifecycle_overview` — returning-purchaser metrics on the hero strip.
  - `chapter_reporting.journey_detail_chapters`, `journeys_overview_stats`, `journeys_overview_list` — the "Converted" / "Open" classification + lifetime-value math.
- **Wired (frontend):** new `cachedClientConfig(client_key)` helper in `dashboard-rpc.ts` returns `{ storefront_domain, boundary_event_name, display_tz }` with 5-min TTL. `journeys/page.tsx` fetches it in the parallel `Promise.all`; `JourneysClient.tsx` receives `boundaryEvent` as a prop and builds the action-filter dropdown + outcome-filter copy dynamically via `buildActionOptions(boundaryEvent)` / `buildOutcomeOptions(boundaryEvent)`. The "Purchase" action row becomes "Lead Submission" (or whatever's configured); the "Open (no purchase yet)" copy becomes "Open (no lead submission yet)".
- **Run_engine's `boundary_event_definition` audit field** now stores the configured value (was hardcoded 'purchase' regardless of what the questions actually filtered on — fixed for honest provenance).
- **EOS regression check:** lifecycle_overview returns the same numbers as before (332 chapters / 33.7% returning all-time / 13% returning-this-window / 10 median touches at 30d window) because `boundary_event('eos_fabrics') = 'purchase'`. No behavior change for existing clients; the surface is now correctly parameterized for B2B clients onboarding into the same code paths.
- **Phase 2 — remaining 13 hardcoded SQL surfaces** (catalogued, deferred until first B2B onboarding):
  - **High-leverage if B2B uses these pages:** `channel_performance_overview`, `channel_roles_overview`, `channel_affinity_overview`, `path_combinations_overview`, `path_length_trend`, `funnel_overview`, `correlation_channel_overview`, `contribution_overview`, `incrementality_channel_overview`, `incrementality_axis_metadata`.
  - **Lower-leverage but worth touching:** `connections_panel`, `observations_dormant_questions`, `journey_detail_events`.
  - Each follows the same pattern: add `v_boundary_event := chapter_config.boundary_event(p_client_key)` to the DECLARE block, replace `'purchase'` literals. Mechanical work, ~30 min total — but defer until there's actually a B2B client whose data justifies validating each surface.

---

### Connections suite + Observations engine + Option B SQL port of attribution refresh chain (May 27 – June 4, 2026)
- **Scope:** post-dashboard-completion sprint focused on (a) two brand-new pages under a new `/chapter/connections/*` route group, (b) a complete Observations engine + nightly cron, and (c) replacing the EOS-hardcoded Node attribution refresh scripts with multi-tenant SQL functions so the daily cron can fan out across every active client.
- **Architectural through-line:** "make everything we build multi-tenant ready now." Materialized cohorts, parameterized refresh functions, and per-client `_snapshot_runs` watermarks all designed so a new client onboarding is purely additive (config row + DNS/CORS entries) — no per-feature refactor.

#### Connections #1 — Cross-Source Influence page (`/chapter/connections/influence`)
- **Per `connections_1_cross_source_influence_spec.md`.** Anchor-first interaction model: pick an anchor (Channel / Page / Campaign / Cohort), see ranked Upstream + Downstream connections with median lag + 30D outcome %. **Person anchor was explicitly DROPPED** — Customer Journeys page already covers per-identity drill-in, so adding a Person anchor here would duplicate that surface.
- **Anchor definitions (locked after operator-clarification pass):**
  - **Channel anchor** = journey-entry channel from `journey_entry_channel_v1` (the session-entry classifier used everywhere else on the dashboard, NOT mid-journey touches). "Anchored on Direct" means "people whose journey began as Direct."
  - **Page anchor** = `page_path` from any pixel event in window. Asymmetric vs Channel (a page can be Upstream or Downstream of a journey-entry channel).
  - **Campaign anchor** = identities with a CLICK on a campaign within window (operator-confirmed — not just opens; not impression-counted). Pulls from `chapter_config.email_engagement_events` for Mailchimp + uploaded equivalent for other platforms.
  - **Cohort anchor** = identity membership in a system or uploaded cohort (see Cohorts below).
- **Upstream / Downstream semantics:** measured at the journey-entry level. "Upstream of Direct" = the channels people entered via BEFORE the Direct journey we're anchored on. "Downstream of Direct" = the channels people entered via AFTER. Median lag = median (in days) between the prior/next journey-entry and the anchored journey-entry.
- **30D Outcome %** = share of anchored identities who had a `purchase` chapter close within 30 days of the anchored journey. **Outcome window is independently picker-controlled (NOT tied to the lag window)** — operator-driven change after seeing the first build conflate the two on screen.
- **Single RPC `chapter_reporting.connections_panel(p_client_key, p_anchor_type, p_anchor_payload, p_range_start, p_range_end, p_lag_days, p_outcome_days, p_filters)`** returns Upstream + Downstream rows + anchor totals. Anchor payload is JSONB so the same function serves all four anchor types via a discriminated union. Per-anchor logic dispatched via plpgsql IF/ELSIF.
- **Default page view = Upstream/Downstream by Page (not Channel)** per operator preference. Toggle keeps Channel view one click away.
- **Click-to-rehome + breadcrumbs:** clicking any Upstream/Downstream row re-anchors the page to that connection (URL: `?anchor_type=channel&anchor_payload={...}`). Breadcrumbs above the anchor card track the rehome chain — `Direct → Email → Organic Search` so operators can backtrack. Reset link at the right.
- **Self-recurrence indicator:** when the same channel/page appears in both Upstream and Downstream of itself (a returning visitor pattern), badge it inline so it's not mistaken for "a different channel that happens to share a name." Common for Direct (return-visitor behavior).
- **"How this page works" expander** with anchor-by-anchor explanation lives under the anchor picker. Lightweight prose; no inline help icons.

#### Connections #2 — Lagged Impact page (`/chapter/connections/lagged-impact`)
- **Per `connections_2_lagged_impact_spec.md`.** Different angle than #1: rather than "who is upstream/downstream of this anchor," asks "how long does it take for a channel touch to convert?" Tabular: channel × lag bucket (0-1d / 2-7d / 8-14d / 15-30d / 30d+) × conversion rate + revenue.
- **Single RPC `chapter_reporting.lagged_impact_panel(client_key, start, end, channel_filter, cohort_filter)`** powers the table. Cohort filter shares the cohort resolver from Connections #1.
- **Heavyweight tier (statistical lift across lag buckets) DEFERRED** — depends on the shared matched-lift engine refactor (Open Fix List). v1 ships as descriptive table only.
- **Header copy lessons from #1 applied:** anchor concept renamed "channel" here since there's no per-anchor pivot — just one table.

#### Cohorts — system pre-bake + uploaded + privacy-first hashing (May 27 – June 1, 2026)
- **Storage:** `chapter_config.cohorts(client_key, cohort_id, kind, name, description, criteria_jsonb, created_at, updated_at)` + `chapter_config.cohort_members(client_key, cohort_id, canonical_identity_key)` with unique idx `(client_key, cohort_id, canonical_identity_key)`. RLS-enabled.
- **`kind` taxonomy:** `'system'` (pre-baked, refreshed nightly), `'uploaded'` (operator-supplied CSV), and a partial unique index `(client_key, kind) WHERE kind <> 'uploaded'` enforces at-most-one row per system kind per client.
- **Materialized for multi-tenant:** original implementation had cohort logic inline in the Connections RPC ("for system kind X, do this JOIN..."). Operator caught it: *"No rows for cohorts... doesn't that make the query extremely slow and multi-tenant harder?"* Refactored to a unified resolver: `chapter_config.refresh_system_cohorts(p_client_key)` populates `cohort_members` once per night; Connections RPCs JOIN that table.
- **System cohorts shipped:** `email_subscribers` (any identity that ever fired an `identify` event with a known email_hash + Mailchimp-list membership) and 3 purchase-value bands (`low_value` / `mid_value` / `high_value`) computed via NTILE(3) over identity-level lifetime revenue in the prior 90 days.
- **Nightly cron `/api/internal/cron/refresh-system-cohorts` at 04:30 UTC** (between MV refresh at 04:00 and Observations engine at 05:00). Iterates active clients from `chapter_config.client_secrets WHERE revoked_at IS NULL`; calls `refresh_system_cohorts(client_key)` for each. GChat alert only on failure.
- **Cohort upload — privacy-first SHA-256 hashing IN-PROCESS:** operator uploads CSV with raw emails; route streams it, hashes `SHA256(lowercase(trim(email)))` in memory, resolves to `canonical_identity_key` via `identity_canon`, INSERTs into `cohort_members`. **RAW EMAILS NEVER PERSIST.** The route returns a count of resolved + unresolved identities; the unresolved list is **truncated email_sha256 hashes** (first 8 chars) so the operator can audit without ever seeing the original PII. This is the load-bearing privacy claim for sales conversations with B2B/health/dental clients.
- **Cohort picker UX:** dropdown shows system cohorts first (with row counts per client), then uploaded cohorts. Empty state ("0 identities") renders a contextual hint about why the cohort is empty (e.g. "Email subscribers cohort is computed nightly at 04:30 UTC; if you onboarded today, check back tomorrow").
- **Future:** MV-ify the Email subscribers cohort JOIN inside the Connections panel resolver; currently each panel call re-does the JOIN. Trade-off chosen for v1: simpler invariants + bounded EOS volume (~1.5k identities) makes the JOIN cheap enough.

#### Observations engine — schema + 27 questions + runner + state machine + nightly cron (May 30 – June 2, 2026)
- **Per `observations_engine_spec.md`** the Observations page is no longer a mock — engine is live with 13 of 27 questions firing on EOS data.
- **Schema in new `chapter_observations` schema:**
  - `questions(question_id text PK, category, title, description, severity_rubric_jsonb, capability_required text[], data_depth_required text[], deferred boolean, enabled boolean)` — 27 seeded questions across 6 categories (Acquisition / Retention / Conversion / Mix / Spend / Identity).
  - `findings(finding_id uuid PK, client_key, question_id, run_id, severity text CHECK ('high','med','low'), state text CHECK ('new','changed','standing','resolved'), payload_jsonb, observed_at, prior_finding_id nullable)` — state machine: NEW → STANDING after first observation; CHANGED if payload diff exceeds question rubric; RESOLVED when next run no longer fires the question.
  - `runs(run_id uuid PK, client_key, started_at, finished_at, questions_executed int, findings_produced int, capability_snapshot_jsonb, error text)` — one row per engine invocation per client.
- **Question execution:** each question is its own `chapter_observations.run_question_<id>(client_key, snapshot_ts)` function returning a result set of (severity, payload) rows. **13 questions implemented + firing on EOS:** A1 (channel mix shift), A2 (new channel emerged), A3 (channel disappeared), A4 (entry channel growth/decline), R1 (returning purchaser rate), C4 (cart abandonment spike), M3 (path-length shift), M4 (multi-touch concentration), S1 (single-channel close rate), I1 (identity stitching rate), I2 (new identity volume), I3 (canonical reduction), I4 (alias-edge growth).
- **Capability detection:** `run_engine(client_key)` introspects what data the client has (`has_pixel`, `has_purchases`, `has_email_campaigns`, `has_offline`, etc.) before dispatching. Questions declare prerequisites in `capability_required[]`. Questions whose prerequisites aren't met are skipped with a `'dormant'` reason rather than firing on bad data.
- **Snapshot-anchored windows (critical):** initial build had A1 firing but S1/I1/I3 returning 0 because they were reading windows ending at `now()` while `canonical_v1_snapshot` lagged by ~2 weeks. Fixed via `chapter_observations._snapshot_now(p_client_key)` returning `MAX(boundary_ts)` from canonical_v1 — every question's "now" is anchored to the snapshot's freshness. The engine and the dashboard always agree about what "now" means for this client.
- **State machine helper `chapter_observations.record_finding(...)`:** atomically reads prior open finding for the same (client_key, question_id), computes next state via `_compute_next_state(...)` (NEW vs CHANGED vs STANDING), INSERTs the new row, and updates the prior row's state if RESOLVED. After the engine run, `mark_stale_findings_resolved(client_key, run_id)` flips any non-current-run open findings to RESOLVED.
- **Read RPCs for the UI:** `observations_list_current(client_key)` / `observations_history(client_key, lookback_days)` / `observations_dormant_questions(client_key)`. Cached via `unstable_cache` with the same `bucketedNow()` 5-min TTL pattern used elsewhere.
- **Page wiring** [src/app/chapter/(authed)/observations/page.tsx](src/app/chapter/(authed)/observations/page.tsx) + [ObservationsClient.tsx](src/app/chapter/(authed)/observations/ObservationsClient.tsx): server component fetches findings/history/dormant via `Promise.all` of cached RPCs; client component renders severity-filtered cards (LOW hidden by default per spec §6), gating-priority banner at top, dormant affordance at bottom ("If you connected Klaviyo, 4 more questions would activate").
- **Nightly cron `/api/internal/cron/run-observations` at 05:00 UTC** (after dashboard MVs at 04:00 + cohorts at 04:30, so the engine reads fresh data). Iterates active clients from `chapter_config.client_secrets WHERE revoked_at IS NULL`. GChat alert only on failure summary (rolls up all errors across clients).
- **Lessons captured in conversation memory but worth flagging here:**
  - `CREATE OR REPLACE FUNCTION` only replaces if the signature is identical — adding a parameter requires `DROP FUNCTION IF EXISTS ... (sig)` first or you get PGRST203 overload conflicts.
  - Returning-table column names that collide with table columns inside the function body cause ambiguity errors — rename the return column (e.g. `cohort_kind` instead of `kind`).
  - `unstable_cache` keys must be bumped (v2, v3...) when the underlying RPC payload shape changes, or stale empty results stick around invisibly for the 5-min TTL window.
- **Still pending** (open backlog): manual severity override UI, popup detail view polish, 14 deferred questions (A5/A6/S4 need spend data, M1/M2 need lift_history, R3/R5 need 26w history, C3/C2 need a pixel-to-chapter MV, R2/S2/S3 are capability-gated on data we don't yet ingest).

#### Option B SHIPPED — SQL port of attribution refresh chain + nightly cron (June 3 – June 5, 2026)
- **Goal:** the previous `chapter-scripts/run-lifecycle-chapters-incremental.js` + `run-snapshot.js` are Node scripts hardcoded to `eos_fabrics`. To get multi-tenant production-ready, port the whole refresh chain to pure SQL functions, parameterize on `p_client_key`, then wire a single Vercel cron route that fans out across active clients.
- **Per-client watermarks (Step 1):** `chapter_reporting._snapshot_runs` gained a `client_key text` column (existing rows backfilled to `'eos_fabrics'` — verified all pre-multi-tenant runs were EOS). New index `(client_key, target_table, status, snapshot_ts_hi DESC)`. The `status` CHECK constraint extended to allow `'partial'` for chunked invocations that didn't process all affected canonicals.
- **`chapter_config.clients` table added** (June 5) as the canonical per-client config home: `(client_key PK, storefront_domain, boundary_event_name, display_tz, notes, created_at, updated_at)`. Populated for all 3 active clients (EOS, projectagram, adsforgood_prod). Used by canonical_v1's session-entry classifier for self-referral detection, and by all functions that need per-client boundary-event awareness. Covers the deferred timezone item too (display_tz column).
- **Step 2 — `chapter_model.refresh_lifecycle_chapters_incremental(p_client_key, p_snapshot_ts_hi, p_safety_margin_hours, p_max_canonicals)`:** SQL port of the Node script's Strategy B (inline source reads — the `lifecycle_chapters` view is now a facade, so reading from it would be circular).
  - Reads per-client watermark from `_snapshot_runs`.
  - Detects affected canonicals from 4 sources (new pixel / new purchase / new offline / new alias edges with current-canon mapping) via UNION; INNER JOINs `identity_canon` to mirror the rebuilder's "exclude bots" coverage.
  - Optional `p_max_canonicals` parameter caps work per call so the cron can checkpoint; if `more_remaining` is true, the run row is marked `'partial'` (not `'ok'`) so the next call's watermark lookup correctly re-detects the unprocessed canonicals.
  - DELETE-affected + INSERT-fresh in a single transaction — readers never see partial state.
  - chapter_id computed via window function: `SUM(CASE WHEN is_boundary_event THEN 1 ELSE 0 END) OVER (PARTITION BY client_key, canonical_identity_key ORDER BY event_ts, created_at) - CASE WHEN is_boundary_event THEN 1 ELSE 0 END`.
  - Preserves the Node rebuilder's offline-milestone double emission (online flavor + offline flavor) for forward-compat with non-EOS clients that have offline data; EOS has zero offline milestones so the double-emission is currently dormant.
  - First production call (during initial smoke test) processed 595k rows in 77s. Subsequent incremental calls on EOS now complete in 2-3s.
- **Step 3 — `chapter_attribution.refresh_canonical_v1_snapshot(p_client_key, p_snapshot_ts_hi)`:** SQL port of the canonical_v1 loader; per-client full rebuild (DELETE + INSERT). Bypasses the EOS-only legacy view chain (`eos_sessionized_events_v1` → `_canonical_v1` → `chapter_session_entry_channels_canonical_v1`) entirely by inlining the session-entry classifier in the function body. Reads `chapter_ingest.pixel_events` directly, filters bots via `journey_bot_classification_v1`, resolves canonical via `identity_canon`, re-sessionizes on the fly (>1hr gap or external-referrer break), classifies each session's entry channel via a CASE expression that pulls `storefront_domain` from `chapter_config.clients` for self-referral detection. Stripped 4 EOS-specific UTM patterns (`eosfabrics.com general` etc); kept universal patterns (`shopify_email`, `mailchimp`, `back-in-stock`). 740 rows in 101 seconds at EOS — **~30× faster than the legacy 50-min Node loader**.
- **Step 4 — `chapter_attribution.refresh_canonical_v2_snapshot(p_client_key, p_snapshot_ts_hi)`:** the BIG simplification. Investigation revealed the legacy canonical_v2 loader's 5-deep `chapter_reporting.eos_*` cache chain (`purchase_base` → `purchase_touch_summary` → `purchase_fallback` → `purchase_channel_final` → `filtered_purchases`) collapses in practice to a single LEFT JOIN with canonical_v1 — every cache's CASE for non-session chapters defaults to `'(direct)'`. The new SQL function is a 50-line one-shot INSERT against `lifecycle_chapters_snapshot` LEFT JOINed with `canonical_v1_snapshot`: chapters with session entries inherit their v1 path, chapters without get `'(direct)'`. 852 rows in 4.6 seconds at EOS. **No reporting-layer caches needed.** Per Fix #18's old decision, the cache-relocation question is now moot — the caches aren't required at all.
- **Step 5 — `chapter_reporting.refresh_full_attribution_chain(p_client_key, p_snapshot_ts_hi)` orchestrator:** chains all 3 stages in one SQL call with a shared `v_snapshot_ts_hi` cutoff. Returns one summary row per invocation. End-to-end EOS run = ~130 seconds.
- **Step 6 — `/api/internal/cron/refresh-attribution-chain` scheduled at 03:30 UTC daily** (before the dashboard MV refresh at 04:00 UTC so downstream MVs see fresh attribution data). Iterates `chapter_config.client_secrets WHERE revoked_at IS NULL`, calls the orchestrator for each. GChat alert only on failure summary. `vercel.json` updated; not yet deployed to prod.
- **Multi-tenant verification:** the new functions take `p_client_key` only — no other parameters depend on EOS-specific knowledge. Per-client `_snapshot_runs` row per stage gives full audit visibility. New client onboarding now reduces to: (1) `INSERT chapter_config.clients`, (2) `INSERT chapter_config.client_secrets`, (3) per-client Postgres role + `CLIENT_ROLE_MAP` entry, (4) CORS origin. No per-feature SQL writing.
- **Why this matters for the sales pitch:** "Chapter scales cleanly to N clients" stops being aspirational and becomes provable. Onboarding day-1 a new client gets nightly attribution refresh, nightly cohort materialization, nightly Observations engine — all automatically, no per-client engineering ceremony.

#### Cumulative wiring scorecard (end of June 4, 2026)
- **Live-wired pages (10 of 10):** Raw Performance, Lifecycle Overview, Channel Roles, Path Patterns, Attribution Models, Customer Journeys, Lift / Incrementality / Value (3 tabs), **Observations (live engine)**, **Cross-Source Influence (new)**, **Lagged Impact (new)**.
- **Nightly crons:** stuck-runs (15-min) and daily-digest (14:00 UTC) are running in production. The full nightly chain — refresh-attribution-chain (03:30 UTC, new in Option B Step 6), refresh-dashboard-mvs (04:00 UTC), refresh-system-cohorts (04:30 UTC), run-observations (05:00 UTC) — is wired in `vercel.json`; awaiting the next prod deploy to activate.
- **3 active clients:** `eos_fabrics` (primary), `projectagram_reels`, `adsforgood_prod`. Dashboard data exists for `eos_fabrics` and `projectagram_reels`; `adsforgood_prod` is the agency-internal smoke-test client.

---

### Incrementality v2 + Contribution tab — Lift & Incrementality page now fully live (3 of 3 tabs) (May 26, 2026)
- **Scope:** finished wiring the L&I page in two pieces: (a) Incrementality v2 corrections after the first build exposed methodology faults on live EOS data, (b) the brand-new Contribution tab replacing the placeholder Causation tab. End-of-day state: all 3 tabs running on real data; page sidebar nav renamed "Lift, Incrementality & Value" to reflect the new third measure.

#### Incrementality v2 corrections (per spec v2 §12, live-data-exposed)
- **Touches metric DROPPED from Incrementality** (kept on Correlation). Structurally degenerate: covariate is "pre-channel touches"; for WITHOUT chapters the covariate equals the outcome by definition → regression can't adjust → circular. Removal is the only honest fix; this is structural, not tunable.
- **Conv Rate ADDED as left-most metric.** Identity-level (matches Correlation tab denominator definition), pre-channel-touch covariate. Hidden on `value_band` axis with tailored "n/a for value-band axis" message — value buckets are derived from purchase amount, so non-converters can't be bucketed → denominator would degenerate. Documented in the expander.
- **Time-to-close covariate SWITCHED from pre-channel touches → recency** (days since prior purchase, measured at chapter start). Reasoning per spec §12 Change 3: match the covariate's units to the outcome's units. Recency derived from ALL-TIME canonical_v1 history (not window-bound LAG). First-ever chapters (`chapter_id = 0`) excluded — separate `days_n_with` / `days_n_without` counts so the n≥30 gate is honest about the strict-subset denominator (109 of 426 90d chapters at EOS).
- **Time-to-close visually DEMOTED** per spec §12 Change 4: opacity 0.95 (vs 1.0), label color `var(--ink-2)` (vs `var(--ink)`), inline "WEAKEST" pill with hover-tooltip explaining selection bias, EXCLUDED from headline candidacy so the "HEADLINE" chip never lands on it. Expander adds: *"covariate adjustment shrinks confounding from journey length, but it does not eliminate selection bias — channel-present chapters disproportionately come from customers with structurally different browsing habits."*
- **UI polish during testing:**
  - Cohort axis layout reworked — picker stacks UNDER tabs, definition box top-aligns with tabs (3-column flex), "Showing N findings" stays top-right. Cohort axis definition box renders live metadata (subscriber count, value-band terciles, current top 5 regions) so operators understand what "Subscribers" / "Low spenders" / "Other" actually mean for THIS client in THIS window.
  - Grayed states darkened (hidden 0.4→0.7 opacity, noise text `var(--ink-4)` → `var(--ink-2)`).
  - Confidence threshold shown on its own line per stat: `need ±5.2% for confident` (noise state) / `gate ±3.8%` (confident state). Computed from CI half-width (`ci_high - adj_lift = 2·SE`). Tells operators how far from real signal a within-noise number is.
- **Files:** [src/app/chapter/_lib/dashboard-rpc.ts](src/app/chapter/_lib/dashboard-rpc.ts) (`IncrementalityRow` type updated), [src/app/chapter/(authed)/lift/LiftClient.tsx](src/app/chapter/(authed)/lift/LiftClient.tsx) (gate computation + render). DB: `incrementality_channel_overview` v2 + `incrementality_axis_metadata` RPCs.

#### Contribution tab (3rd of 3) — replaces placeholder Causation tab
- **Per contribution_tab_spec.md.** Tab is named "Contribution" (sells the concept); two internal measures stay distinctly labeled. **Critical labeling discipline:** the confident-causal word never attaches to the Contribution Index — that's what keeps this tab honest.
- **New RPC `chapter_reporting.contribution_overview(client, start, end)`** returns one row per channel with sufficient stats for:
  - **Measure A (Incremental Loss):** cohort-summed incremental rate + variance (subscriber axis as the default cohort). TS computes range = touched_volume × ±2·SE band. Per spec: NEVER a bare point number, ALWAYS a range + mechanism clause.
  - **Measure B (Contribution Index):** 3 signals — participation rate, aggregate fractional revenue (from `attribution_linear_chapter_v1`), recurrence score (for returning customers, avg fraction of their chapters containing channel). TS normalizes each 0-1 across channel set + averages.
  - 2×2 quadrant inputs.
- **TS layer** (`computeContribution`): equal-weight average of 3 normalized signals → Contribution Index 0-100. Median-split across channels for quadrant assignment. CI propagation from RPC's `incremental_rate_variance` field.
- **Quadrant taxonomy (final naming):**
  - High Inc + High Con → **Core driver** ("Protect — both incremental AND deeply embedded")
  - **Low Inc + High Con** → **Connective tissue** ("DO NOT CUT despite low incremental") — bottom-right quadrant is THE reason the tab exists; gets orange tint on the matrix
  - High Inc + Low Con → **Closing spark** ("Rarely appears, but converts when it does")
  - Low Inc + Low Con → **Coasting** ("Low incremental + low embedded footprint")
- **ContributionCard layout:** headline = range + mechanism clause; below it, Measure A + Measure B in side-by-side panels (counterweight always adjacent so "low incremental" never reads alone); quadrant verdict caveat at bottom; "how we calculated" expander.
- **Channel Value Matrix** (inline SVG, no chart library): x-axis "Incrementality (matched-cohort)" -30%→+50%, y-axis "Contribution Index" 0-100. Dashed median-split lines; quadrant backgrounds shaded (orange tint on connective-tissue corner per spec §4). Channel chips colored to channel taxonomy.
- **Live EOS narrative** (90d): Direct (69% participation, 80% recurrence, ~0% incremental) and Email (43% participation, 43% recurrence, ~5% incremental within noise) both land in **Connective Tissue** — exactly the cohort a ROAS-only tool would wrongly cut. This is the highest-value sales narrative the L&I feature produces.
- **Sidebar nav renamed** "Lift & Incrementality" → "**Lift, Incrementality & Value**" in [src/app/chapter/_components/Sidebar.tsx](src/app/chapter/_components/Sidebar.tsx). Route stays `/chapter/lift`; page header TopBar stays "Lift & Incrementality" (the page header is the analytical-frame label; the nav label sells the user-facing benefit).
- **Deferred for v2:** (a) shared matched-lift engine refactor between Incrementality and Contribution (spec §9 — both RPCs currently inline the matched-lift math), (b) modeling where substituting buyers redistribute (which channel absorbs them; spec §2 — dies at EOS's n), (c) Causation mock data + types are now unused but not yet cleaned out of `mockdata.ts`.

#### Cumulative wiring scorecard (end of May 26, 2026)
- **7 of 8 pages fully live-wired:** Raw Performance, Lifecycle Overview, Channel Roles, Path Patterns, Attribution Models, Customer Journeys, Lift / Incrementality / Value (all 3 tabs).
- **1 deferred indefinitely:** Observations (needs question-library engine — multi-day project, deferred until first real engagement question is identified).

### Correlation tab on /chapter/lift live-wired (1st of 3 L&I tabs) (May 26, 2026)
- **Scope:** Phase-1 implementation of the Lift & Incrementality page per a methodology spec produced in Claude Chat (see `correlation_tab_spec.md`). Only the Correlation tab — Incrementality + Causation tabs explicitly stay on mockdata pending their own methodology design phase.
- **New RPC `chapter_reporting.correlation_channel_overview(client, start, end)`** returns one row per channel actually present in the client's data with two distinct metric spaces:
  - **Identity-level (conversion rate):** `ids_with` / `ids_without` (canonical_identity_keys with ≥1 non-bot human journey in window touching that channel via `journey_entry_channel_v1`) and `conv_ids_with` / `conv_ids_without` (subset that also has ≥1 `canonical_v1` purchase chapter in window). Conversion rate is `conv / total` per arm.
  - **Chapter-level (continuous metrics, converters only):** `chapters_with` / `chapters_without` based on whether the channel appears in `canonical_v1.channel_path`. Returns mean + **sample stddev** per arm for AOV (`boundary_value`), time-to-close (`boundary_ts - first_ts` in days), and touches (`array_length(channel_path)`). Stddev shipped in v1 so the SE noise gate covers all metrics from day one.
- **Bot filter convention:** matches existing `journey_overview` (`bot_class IN ('human_likely', 'suspect')` AND `event_count > 1`). Numbers stay consistent with Overview/Raw/Channels pages. The spec author's stricter "human_likely only" was explicitly rejected for cross-page consistency.
- **Channel list is data-driven** from the union of channels-in-traffic (identity-level) and channels-in-purchase-paths (chapter-level). No template/demo channels — if EOS doesn't have Meta, no Meta card appears.
- **Statistical honesty gate (TS-side, in [LiftClient.tsx](src/app/chapter/(authed)/lift/LiftClient.tsx)):**
  - **Hidden** (`min(n_with, n_without) < 30`) — metric renders as "need n ≥ 30", grayed
  - **Within noise** (`|Δ|/SE < 2`) — delta shown but grayed with "within noise" tag; hover-tooltip shows the math
  - **Confident** (`|Δ|/SE ≥ 2`) — colored delta (good/bad)
  - SE formulas: proportion-difference for conv rate (`sqrt(p_pool*(1-p_pool)*(1/n_w + 1/n_wo))`); Welch mean-diff for continuous (`sqrt(s_w²/n_w + s_wo²/n_wo)`). Computed in TS per spec §4 — thresholds tunable without a migration.
  - **Card-level hidden:** if ALL metrics for a channel are hidden, render a single "Not enough data yet — need ≥30 samples with and without this channel" card instead of an empty card.
- **Dynamic headline metric** (spec §3): picks the metric with largest `|Δ_rel|` that clears the confidence gate. Defaults to conversion rate if no metric clears. Headline metric gets a small `HEADLINE` chip on its stat block. Card headline text follows the locked claim shape: *"When [channel] is present in paths, we see [X]% [metric]."*
- **Per-channel observational caveat** in each card (e.g. Email: *"Email subscribers are typically more engaged than non-subscribers. This is correlation, not a causal estimate."* Direct: *"Direct traffic skews toward returning customers…"*).
- **Page-default window = 90d** (vs 30d elsewhere) because the noise gate needs sample size — at EOS's ~270 conv/mo volume a 30d window would gray out most cards. Spec §6 locked decision.
- **Tab labels** now show `LIVE` (Correlation) vs `mock` (Incrementality, Causation) so it's unambiguous which tab is real.
- **Live EOS findings the gate surfaces** (90d window):
  - **Email**: conv rate +14.4% relative (68.5% vs 59.5%). Likely confident — Email "headline" metric.
  - **Direct**: conv rate -7.1% (60.3% vs 65.0%). Counterintuitive but explained by Direct being mostly returning customers who browse without buying (caveat surfaces this).
  - **Organic Search**: conv rate ~flat (within noise), but touches metric shows 23.86 vs 5.22 — Organic Search chapters are ~4.5x longer paths (deep browsing).
  - **Referral / Organic Social / Paid Social**: hidden at n<30.
- **Server/client split:** [page.tsx](src/app/chapter/(authed)/lift/page.tsx) is server (fetches correlation RPC, defaults to 90d), [LiftClient.tsx](src/app/chapter/(authed)/lift/LiftClient.tsx) handles tab state and renders all three tabs with the appropriate data source per tab.

### Two more Chapter Dashboard pages live-wired (Overview + Journeys) — 6 of 8 pages live (May 26, 2026)
- **Goal:** finish wiring the actively-buildable dashboard pages. Started with Overview (mostly reuses RPCs from other pages, plus 2 new ones), then Journeys (most complex — full audit/privacy infrastructure required). Both shipped end-to-end including UI polish.

#### Overview (Lifecycle Overview) page wired
- **2 new RPCs:**
  - `chapter_reporting.lifecycle_overview(client, start, end)` — chapter-level aggregates (median touches, median + p90 days to close, % multi-touch, % returning all-time). Later extended to include `in_window_returning_chapters` / `in_window_returning_pct` — a SECOND retention metric scoped to "bought multiple times within this window" (vs. all-time history).
  - `chapter_reporting.path_length_trend(client, start, end, n_buckets)` — N equi-width buckets with per-bucket median + p90 + **avg** (added after launch). Drives the trend chart.
- **Reused 2 existing RPCs** for the bottom-row preview tiles: `channel_roles_overview` (top 5 channels) and `path_combinations_overview` (top 5 combinations).
- **Trend tile enhancements** (post-launch polish, all shipped same day):
  - Added **average** as a 3rd line on the chart (median solid orange, avg dashed steel-blue #2D7AC9, p90 dotted violet #8E5DA8) — three visually-distinct colors so the lines are easy to tell apart
  - Per-tile time-range picker: 4w / 12w / 26w / 52w (defaults 12w). Server pre-fetches all 4 windows in parallel so toggling is instant.
  - Renamed "p90" → **"90% Max"** throughout (chart legend, what-tooltip, lifecycle metric foot text). More readable for non-stats audiences.
  - X-axis labels switched from "W1, W3, W5…" placeholder to actual bucket-start dates ("May 6", "Mar 17", etc.) with first + last always anchored to window edges.
  - Chart legend reformatted: each label colored to match its line + descriptor in muted gray (e.g. **Median**: typical length).
- **Returning purchasers split into two stats** (after user feedback that one number was ambiguous):
  - **All-time returning** — chapters whose `chapter_id ≥ 1` (customer has any prior chapter ever in canonical_v1). Promoted into the hero header area (right of H2) so it doesn't crowd the metrics row.
  - **Returning this window** — chapters that are NOT the customer's first chapter inside this window (regardless of all-time history). Smaller metric (~10% vs ~33% all-time for EOS). Lives in the metrics row.
  - For EOS 30d: 33% all-time returning, 10.1% returning this window — confirms the gap is meaningful signal.
- **Lifecycle metric labels** fixed: "Avg touches to close" → **"Median touches to close"** (was always computing median; label was inaccurate inherited from mock). Same for "Avg time" → "Median time".
- **Top combinations tile** got an inline picker swapping between Set/Collapsed/Raw modes (server pre-fetches all 3 like the trend windows). Now ranked by revenue (was chapter count). Title: "Top converting channel combinations".
- **Channel roles preview tile** got a color-matched legend in the subtitle: <span color=solo>solo</span> / <span color=opener>opener</span> / <span color=mid>mid</span> / <span color=closer>closer</span> — each colored to match its bar segment.

#### Journeys (Customer Journeys) page wired — most complex page, audit + privacy infrastructure built alongside
- **Privacy architecture decisions** (made BEFORE building, with user):
  - **Browse-only** — NO email/phone input search. Dropping the search box that the mock had. Targeted PII lookup deferred to a separate elevated-permission endpoint (`/chapter/admin/lookup` style, future).
  - **Truncated hashes** displayed: `email_sha256:4ee3a1a6…` (prefix + 8 chars). Operators can copy-paste between pages but can't read the original PII.
  - **Audit log every detail view** — see new audit infra below.
- **New audit table `chapter_audit.dashboard_pii_views`** + 3 indexes (ts DESC; client+identity+ts; viewer_session+ts). Columns: page, client_key, viewed_identity, viewer_session (SHA-256 of chapter_auth cookie — coarse until per-user auth), ip_hash, user_agent_snippet, request_id. New helper at [src/app/lib/audit/pii-views.ts](src/app/lib/audit/pii-views.ts) (`logPiiView`, `hashSecret`).
- **Audit logging is fire-and-forget** in the server page (`void logPiiView(...)`) — never blocks page render. Only fires when user EXPLICITLY navigates to `?identity=xxx` (not on the default first-row auto-selection) to avoid noise.
- **5 new RPCs:**
  - `journeys_overview_stats(client, start, end, action, outcome)` — summary stats for filtered cohort (total identities, % converted, total/avg/median LTV)
  - `journeys_overview_list(client, start, end, action, outcome, limit)` — paginated identity list (top 50 by lifetime value)
  - `journey_detail_chapters(client, canonical_identity_key)` — lifetime chapter list per identity
  - `journey_detail_events(client, canonical_identity_key)` — per-event timeline, FILTERED to meaningful actions (skips `visibility_change`, `hover_intent`, `scroll_depth`, `time_on_page`, `page_exit` noise)
  - `journey_detail_aliases(client, canonical_identity_key)` — stitched alias list from `identity_aliases` graph
- **Filter UX:**
  - **Action dropdown** — curated funnel-order list: All actions / Page view / Add to cart / Cart View / Identify / form fill / Purchase. Maps to underlying `event_name` values. Auto-discovered full list deferred to v2.
  - **Outcome dropdown** — Converted / Open. Hardcoded to `boundary_event_name = 'purchase'` for MVP. **Future:** per-client boundary event config in `chapter_config` (B2B brands would use `lead_submission` instead of `purchase`).
- **Detail panel polish:**
  - **Collapsible chapter cards** (default collapsed, click to expand). Each chapter header shows summary: chapter id, event count, time span, "Closed at $X", channel path. Expanded view reveals the full event timeline below. Expand-all / Collapse-all batch button next to the section title. State resets when selected identity changes.
  - **Run-length encoding** for events in the expanded view — consecutive same-name events collapse to "5× Page view  over 2m" instead of 5 separate rows. Purchases always break the run (own line with ★ marker + revenue).
  - **Closing "Purchase" pill** at the end of each chapter's channel path (`Email → Direct → Direct → ★ Purchase +$235`) — soft-accent rounded chip matching the boundary-event style in the expanded timeline.
- **Sales-pitch concrete example from live data:** for EOS 30d with action=`identify`: **288 identities did form-fill → 69 converted (24%) → $11.8K total LTV from that cohort**. Exactly the "ran a newsletter campaign, want to know who signed up + what they're worth" use case.

#### Cumulative wiring scorecard (end of May 26, full session)
- **Live-wired pages (6 of 8):** Raw Performance, Lifecycle Overview, Channel Roles, Path Patterns, Attribution Models, Customer Journeys
- **Deferred indefinitely (2):** Observations (needs question-library engine), Lift & Incrementality (needs holdout/causation infrastructure)
- **All live pages use the same architectural pattern:** server component does Promise.all of cached RPCs + page-specific data → client component renders + handles interactivity. URL searchParams are the source of truth for filters (client, range, action, outcome, identity, etc.).

### Three Chapter Dashboard pages live-wired + MV refresh cron (May 25–26, 2026)
- **Goal:** ship the next batch of Chapter dashboard pages on live data after Raw Performance was completed May 22–25. Started Channels, then ended up nailing Attribution Models + Paths + Channels (with two enhancements). Two pages remain on mockdata: **Overview** and **Journeys**. Observations + Lift deferred (no engine).
- **Process lesson reinforced:** Raw was 30–60 min because all 6 of its RPCs already existed. The remaining pages need 3–5 NEW RPCs each (sometimes new snapshot tables). Each new page is a 2–4 hour project done properly per the CLAUDE.md "Reporting generalization strategy" recipe — not the original "all in one day" estimate.

#### Dashboard MV refresh cron (Priority 1 completed)
- **Cron route** [src/app/api/internal/cron/refresh-dashboard-mvs/route.ts](src/app/api/internal/cron/refresh-dashboard-mvs/route.ts) — uses `DATABASE_DIRECT_URL` + `keep_alive: 60` + 30-min statement_timeout. Runs `REFRESH MATERIALIZED VIEW CONCURRENTLY` + `ANALYZE` on all 3 dashboard MVs (`journey_bot_classification_v1`, `journey_funnel_steps_v1`, `journey_entry_channel_v1`). Posts GChat alert only on failure (daily success would be noise).
- **`vercel.json`** [vercel.json](vercel.json) — scheduled `0 4 * * *` (04:00 UTC = 21:00 PT off-peak), joining the existing Fix #27 monitoring crons.
- **Daily-digest extended** [src/app/api/internal/monitoring/daily-digest/route.ts](src/app/api/internal/monitoring/daily-digest/route.ts) — adds "Dashboard MV freshness" section comparing `MAX(journey_start_ts)` per MV vs `MAX(first_seen)` from `chapter_journey.journeys`. Alerts if any MV is > 24h behind source. This catches BOTH stale data AND a silently-failed cron (since the digest fires at 14:00 UTC daily regardless).
- **Pre-deploy:** `DATABASE_DIRECT_URL` added to Vercel Production env (user confirmed deployed). Replica direct URL is read-only and would fail REFRESH MV; uses primary direct host.

#### Attribution Models page wired (RPC + Single-then-Compare layout)
- **2 new multi-tenant snapshot tables in `chapter_reporting`** (no `eos_` prefix, per CLAUDE.md reporting-generalization recipe):
  - `purchase_channel_final_v1` (chapter-level final first/last touch + purchase_ts, indexed on `(client_key, purchase_ts)`)
  - `attribution_linear_chapter_v1` (chapter×channel fractional credit + purchase_ts)
- **Loader function `chapter_reporting.refresh_attribution_tables(p_cohort_start)`** — v1 used `chapter_attribution.chapter_summary_v1` for first/last and timed out at 28+ min on first run. **v2 (shipped) reads first/last from `canonical_v1.channel_path` directly** (parse first/last segments) — completes in seconds. Same source as Phase 2's linear, so first/last/linear are semantically consistent. Trade-off: ~1% drift vs legacy `eos_attribution_*_v1` (the legacy uses chapter_summary_v1 which includes non-session-entry events).
- **RPC `chapter_reporting.attribution_overview(client_key, start, end)`** — single round-trip returning channel × first/last/linear orders+revenue, windowed by `purchase_ts`. Page computes percentages client-side.
- **Page wiring** [src/app/chapter/(authed)/attribution/page.tsx](src/app/chapter/(authed)/attribution/page.tsx) + [AttributionClient.tsx](src/app/chapter/(authed)/attribution/AttributionClient.tsx): server Promise.all of attribution + 3 KPI strip RPCs + 3 prior-window RPCs. Client converts rows → percentages, J-shape custom = 40% first + 20% linear + 40% last.
- **Layout change** (per user request): dropped the "Compare models / Single model" toggle. Page now shows Single Model section (with model dropdown + allocation card) at top, then Compare Models section (multi-select + bump chart + allocation table) below. Both views always rendered.
- **Validation:** new linear matches legacy `eos_attribution_linear_v1` within ~1% drift on every channel at the May 3 cutoff (drift = canonical_v1 being fresher than May-3-frozen `eos_attribution_linear_v1` snapshot).
- **Override-layer note:** the new RPC does NOT apply the email backfill override layer (Fix #21+ work). To match override-aware semantics in the future, we'd need to either join `journey_entry_channel_overrides` on session-level journey_ids (not exposed in canonical_v1_snapshot) OR rebuild via the old `chapter_summary_v1` path and accept its 28+ min runtime. Deferred — accepted ~10-15% per-channel divergence vs legacy.

#### Paths page wired (Set + Collapsed + Raw modes, all real data)
- **RPC `chapter_reporting.path_combinations_overview(client_key, start, end, p_mode)`** — single function accepts `p_mode = 'set' | 'collapsed' | 'raw'` and switches grouping inside the SQL:
  - **Set**: `GROUP BY` sorted distinct channels (e.g., `{direct, email}`). 14 rows for EOS in 30d window. Order-independent.
  - **Collapsed**: `GROUP BY (first_touch, last_touch, middle_step_count)`. Returns `channels = [first, last]` + `gaps = [middle_count]`. 109 rows. E.g., `Direct → 2 steps → Email`. Exact step count is part of the grouping key — two chapters with different middle counts are separate rows.
  - **Raw**: `GROUP BY` exact `channel_path` string. 132 rows. Most granular.
- **Server page fetches all 3 modes (+ both windows) in parallel** — 6 RPC calls in one Promise.all. Each independently cached via `unstable_cache`, so toggling mode after first load is free.
- **PathsClient renders mode-appropriate row IDs** so the "New" badge compares apples-to-apples per mode (a "new raw path" means that exact sequence didn't appear in prior; a "new set" means that channel combination didn't).
- **"New" badge bug fix:** when prior window has zero data at all (e.g., 90d range but cohort only starts 30d ago), suppress the badge entirely. Otherwise every combo would look "new" against an empty baseline.
- **UI removed at user request:** Compare button, row-checkbox selectors, right-side chevron column. Just the data table.
- **Files:** [src/app/chapter/(authed)/paths/page.tsx](src/app/chapter/(authed)/paths/page.tsx), [PathsClient.tsx](src/app/chapter/(authed)/paths/PathsClient.tsx).

#### Channels page wired (role classifier + Cards/Matrix views)
- **RPC `chapter_reporting.channel_roles_overview(client_key, start, end)`** — one row per channel with `only_pct / opener_pct / mid_pct / closer_pct` (sum to 100) + `presence_pct` + `revenue_touched` + `chapters`. Per (chapter, channel) where channel appears:
  - `only` = chapter has exactly 1 distinct channel
  - `closer` = multi-channel AND channel is the last session
  - `opener` = multi-channel AND channel is first session AND not also last (closer wins ties)
  - `mid` = appears in chapter but isn't opener/closer/only
- **Dominant-role labeling done client-side** with tunable thresholds (`dominantLabel` in [ChannelsClient.tsx](src/app/chapter/(authed)/channels/ChannelsClient.tsx)):
  - `Solo` if only ≥ 60%
  - `Generalist` if opener/mid/closer spread ≤ 12pp
  - else dominant = max of opener/mid/closer
- **Live EOS results (30d):** Direct = Closer (41% close, 39% only), Email = Opener (33% open), Organic Search = Generalist (all roles ~23-30%), Referral = Closer, Organic Social = Solo (100% only with N=1).
- **`roleSentence` templates** generate the per-card narrative based on dominant label, with an appended "solo clause" when `Only ≥ 25%` (e.g., "Direct closes 41%... That said, it's the only channel a notable 39% of the time"). Tunable in TS, no LLM.

#### Channels enhancements: Acq/Ret split + Affinity matrix
- **Acquisition vs Retention split per channel (Cards view):**
  - RPC `channel_roles_overview` extended with `acquisition_chapters` (chapter_id = 0 = first ever purchase for that identity) + `retention_chapters` (chapter_id ≥ 1).
  - Rendered as "New · Ret" stat (labeled "New · Ret" not "Acq · Ret" per user preference). Shown as `63% / 37%` style next to Presence/Revenue/Chapters.
  - 4 stats now fit on one row per card via inline `gridTemplateColumns: "repeat(4, 1fr)"` override (CSS default was 3 columns).
- **Channel co-occurrence affinity matrix (Matrix view):**
  - RPC `chapter_reporting.channel_affinity_overview(client_key, start, end)` returns one row per ordered (src, dst) pair of distinct channels. `affinity_pct = % of chapters containing src that ALSO contain dst`. Asymmetric by design.
  - Renders as a 5×5 grid below the role-distribution table. Cell intensity scales with affinity (transparent at 0, navy at ≥50%, white text at ≥50%). Hover shows full precision.
  - **Row labels (left, "anchor" channel) = warm orange band**; **column headers (top, "checked" channel) = cool gray band**. Black 2px L-divider between the header band and data cells. User-driven styling — visual reinforcement of which axis is which.
  - Header reads: "When [row] channel appears, [column] channel appears…" with `[row]` in orange and `[column]` in gray to mirror the cell coloring.
- **Key EOS insight from affinity matrix:** Email→Direct = 67% (when Email appears, Direct does too 67% of time); Direct→Email = 42% (asymmetric — Direct is mostly solo / return-customer traffic).

#### Cumulative wiring scorecard (end of May 26)
- **Live-wired pages (4 of 8):** Raw Performance, Attribution Models, Path Patterns, Channel Roles
- **Still on mockdata (2):** Lifecycle Overview, Customer Journeys
- **Deferred indefinitely (2):** Observations (needs question-library engine), Lift & Incrementality (needs holdout/causation infrastructure)

### Stale-MV diagnosis + dashboard refresh script (May 25, 2026)
- **Symptom:** `/chapter/raw` rendered with sparse/empty tile fields and Next.js dev indicator showed 5 failed RPC calls (`journey_overview` ×2, `engagement_quality` ×2, `dashboard_timeseries` ×1) all returning `code: 57014 — canceling statement due to statement timeout` (PostgREST 8s ceiling).
- **Diagnosis:** `chapter_reporting.journey_bot_classification_v1` (+ siblings `journey_funnel_steps_v1`, `journey_entry_channel_v1`) had max `journey_start_ts = 2026-05-16 23:02 UTC` — **9 days stale** vs source `chapter_journey.journeys` max `first_seen = 2026-05-25 18:12 UTC`. The MVs are not auto-refreshed. Stale Postgres stats + cold buffer cache pushed `journey_overview` from sub-second to 4.27s (EXPLAIN ANALYZE), and current+prior calls combined exceeded the PostgREST 8s timeout.
- **Fix:** `chapter-scripts/refresh-dashboard-mvs.js` — refreshes all 3 dashboard-critical MVs with `REFRESH MATERIALIZED VIEW CONCURRENTLY` (all have unique PK indexes) + `ANALYZE` per MV. Uses `DATABASE_DIRECT_URL` + `statement_timeout = '30min'` + `keep_alive: 60` (memory: `feedback_postgres_js_keepalive`).
- **Cadence pending:** the script is one-shot. A nightly Vercel Cron schedule (or pg_cron) needs to be wired — this is the now-active "Build MV refresh script + cron" item that was originally in the backlog.
- **Lesson:** materialized views that back live dashboard surfaces must have a refresh cadence from day one. The dashboard's `unstable_cache` (5-min TTL) sits on top of the RPC layer, but the RPCs read from MVs that don't auto-refresh — so a stale MV creates the illusion of working caches while serving frozen data. Detection signal: max-timestamp drift between MV and source table. Add this check to monitoring (Fix #27 daily-digest is the natural home).

### Chapter Dashboard data-wiring — Raw Performance fully wired (May 22-25, 2026)
- **Page status:** `/chapter/raw` is the first of 8 Chapter dashboard pages to be fully live-wired. Other 7 (Observations, Overview, Channels, Paths, Lift, Attribution, Journeys) still on mockdata.
- **New RPC `chapter_reporting.dashboard_timeseries(client_key, start, end, n_buckets)`** — returns N equi-width buckets across `[start, end)` with per-bucket `orders / revenue / journeys / identified / engagement_rate`. One round-trip backs every sparkline on the page. Reconciles to headline tile values exactly when same window is used (370 orders / $32,743.55 net revenue / 43,771 non-bot journeys / 1,597 identified — verified Apr 22 → May 22 window).
- **Live wiring scope:**
  - 6 tile cards each get a real sparkline (12 buckets) + real movement delta ("+8.6% vs prior") computed from a second parallel call to existing tile RPCs with a `priorWindow(start, end)`-shifted window
  - Top-bar KPI strip (`Orders / Revenue / AOV / Journeys / % Identified`) now pulls live values for each page that passes the `kpis` prop to `TopBar`; unwired pages still see mock via the fallback in `KpiStrip`
  - "No comparison" choice in the Compare dropdown (`?compare=none`) cleanly hides all movement-delta UI everywhere (tile cards + KPI strip) — both `KpiStrip` and `RawClient` check `useSearchParams().get("compare")`
- **Caching:** `cachedDashboardTimeseries` added to `src/app/chapter/_lib/dashboard-rpc.ts`. Same `unstable_cache` + 5-min TTL + 5-min bucket pattern as the rest. Prior-period args don't need a new RPC — just shifted window into existing tile RPCs.
- **Files touched:** `src/app/chapter/(authed)/raw/page.tsx`, `RawClient.tsx`; `src/app/chapter/_lib/dashboard-rpc.ts` (added `DashboardTimeseriesRow`, `cachedDashboardTimeseries`, `priorWindow()`); `src/app/chapter/_components/KpiStrip.tsx` (accepts `kpis?: Kpi[]`, hides delta when `?compare=none`); `src/app/chapter/_components/TopBar.tsx` (accepts + passes `kpis`).
- **Pattern for wiring the remaining 7 pages:** server page fetches current + prior + (page-specific RPCs) in `Promise.all`, computes deltas in TS, builds a `Kpi[]` array, passes everything to client component. Reuse `priorWindow()`, `pctDelta()`, the `kpis` prop on TopBar. No DB schema changes needed for next pages unless their tiles require new RPCs.

### Chapter Dashboard data validation pass — all 5 Raw tiles reconcile (May 22, 2026)
- **Scope:** every tile on `/chapter/raw` cross-checked against raw tables in `chapter_ingest.*` + `chapter_journey.*` + `chapter_identity.*`. Window: Apr 22 → May 22 (30d UTC).
- **Results:**
  | RPC | Result | Match |
  |---|---|---|
  | `purchase_overview` | 370 orders, $32,743.55 net rev | matches raw (370 orders, $32,781.36 gross − $37.81 refunds) ✓ |
  | `journey_overview` | 43,771 non-bot, 1,597 identified, 1,684 identify events | all exact ✓ |
  | `channel_performance_overview` | 8 channel rows | journey/order/revenue totals reconcile within $0.01 rounding ✓ |
  | `funnel_overview` | 43,250 page-views → 30,828 product → 448 cart → 370 purchase | exact ✓ |
  | `engagement_quality` | 43,771 total / 26,161 with-time / 0.5977 engagement | exact ✓ |
- **Override layer working correctly:** 771 (direct) journeys reclassified in window — 728 → email, 43 → referral. Total journey count unchanged (overrides only rewrite labels, never adjust counts).
- **5 design observations flagged for future** (none are bugs, all are intentional choices to revisit):
  1. **`pct_identified` denominator is bot-filtered but numerator isn't** — could yield >100% if a bot ever resolves identity. Easy guard when next touching the RPC.
  2. **521 non-bot journeys have no `page_view` event** (43,771 total − 43,250 page_view) — started with hover_intent, identify, or scroll. The funnel's "Page view" is therefore not the *true* top; should be read as "page view among journeys that have one." **Tier 1 redirect domain will largely close this** because the redirect owns the landing URL → can deterministically fire a server-side page_view equivalent at redirect time.
  3. **Funnel's Purchase step doesn't apply the non-bot filter** — by design (orders are authoritative regardless of bot classification). For EOS data this is fine.
  4. **Shopify Admin "Gross sales" vs Chapter `value`** — definitional difference (Shopify gross = subtotal × qty, pre-tax/ship/discount; Chapter `value` = total_price post-everything). Documented in Fix #3.
  5. **(unknown) bucket = 27.7% of attributable revenue ($9,054.61)** — chapters with no canonical_v1 session entry (purchase via email-bridge / cart_token bridge without browser session in window). Likely repeat customers reusing cart links / Shopify Email wrapped URLs. Not a bug, but the size suggests there's still attribution lift available if you wanted to chase it further.

### Email channel attribution backfill — multi-pronged, EOS now within 2.4pp of GA (May 17-22, 2026)
- **Goal:** close the gap between Chapter's email-channel attribution and GA's. Pre-backfill Chapter showed email at ~27% of GA's share; post-backfill Chapter shows email at ~75% of GA's share for EOS (~2.4pp absolute residual gap, mostly cross-device users without identity link — structural, not addressable without Tier 1 redirect).
- **Five backfill passes**, each writing to `chapter_reporting.journey_entry_channel_overrides` (read-time overlay table; channel_performance_overview applies via `COALESCE(override.entry_channel, ec.entry_channel)` so MVs don't need rebuilding):
  1. **Mailchimp URL+14d match (3,460 overrides)** — loaded 27 campaigns / 666 link rows from xlsx export → `chapter_config.email_campaigns (platform='mailchimp')`. Matched (direct) journeys whose entry page_url path matched a known email link within 14d of campaign send.
  2. **Mailchimp identity-stitch via identity_canon (214 overrides)** — Mailchimp Reports API → `chapter_config.email_engagement_events` (12,427 clicks + 105,533 opens across 30 campaigns). For each click, found journeys where `canonical_identity = email_sha256:X` of the recipient AND journey.first_seen ∈ [click_ts, click_ts + 14d].
  3. **Mailchimp URL+time precision (239 overrides)** — for clicks within 90s of an anonymous (direct) journey landing on the same URL. 3-phase materialization (click landings → direct landings filtered to clicked URLs → 90s JOIN) to dodge the 5-min PostgREST API timeout. Phase 2: 234k journeys → 20,356 filtered = 12× reduction.
  4. **AI source reclassification (77 overrides)** — (direct) journeys where the AI parsed a probable real source from URL params / referrer → reclassified mostly to referral.
  5. **Shopify Messaging URL+14d match (416 overrides)** — 19 campaigns manually pasted from Shopify Messaging admin into `/tmp/shopify_messaging_campaigns.json` (no per-recipient API available — only aggregate clicks). Loaded into same `email_campaigns` table with `platform='shopify_messaging'`. Backfilled with `ON CONFLICT DO NOTHING` so Mailchimp's stronger signals (identity-stitch) take precedence.
- **Total overrides for eos_fabrics: 4,406.** Distribution: `email_url_match` 3,460 / `shopify_url_match` 416 / `mailchimp_url_time_match` 239 / `mailchimp_click_match` 214 / `ai_source_reclassify` 77.
- **Architectural notes:**
  - Email_sha256 hash convention: `SHA256(lowercase(trim(email)))` — used by both ingest (`identity_canon`) and these backfills consistently.
  - The override table is keyed on `(client_key, journey_id)` UNIQUE — so a journey can only have one override. Multiple backfill passes use `ON CONFLICT DO NOTHING` to preserve precedence (stronger signal wins because it ran first).
  - Mailchimp API key + Shopify Messaging access flow: see chapter-scripts/sync-mailchimp-engagement.js, chapter-scripts/load-eos-shopify-messaging-campaigns.js, chapter-scripts/run-shopify-messaging-url-match-backfill.js.
- **Pricing/scaling note:** Mailchimp Reports API calls don't incur incremental cost on their subscription. Shopify Messaging has no per-recipient API — manual paste is the only path until/unless Shopify exposes it. **Recipient-list-only data (without per-recipient clicks) was deemed not worth chasing** — would back-attribute visits from people who never opened the email, creating noise without proportional signal.

### Refunds webhook + refund-netting in dashboards (May 17-25, 2026)
- **New table** `chapter_ingest.refund_events`: `(refund_id PK, client_key, order_id, shop_domain, amount, currency, refund_ts, raw, ingested_at)`. RLS-enabled (Fix #26 framework). Refund_id format distinguishes source: `csv_backfill:#102173` (historical) vs `shopify_refund_{shopify_refund_id}` (webhook-flowing).
- **CSV backfill (May 17):** 17 historical EOS refunds totaling $450.96 imported from a manual export.
- **Webhook route** `src/app/api/shopify/webhooks/refunds-create/route.ts`: same per-shop HMAC pattern as orders-create. Sums `transactions[].amount` where `kind='refund' AND status='success'`; zero-amount returns 200 with `skipped: "zero_amount"` (Shopify "Send test notification" sends a zero-amount mock — by design). Configured + verified in EOS Shopify admin (verified May 20: auth path + skip path); INSERT path will validate on first real refund event.
- **Refund-netting in dashboard RPCs:**
  - `purchase_overview` — `total_revenue` now subtracts `refunds.amount` for orders in window
  - `channel_performance_overview` — net revenue distributed across channels via linear attribution
  - `dashboard_timeseries` — refunds bucketed by `refund_ts` and netted out of bucket revenue
  - **AOV uses net revenue ÷ gross order count** — matches Shopify Admin's "Gross sales" / "Net sales" convention. Total_orders count is NOT decremented by refunds (intentional — "transactions processed" remains accurate).
- **Validation:** Apr 22 → May 22 window had 3 refunds totaling $37.81 (within 17 backfill rows). RPC's net revenue ($32,743.55) = raw gross ($32,781.36) − $37.81 refunds. Exact match.

### /internal/tasks page — n8n-driven task tracker (May 21, 2026)
- **Use case:** the user's email-to-clients flow now has an n8n pipeline that (1) parses outgoing project-update emails via Claude, (2) extracts actionable tasks, (3) writes to Supabase. This page is the human review surface where tasks can be ticked done.
- **Schema in `tasks` schema (new):**
  - `tasks.task_batches`: `(id uuid PK, client_id uuid FK→crm.clients.id nullable, subject_line, source_phrase, gmail_message_id UNIQUE, unmatched bool, match_score real, created_at)`
  - `tasks.tasks`: `(id uuid PK, batch_id uuid FK→task_batches CASCADE, topic, task_text, note nullable, status text CHECK IN ('draft','open','done','dropped') default 'draft', sort_order, created_at)`
  - RLS-enabled. service_role has full grants (USAGE schema, SELECT/INSERT/UPDATE/DELETE tables, default privileges set for future tables, schema added to PostgREST exposed schemas).
- **Page `/internal/tasks`:**
  - Gated by `CHAPTER_DASH_TOKEN` cookie (same middleware gate as `/internal/client-portal-config`)
  - Client columns (`crm.clients.business_name`) → topic groups → task rows
  - "Unassigned" column appended for batches with `client_id IS NULL` (n8n's unmatched bucket)
  - Defaults to `status='open'`; toggle pill switches to also show `done` (URL: `?done=1`)
  - **Inline editing on click**: task_text, note, and topic header all editable. Enter saves (Shift+Enter for newline), Esc cancels, blur also saves. Optimistic UI with error-revert. Editing a topic header re-topics the *first task only* (avoids surprise bulk re-grouping; to move multiple, edit each task individually).
  - Server actions: `toggleTaskStatus`, `updateTaskText`, `updateTaskNote`, `updateTaskTopic` — all use `revalidatePath("/internal/tasks")` to refresh.
- **n8n integration shape:** n8n writes directly to Supabase via service_role (no Next.js webhook). Promotion `draft → open` happens via an n8n form submit (out of scope for this repo). Future plan: when a task hits `status='open'`, n8n triggers Claude to write code → opens a PR or posts a Gchat reply.
- **Files:** `src/app/internal/tasks/layout.tsx`, `page.tsx`, `TasksBoard.tsx`, `_actions.ts`.

### Chapter Dashboard v1 shell shipped (May 14, 2026)
- **Scope shipped today:** the full agency-operator dashboard surface at `/chapter/*` — 8 pages (Observations, Lifecycle Overview, Channel Roles, Path Patterns, Lift & Incrementality, Attribution Models, Customer Journeys, Raw Performance) — running on `_components/mockdata.ts`. Page-by-page Supabase wiring starts May 15.
- **Design:** ported from a Claude Design handoff (high-fidelity React-in-browser prototype). 13 reusable primitives. Tokens scoped to a `.chapter-app` wrapper class so they cannot leak into agency Tailwind. Mobile-responsive (sidebar drawer, KPI wrap, table internal-scroll, Journeys detail panel hidden on phone).
- **Auth:** shared `CHAPTER_DASH_TOKEN` env var compared verbatim against `chapter_auth` cookie. Middleware extends to gate `/chapter/*` alongside the existing `/for-clients/*` HTTP Basic. Login at `/chapter/login`; 14d session.
- **Architectural decisions** (data fetching pattern, reporting generalization strategy, URL state, mobile rules, future `/chapter/[client_key]/*` plan) all live in the new **📊 Chapter Dashboard** section above. That section is the source of truth for data-wiring sessions ahead — read it before touching the dashboard.
- **Files:** `src/app/chapter/*` (layout, route group, 8 pages, login, primitives), `src/app/api/chapter-auth/route.ts`, `middleware.ts` extension. Plus `src/components/NavBar.tsx` / `Footer.tsx` / `ChapterLoader.tsx` updated to hide on `/chapter/*` paths.
- **Known UI polish deferred to data-wiring sessions:** channel drawer + path-combo drawer (designed, not built), bump-chart hot-channel emphasis, tier-based feature stripping beyond the existing Starter lock-pill pattern.

### Projectagram client onboarded — second production client (May 12, 2026)
- **Client:** `projectagram_reels` (storefront `projectagram.com`, Shopify shop `projectagram.myshopify.com`). Shopify ecommerce, similar shape to EOS (3P pixel pattern; user's preferred 1P-HOSTED variant not viable on Shopify until a custom app is built).
- **Onboarding shape:** four phases — (1) DB setup, (2) code changes for multi-tenant, (3) pixel scripts installed in their `theme.liquid`, (4) Shopify webhooks configured. Total ~2 hours from "client wants in" to "pixel + webhook fully verified."
- **Phase 1 DB:** HMAC secret generated + INSERTed to `chapter_config.client_secrets` via `chapter-scripts/onboard-projectagram.js`. Per-client Postgres role `client_projectagram_reels` created (forward-compat for Fix #26 part 2 route migration).
- **Phase 2 code — multi-tenant CORS:** `src/app/api/chapter/collect/route.ts`'s hardcoded `ALLOWED_ORIGIN = "https://eosfabrics.com"` replaced with a `Set<string>` containing both clients' apex + www. CORS dynamically reflects the matching `Origin` header (never wildcard, so credentials work).
- **Phase 2 code — multi-tenant Shopify webhook routing:** both `/api/shopify/webhooks/orders-create` and `orders-cancelled` now resolve `client_key` from the `x-shopify-shop-domain` header via a `SHOPIFY_SHOP_DOMAIN_TO_CLIENT_KEY` map (currently `emmaonesock.myshopify.com → eos_fabrics`, `projectagram.myshopify.com → projectagram_reels`). Unknown shop → 401 `unknown_shopify_shop` with audit log.
- **Phase 2 code — DB-backed per-shop webhook secrets** (built during onboarding, applies retroactively to EOS too): new table `chapter_config.shopify_webhook_secrets (client_key, shop_domain, secret, key_version, rotated_at, revoked_at, notes)`. Helper at `src/app/lib/auth/shopify-webhook-secrets.ts` (`getActiveWebhookSecrets(shop_domain)`, 5-min in-memory cache, supports rotation overlap). Webhook routes try each non-revoked secret in turn. `SHOPIFY_API_SECRET` env var is now ignored by code (can be dropped from Vercel after stable period). EOS's secret backfilled from the env var; projectagram's pasted from their Shopify Admin → Settings → Notifications → Webhooks.
- **Phase 3 pixel:** pixel scripts (base + identification + Add-to-Cart + Cart-View) installed in `theme.liquid` <head>. Newsletter identification: custom selector for Shopify native footer signup (`form#newsletter-footer`). Contact identification: form ID `contact-template--18751776522284__form` (projectagram's theme uses different prefix than EOS — `contact-` vs EOS's `ContactForm-`). Login + Add-to-Cart + Cart-View identical to EOS's idempotent versions.
- **Phase 4 Shopify config:** orders-create + orders-cancelled webhooks created in projectagram.myshopify.com admin (scenario B = Admin-configured, per-shop signing key). Both verified end-to-end via Shopify's "Send test notification" → success rows in `chapter_audit.api_auth_attempts`.
- **Lesson learned:** initially guessed EOS's `.myshopify.com` handle as `eosfabrics.myshopify.com` based on company name. Wrong — actual is `emmaonesock.myshopify.com`. First EOS test webhook failed `unknown_shopify_shop`, requiring code + DB correction + redeploy. Saved to memory `feedback_never_guess_external_identifiers.md`. Going forward: always ask the user for the exact handle/identifier; never derive from a company name or pattern.
- **EOS dedup cleanup (same session):** EOS had all 6 pixel script blocks duplicated in `<head>` (template-copy artifact). Analyzed each — Base / Login / Cart-View were idempotent already; Mailchimp / Contact / Add-to-Cart were duplicating real network calls (Add-to-Cart was inflating `add_to_cart` event counts 2×). User deleted the 6 duplicate blocks and replaced the surviving Mailchimp / Contact / Add-to-Cart copies with idempotent versions (added `window.__chapter_*_bound` global flags). Historical `add_to_cart` event counts in `chapter_ingest.pixel_events` likely 2× actual for the duplication window — accepted gap, no backfill.
- **/api/purchase canon-upsert bug fix (closes the bleed for new orphan purchases):** added unconditional self-canonical `identity_canon` upsert at the start of the purchase write path. Previously the two existing canon-upsert paths (explicit-identify + cart_token-bridge) only fired when an anonymous_id or cart_token existed; guest checkouts with only email_hash hit neither path → email_hash never made it into canon → purchase orphaned out of attribution. Fix: every purchase with email_hash or customer_id now upserts a self-canonical row. Idempotent. Deployed alongside the projectagram onboarding code changes.

### 44-row attribution gap (RESOLVED May 12, 2026)
- **Symptom:** 494 raw `purchase_events` post-April-1 but only 450 chapters in `purchase_base` — 44 valid purchases (~9% of revenue events) being dropped silently.
- **Root cause:** 41 distinct deterministic identities (email_sha256:..., shopify_customer_id:...) from those orphan purchases were missing from `chapter_identity.identity_canon` entirely. Fix #20's backfill went `identity_canonical → identity_canon`, but these emails had no alias edges → not in `identity_canonical` → not picked up. The chunked rebuilder iterates only over canonicals in `identity_canon`, so these orphans never made it into `lifecycle_chapters_snapshot`, which then cascaded down.
- **Two populations:** 35 pre-May-4 orphans (Fix #20's backfill couldn't have caught them — pre-date the fix); 6 post-May-4 orphans (now-closed code bug — Fix #20's `/api/purchase` canon-upsert path was NOT firing for guest-checkout Shopify webhook flows without cart_token bridge).
- **Fix applied (May 12):** SQL backfill `chapter-scripts/snapshots/2026-05-12-fix-26-followup-canon-backfill-purchases.sql` inserts missing identities as self-canonical (`identity_canon` 2,227 → 2,276 rows, +49). Re-ran chunked rebuilder (+44 rows to `lifecycle_chapters_snapshot`). Re-ran Phase 1 cascade. All snapshots now reconcile cleanly: 494 raw = 494 in `purchase_base` = 494 in canonical_v2 (349 with session entry data + 145 fallback no-session, including the 44 newly-recovered orphans). `canonical_v1` stays at 349 by design (it only includes chapters with session-entry data, and orphans had none).
- **Code fix shipped (also May 12):** see Projectagram onboarding entry above — `/api/purchase` now unconditionally upserts a self-canonical row, closing the orphan bleed for all future orders.

### Fix #26 Part 2 — Multi-tenant route migration COMPLETE (May 13, 2026)
- **Goal:** every Chapter ingest route now writes through per-client Postgres roles with RLS-enforced isolation. A bug or compromised secret for one client cannot read or write another client's data — DB enforces it, not application code.
- **Pool role:** new `chapter_app` LOGIN role (NOBYPASSRLS, NOINHERIT, **zero direct table grants**). Routes open a transaction over the Supabase transaction pooler (port 6543) and call `SET LOCAL ROLE client_<key>; SET LOCAL app.client_key = '<key>'`. If a route forgets to `SET ROLE`, queries fail with permission denied (loud failure mode, not silent leak). Provisioning script: `chapter-scripts/provision-chapter-app-role.js`. Connection string in `CHAPTER_APP_DATABASE_URL` (Vercel + chapter-scripts/.env).
- **Helper module:** `src/app/lib/db/per-client.ts` exposes `withClient(clientKey, fn)`. `CLIENT_ROLE_MAP` is the source of truth — keep aligned with `chapter_config.client_secrets` and the per-client Postgres roles when onboarding new clients.
- **CORS helper:** `src/app/lib/auth/cors.ts` (`CHAPTER_ALLOWED_ORIGINS`, `withCors`, `corsPreflightHeaders`). Used by every browser-facing route. Onboard new clients by editing one Set there.
- **Routes migrated (7 total, deployed + verified in prod one at a time):**
  - `/api/conversion` — HMAC, RLS, jsonb metadata. Canary deploy.
  - `/api/purchase` — HMAC, RLS, 4-phase logic (explicit-identify alias, cart-token bridge, self-canonical fallback, canon-lookup + purchase INSERT + identify audit). Preserves all Fix #20 + Fix #25 semantics.
  - `/api/identify` — multi-tenant CORS, RLS, 6 phases (journey ensure, self-canon, prev-identity bridge, identity_links upsert, journey backfill, pixel_events audit). `journey_id` is real here so the audit insert actually succeeds (unlike purchase's audit attempt, which has a NOT-NULL constraint footgun preserved as latent).
  - `/api/consent` — gained multi-tenant CORS (was unauthenticated). RLS. consent_events + journey upsert collapsed into one statement via `INSERT ... ON CONFLICT (id) DO UPDATE`.
  - `/api/alias` — gained HMAC auth (was unauthenticated). RLS. **Also fixed latent NOT-NULL bug on `identity_aliases.reason`** — original had zero successful inserts since whenever the constraint was added; route now defaults `reason` to `'manual_alias_api'`.
  - `/api/offline` — gained HMAC auth (was unauthenticated). RLS. Preserves consent hard-stop (204 when milestone fires without `opt_in`). Discovered `offline_milestones` has **no uniqueness constraint** beyond PK; the original "idempotent duplicates" comment was wrong (23505 never fires). Not in scope; flagged.
  - `/api/chapter/collect` → `/api/pixel` — hottest route (~50k events/day). **Consolidated 10 DB round-trips into 3 transactions per event** by collapsing journey existence-check + INSERT/UPDATE into a single `ON CONFLICT DO UPDATE`. Consent gate preserved exactly.
- **Grants added** during migration (discovered during canary): `UPDATE` on all RLS-protected tables to per-client roles (`ON CONFLICT DO UPDATE` requires it), plus `USAGE, SELECT ON ALL SEQUENCES` in `chapter_ingest`, `chapter_identity`, `chapter_journey`. Default privileges set for future tables. SQL: `chapter-scripts/snapshots/2026-05-13-fix-26-part2-add-update-grants.sql`.
- **JSONB binding fix (critical):** `${JSON.stringify(obj)}::jsonb` with postgres-js double-encodes — the value stores as a JSON-quoted *scalar string*, not as an object. `traits->>'plan'` returns null. Correct pattern: `${tx.json(obj)}::jsonb` for non-null, `${obj ? tx.json(obj) : null}::jsonb` when nullable. Applied to identify, pixel, consent, alias, offline routes. (Purchase route's only stringify was in the latent-broken Phase 6 audit insert, fixed defensively even though it never runs.)
- **Transaction-state gotcha:** postgres-js `sql.begin()` aborts the entire transaction on any error inside the callback. Try/catch inside the transaction *cannot recover* by issuing another query — Postgres rejects subsequent statements with "transaction aborted." Pattern: use `INSERT ... ON CONFLICT DO UPDATE` (single statement, never needs in-tx recovery) instead of INSERT-then-conditional-UPDATE.
- **End-to-end verification:** `chapter-scripts/verify-rls-end-to-end.js` confirms (1) roles configured correctly, (2) `chapter_app` has zero direct grants, (3) 11 tables RLS-enabled, (4) **cross-tenant write rejected with 42501 row-level-security violation — the load-bearing safety property**, (5) recent audit log activity from every endpoint, (6) production data flow unchanged, (7) identity_canon growth healthy.
- **Env vars dropped (May 13):** `AFG_CLIENT_SECRETS_JSON` (replaced by `chapter_config.client_secrets`, Fix #26 Part 3) and `SHOPIFY_API_SECRET` (replaced by `chapter_config.shopify_webhook_secrets`). No live code reads them — verified via grep before deletion.
- **What this unlocks:** Chapter is now safe to onboard dentist / school / B2B startup clients. Sales pitch claim "DB-level tenant isolation" is now backed by actual policy, not aspirational architecture. At 50 clients the cost of a bug-induced cross-client leak goes from "explain to one client" to "explain to 49"; this work eliminates that failure mode entirely.
- **Onboarding a new client now requires:** (1) generate HMAC secret + INSERT to `chapter_config.client_secrets`, (2) `CREATE ROLE client_<key> NOLOGIN NOINHERIT NOBYPASSRLS` + grants + `GRANT client_<key> TO chapter_app`, (3) add `client_<key>` → `client_client_<key>` to `CLIENT_ROLE_MAP` in `src/app/lib/db/per-client.ts`, (4) add origin to `CHAPTER_ALLOWED_ORIGINS` in `src/app/lib/auth/cors.ts`, (5) add shop_domain → client_key to Shopify webhook routes if Shopify. **Worth scripting** if/when onboarding cadence picks up — current process is ~30 min/client and error-prone.

### Fix #26 Part 2 framework — RLS policies + per-client Postgres roles (May 12, 2026)
- **Scope:** establish the database-level isolation framework. Per-client Postgres roles created (`client_eos_fabrics`, `client_adsforgood_prod`, NOINHERIT/NOLOGIN). RLS enabled with `USING (client_key = current_setting('app.client_key', true))` policies on 10 high-risk tables: all of `chapter_ingest.*` (6 tables), `chapter_identity.identity_aliases`/`identity_canon`/`identity_links`, and `chapter_journey.journeys`. Grants on `chapter_ingest.*` and `chapter_identity.*` to per-client roles: SELECT + INSERT (append-only matches the "raw ingest, never mutated" principle).
- **service_role still bypasses (BYPASSRLS=true).** RLS is enabled, not FORCED. All current routes use service_role → continue working unchanged. No regression.
- **Status update (May 13):** see "Fix #26 Part 2 — Multi-tenant route migration COMPLETE" entry above. Routes now use `chapter_app` + per-client SET ROLE; RLS actively enforces tenant isolation.
- **Files:** `chapter-scripts/snapshots/2026-05-12-fix-26-part2-rls-framework.sql`, verifier `chapter-scripts/verify-rls-framework.js`.
- **Design doc:** `/docs/fix-26-multi-tenant-isolation-design.md` describes the full migration path (parts 2 + 3 architectural shift).

### Fix #26 Part 4 — Audit logging on auth attempts (May 12, 2026)
- **New schema `chapter_audit`** for operational/security logs (separate from `chapter_reporting`'s dashboard focus). Table `chapter_audit.api_auth_attempts` with: `endpoint`, `client_key`, `success`, `failure_reason`, `ip_hash` (SHA-256, no raw IP per GDPR), `user_agent_snippet`, `request_id`, `ts`. Three indexes: by-time DESC, by-(client,time), and partial-on-failures.
- **Helper module:** `src/app/lib/audit/auth.ts` exports `logAuthAttempt()`, `hashIp()`, `getClientIp()`. Errors in logging never block the actual request (caught + `console.error`'d).
- **Wired into 4 HMAC-protected endpoints:** `/api/purchase`, `/api/conversion`, `/api/shopify/webhooks/orders-create`, `/api/shopify/webhooks/orders-cancelled`. Each logs success + every failure path with the specific `failure_reason` (`missing_client_key` / `unknown_client` / `missing_signature` / `invalid_signature` / `missing_shopify_secret` / `missing_shopify_hmac` / `invalid_shopify_hmac`).
- **Not wired:** pixel `/api/chapter/collect` — would log one row per pixel event (~50k/day). Pixel uses CORS-only auth (no HMAC), different security model.
- **Verified post-deploy** with a deliberate `unknown_client` curl test against production; row appeared in `chapter_audit.api_auth_attempts` correctly.
- **Watch out:** new schemas must be added to PostgREST's "Exposed schemas" list in Supabase Dashboard (Settings → API). Without this, `supabase.schema("chapter_audit")` calls silently fail. `chapter_audit` and `chapter_config` added on May 12.

### Fix #26 Part 3 — Per-client API keys (DB-backed secrets) (May 12, 2026)
- **Replaced `AFG_CLIENT_SECRETS_JSON` env var** (one dict, single rotation unit) with `chapter_config.client_secrets` table supporting per-client independent rotation/revocation + overlap-window rotation (new + old both active until old is hard-revoked).
- **Schema:** `(id uuid PK, client_key, secret, key_version, created_at, rotated_at, revoked_at, notes)`. Plaintext secrets for now (HMAC needs plaintext). Restricted to service_role. Revisit with KMS encryption when enterprise compliance demands.
- **Helper module:** `src/app/lib/auth/client-secrets.ts` with `getActiveSecrets(client_key)` (returns all non-revoked secrets, newest first — auth code tries each) and `getActiveSecretForOutbound(client_key)` (newest active — used by Shopify webhooks to sign their internal call to `/api/purchase`). 5-min in-memory cache.
- **Backfilled** 2 clients (`eos_fabrics` + `adsforgood_prod`) from the existing env var via `chapter-scripts/backfill-client-secrets.js`.
- **Migrated 4 endpoints:** all 4 HMAC-protected endpoints now read from the table instead of the env var. The env var is now ignored (but still set in Vercel — will be dropped after ~few days of stable operation).
- **How rotation works now:** INSERT new row with `key_version=max+1` and fresh secret. Both old and new HMAC signatures continue to be accepted (auth code tries each). When client confirms switch: UPDATE old row to set `revoked_at = now()`. No re-deploy, no shared dict, per-client independent.
- **Deploy verified May 12** with end-to-end curl test through production.

### Fix #26 Part 1 — Leading client_key indexes (May 12, 2026)
- **Audit found 6 tables in `chapter_reporting` with NO indexes** (all post-Fix-#10 snapshot caches): `eos_purchase_base_snapshot_v1`, `eos_purchase_touch_summary_snapshot_v1`, `eos_purchase_fallback_snapshot_v1`, `eos_purchase_channel_final_snapshot_v1`, `eos_filtered_purchases_v1`, `eos_filtered_purchase_channels_v1`.
- For single-client (~450 rows each), seq scans are sub-millisecond — no impact yet. For multi-tenant, every query without an index scans ALL clients' rows.
- **Applied** single-column `(client_key)` leading indexes via `chapter-scripts/snapshots/2026-05-12-fix-26-part1-client-key-indexes.sql`. Multi-column tuning (e.g., `(client_key, purchase_ts)`) deferred until multi-client query patterns emerge.
- **All other 13 per-client tables** across `chapter_ingest.*`, `chapter_identity.*`, `chapter_journey.*`, `chapter_model.*`, `chapter_attribution.*` already had leading `client_key` indexes — coverage was good.

### Fix #25 Phase 0 + Phase 1 — Materialize lifecycle_chapters + cascade refresh (May 8-12, 2026, DONE)
- **Scope pivot (May 8, 2026):** Original Fix #25 design (incremental refresh layered on existing snapshots) failed validation. Diagnostic on `purchase_chapters_base` showed COUNT(*) timing out at 5 min; predicates don't push down through `unified_timeline_v1`'s union or `lifecycle_chapters`'s WindowAgg (~20M cost plan). Root: `lifecycle_chapters` was a VIEW running a window function over 2.77M pixel events on every consumer query.
- **Phase 0 = materialize `lifecycle_chapters` as a real table.** Then Phase 1 = original incremental work, now feasible because source view chain becomes fast.
- **Day 1 attempt FAILED (May 8):** Node loader ran 36 min, dropped with `CONNECTION_CLOSED`. Postgres-js doesn't enable TCP keepalive by default — middlebox closed the idle connection. Lesson saved to memory `feedback_postgres_js_keepalive.md` (fix: `keep_alive: 60` option OR server-side DO blocks).
- **Day 2 attempt FAILED (May 11):** Server-side DO block via Supabase SQL Editor also died at ~30 min. Pattern: ~30-min server-side connection ceiling in Supabase's stack (API gateway / load balancer level). Confirmed predicate pushdown is broken even on `unified_timeline_v1` directly via Strategy A test. Must use Strategy B (replicate three-branch logic inline at source tables).
- **Chunked rebuilder succeeded (May 12):** `chapter-scripts/run-lifecycle-chapters-chunked.js` bypasses the slow view chain entirely. Per chunk: query raw `pixel_events` / `purchase_events` / `offline_milestones` directly with `identity_key IN (...)` filter (hits `pixel_events_identity_idx`, ~0.2s per chunk), compute `chapter_id` window in JS, INSERT into snapshot in batches of 2000 rows (to stay under wire protocol's 65534-parameter limit). 31 chunks of 50 canonicals each → 315,979 rows in ~16 min wall time.
- **Documented gap:** snapshot excludes bot canonicals (identities not in `identity_canon`). For EOS that's ~61% of journeys but mostly 1-event bot traffic. Both rebuild and incremental respect this consistently. Will revisit if reporting needs bot data; current attribution work is unaffected.
- **Day 2 incremental loader (May 12):** `chapter-scripts/run-lifecycle-chapters-incremental.js` uses the same chunked Class B pattern with five-source affected-canonical detection (new pixel/purchase/conversion/offline events + new alias edges). DELETE-affected + re-INSERT per chunk in a transaction (readers never see partial state). INNER JOIN to `identity_canon` to exclude bots (matching rebuilder's coverage). Smoke-tested: found 16 affected canonicals in a 2-hour window, processed in one chunk, +1,118 net rows (47,104 inserted minus 45,986 deleted).
- **Day 3 facade migration (May 12):** rewrote `chapter_model.lifecycle_chapters` as `SELECT * FROM chapter_model.lifecycle_chapters_snapshot`. **2500× speedup measured** on canonical filter queries (30s+ timeout → 0.2s). Original view DDL backed up in `chapter-scripts/snapshots/2026-05-12-fix-25-phase0-lifecycle-view-original-backup.sql` for rollback if ever needed.
- **Phase 1 cascade refresh (May 12):** ran all 7 downstream snapshots in dependency order with shared `SNAPSHOT_TS_HI=2026-05-12T18:45:38Z`: `eos_filtered_purchases_v1`, `eos_purchase_base_snapshot_v1`, `eos_purchase_touch_summary_snapshot_v1`, `eos_purchase_fallback_snapshot_v1`, `eos_purchase_channel_final_snapshot_v1`, `canonical_v1_snapshot`, `canonical_v2_snapshot`. All succeeded in minutes (was 50+ min for canonical_v1 alone pre-facade). Row counts grew (311 → 349 canonical_v1; 443 → 450 purchase_base) — the slow view chain had been silently dropping real attribution data which is now captured correctly.
- **Important post-Phase-1 finding:** 44 raw `purchase_events` (494 raw vs 450 chapters) are still being dropped at the attribution layer — investigation needed (see Open Fix List).
- **Design doc:** `/docs/fix-25-incremental-refresh-design.md`.

### Fix #24 — Supabase read replica + analytical isolation (May 8, 2026)
- **Replica provisioned** in us-west-2 (same region as primary, sub-second lag expected). Cost: ~$16/mo. IPv4 add-on (Fix #23) already covered the replica host automatically.
- **Connection routing:** primary handles writes (pixel ingest, purchase webhooks, identity_aliases updates). Replica handles reads — Looker, internal monitoring routes, future dashboards.
- **Code changes:** Vercel env added `SUPABASE_REPLICA_URL` and `DATABASE_REPLICA_DIRECT_URL` (Production + Preview). Three Next.js routes updated to use replica via fallback (`process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL`): `/api/internal/monitoring/stuck-runs`, `/api/internal/monitoring/daily-digest`, `/demo/snapshot`. `chapter-scripts/.env` got `DATABASE_REPLICA_DIRECT_URL` too. `run-snapshot.js` deliberately stays on primary (its INSERT-FROM-SELECT pattern can't split — already covered by Fix #24's plan).
- **Looker migration:** 15 of 20 data sources reconnected to replica host directly. 5 still failing with generic "encountered an error" (no useful detail in Looker's UI). Original theory was "bulk-edit cache settle, retry in 15 min." May 11 update: 3-day wait didn't clear those 5 → cache theory invalidated. **Current hypothesis: those 5 are slow-view-chain bound** — their underlying views chain through `pixel_events` and time out during Looker's reconnect validation query. Confirms Fix #25 Phase 0 + Day 3 (view facade) will resolve them. **Parked pending Phase 0 completion.**
- **Memory:** `feedback_looker_connection_edit_intermittent.md` documents the bulk-edit pattern. **Update needed (May 11):** the "wait ~15 min" hypothesis was wrong for the stragglers; they're query-timeout bound, not cache bound.
- **Why critical:** primary now insulated from analytical load. The May 5 cascade meltdown pattern (50-min `canonical_v1` build holding locks + degrading ingest) becomes impossible because analytical reads never hit primary.

### Fix #11 — Consolidated reference doc (May 8, 2026)
- **Created `/docs/chapter-reference.md`** — single source-of-truth doc combining the user's existing schema reference (table-level descriptions) + new conceptual definitions glossary (first/last/linear/channel contribution/only touch/middle touch/unknown/chapter/journey/sessionized journey/canonical identity/boundary event/bot-likely/etc.) + audit history through May 11 + open follow-ups + pricing/scaling notes.
- **30+ terms** grouped by schema-flow (Identity → Journey → Events/Chapters → Channels → Traffic Quality → Attribution) per user preference.
- **Stale items updated** in the schema reference body: linear attribution definition rewritten to per-session-entry (Fix #9), all `_deprecated` objects removed from listings (Fix #10), `canonical_v1`/_v2 snapshot tables added (Fix #7 / #7b), `_snapshot_runs` documented (Fix #1).
- **New section added:** `chapter_analysis` schema — was missing from the original schema reference even though the schema exists.

### Schema Cleanup (April 6, 2026 audit — DONE)
- Journey schema cleaned — removed `journeys_filtered_v1`, `journeys_filtered_v2`
- Model schema standardized on v2 pipeline (`unified_events_v2`, `unified_events_resolved_v2`)
- Attribution schema cleaned — one canonical model per type (first/last/linear)
- EOS-specific attribution objects moved to `chapter_analysis`
- Experimental views removed from `chapter_model` and `chapter_attribution`
- `chapter_channel_compressed` bug fixed — boundary events now always retained
- Linear attribution validated — 100% revenue reconciliation confirmed

### Per-identity chaptering (Fix #12 — verified April 29, 2026)
- `chapter_model.lifecycle_chapters` view already partitions by `(client_key, canonical_identity_key)` — chapter_id resets per identity.
- Verified with two real multi-purchase identities: each produces sequential chapter_ids starting at 0.
- Downstream `chapter_reporting.eos_lifecycle_chapters_valid_v1` is a pass-through filter, no re-numbering.

### Canonical paths v2 materialization (Fix #7 — applied May 1, 2026)
- New table `chapter_attribution.chapter_channel_paths_canonical_v2_snapshot` holds the materialized output (PK on `(client_key, canonical_identity_key, chapter_id)`, indexes on `boundary_ts` and `snapshot_ts_hi`).
- Original view `chapter_attribution.chapter_channel_paths_canonical_v2` rewritten as a thin facade over the snapshot table — same column shape, same name, no consumer changes needed.
- Refreshed via `run-snapshot.js` with `LABEL=canonical_paths_v2`. Initial population: 283 rows, 7m 13s.
- Reads now return in milliseconds. Channel-contribution refresh is no longer blocked by 25-min view scans.
- Fix #6 implicitly answered: 283 purchase chapters, 240 distinct identities, 27 unknown / 186 single-touch / 97 multi-touch.

### Snapshot timing consistency (Fix #1 — applied April 29, 2026)
- New table `chapter_reporting._snapshot_runs` tracks every snapshot refresh: `(run_id, label, target_table, snapshot_ts_hi, started_at, finished_at, status, row_count, error_message)`.
- New `snapshot_ts_hi timestamptz` column added to 14 snapshot-shaped tables (8 named `*_snapshot` + channel_contribution_v1, attribution_linear_v1, single_touch_chapters_v1, sessionized_universe_summary_v1, identity_overlap_summary_v1, channel_paths_canonical_summary_v1).
- `run-snapshot.js` (in separate `chapter-scripts/` repo) refactored to enforce the contract: opens a `_snapshot_runs` row, bounds source queries with `SNAPSHOT_TS_HI` env var, stamps every output row, closes the run row on success or failure. TRUNCATE+INSERT now wrapped in a transaction.
- Reconciliation pass: `export SNAPSHOT_TS_HI=... && node run-snapshot.js` for each snapshot in turn → all rows share the same cutoff.
- Contract verified end-to-end against a scratch table on April 29, 2026.
- 5 reporting tables not yet in scope (`eos_filtered_purchase_channels_v1`, `eos_filtered_purchases_v1`, `eos_full_paths_readable_v1`, `eos_top_paths_v1`, `eos_valid_journey_ids_v3`) — extend if/when they're confirmed snapshot-shaped.

### Fix #9 — Linear attribution model: per-session-entry + (unknown) bucket (May 7, 2026)
- **Decision:** linear attribution is now per-session-entry at the chapter level, with a `(unknown)` bucket for chapters lacking session data. Repeats accumulate proportional credit (a chapter's `direct → direct → email` path = direct 2/3, email 1/3 of revenue). See `memory/project_linear_attribution_definition.md` for the canonical spec.
- **Loader change:** `chapter_reporting.eos_attribution_linear_v1` is now built from `chapter_attribution.chapter_channel_paths_canonical_v1` (session entries) UNION ALL with a `(unknown)` row per chapter that's in canonical_v2 but missing from canonical_v1 (the 132 fallback chapters with no session data). New loader saved at `chapter-scripts/snapshots/2026-05-07-fix-9-linear-model-d.sql`; cascade SQL `2026-05-06-fix-21-cascade.sql` Block 4 also updated for future cohort runs.
- **Result at `SNAPSHOT_TS_HI=2026-05-03T18:00:00Z`:** 6 rows in `eos_attribution_linear_v1`, totals reconcile cleanly to the cohort (442 orders, $44,074.74).
- **Distribution shift vs. previous per-event model:**
  - **(direct):** 69.3% revenue → **35.1%** (the per-event over-weighting bias is gone — was inflated because deep return-visitor sessions accumulated 30+ direct events each)
  - **(unknown):** new at 28.3% — these are the 132 chapters with no session data (purchase via email-bridge / cart-token without a browser session in window). Previously hidden inside the "(direct)" bucket; now visibly distinct.
  - **organic search:** 8.2% → 14.4% (was under-credited because organic-search sessions tend to be shorter)
  - **email:** ~unchanged (~20%)
- **What this means for client-facing dashboards:** the "(direct) is 70% of attribution" narrative collapses into a more honest split. When pitching the dentist / school, can credibly say: "EOS Fabrics' attribution is ~35% direct return traffic, ~28% unattributable repeat customers, ~20% email, ~14% organic search."
- **Open follow-ups (not blocking, deferred):**
  - When Fix #25 (incremental refresh) lands, the loader's `JOIN ... LEFT JOIN ... WHERE p1.chapter_id IS NULL` pattern for fallback detection should be revisited — incremental might want a different shape.
  - Distinguish "(unknown)" further: today it's a single bucket. If Looker tile audit reveals demand, could split into "(unknown - email-bridge)" / "(unknown - cart-token-bridge)" / "(unknown - other)" to surface where the no-session purchases came from.

### Fix #10 — Cleanup old/experimental views: 32 objects dropped (May 7, 2026)
- **Tier 1 dropped (9, all `_deprecated` in chapter_analysis):** migration `fix_10_drop_deprecated_and_legacy_views`. `eos_attribution_linear_v1_deprecated`, `eos_bot_scores_24h_v5_deprecated`, `eos_bot_scores_v1_deprecated`, `eos_purchase_attribution_v6_deprecated`, `eos_purchase_channel_presence_v3_deprecated`, `eos_purchase_last_journey_v2_clean_deprecated`, `eos_purchase_paths_v2_deprecated`, `eos_purchase_stitched_events_v2_deprecated`, `unified_events_legacy`.
- **Tier 2 dropped (6, older numbered variants):** same migration. `chapter_attribution.chapter_channel_paths_v2`, `chapter_channel_paths_v3`, `chapter_session_entry_channels_v2`, `chapter_analysis.attribution_first_touch_v2`, `attribution_last_touch_v2`, `attribution_linear_v2`.
- **Tier 3 dropped (17 of 25 candidates):** migration `fix_10_tier_3_drop_17_safe_items`, applied in dependency-ordered waves. chapter_analysis: `attribution_last_touch_eos_v1`, `chapter_channel_events_eos_v1`, `chapter_correlation_base`, `chapter_paths`, `eos_journey_summary_v1`, `eos_pixel_events_clean_v1`, `eos_pixel_events_postfix`, `eos_pixel_events_recent`, `eos_postfix_journey_bot_scores_v1`, `eos_postfix_journey_bot_scores_v2`, `journey_bot_scores_v1`, `unified_events_clean_v1`. chapter_attribution: `attribution_first_touch`, `attribution_last_touch`, `chapter_channel_presence`, `purchase_channel_fallbacks_v1`, `purchase_channel_final_v1`. (`eos_pixel_events_recent` had 750k accumulated stale rows; reproducible from `chapter_ingest.pixel_events` if ever needed.)
- **Audit lesson recorded:** the first Tier 3 audit pass joined `pg_depend` through `pg_stat_all_tables`, which **excludes views**. That under-reported dependencies on every view candidate, making them all appear droppable. Postgres's transactional DROP rolled back the entire migration on first failure (zero state change), and the corrected query joining through `pg_class` directly revealed the real picture. **For future audits: use `pg_class` + `pg_depend` + `pg_rewrite`, never `pg_stat_all_tables` for view dependency checks.**
- **8 candidates kept as scaffolding for future dashboard work** (NOT dropped):
  - `public.dashboard_snapshot_v1` — sophisticated per-client JSON aggregator (KPI tiles + journey tiles + linear attribution + correlation lift + top5 paths). Zero current code references but architecturally complete; matches the "Dashboard build" line in Future Work. Treating as deliberate scaffolding for the planned `src/app/chapter/` dashboard. **Don't drop without first deciding whether that dashboard will reuse it or rebuild from scratch.**
  - 6 candidates blocked by `dashboard_snapshot_v1`: `chapter_attribution.attribution_linear`, `chapter_channel_exploded`, `purchase_chapter_channels`; `chapter_analysis.channel_correlation_v1`, `top_chapter_paths`, `top_chapter_paths_dashboard`. All become droppable if/when `dashboard_snapshot_v1` is dropped.
  - `chapter_attribution.chapter_channel_events` — genuinely live, root of the active attribution chain (`chapter_summary_v1`, `chapter_channel_compressed`, `chapter_channel_paths` all depend on it transitively). Keep.
  - `chapter_analysis.eos_pixel_journey_bot_scores_v1` — consumed by `chapter_reporting.eos_valid_journeys_v2`, which is itself unaudited. Worth a separate look — `eos_valid_journeys_v2` may be deferred legacy reporting (per Fix #1 it was one of the 5 reporting tables not yet snapshot-aligned). If `eos_valid_journeys_v2` ends up dead, this can drop too.

### Fix #16 — closed without code change (May 7, 2026, principled decline)
- **Original spec:** capture truncated IP (e.g., `71.237.147.0`) on `chapter_ingest.pixel_events` to improve bot detection.
- **Why closed without action:** journey-level `user_agent` (existing on `chapter_journey.journeys`) plus the new purchase-level `user_agent` (Fix #15) already give effective bot-detection coverage at both ends of the funnel. The April UA-based bot-network discovery (3,056 fake-Chrome-142 China journeys) demonstrated UA alone is sufficient for the bot heuristics we actually run. Adding any IP storage — even truncated — increases PII surface area without a proportional gain in detection capability we can't get from UA. Principled decision: don't collect data we don't need.
- **What this means going forward:** bot-detection rules should target `journey.user_agent` and `purchase_events.user_agent`, not IP-derived signals. If a future bot pattern only manifests in IP space (and somehow can't be inferred from UA + behavior), revisit this.

### Fix #15 — `user_agent` extracted to proper column on `purchase_events` (May 7, 2026)
- **Migration applied:** `chapter_ingest.purchase_events` now has a `user_agent text` column (migration `fix_15_add_user_agent_to_purchase_events`).
- **Backfill:** 664 of 672 historical rows populated from `raw->'order'->'client_details'->>'user_agent'`. Remaining 8 are non-browser orders (POS / Quick Sale / mobile app) that genuinely never had a UA — null is correct for those.
- **Code path updated:** `src/app/api/shopify/webhooks/orders-create/route.ts` extracts `order.client_details.user_agent` into the `purchasePayload`; `/api/purchase/route.ts` writes it to the new column. Sanitization function unchanged — UA was never being stripped (only `browser_ip` was, intentionally for GDPR).
- **Why bother when it's still in `raw`:** queryability. `WHERE user_agent ILIKE '%bot%'` is now an indexed-friendly column scan instead of `WHERE raw->'order'->'client_details'->>'user_agent' ILIKE ...` (slower, no index, ugly).

### Fix #14 — closed without code change (May 7, 2026, superseded)
- **Original spec:** extract `browser_ip` from `raw->order->browser_ip` / `raw->order->client_details->browser_ip` into a queryable column on `purchase_events`.
- **Why closed without action:** the orders-create webhook's `sanitizeShopifyOrderForRaw` already strips both IP locations from `raw` BEFORE the row hits `purchase_events`, in compliance with the CLAUDE.md "Do not store raw IP addresses" rule. So there's no `browser_ip` in `raw` for new rows to extract. Old rows would also be subject to the same GDPR rule if extracted.
- **What replaces it:** Fix #16 (truncated IP on `pixel_events`). The original Fix #14 / #16 split conflated two concerns; Fix #14 was scope-creep onto a path the privacy sanitization had already handled. The bot-detection use case those fixes were chasing now lives entirely in Fix #16's pixel-events truncated-IP plan.

### Fix #13 — Pixel hover_intent enrichment (May 7, 2026)
- **Problem:** `hover_intent` events only captured `tag` + `label`. Couldn't tell which `<a>` was hovered (no `href`), couldn't group by section, couldn't filter by class/id without backfilling from page-level context.
- **Fix:** Added `getElementProps(el)` in `src/app/api/chapter/pixel.js/route.ts` returning `{ label, tag, href, element_id, element_class, aria_label, page_section }`. `page_section` resolves to the nearest `<section>/<nav>/<header>/<footer>/<main>/<aside>` ancestor's aria-label / id / tagName. Updated the mouseover handler to pass `getElementProps(el)` directly to `api.track("hover_intent", …)`.
- **Defensive note:** `el.className` returns an `SVGAnimatedString` (not a string) on SVG elements. `closest("a, button")` filters to HTML `<a>`/`<button>` so the value is always a string in practice — but added a `typeof` guard anyway since the JS runs in arbitrary DOM contexts.
- **Deployment:** Browsers re-fetch `/api/chapter/pixel.js` on every page load (`Cache-Control: no-store`), so the enriched payload starts arriving as soon as the deploy goes live. No client-side migration needed.
- **CLAUDE.md correction:** previously said `src/app/api/pixel/route.ts` was the script-serving file — that's actually the server ingest helper. Real script-serving file is `src/app/api/chapter/pixel.js/route.ts`. Pixel Files section corrected.

### Fix #27 — Production monitoring & alerting (mostly) (May 7, 2026)
- **Done:** parts (b) + (c) from the original spec — application-layer alerting on `chapter_reporting._snapshot_runs`, posted to Google Chat via webhook, scheduled by Vercel Cron.
- **Architecture:** `vercel.json` registers two cron jobs against Next.js API routes, authenticated via `Bearer ${CRON_SECRET}` (Vercel auto-injects when `CRON_SECRET` env is set):
  - `*/15 * * * *` → `/api/internal/monitoring/stuck-runs` — alerts if any `_snapshot_runs` row has `status='running' AND started_at < now() - interval '60 min'`. Silent when nothing's stuck.
  - `0 14 * * *` → `/api/internal/monitoring/daily-digest` — posts a 24h health summary every day at 14:00 UTC (7am PT).
- **Plumbing files added:** `src/app/lib/monitoring/{gchat,auth,types}.ts` (webhook poster, cron auth validator, `SnapshotRunRow` type) and the two route handlers under `src/app/api/internal/monitoring/`. Schema helper for `chapter_reporting` added to `src/app/lib/chapter-db.ts`.
- **Env vars** in Vercel: `CHAPTER_GCHAT_WEBHOOK_URL` (the Google Chat space webhook) + `CRON_SECRET` (random hex, validates the `Authorization` header). Both must be set for the routes to function.
- **Schema/grant prerequisites done:** `chapter_reporting` added to PostgREST exposed schemas; `service_role` granted USAGE on schema + SELECT on all tables (with default privileges for future tables).
- **Deferred (part a):** Per-resource threshold alerts (CPU, IO, connections at 70%). Supabase Pro doesn't ship per-metric UI alerts as a feature. Three options if/when this becomes load-bearing: external monitoring (Better Stack/Datadog), or a self-rolled Vercel Cron (~30-60 min) that polls the Supabase Management API and posts to the same GChat space. Not blocking — the stuck-runs alert covers the most common outage path (orphaned long-running queries holding locks), which is what would have prevented the May 5 incident.
- **Verified:** both routes returned 200 in production curl tests; daily-digest's first manual fire successfully posted to Google Chat.

### Fix #22 + Fix #23 — statement_timeout default + direct connection wired up (May 7, 2026)
- **Fix #22 (DB-level):** `ALTER ROLE postgres SET statement_timeout = '30min'` applied. New `postgres` role connections inherit a 30-min ceiling; `run-snapshot.js`'s per-session `SET statement_timeout = '60min'` override wins for legitimate long ops (canonical_v1 etc.). Reversible via `ALTER ROLE postgres RESET statement_timeout`.
- **Fix #23 (env + connection):** `DATABASE_DIRECT_URL` added to `chapter-scripts/.env` pointing at `db.bvvmmhekdgskeilczeuy.supabase.co:5432`. `run-snapshot.js` already prefers it over `DATABASE_URL` with fallback warning (was code-ready before).
- **IPv4 add-on enabled** (~$4/mo) — required because the project's direct host is IPv6-only by default and Mac/work-network couldn't resolve AAAA records. The IPv4 add-on provisions an A record so the same hostname is reachable from IPv4-only clients. No change to the connection string itself.
- **Gotcha for the next person:** if your DB password contains `@`, `:`, `/`, `?`, `#`, or `[`/`]`, you MUST URL-encode them in the connection string (e.g., `@` → `%40`). The pooler tolerates malformed URLs; direct connection does not. `test-direct.js` will print `URL host: NOT SET` even when `DATABASE_DIRECT_URL` IS set if the password's unencoded `@`s break URL parsing — misleading; check the actual env var content with `awk` + `cat -ev` if in doubt.
- **Verified via `test-direct.js`:** `URL host: db.bvvmmhekdgskeilczeuy.supabase.co:5432` + `OK: [ { ping: 1 } ]`. End-to-end smoke test through `run-snapshot.js` deferred until next genuine snapshot run (no value in artificial test; the connection logic is unchanged on the script side).

### Fix #21 cascade complete — direct dominance confirmed real (May 6, 2026 — `SNAPSHOT_TS_HI=2026-05-03T18:00:00Z`)
- **Hypothesis:** widen `eos_pixel_events_categorized_v1`'s entry-channel classifier to scan ALL events in a chapter for UTM/click_id/referrer signals — recovering "direct" chapters that have non-direct signals buried mid-journey.
- **Cascade run (6 snapshots, all `status='ok'` at the same cutoff):** canonical_v1 (311) → canonical_v2 (442) → channel_contribution (5) → single_touch_chapters (3) → linear (5) → channel_paths_canonical_summary (1). All paste-ready DO blocks archived at `chapter-scripts/snapshots/2026-05-06-fix-21-cascade.sql`.
- **Result:** post-fix, **(direct) is in 73% of chapters (323/442) and gets 69.3% of linear revenue ($28,221 of $40,716)** — essentially unchanged from pre-fix. Single-touch (direct) actually went UP (158 vs pre-fix 42) because the new sessionization restructured the underlying chapter set, not because attribution improved.
- **Conclusion:** EOS's direct dominance is genuine customer behavior (loyal / return / bookmark traffic, no paid spend), NOT a classification gap. Fix #21 closed with the "if not recoverable" outcome it pre-emptively scoped.
- **Lesson learned (also captured in user memory):** Dashboard SQL Editor "Failed to fetch (api.supabase.com)" is a UI-layer HTTP timeout (~5 min), NOT a query failure. Backend keeps running and commits on its own schedule. Recovery: find holder via `pg_stat_activity` filtered by `application_name = 'supabase/dashboard-query-editor'` AND `state = 'active'` ORDER BY `xact_start` — filtering by `query ILIKE '%table_name%'` MISSES multi-statement DO block holders because `query` shows the last statement (often a `SET`), not the long-running INSERT. Do NOT retry. Terminate piled-up victim queries (those waiting on `Lock`), leave the holder alone.
- **Snapshot contract bug surfaced:** `_snapshot_runs.elapsed = finished_at - started_at` is always `00:00:00` in a single-tx DO block because both columns resolve to `now()` = transaction-start time. Fix in `run-snapshot.js`: use `clock_timestamp()` for `finished_at`. Not blocking, just misleading telemetry.

### Null/unknown attribution closed (Fix #4 — verified May 5, 2026)
- **Original problem:** `null`/`unknown` channels in attribution output.
- **Verified:** Zero chapters have `NULL` or `(unknown)` channel_paths after the Fix #17 cascade. The fallback in canonical_v2's view hardcodes `(direct)` so nothing falls through to `(unknown)` anymore. Fix #17's full cascade silently fixed this.
- **What's left after closing Fix #4:** the broader question of "(direct) is 70% of attribution" — that's NOT a bug per se. EOS doesn't run paid ads and likely has a loyal direct/bookmark/return-visitor base. **Sub-problem 1 (29% revenue)** is no-session purchases (Fix #20 residual gap). **Sub-problem 2 (49% revenue)** was sessions classified as direct — Fix #21 (closed May 6) tested whether widening the categorizer could recover them; outcome was no material change, confirming EOS's direct dominance is real customer behavior, not misclassification.

### canonical_v1 materialization (Fix #7b — applied May 5, 2026)
- **Same pattern as Fix #7 (canonical_v2), one layer deeper.** Replaced the slow chained view with a snapshot table + thin facade.
- **New table:** `chapter_attribution.chapter_channel_paths_canonical_v1_snapshot` (PK on client_key/canonical_identity_key/chapter_id, indexes on boundary_ts and snapshot_ts_hi).
- **View `chapter_channel_paths_canonical_v1` rewritten as facade** over the snapshot — same column shape, no consumer changes.
- **First population:** 311 rows, ~52 min compute time (much longer than the ~25 min I'd estimated; the chain is heavier than canonical_v2's was). Aligned to the May 3 cohort: `SNAPSHOT_TS_HI=2026-05-03T18:00:00Z`.
- **Refreshed via `run-snapshot.js`** with `LABEL=canonical_paths_v1`.
- **Unblocked the deferred `channel_paths_canonical_summary` snapshot** — was 15-min timeout on May 3, now finishes in **0.75s**.
- **Why 311 vs canonical_v2's 443:** canonical_v1 only includes chapters with at least one matching session entry; canonical_v2 adds 132 more chapters with fallback-only paths. Consistent with the design.

### identity_canon staleness fixed (Fix #20 — applied May 4, 2026)
- **Symptom:** identity_overlap_summary initially showed only 10.4% purchaser↔session overlap. Diagnosed as artifact of `identity_canon` (table cache) being out of sync with `identity_aliases` (source of truth).
- **Root cause:** `/api/identify` wrote to BOTH `identity_aliases` AND `identity_canon`, but `/api/purchase` and `/api/conversion` wrote only to `identity_aliases`. So aliases from purchase email-bridge, cart_token bridge, and conversion explicit_identify_call never reached canon. Confirmed: pre-fix, canon had 1,197 self-canonical emails + 169 UUID→email mappings — all from /api/identify. Zero entries from purchase/conversion paths.
- **Fix part B (DB):** New trigger `trg_sync_canon_from_alias` on `identity_aliases` (function `chapter_identity.sync_canon_from_alias`) propagates every alias edge into canon, with multi-hop forward resolution (A→B then B→C correctly produces A→C). Errors raise WARNING, never block alias inserts.
- **Fix part A (code):** `/api/purchase` (both alias paths) + `/api/conversion` now upsert canon alongside identity_aliases, mirroring `/api/identify`'s pattern. Defense in depth.
- **Backfill:** One-time INSERT … SELECT FROM identity_canonical brought canon from 1,366 → 1,842 rows for eos_fabrics (+476 recovered mappings).
- **After re-shim + canon fix:** purchaser↔session overlap moved from 10.4% (artifact) → 65.8% (true). Remaining 34.2% missing is a real coverage gap — POS / mobile app / ad blocker / pre-Apr-1 carryover — but much smaller and more tractable.

### canonical_v2 data lag closed (Fix #17 — applied May 3, 2026 — `SNAPSHOT_TS_HI=2026-05-03T18:00:00Z`)
- **Root cause:** Not actually a `lifecycle_chapters` lag (as originally framed). The bottleneck was `chapter_reporting.eos_filtered_purchases_v1` — a reporting-layer table that `chapter_attribution.chapter_channel_paths_canonical_v2` depends on. That table had been stale since Apr 20 and was one of the 5 reporting tables originally left out of Fix #1's migration.
- **Fix:** Added `snapshot_ts_hi` column to `eos_filtered_purchases_v1` via migration `fix_17_add_snapshot_ts_hi_to_filtered_purchases`. Recovered the loader SQL (Version A — `purchase_chapters_base` source, matches purchase_base's source for row-count consistency). Ran a 9-snapshot cascade at the new cutoff: filtered_purchases → 4 purchase snapshots → canonical_v2 re-population → channel_contribution + single_touch + linear.
- **Result:** canonical_v2 grew from 283 → **443 rows** (+160 chapters). Max boundary_ts moved from 2026-04-20 18:27 → 2026-05-03 16:13. Channel attribution now covers post-Apr-20 purchases.
- **Snapshot reduction observed:** channel_contribution went 6 → 5 channels; single_touch went 6 → 5. One channel from the May 1 cohort dropped out — likely a chapter's path got recomputed against the larger lifecycle_chapters output. Not a bug, real data shift.
- **Architectural smell flagged for future:** `chapter_attribution.chapter_channel_paths_canonical_v2` (an attribution-layer view) depends on a reporting-layer snapshot. Worth inverting the dependency in a future Fix #18.
- **Deferred:** `eos_channel_paths_canonical_summary_v1` was NOT refreshed — its loader takes 24+ min and the Supabase pooler dropped the connection at ~15 min. This snapshot is a 5-row diagnostic with no business consumers, so deferred until **after Fix #7b** (which makes canonical_v1 fast).

### Canonical identity key shim — phase 1 (Fix #5 phase 1 — May 4, 2026)
- **Phase 1 strategy: additive shim.** Added `canonical_identity_key` column alongside existing `final_identity_key` in every reporting view that referenced it. No dependents broken; consumers migrate at their own pace.
- **Audit found 13 views** referencing `final_identity_key` across `chapter_reporting` and `chapter_attribution`. After phase 1: **2 dropped as dead, 9 shimmed, 1 already had canonical column, 1 got an analogous count column.**
- **Dropped (dead):** `chapter_attribution.chapter_session_entry_channels_v1`, `chapter_reporting.eos_sessionized_journeys_v1` — confirmed unused in code, archived snapshots, and Looker.
- **Shimmed (canonical_identity_key added at the end of column list, via CREATE OR REPLACE VIEW):** `eos_pixel_events_unified_v1`, `eos_pixel_events_valid_v2`, `eos_pixel_events_unified_v2`, `eos_pixel_events_valid_v3`, `eos_valid_pixel_events_v2`, `eos_sessionized_events_v1`, `eos_valid_reporting_events_v1`, `eos_pixel_events_categorized_v1`. Plus `eos_cart_identity_map_v1` (output column was already named `canonical_identity_key`; semantics fixed to actually use the canonical resolver instead of `MIN(final_identity_key)`).
- **Aggregate-shim:** `eos_valid_journeys_v2` got `canonical_identity_count` (parallel to existing `stitched_identity_count`).
- **Already shimmed:** `eos_sessionized_events_canonical_v1` already exposed both columns; left alone.
- **Resolver consistency note:** upstream views use `chapter_identity.identity_canon` (table); `eos_sessionized_events_canonical_v1` uses `chapter_identity.identity_canonical` (recursive view). Recursive resolver is more thorough; harmonize in phase 3 cleanup.
- **Phase 2 (next):** migrate consumers — `run-snapshot.js` scripts for `sessionized_universe_summary_v1` and `identity_overlap_summary_v1`, plus any Looker tiles still pulling `final_identity_key`.
- **Phase 3 (after phase 2):** drop `final_identity_key` from view outputs and view body references, harmonize `identity_canon` vs `identity_canonical`.

### Shopify revenue reconciliation diagnosed (Fix #3 — investigation closed May 3, 2026)
- **Diagnosis:** Cross-referenced Chapter (`purchase_events` 4/01 1pm EDT → 5/03 2pm EDT) against Shopify gross sales for same window. Found 443 vs 444 orders (1 missing) and $44,223.32 vs $44,503.20 ($279.88 gap). Identified missing order via daily-count comparison + order_number gap (#102256). Root cause = POS / Quick Sale rejected by webhook adapter — see Fix #19.
- **After backfill of #102256:** order count matches (444 = 444). Remaining gap of $201.88 between Chapter `value` total ($44,301.32) and Shopify "gross sales" ($44,503.20) is **definitional, not data loss** — Shopify "gross sales" = subtotal_line_price × quantity (pre-tax/shipping/discount); Chapter `value` = `total_price` (post-everything). Different metrics intentionally.
- **What's still open under Fix #3:** decide whether reporting should compute a "Shopify-equivalent gross" metric for direct dashboard reconciliation, or document the metric difference and accept it.

### Snapshot refresh cadence (Fix #2 — closed May 3, 2026)
- **Policy:** On-demand reconciliation pass. Run `chapter-scripts/run-snapshot.js` for each snapshot in turn with a shared `SNAPSHOT_TS_HI` env var when fresh data is needed (e.g., before a Looker review, weekly, or after major schema/logic changes).
- **No automated cron yet.** First reconciliation pass took ~88 min mostly because `channel_paths_canonical_summary` reads chained `canonical_v1` (Fix #7b will fix). Once Fix #7b ships and the slow snapshots become fast, revisit and consider nightly cron via Supabase `pg_cron` or Vercel scheduled function.
- **Why on-demand for now:** zero new infra to maintain, matches current workflow (one-client EOS Fabrics, Looker dashboards reviewed periodically), avoids premature automation.

### First reconciliation pass — COMPLETE (May 1, 2026 — `SNAPSHOT_TS_HI=2026-05-01T03:46:50.986Z`)
- All 14 snapshot tables aligned to one cutoff. Reconciliation is now one SQL filter: `WHERE snapshot_ts_hi = '2026-05-01 03:46:50.986+00'`.
- Total compute: ~88 min across 16 runs (purchase_base ran twice — first version pulled all-time 608 rows due to missing lower bound, corrected to 424 rows post-Apr-1).
- Slowest snapshots: `channel_paths_canonical_summary` (24m, reads chained `canonical_v1` — see Fix #7b), `channel_performance` (12m), `top_paths` (6m).
- Fastest snapshots (post-Fix #7): `channel_contribution`, `single_touch_chapters`, `purchase_fallback`, `purchase_channel_final` — all sub-second since they read from materialized snapshot tables.
- All 4 purchase snapshots (`purchase_base`, `purchase_touch_summary`, `purchase_fallback`, `purchase_channel_final`) aligned at 424 rows.
- Schema correction made along the way: pasted SQL for `purchase_channel_final` referenced `fallback_channel_group`/`fallback_channel_source` columns that no longer exist on `eos_purchase_fallback_snapshot_v1` — adapted to current schema (`fallback_channel`).
- Loader SQL recovered from Supabase SQL Editor history for the 8 snapshots not previously archived in `chapter-scripts/`. All 14 loader scripts now exist in `chapter-scripts/snapshots/archive/` with the `_reconcile.js` suffix.

### Known data lag observed during the reconciliation
- `purchase_chapters_base` (and downstream `purchase_*_snapshot_v1` tables) extends to **2026-05-01 03:29 UTC**.
- `chapter_channel_paths_canonical_v2_snapshot` only extends to **2026-04-20 18:27 UTC** — does NOT include the most recent ~10 days of purchases.
- This means `eos_channel_contribution_v1` and `eos_single_touch_chapters_v1` (which read from canonical_v2) undercount channels for purchases after 2026-04-20.
- Root cause likely upstream in `chapter_model.lifecycle_chapters` or the canonical_v1 → canonical_v2 chain — investigate as a separate fix.

---

## 🔧 Open Fix List (Priority Order)

### 🚀 Scale Readiness Roadmap (added May 5, 2026)
Pipeline of clients on the horizon: 300-location school, 2K-location national dentist, B2B startup, more ecommerce. Goal: prevent the "single runaway query melts the DB" pattern from May 5 (Fix #21 cascade) and similar issues at 5-30 clients with high per-client volume. Build for scale + security NOW, not after the next blowup. Fixes #22, #23, #27 done May 7; **Fix #24 done May 8; Fix #25 Phase 0 + Phase 1 cascade done May 12; Fix #26 parts 1/3/4 + part 2 framework done May 12; Fix #26 Part 2 route migration done May 13.** Remaining scale items: #28 below + dashboard MV refresh cadence.

### 🔴 Priority 1 — Active build plan (sequenced June 9, 2026)

**Dashboard wiring queue: 10 of 10 pages fully live.** **Production attribution chain cron + Observations + cohort cron all healthy** (validated). **Cross-Source Influence cold-load: 24s → 4s** after Sprint 1.5 (June 8–9). **Boundary-event Phase 2: 11 of 13 dashboard RPCs wired** through `chapter_config.boundary_event()` helper (Sprint 1.3, June 9).

**Build philosophy locked (June 5):** hybrid sales-pulled + primitive-first. Sales drives priority; every feature ships as a config-driven primitive (no `if (client === 'x')`). The abstraction is the hard part — the second instance is cheap. Build abstractions at client #2 of any new vertical, not at client #5.

**Architectural Forward Rule locked (June 9):** every new dashboard RPC scanning >100k rows MUST ship with a pre-aggregated MV/snapshot from day 1, wired into `refresh-dashboard-mvs` cron. The Cross-Source Influence work proves the pattern. The wrong way (raw-event scans during page render) does not scale.

#### Sprint 1 — Platform readiness
- **Sprint 1.1 SHIPPED June 9** — Cron parallelism for `refresh-attribution-chain` (CONCURRENCY=5; ~22-client headroom under maxDuration).
- **Sprint 1.3 SHIPPED June 9** — Boundary-event Phase 2: 11 of 13 dashboard RPCs wired through `chapter_config.boundary_event()`. 2 deferred to Sprint 2.4 (`funnel_overview` + `connections_panel` — their `'purchase'` refs are raw `event_name` scans on `chapter_ingest.purchase_events`, vertical-fit territory not boundary-swap).
- **Sprint 1.5 SHIPPED June 8–9** — Cross-Source Influence perf fix: connections_panel SQL fix + pageOptions/campaignOptions pre-aggregated MVs (24s → 4s, 6×). All 3 new MVs wired into the 04:00 UTC refresh cron.
- **Sprint 1.2 DEFERRED** — Onboarding automation script. Doing manual onboarding for the barbershop first; script the playbook AFTER walking it once. Easier to codify a known path than to predict it.
- **Sprint 1.4 REMAINING** — Configurable email-source patterns. Move canonical_v1's hardcoded email classifier (`shopify_email` / `mailchimp` / `back-in-stock` CASE branches) into `chapter_config` (JSONB column). Cheap; unblocks first Klaviyo / Marketo / HubSpot Marketing / Sendinblue client without code changes.

#### Sprint 2 — B2C personal services / Barbershop (THIS WEEK, signed + onboarding)
- **Vertical:** B2C personal services. **Client:** barbershop. **Booking platform:** Square Appointments. **Stage:** already signed; onboarding this week.
- **2.1 Provision barbershop client (IN PROGRESS)** — `chapter_config.clients` (storefront_domain, `boundary_event_name = 'appointment_booked'`, display_tz), `client_secrets`, per-client Postgres role + grants, `CLIENT_ROLE_MAP` entry in `src/app/lib/db/per-client.ts`, CORS origin. Manual (Sprint 1.2 deferred). **Still needed from operator:** shop name (→ `client_key`), storefront domain, Square OAuth credentials, whether booking forms reliably capture email, boundary semantics (`appointment.created` vs `appointment.completed` — recommend `created`).
- **2.3 Square Appointments webhook adapter (BIGGEST UNKNOWN, ~1–1.5 days)** — `/api/square/webhooks/appointments/route.ts`. Square HMAC signature verification (different mechanism from Shopify). Transform `appointment.created` payload → `chapter_ingest.purchase_events` row with `event_name='appointment_booked'`, `source_platform='square_appointments'`, identity stitched via customer email (phone optional). Wire Square's webhook subscription post-deploy.
- **2.3 v2 — Phone-first identity stitching** — `phone_sha256:` analog of `email_sha256:` in `identity_canon`. Build only if barbershop customers email-skip; defer otherwise. The barbershop's Square setup likely captures email for confirmation emails, so v1 = email-only.
- **2.1 cont — Pixel install** on barbershop's marketing site. Test cross-domain stitch: pixel-tracked journey → Square hosted booking page → webhook fires → identity_canon matches to pre-booking journey.
- **2.4 LIGHT — Personal-services dashboard copy + taxonomy minimum-viable.** Action filter shows "Appointment Booked" instead of "Purchase" (works automatically via per-client `boundary_event`). "Cart View" / "Add to cart" polish + funnel reshape deferred until after launch.
- **2.2 — Tune Observation thresholds for personal-services norms** once first week of data lands. Likely higher returning-customer band (repeat haircuts), local-geo concentration, lower order-counts-per-identity initially.

#### Sprint 4 — Tier 1 first-party redirect domain (~4–5 days, NEXT after barbershop)
- **Promoted from Future Work** to active queue. "Branch.io for open-web ecom" positioning. Memory: `project_tier1_redirect_scope.md`.
- **Delivers:** (a) clean campaign attribution (closes the 521-missing-page-views finding from May 22 validation), (b) programmatic destination injection per identity/cart/geo/device.
- **Why HIGH-VALUE for barbershop specifically:** their booking flow is cross-domain (marketing site → Square's hosted booking page). Tier 1 redirect would close their attribution gap — strong upsell wedge post-launch. Ranked AFTER barbershop onboarding so we onboard a paying client first.

#### Sprint 5 — `/chapter/[client_key]/*` client-scoped surface w/ per-user auth (~2–3 days for auth, half-day for routes)
- **Promoted from Future Work.** Today's `/chapter/*` is a shared agency-operator surface gated by one `CHAPTER_DASH_TOKEN` cookie. Sprint 5 adds Supabase Auth + per-user → client_key mapping + middleware that gates `/chapter/[client_key]/*` so only employees of that client can access their dashboard.
- **Design:** add `chapter_config.users(user_id PK, email, client_key, role text)` where `role IN ('agency_operator', 'client_employee')`. Agency operators retain global access; client employees gated to their `client_key`'s route group. Middleware enforces.

#### Sprint 6 — Offline attribution expansion (~1–2 weeks, when first client needs it)
- **Promoted from Future Work.** Pack D / online+offline modeling via `chapter_ingest.offline_milestones`. Option B SQL refresh functions already preserve offline-milestone double-emission for forward-compat.

#### Cross-cutting nice-to-haves (can land in any sprint without blocking)
- **Daily-digest chain-freshness check** — extend 14:00 UTC digest with `MAX(snapshot_ts_hi) WHERE status='ok'` per client per stage vs. `now() - 24h`. Catches silently-failed crons.
- **Shared matched-lift engine refactor** — L&I Incrementality + Contribution + the deferred Connections #2 heavyweight tier all want this. Build before a third consumer appears.
- **Observations severity override UI + popup polish** — operators may want to override computed severity per finding (Black Friday spike → acknowledged). Schema slot exists; UI doesn't.

#### Observations engine — deferred questions (14 of 27, blocked on data)
- **A5 / A6 / S4** depend on a spend-data ingest path (none today; would be a Google/Meta API connector or operator CSV).
- **M1 / M2** depend on a `lift_history` snapshot table that doesn't yet exist (would be populated by a future test-result-capture flow when operators run controlled lift tests).
- **R3 / R5** need 26-week history; EOS only has ~9 weeks of clean post-cookie-fix data. Will activate naturally over time.
- **C3 / C2** depend on a pixel-to-chapter MV that hasn't been built (joins pixel events to their owning chapter at boundary time; useful but not blocking).
- **R2 / S2 / S3** capability-gated on data we don't yet ingest (loyalty signals, returns, churn surveys).

---

### 🟡 Priority 2 — Attribution Quality

**Fix #28 — Snapshot scheduling + per-client isolation** *(scale roadmap — depends on Fix #25)*
- **Problem:** Currently snapshots are run manually + on-demand. With many clients, manual coordination doesn't scale. Concurrent refreshes for multiple clients would hit resource exhaustion.
- **Fix:** `pg_cron` or Vercel scheduled functions. Stagger per-client refreshes (client A 1am UTC, client B 1:30am, etc.) — never all simultaneous. Run during off-peak (UTC night). Fix #25 (incremental refresh) makes each refresh small enough to fit in a stagger window.
- **Effort:** ~1-2 days. After Fix #25 is done.
- **Why P2:** Optimization layer on top of Fix #25. Same shape as the MV refresh cadence above — likely a unified Cron handler covers both.

---

**Fix #5 phase 3 — Cleanup (effectively unblocked since May 12 Looker rebuild)**
- **Phases 1 + 2 complete (May 4, 2026):** additive shim across all 11 views; both reporting snapshots (sessionized_universe_summary, identity_overlap_summary) migrated to canonical_identity_key.
- **Phase 3 work:** drop `final_identity_key` from view outputs and body references; harmonize `identity_canon` (table) vs `identity_canonical` (recursive view) across the chain.
- **Blocker removed (May 12):** the 5 parked Looker sources that originally required a tile audit were deleted (strategic call to rebuild reporting post-multi-tenant). Phase 3 is now a straightforward series of CREATE OR REPLACE VIEWs.


---

### 🟡 Priority 2 — Attribution Quality

**Fix #18 — Deferred until Fix #25 (decision recorded May 7, 2026)**
- **Original framing:** invert canonical_v2's dependency on reporting-layer snapshots (`eos_filtered_purchases_v1`, `eos_purchase_channel_final_snapshot_v1`).
- **What investigation revealed (May 7):** the four reporting snapshots `canonical_v2` reads from (`eos_purchase_base`, `eos_purchase_touch_summary`, `eos_purchase_fallback`, `eos_purchase_channel_final`) are **caches of attribution-layer computation**, not reporting-layer business logic. Specifically, `eos_purchase_touch_summary_snapshot_v1` caches a query against `chapter_attribution.chapter_summary_v1` that's heavy enough to time out at 60s+ standalone. The "cross-layer dependency" is a caching pattern in the wrong schema — not pure architectural badness.
- **Why not just invert it now:** removing the cache and reading `chapter_summary_v1` directly from canonical_v2 would push canonical_v2's runtime from ~7 min to plausibly 15-30 min. Real performance regression for marginal architectural cleanup. The "right" fix is **Path B** (relocate the cache from `chapter_reporting` to `chapter_attribution` + facade view) — but that's a 2-3 hr refactor for a smell that isn't blocking anything.
- **Why deferred:** **Fix #25 (incremental snapshot refresh)** completely redesigns the snapshot architecture — `chapter_summary_v1`, `purchase_chapters_base`, and the four reporting caches all get rethought during that refactor. Doing Fix #18 now risks doing the work twice. The right place to address layering is during Fix #25's design.
- **Reopen criteria:** if Fix #25 changes scope or gets deferred indefinitely AND Fix #17-style data-lag incidents recur, revisit Fix #18 as an independent project (likely as Path B — relocate caches to attribution layer).

---

### 🟢 Priority 3 — Housekeeping & Documentation

**Fix #8 — Historical identity gap documentation**
- **Note:** Early EOS data had identity persistence gaps. Cookie fixes applied April 1 (identity) and April 14 (journey). Fallback paths are needed for older chapters. Future data should have full coverage.
- **Action:** Document formally. No code change required.

**Fix #19 — POS / Quick Sale orders rejected by Shopify webhook adapter** *(code-complete May 5, 2026 — pending deploy + real-world verification)*
- **Problem:** orders-create webhook returned 400 `missing_purchase_identity` when an order had neither email nor customer_id. POS / Quick Sale walk-ins typically have neither, so they were silently dropped. Confirmed by the Apr 9 order #102256 ($78, source_name=`pos`) miss.
- **Backfill applied May 3, 2026:** order #102256 inserted into `chapter_ingest.purchase_events` with synthetic identity `customer_id=shopify_pos_anonymous:7802309804325`.
- **Code fix (May 5, 2026):** `src/app/api/shopify/webhooks/orders-create/route.ts` now generalizes the identity-missing branch — for any order with a `source_name` and `id` but no email/customer, synthesizes `customer_id = shopify_{source_name}_anonymous:{order_id}`. Covers POS, mobile_app, draft_order, and future non-web sources. Strict 400 only fires when both source_name and order id are missing (malformed webhook).
- **To verify after deploy:** wait for next non-web order (or trigger one). Confirm `purchase_events` has a row with `customer_id` matching the `shopify_*_anonymous:` pattern. Reporting/snapshot scripts can filter POS via `raw->'order'->>'source_name'`.
- **Location:** `src/app/api/shopify/webhooks/orders-create/route.ts`

---

### 📦 Backlog + deploy state (June 9, 2026 — end of day)

**Live in prod:** the full Chapter dashboard (10 pages), Observations engine + 05:00 UTC cron, Connections #1 + #2, system cohorts + 04:30 UTC cron, Option B SQL attribution chain + 03:30 UTC cron, `chapter_config.clients` table, per-client boundary event Phase 1 + Phase 2 wiring (helper + **26 wired SQL functions** across Observations engine + 11 dashboard RPCs + lifecycle_overview + 3 journeys RPCs), `chapter_observations.runs.boundary_event_definition` audit-aware, Cross-Source Influence 6× perf fix (June 8–9), cron parallelism on `refresh-attribution-chain` with `CONCURRENCY=5` (June 9).

**Live in DB but pending next prod deploy** (from this session): cron route changes (refresh-dashboard-mvs now refreshes 3 new connections MVs at 04:00 UTC; refresh-attribution-chain uses bounded-concurrency worker pool with `max=5` pool size), perf instrumentation removal from `influence/page.tsx`.

**Backlog items (small, opportunistic):**
- **Move shop-display tz into `chapter_config.clients.display_tz`** — column already exists; just need to wire it through `src/app/chapter/_components/format.ts:rangeToWindow` (currently hardcoded `America/Los_Angeles`). Trigger to do this: first non-PT client onboarding.
- **MV-ify Email subscribers cohort JOIN inside Connections panel resolver** — currently the Connections RPCs re-do the cohort JOIN per call. Fine at EOS volume; revisit when first client has >50k subscribers.
- **Clean up unused `LIFT_CAUSATION` mock + `LiftCausation` type from `mockdata.ts`** — leftover from when Causation tab was a placeholder. Now superseded by Contribution.
- **Investigate load-balancer hostname DNS for prod** — surfaced earlier; reason was forgotten before being documented. Worth grepping commit history for context if/when picked up.

---

## 📊 Key Data Insights (EOS Fabrics — April 2–25, 2026)

### Bot Traffic
- **101,956** total journeys in window
- **62,864 (61.7%)** bot-likely — single event, no engagement, 1 second avg duration
- **38,354 (37.6%)** human
- **738 (0.7%)** suspect
- **Active bot network detected April 27–28:** 3,056 journeys from China, 96.6% using `Chrome/142.0.0.0` (a non-existent future Chrome version). Zero purchases. Pure bot. Blocking this user agent at Shopify level is safe and recommended.

### Identity Stitching
- **357,992** total resolved identities in window
- **1,269** multi-journey identities (true returning users Chapter can detect)
- **362** stitched journeys (started anonymous, resolved to known identity via `purchase_cart_token_bridge` or `explicit_identify_call`)
- GA reported only 2,975 returning users (cookie-based only). Chapter found 1,269 with cross-session graph stitching.

### Behavioral Insights
- Top homepage first action: **74.7% passive** (time on page, scroll, visibility)
- **14.5%** go straight to product browsing (hover: collection card)
- **10%** immediate bounce
- Gallery view button (`Open Media In Gallery View`) is the #1 hovered element — 15,582 hovers, all on New Arrivals products
- **28.3%** of journeys that added to cart had previously hovered the gallery view button
- Top converting product: `holiday-embroidered-all-cotton-overprinted-eyelet` — 10.8% hover-to-cart rate vs 1.7–5.3% for others

### Attribution
- **3 average channel touches** per purchase chapter (outliers removed, clean dataset of 66 chapters)
- **1.91 average distinct channels** per chapter
- Multi-touch paths: 15 path types, single-touch: 1
- Direct dominance is partly a data artifact from pre-April-1 cookie bug — will improve with more data

---

## 🚫 What NOT To Do

- Do not mutate `chapter_ingest` tables — they are append-only source of truth
- Do not add attribution logic directly to `chapter_reporting` — it belongs in `chapter_attribution`
- Do not use `unified_events` (legacy) — use `unified_events_v2`
- Do not use `final_identity_key` in reporting — use `canonical_identity_key`
- Do not use `_deprecated` suffixed objects
- Do not use `_v2` attribution models — non-canonical and not financially validated
- Do not touch agency pages (`/about`, `/contact`, `/for-businesses`, etc.)
- Do not use `sudo npm install` for anything
- Do not store raw IP addresses (GDPR/CCPA) — use hashed or truncated form only

---

## 💰 Pricing model & unit economics (May 5, 2026 reference)

- **Billing metric:** raw journeys per month (includes bots; matches the count in `chapter_journey.journeys` filtered to `client_key`).
- **Tier 1 (up to 100K raw journeys/mo):** $399/mo flat.
- **Overage between 100K and 200K:** $25 per additional 10K journeys (linear).
- **Tier 2 (at 200K raw journeys/mo):** $799/mo flat.
- **Above 200K:** **not yet priced.** TBD when first client (likely the 2K-location dentist) approaches that scale. Open considerations: continue $25/10K linearly, switch to volume discount, or move to enterprise custom pricing.
- **EOS Fabrics today** (~96K raw journeys/mo): sits at the **$399 tier**.
- **Stack cost per client** (at 5-7 small clients on the warehouse architecture): ~$130-180/mo.
- **Per-client margin at $399 tier:** ~55-65% gross.
- **Per-unit cost to Chapter** at this scale: ~$0.003 per journey, ~$0.19 per tracked purchase, ~0.27% of attributed revenue.
- **Bot caveat:** ~62% of raw journeys at EOS are bot-likely. Clients pay for bot traffic under the current model. Two future levers: (a) bill on `human_likely` + `suspect` only (drops EOS billable journeys to ~36K — would price as $399 with lots of headroom), (b) keep raw + improve bot filtering at ingest so the count is honestly lower. Decide before onboarding scale clients where bot ratio could differ wildly.

---

## 📚 Multi-tier scaling architecture (Year 2+ reference)

- **Pattern:** Supabase (OLTP — real-time writes, identity stitching) → ETL every 15 min (Fivetran/Airbyte) → Warehouse (Snowflake/BigQuery — heavy aggregations, columnar, MPP) → Looker reads warehouse only.
- **Stays in Supabase:** raw event ingest, identity_aliases + identity_canon (live triggers), customer-support per-record lookups.
- **Moves to warehouse:** all chapter_attribution + chapter_reporting compute, all Looker queries.
- **Migration triggers (when to actually do it):** any single client > 100M events/month; OR Looker dashboards still slow even after Fix #25 (incremental refresh); OR Postgres compute add-ons exceed warehouse-stack alternative cost.
- **Cost at projected Chapter scale (5 ecommerce + dentist + school + B2B startup, ~50-100M events/mo):** $500-1500/mo total. ETL is biggest variable (Fivetran $300-700 vs Airbyte self-hosted ~$30); warehouse compute $100-300; dbt $0-300; Looker $200-400.
- **Storage scaling is trivial.** Snowflake $25/TB/mo, BigQuery $20/TB (or $10/TB long-term). At 5-year Chapter scale (~200GB raw → ~25GB warehouse-compressed), storage < $1/mo. Postgres storage is 10× more expensive AND forces compute tier upgrades as tables grow — this is why Postgres-only ages worse than the split architecture.
- **Compute scales sub-linearly** with smart architecture (incremental refresh + materialized aggregates) — Fix #25 is the prep move that makes a future warehouse migration a config change rather than a refactor.
- **Pruning lever (Year 5+ if needed):** retain raw events 12-18 months, aggregates forever, archive cold history to S3 ($0.023/GB/mo). BigQuery auto-discounts long-term storage; ClickHouse supports per-table TTL.

---

## 🔜 Future Work

- **Dashboard build** — v1 shell shipped May 14, 2026. **10 of 10 pages fully live-wired** as of end of June 4, 2026. Cross-Source Influence 6× perf fix (June 8–9) brought cold-load from 24s → 4s.
- **Tier 1 first-party redirect domain** — **PROMOTED to Sprint 4** (after barbershop onboarding). See Priority 1 section.
- **`/chapter/[client_key]/*` client-scoped surface w/ per-user auth** — **PROMOTED to Sprint 5**. See Priority 1 section.
- **Offline attribution expansion** — **PROMOTED to Sprint 6**. See Priority 1 section.
- **Google Search Console backfill** — OAuth client setup pending in GCP. Once flowing: per-page + per-keyword search performance data into `chapter_config.gsc_*` (TBD table name). Doesn't move attribution numbers — unlocks SEO reporting depth for Tigerbyte's portal + Channels page drill-down.
- **Lift & Incrementality test infrastructure (heavyweight tier)** — L&I page is live with all 3 tabs (Correlation, Incrementality v2, Contribution). What's missing is the lift-TEST engine: holdout assignment + suppression mechanics + p-value/power + propensity-score matching + covariate storage. Multi-week build. Trigger: first client demands a real controlled lift test.
- **Multi-client generalization of `chapter_reporting`** — COMPLETE via Option B (June 4–5, 2026): lifecycle_chapters / canonical_v1 / canonical_v2 are multi-tenant SQL functions; the 5 legacy `eos_purchase_*_snapshot_v1` reporting caches that canonical_v2 used to depend on are bypassed.
- **Gchat slash-command bot** on top of `saveClient` action — admin team interface for updating client portal config without the form UI.
- **Replace JSON textareas in `/internal/client-portal-config` admin form with structured editors** — current `project_summaries` + `reporting_tiles` fields are raw JSON textareas. Easy to break with invalid JSON.
- **`purchase_items` population** — not yet populated for EOS.
- **`chapter_config` schema** — per-client config home. Tables: `clients` (canonical per-client config: storefront_domain, boundary_event_name, display_tz — added June 5), `client_secrets`, `shopify_webhook_secrets`, `email_campaigns`, `email_engagement_events`, `connections_cohorts` + `connections_cohort_members` (added June 1).
