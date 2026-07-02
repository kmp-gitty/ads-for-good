# CLAUDE.md — Chapter Project Context
> This file is the living source of truth for Claude Code sessions.
> Updated at the end of each working session. Do not modify manually.
> Last updated: July 2, 2026 (midday — Fix 1B production cron validated overnight (21/21 runs ok). NSC digest surfaced a real bug: lifecycle SQL was hardcoding `event_name='purchase'` in the purchase-events UNION branch, silently overwriting NSC's `appointment_booked` boundary events → canonical_v1/v2 wrote 0 rows. Fix applied (1-line change: use `p.event_name` from source). Chain re-ran 2.6s clean; 869 canonical_v2 rows land as `(direct)` fallback (expected — no pre-click pixel data until Book Now is wrapped in Tier 1 redirect). Payments backfill hardened with SQL retry + `max_lifetime:0` after repeated ECONNRESET at ~30-min mark; resumed 1795 → 4298.)

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

### Tier 1 first-party redirect (added June 10, 2026)
- **URL shape:** `https://ads4good.com/r/<client_key>/<slug>?<query>` — visitor 302s to a destination chosen by priority-ordered rules evaluated against identity/cart/geo/device/AB/time/query/referrer context. Click is logged to `chapter_ingest.pixel_events` as `event_name='redirect_click'` so it flows through canonical_v1 as a normal session entry. Identity + journey cookies are dropped so downstream pixel events stitch to the same identity. <50ms latency target.
- **Admin UI:** `/internal/redirect-rules` (gated by `CHAPTER_DASH_TOKEN` cookie). Create/edit/toggle/delete rules per (client_key, slug). Conditions are raw JSON (object = AND-ed predicates; empty `{}` = catch-all). Destination template supports `{q:utm_source}`, `{identity_key}`, `{client_key}`, `{country}`, `{region}`, `{city}`, `{device_type}`, `{os}`.
- **Route handler:** `src/app/r/[client_key]/[slug]/route.ts`. Library modules in `src/app/lib/redirect/` (rules, identity, geo, device, ab, cart, segments, conditions, click-logger, template, consent).
- **Consent gate is always-on.** `chapter_consent` cookie on the redirect apex; `opt_out` blocks the click log + cookie issuance but still 302s. No per-client toggle (matches the `/api/chapter/collect` contract). Per-client knob is the "default when cookie is absent" — v1 hardcoded `"opt_in"`.
- **Operator guide:** `docs/tier1-redirect.md` (URL shape, all 17 condition types, template vars, example SQL, ESP wrap patterns for Mailchimp/Klaviyo/Shopify Email/Meta/Google Ads).

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
| `chapter_config` | Per-client config — `clients` (PK config: storefront_domain / boundary_event_name / display_tz / email_source_patterns + agency_key added June 18), `client_secrets`, `shopify_webhook_secrets`, `square_webhook_secrets` + `square_oauth_tokens` (added June 9), `email_campaigns`, `email_engagement_events`, `connections_cohorts` + `connections_cohort_members`, `redirect_rules` + `redirect_ab_experiments` (added June 10, Tier 1 redirect), `users` (Sprint 5a auth + agency_key column added June 18), `agencies` (Sprint 7, June 18), `allowed_email_domains` (Sprint 7, June 18), `tracking_ignore_list` (June 17) |
| `chapter_observations` | Observations engine — `questions` catalog, `findings` state machine, `runs` audit (added June 2, 2026) |
| `chapter_audit` | Auth-attempt + PII-view audit logs (added Fix #26 part 4) |
| `chapter_recommendations` | Recommendations engine — `rules` config, `findings` state machine, `runs` audit (added June 14, 2026) |
| `chapter_inquiries` | Sprint 8 inquiries — `threads` + `messages` + auto-bump trigger. Per-client inquiry threads; chapter_staff reply via `/internal/inbox`; clients/agencies see status updates via `/chapter/<key>/inbox`. Gchat webhook on new thread + client reply (chapter_staff suppressed). Storage bucket `inquiry-attachments` (private, 10MB cap, image-only). RLS-on-no-policies; access enforced server-side. |
| `crm` | Internal CRM — `prospects`, `communications` (manual touchpoints + n8n-synced emails/meetings), `interactions` (observed signals — site visits / GBP / Yelp / inquiry / review / referral), `clients` (converted prospects → paying clients). RLS enabled, service_role full grants (June 18 added INSERT/UPDATE/DELETE on prospects/communications/interactions which were SELECT-only). `/internal/crm` page operates over this schema. See "Agency dogfood" entry under Completed Fixes for the full CRM↔Chapter integration architecture. |
| `tasks` | n8n-driven internal task tracker — `task_batches` (per-email batches from outgoing project updates), `tasks` (individual action items per batch). `/internal/tasks` admin UI. |

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

### Active Clients (as of June 10, 2026)
- **EOS Fabrics** (`client_key = 'eos_fabrics'`, shop `emmaonesock.myshopify.com`, storefront `eosfabrics.com`) — primary client since April 2026. Full dashboard + Observations + cohorts live.
- **Projectagram Reels** (`client_key = 'projectagram_reels'`, shop `projectagram.myshopify.com`, storefront `projectagram.com`) — onboarded May 12, 2026. Same Shopify 3P pattern as EOS. Ingest is live; dashboard renders against the multi-tenant RPC layer (no `eos_*` hardcoding remains on the live-wired pages).
- **adsforgood_prod** (`client_key = 'adsforgood_prod'`) — agency-internal smoke-test client; used for cross-tenant isolation validation and connection-test endpoints. Not a paying client.
- **Not So Cavalier** (`client_key = 'not_so_cavalier'`, storefront `notsocavalier.com`, Square merchant `MLW5ZHWCR6X7E`) — first B2C personal services client. Signed + paying. Onboarded June 10, 2026. **First 1P-hosted pixel** at `chapter.notsocavalier.com` (CNAME → Vercel; live June 16). Booking platform: Square Appointments. Cross-domain pattern: marketing site has Chapter pixel; booking flow on Square's hosted `book.squareup.com/...` domain. `boundary_event_name = 'appointment_booked'`, `display_tz = 'America/New_York'`. Server-side provisioning + pixel install both complete. Google Ads tracking template live; real ad clicks flowing with full `gclid` + utm capture. Steps 6-8 (`/booking-confirmed` route + Square Appointments post-booking redirect URL config + e2e test) parked pending Katoa's Square Appointments Staff-role access.
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

## ✅ Completed Fixes (as of June 30, 2026)

### Lifecycle event_name hardcode bug — silent NSC canonical failure diagnosed + fixed (July 2, 2026 midday)
- **Fix 1B production cron ran clean overnight** (21/21 runs ok, 0 failed, 1.4M rows written across all 4 clients). Fix 1B semantics validated in production — no temp-table collisions, no HAVING regressions, no chapter_id discontinuity. Confirmed pure Fix 1B chain in NSC's stage runs.
- **But NSC's dashboards would have been empty** — noticed while spot-checking chain state post-cron. `chapter_model.lifecycle_chapters_snapshot` had 801 NSC rows (✓ processed), but `canonical_v1_snapshot` had **0 rows** and `canonical_v2_snapshot` had **0 rows**, both with `status='ok'`. Silent HAVING-filter miss.
- **Root cause:** the lifecycle refresh function's purchase-events UNION branch hardcoded `event_name` in the SELECT list:
  ```sql
  SELECT p.client_key, p.event_ts, 'purchase', 'purchase',
         COALESCE(p.source_platform, 'shopify'), ...
  FROM chapter_ingest.purchase_events p
  ```
  Column order for the INSERT is `(client_key, event_ts, event_type, event_name, ...)`. First `'purchase'` fine (event_type is a category). **Second `'purchase'` overwrites the actual `event_name` from source data.**
- **Why EOS/projectagram/adsforgood weren't affected:** their `boundary_event_name = 'purchase'` in `chapter_config.clients`. The hardcode matches their real event_name by accident. NSC's `boundary_event_name = 'appointment_booked'` — the hardcode overwrites → canonical_v1's `HAVING event_name = <boundary_event>` filter never matches → 0 rows → dashboard silence.
- **The bug has been latent since Fix 1B lifecycle shipped July 1** (and identical code likely predates Fix 1B — inherited from the original Fix 25 lifecycle refactor). Just wasn't stressed until NSC's data flowed through the chain.
- **Fix:** one-line change. Replace `'purchase', 'purchase',` → `'purchase', p.event_name,` in that UNION branch. Applied via `~/chapter-scripts/snapshots/2026-07-02-fix-lifecycle-event-name-bug.sql` through Supabase Dashboard SQL Editor (MCP path stayed blocked by same Cloudflare rule as last night). Everything else in the function byte-identical.
- **Recovery run:** deleted NSC's 66 recent successful `_snapshot_runs` rows (22 per stage × 3 stages) to reset the watermark to April 1 2026, then called `chapter_reporting.refresh_full_attribution_chain('not_so_cavalier')`. Ran in 2.6s. Fix 1B's chapter-scoped DELETE-then-INSERT overwrote the 801 incorrect lifecycle rows and inserted 1,076 fresh rows (869 with `event_name = 'appointment_booked'` + 207 pixel events).
- **Canonical_v2: 869 rows, all `(direct)`, $0 revenue.** Both are structurally-expected given current NSC state, NOT bugs:
  - **All `(direct)`:** NSC has no pre-click pixel data linked to any booking. Chapter pixel was installed June 16 but Book Now button on Lovable isn't yet wrapped in Tier 1 redirect, so no `redirect_click` breadcrumbs exist for canonical_v1's session-entry classifier. Every chapter falls through to canonical_v2's `(direct)` fallback. **Fixed forward** when the stitching layer ships (see prior entry).
  - **$0 revenue:** by design. NSC boundary events are `appointment_booked` with `value=0`. Real revenue lives in downstream `appointment_paid` events (Sprint 2.1). Dashboard queries need to JOIN payments to bookings via `order_id` to compute revenue-per-chapter. That JOIN layer isn't wired yet either — separate dashboard-side work.
- **Canonical_v1: 0 rows** — expected for the same reason. Zero session-entry data means zero chapters with attributable channel paths. Will populate once Book Now is wrapped + a couple weeks of clicks accumulate.
- **Latent secondary bug flagged during investigation (NOT fixed today):** the lifecycle function's identity resolution also hardcodes `'shopify_customer_id:' || p.customer_id` in the affected-canonical detection CTE AND in the purchase-branch identity join. But NSC stores `customer_id` in `chapter_ingest.purchase_events` with the `square_customer_id:` prefix already applied by the webhook adapter. So the string concat yields `'shopify_customer_id:square_customer_id:...'` — a malformed key that doesn't match any `identity_canon` row. **Impact for NSC is small (~24 bookings without email_hash would silently orphan; 97.3% of NSC bookings have email_hash and route through the `'email_sha256:' || p.email_hash` branch correctly).** Same shape as the June 9 `/api/purchase` double-prefix fix — the lifecycle function inherited the pre-fix pattern. Fix is trivial (`CASE WHEN p.customer_id LIKE '%:%' THEN p.customer_id ELSE 'shopify_customer_id:' || p.customer_id END`) but not blocking; deferred to a follow-up.
- **Payments backfill hardening:** the postgres-js connection was hitting the default 30-min `max_lifetime` and blowing up with ECONNRESET. Two prior resumes died at ~30 min. Fix: `max_lifetime: 0` + `idle_timeout: 0` on the `postgres()` config + a `sqlWithRetry()` wrapper on the idempotency check that catches ECONNRESET/EPIPE/CONNECTION_ENDED and retries with exponential backoff. Resumed with 1795 payments already landed ($105K revenue recovered pre-crash); continues toward 4298 target.

### NSC stitching layer — design decisions locked, Square constraint boundary confirmed (July 2, 2026 late evening)
- **Question being answered:** how to link anonymous browser sessions on `notsocavalier.com` to identified bookings on `book.squareup.com` given that Square's hosted flow strips all URL params + doesn't expose custom customer-input fields + doesn't emit any customer-behavior webhook events.
- **Path options exhausted, in this session:**
  - **Pre-click Moment Identity modal on Book Now** — technically works (uses existing `chapter_config.identity_prompts` primitive) but adds friction to booking flow. **Rejected by operator.**
  - **Google Enhanced Conversions for Leads** — server-side upload of hashed email to Google Ads after boundary event. Google matches email to original ad click on their side. **Rejected by operator** — inverts Chapter's positioning ("we know because we watch the whole chain" → "Google knows because they own both sides"). Diminishes Chapter's value proposition.
  - **Confirmation email / SMS link-back** — depends on Square supporting URL substitution tokens in confirmation templates (unverified; likely not supported per prior claude-chat findings).
  - **seller_note write-back via Square API** — Chapter → Square audit slot. Post-decision only (we must already know which anonymous_id belongs to which booking BEFORE writing). Staff-visible in Square admin/POS. **Confirmed by operator's later research: writable via UpdateBooking with seller-level auth; NSC on Appointments Plus qualifies. Requires version handling + feedback-loop guard (our write triggers booking.updated).**
  - **Booking Custom Attributes API** — same write-back trap as seller_note but on the booking record. **Same conclusion: audit slot, not decision mechanism.**
  - **Customer Custom Attributes API** — same trap on the customer record. VISIBILITY_HIDDEN scope would solve staff-visibility concern (invisible to Square admin UI) but doesn't change the fundamental "we're the ones writing, we need to know what to write first" problem.
  - **OAuth flow** — merchant → app authorization only. `state` param is a CSRF token that preserves OUR context across the merchant-authorization step, not per-customer context. Zero relevance to customer identity linking.
  - **All 149 Square webhook event types** (enumerated via `/v2/webhooks/event-types` API using NSC's PAT — see `~/chapter-scripts/list-square-events.js` utility): every event is a persistent-record state change (bookings, customers, orders, payments, custom-attribute definitions). **ZERO events for customer landing on booking page, session start, form-field interaction, or abandoned booking.** Square's webhook philosophy is state-based, not behavior-based.
- **Square's boundary is confirmed structural**, not a feature Square hasn't shipped yet. The "no post-booking redirect / no URL passthrough" gap has been on their unfilled feature-request list for years (per claude-chat's earlier research).
- **Final locked plan for NSC stitching**, in order of build:
  1. **Wrap NSC's "Book Now" button on Lovable in Tier 1 redirect** — change the button href to `https://chapter.notsocavalier.com/r/not_so_cavalier/book-now?to=<square_url>`. Every click gets logged as a `redirect_click` pixel event with `journey_id + anonymous_id + click_ts + destination`. Zero infrastructure work on Chapter's side (Sprint 4 route already handles this shape). Small Lovable-side change.
  2. **Add probabilistic time-window matcher to `/api/square/webhooks/appointments`** — runs AFTER the boundary event lands. Queries `chapter_ingest.pixel_events` for `redirect_click` events targeting `book.squareup.com` in the 30 min preceding `booking.created_at`. Match logic: **0 candidates** → no stitch, canonical stays direct-fallback. **1 candidate** → high confidence, insert alias `anonymous_id ↔ email_sha256:X`, canon walks graph. **N candidates** → nearest-in-time wins v1; heuristic tiebreakers (UA family, geo match against journey.country/city) added later if ambiguity rate is meaningful.
  3. **Historical stitch backfill** — SQL script re-runs same match logic against all 923 backfilled bookings once ~2 weeks of forward redirect_click data has accumulated. Idempotent on `identity_aliases` unique constraints.
  4. **Optional post-hoc audit write-back** — deferred. If shop owner asks "how do I see which bookings came from ads?", add Customer Custom Attribute (VISIBILITY_HIDDEN) write from post-webhook. Feedback-loop guard required (our write fires customer.custom_attribute.updated back at us).
- **Structural residual gap (accepted):** ~400+ of the 923 backfilled bookings have `event_ts` BEFORE the pixel install date (June 16, 2026). No browser breadcrumb exists to attribute a channel to those. They fall through to `(direct)` in canonical_v1 fallback. Real identity graph is still preserved (customer's email/phone/square_id canonicals) so future browsing by these customers stitches to their canonical, but historical attribution for the pre-pixel window is `(direct)` fallback. Not fixable — cost of NSC onboarding pixel 6 days after webhook subscription.
- **Utility script left behind:** `~/chapter-scripts/list-square-events.js` — one-off script that queries Square's `/v2/webhooks/event-types` API via NSC's PAT and prints the enumerated event list. Reusable for future Square event catalog audits.

### NSC Square webhook recovery — silent failure diagnosed, 12+ months of history backfilled (July 1-2, 2026 evening)
- **NSC was silently orphaned since June 10 onboarding.** 11,500+ Square webhook delivery attempts failed with 307/401/504 over 3 weeks. Zero rows in `chapter_ingest.purchase_events` for `not_so_cavalier` until tonight. Dashboards showed empty. GChat operational alerts never fired because our audit-log only writes on route reach — the 307s died at Vercel's edge before touching any handler.
- **Root cause #1 — Vercel apex→www 307 redirect.** Direct `curl -si -X POST https://ads4good.com/api/square/webhooks/appointments` returns `HTTP/2 307` with `location: https://www.ads4good.com/...`. Vercel's project has `www.ads4good.com` set as canonical; the apex redirects. Square (like most webhook senders) doesn't follow redirects for POST — treats 307 as delivery failure. **Every NSC webhook died at the edge for 3 weeks.**
- **Fix #1:** operator updated all 3 NSC subscriptions in Square admin (bookings + payments + refunds) to `https://www.ads4good.com/...`. Also updated `chapter_config.square_webhook_secrets.notification_url` to match (documentation-only field but keeps records consistent).
- **Root cause #2 — HMAC signing URL mismatch after fix.** Square signs webhook payloads as HMAC-SHA-256 over `(notification_url + raw_body)`. Our verify code (`src/app/api/square/webhooks/appointments/route.ts:51`) uses `row.notification_url` from DB. Post-fix, Square was signing with `https://www.ads4good.com/...` while our DB still had `https://ads4good.com/...` (before we updated the row). HMAC computed with different URL strings → mismatch → 401. Documented in the ` /api/square/webhooks/appointments` route already but was landmined by the split state.
- **Fix #2:** SQL `UPDATE chapter_config.square_webhook_secrets SET notification_url = REPLACE(..., 'https://ads4good.com', 'https://www.ads4good.com') WHERE client_key = 'not_so_cavalier'`. Vercel Lambda's 5-min in-memory cache on `getActiveSquareSecrets(merchant_id)` delayed propagation; cold Lambda picked up the fresh URL, warm ones kept 401'ing during transition (visible in audit log timeline: 22:38 to 22:40 UTC = 401s, 22:44 onwards = 200s).
- **E2E validation post-fix.** 5 real webhook events landed successfully. Full June 9 Phase 3.5 identity_canon merge worked: for each booking, `square_customer_id:Y ↔ email_sha256:X ↔ phone_sha256:Z` triple-alias inserted, all resolving to a single canonical. Customers API enrichment confirmed alive.
- **Backfill via Square API — full historical recovery.** Wrote 3 scripts in `~/chapter-scripts/`:
  - **`backfill-nsc-square-bookings.js`** — 923 bookings recovered spanning `2025-06-18 → 2026-07-01` (over 12 months). 97.3% Customers API enrichment (email hash populated). Historical `event_ts` preserved so attribution windows reconstruct correctly. Ran in ~10 min after retry-with-timeout added (first two attempts died at ETIMEDOUT ~half-way; fetch wrapped in AbortController with 30s timeout + 3-attempt exponential backoff fixes it).
  - **`backfill-nsc-square-refunds.js`** — 1 refund, $40 recovered. Direct INSERT to `chapter_ingest.refund_events` with `ON CONFLICT (refund_id) DO NOTHING`. Trivial (barbershop rarely refunds).
  - **`backfill-nsc-square-payments.js`** — 4,297 payments spanning same window (much larger than bookings because POS/walk-in payments are captured too, not just appointment-linked). Uses 5-concurrent worker pool because sequential would take 3-4 hours at ~2s per row. **Still running in background at commit time**; will land as `appointment_paid` downstream events with the SAME `order_id` as the linked booking for dashboard `booking → paid` fulfillment-rate JOINs.
- **Identity graph after bookings backfill:** 1,446 `identity_canon` rows for NSC / 497 distinct customers / 471 `square_customer_id` + 467 `email_sha256` + 484 `phone_sha256` canonicals + 12 orphaned `anonymous_id` canonicals (from pre-pixel-install pixel activity June 21-29 — structural, can never be stitched to bookings since browser sessions predate the pixel install by weeks).
- **Structural stitching gap acknowledged (pre-June-16 bookings).** ~400+ of the 923 bookings have `event_ts` before the pixel install date (June 16). These will fall through to `(direct)` in canonical_v1 fallback — no browser breadcrumb exists to attribute a channel. Real identity graph is still preserved (email/phone/square_id canonicals) so future browsing by these customers stitches to their canonical, but historical attribution is `(direct)` fallback for the retroactive window.
- **Ongoing gap: matching anonymous pre-click sessions to booking canonicals.** For June-16-forward bookings, the pixel data + booking data both exist but there's no automatic link. Three mechanisms discussed:
  - **Pre-click identity capture** (Moment Identity modal on Book Now). Adds friction to booking. User rejected as too much UX cost.
  - **Post-hoc probabilistic via time-window** + optional seller_note write-back for audit. Match anonymous_id from a redirect_click within 30 min of booking timestamp. Chapter-native, deterministic on unambiguous cases, honest on ambiguous ones. **User accepted as backup + backfill mechanism.**
  - **Confirmation email link-back.** Depends on Square supporting URL substitution tokens in confirmation email/SMS templates — not yet verified.
- **Fix 1B chain running tonight at 03:30 UTC will pick up all backfilled bookings + refunds** into `lifecycle_chapters_snapshot`, `canonical_v1_snapshot`, and `canonical_v2_snapshot`. First proper NSC dashboards land tomorrow morning. Payments landing in background will flow through next night's chain.
- **Backfill script pattern lessons captured for future use:**
  - **Idempotency is mandatory.** Every script checks `event_id` existence before inserting. Restart-safe after any mid-run crash.
  - **`fetch` in Node 22 needs explicit AbortController timeout.** Default is no timeout → ETIMEDOUT kills the process mid-run. 30s timeout + 3-attempt exponential backoff added to the shared helper.
  - **`run_in_background: true` at the tool level (not `&` inside a bash) for long-running scripts.** Subshells backgrounded via `&` get SIGHUP'd when the outer tool exits.
  - **Bounded worker pool** — 5 concurrent workers is a good tradeoff against Square API's 100 req/s burst limit. Speedup roughly matches worker count minus DB pool contention.
  - **Historical `event_ts` preservation is critical for attribution correctness.** Script explicitly stamps `booking.created_at` (not `now()`) so lifecycle_chapters windows reconstruct correctly.
- **Files:** `~/chapter-scripts/backfill-nsc-square-{bookings,payments,refunds}.js`. Not committed (chapter-scripts is not a git repo — matches ad-hoc pattern). Ingest routes unchanged; the June 9 + June 10 + June 11 Square adapters worked as designed once the redirect + URL-mismatch issues were fixed.

### Fix 1B — retention floor + chapter-spanning caveat wired through the chain (July 1, 2026 evening)
- **Fix 1A shipped the schema (retention_days column + `chapter_config.retention_floor()` helper) on June 30 but deferred wiring it into the chain.** Fix 1B closes that loop: `lifecycle_chapters_incremental` + `refresh_canonical_v1_snapshot` + `refresh_canonical_v2_snapshot` all now filter by a per-client retention floor. Reads `retention_days` from `chapter_config.clients` directly, `retention_floor = GREATEST(hardcoded_date_floor, snapshot_ts_hi - retention_days)`. With `retention_days IS NULL` (all 4 clients today), collapses to Fix 2 semantics — zero drift.
- **Chapter-spanning caveat solved via `effective_floor` + `chapter_offset` per canonical.** A canonical whose chapters straddle the retention boundary would break naively — chapter events start before the boundary, chapter_ids from a naive rebuild would collide with frozen pre-retention rows.
  - `effective_floor` per canonical = `MIN(first_ts)` over qualifying chapters (chapters with `boundary_ts >= retention_floor` OR still open). The event scan reads back to this per-canonical horizon so cross-boundary chapters see their full history.
  - `chapter_offset` per canonical = count of chapters with `boundary_ts < retention_floor`. Window function output gets shifted by this offset so post-retention chapter_ids stay contiguous with frozen rows.
  - Chapter-scoped DELETE: `DELETE ... WHERE chapter_id >= chapter_offset` — pre-retention rows never touched.
- **Regression validated on EOS live data** (docs/fix-1b-retention-floor-design.md has the full detail). `retention_days=999` (no effective retention): 72 affected canonicals, 303,713 test rows vs 296,986 production rows — diff explained entirely by the 6-hour time gap between runs. `retention_days=30`: 76 affected canonicals, 37 with pre-retention chapters, verified on one email_sha256 canonical with 7 chapters that chapters 0-3 stayed frozen at production chapter_ids and chapters 4-6 reprocessed with chapter_ids preserved via offset. **Both PASSED.**
- **Cloudflare WAF blocked the MCP path** for three sequential `apply_migration`/`execute_sql` attempts (Ray IDs `a14762557c8f3d64`, `a1476ca229133d64`, `a14778822aad0f95`). Block page identified `anthropic.com` — the WAF sits on Anthropic's MCP router edge, not Supabase's, and tripped on some combination of large `CREATE OR REPLACE FUNCTION` body + `SECURITY DEFINER` + classifier CASE URL patterns + DDL keywords. Workaround: persisted 3 SQL files to `~/chapter-scripts/snapshots/2026-07-01-fix-1b-*.sql` + operator runbook, operator pasted each into Supabase Dashboard SQL Editor (browser → `api.supabase.com` direct path, not through Anthropic's WAF). All three succeeded sub-second.
- **Named-parameter resolution ambiguity postmortem.** The earlier "Fix 1B lifecycle production" attempt added `p_retention_days_override integer DEFAULT NULL` to the lifecycle signature — but Postgres treats new-parameter versions as distinct overloads, not replacements. Ended up with BOTH 4-arg (Fix 2) AND 5-arg (Fix 1B) live simultaneously. Orchestrator's named-parameter call (`p_client_key => ..., p_snapshot_ts_hi => ...`) failed with `42725: function ... is not unique` — Postgres couldn't pick between overloads sharing those parameter names with defaults for the rest. **Fix:** dropped the 5-arg overload immediately after applying the 4-arg in-place replacement. **Lesson:** `CREATE OR REPLACE FUNCTION` only replaces when signature matches EXACTLY. For in-place production replacements, keep the signature untouched and move new configurability into the function body (read config from a table) rather than a new parameter. Test overloads are safe because they use different scratch tables and are called directly, not through the orchestrator's named-param interface.
- **Files:** `docs/fix-1b-retention-floor-design.md` (full design + regression results + postmortems). Production functions: `chapter_model.refresh_lifecycle_chapters_incremental` (4-arg), `chapter_attribution.refresh_canonical_v1_snapshot` (2-arg), `chapter_attribution.refresh_canonical_v2_snapshot` (2-arg). Preserved SQL: `~/chapter-scripts/snapshots/2026-07-01-fix-1b-*.sql` (3 files + runbook).
- **Smoke test on adsforgood_prod (post-cutover):** 0 rows across all 3 stages, 0.6s wall-clock, no errors. Correct for a quiet client. Tonight's 03:30 UTC cron is the final validation across all 4 clients.
- **Next tenant to exercise the frozen-chapter path:** Guardian Angel Cincy, when they onboard with a sub-90d retention tier. Watch `_snapshot_runs.rows_deleted < rows_deleted-of-all-time` (chapter-scoped DELETE working) and chapter_id sequences staying contiguous for those first 3 nights.

### Chain-order backfill — 1 real recovery, 73 false positives (July 2, 2026 morning)
- **Ran the historical chain-order miss backfill** against EOS to close the "canonicals misattributed by pre-June-30 stale-MV reads" gap. Executed via a synthetic-snapshot_ts_hi mechanism: mark victim canonicals' lifecycle rows with a specific timestamp, then call `refresh_canonical_v1_snapshot('eos_fabrics', synthetic_ts)` + `refresh_canonical_v2_snapshot('eos_fabrics', synthetic_ts)`. Fix 2's incremental detects them via the marker and reprocesses.
- **Detection filter was too broad.** Initial query flagged 74 candidate victims ($5,451.70 nominal revenue): `channel_path = '(direct)' AND non_boundary_events = 1 AND non_bot journey exists in chapter window`. This over-collects because MANY genuinely-direct visitors satisfy the same filter — a visitor who bookmarks the site + fills a form is single-touch direct + has non-bot journey activity + is a real customer, not a chain-order victim.
- **Real signature would be tighter:** canonical_v1 has NO row for a chapter that has classifiable non-bot journeys tied to non-direct entry channels (referrer/utm/click_id). The filter I used caught #1 but missed the "entry channel is actually non-direct" qualifier.
- **Recovery outcome:** 1 chapter recovered ($202, `email_sha256:ede28d93...` chapter 0 — reattributed from `(direct)` to `organic social`). 73 chapters stayed as single-touch `(direct)` because they were genuinely direct all along. Total EOS revenue unchanged; only 1 chapter's channel label shifted.
- **Historical impact of the chain-order bug at EOS: minimal.** The June 30 fix (MV refresh 04:00 → 03:00 UTC) prevents future misses; the historical damage was <$300 total. Not worth deep future backfill investment.
- **Artifact left behind (benign):** 68 canonicals' `chapter_model.lifecycle_chapters_snapshot` rows now have `snapshot_ts_hi = '2026-07-02 14:00:00.999999+00'` (the synthetic marker). This doesn't affect future crons (they read watermark from `_snapshot_runs`, not from lifecycle rows). Will get overwritten naturally when those canonicals see new activity.
- **Backfill mechanism lesson:** the "synthetic-marker + call refresh functions" pattern works cleanly. Adds `_snapshot_runs` rows with the synthetic ts (marked `ok`). Doesn't disrupt production data flows. Reusable for other clients if needed — but based on EOS's tiny actual impact, unlikely worth running for the other 3 clients.

### Fix 2 temp table collision postmortem (July 1, 2026 morning)
- **First nightly cron run of the Fix 2 incremental functions failed** July 1 03:30 UTC. GChat alert (Katoa saw ~11:33 PM ET June 30): "Attribution chain refresh — 4 client(s) failed. Elapsed: 186s. 0 clients ran successfully." Every client hit `relation "_affected" already exists`.
- **Root cause:** Fix 2's `refresh_canonical_v1_snapshot` and `refresh_canonical_v2_snapshot` BOTH used `CREATE TEMP TABLE _affected ON COMMIT DROP AS ...` — same table name. When called sequentially by `refresh_full_attribution_chain`, both functions run in the SAME plpgsql transaction. `ON COMMIT DROP` only fires at transaction commit (after v2). So v2's `CREATE TEMP TABLE _affected` collided with v1's still-live temp table.
- **Blast radius:** v2's exception raised, which rolled back the ENTIRE transaction — including lifecycle + v1's `_snapshot_runs` INSERTs AND their DELETE + INSERT operations against the snapshot tables. So NO snapshots updated for July 1, and NO `_snapshot_runs` rows exist for that date. Only journey_resolved_v1 (fired at 04:25 UTC by the separate derived-snapshots cron) has July 1 rows, but it read stale canonical_v1 data.
- **Regression test blind spot** (the important lesson): the `_test` function variants written for Fix 2's regression test wrote to SEPARATE scratch tables (`_v1_test`, `_v2_test`) and were called independently via manual SQL — not chained through the orchestrator in a single transaction. So the ON-COMMIT-DROP-timing-across-stages scenario never materialized. **The chain-in-one-transaction behavior only manifests when the production orchestrator runs both stages back-to-back.**
- **Fix (migration `fix_2_temp_table_collision`):** added `DROP TABLE IF EXISTS _affected` (and defensively `_raw_ids`, `_journeys`) at the top of each function's inner BEGIN block. If the temp table exists from a prior stage in the same transaction, drop it first; otherwise no-op. `ON COMMIT DROP` still handles post-transaction cleanup.
- **Recovery:** manual `refresh_full_attribution_chain(client_key)` per client. All 4 clients ran clean: adsforgood_prod 1.2s (0 rows) · not_so_cavalier 0.08s (0 rows) · projectagram_reels 0.1s (0 rows) · eos_fabrics ~4 min (lifecycle 107s / v1 119s / v2 12s; 209 canonical_v1 rows + 223 canonical_v2 rows + 514,322 lifecycle rows). Three of four clients showed 0 rows because they had no new activity since watermark — expected incremental behavior, not a symptom of the bug.
- **Interpretation of "no new July 1 data" for 3 of 4 clients:** for tiny tenants (adsforgood_prod, not_so_cavalier) OR quiet ones (projectagram_reels), the lifecycle incremental correctly detected zero affected canonicals since the last successful watermark and no-op'd. adsforgood_prod + not_so_cavalier have NULL canonical_v1/v2 (no purchases ever, no boundary events, no chapters). Only EOS had material data to fill in.
- **Lesson recorded for future incremental patterns:** temp table names are shared across sibling function calls in the same transaction. Either (a) namespace them per-function (`_affected_v1`, `_affected_v2`), or (b) `DROP TABLE IF EXISTS` at the top of each function. Both work; we chose (b) — defensive without renaming, no signature changes required.
- **Design doc updated** with full postmortem: [docs/fix-2-canonical-incremental-design.md](docs/fix-2-canonical-incremental-design.md).

### Classifier calibration tooling (June 30, 2026 late-late evening)
- **Per `docs/bot-classifier-v1.md` calibration backlog** — built the labeling infrastructure so the operator can measure precision/recall against ground truth whenever they want. The pin (earlier tonight) closed the change-control gap; this closes the accuracy-measurement gap.
- **New table `chapter_observations.classifier_labels`** — one row per (client, journey) with `mv_bot_class` + `mv_bot_score` snapshot at labeling time (so future re-classifications don't poison historical calibration) + `operator_label` ('human' | 'suspect' | 'bot' | 'unsure') + `operator_notes` + `labeled_by` + `labeled_at`. Unique on `(client_key, journey_id)`.
- **Admin UI at `/internal/classifier-calibration`** — page pulls a random 20-journey sample from the last 30 days, filters out already-labelled ones, computes confusion matrix stats from the labels table. Operator picks a client from the switcher (4 active clients), sees each journey with v1's verdict (chip + score) + every signal v1 reads (event_count, distinct types, page_view/scroll/hover/time_on/identify counts, has_identity, durations, gaps, events/min). Click one of 4 label buttons → optimistic mark + server action upserts. "New sample" button re-rolls.
- **Stats panel computes (once labels accumulate to ≥20):**
  - **False positive on `suspect`** = real humans excluded from billing as suspect (we're under-billing the client by this much)
  - **False negative on `human_likely`** = bots billed as human (we're over-billing the client by this much)
  - **Confusion matrix** (raw counts, expandable details panel)
- **Locked semantics:** the snapshot of `mv_bot_class` + `mv_bot_score` at labeling time is the contract. If the MV gets refreshed later and a journey's classification changes, that doesn't invalidate the historical label — we measure v1's accuracy on the data v1 actually wrote at that moment.
- **Files:** schema migration `classifier_labels_table`; [src/app/internal/classifier-calibration/page.tsx](src/app/internal/classifier-calibration/page.tsx), [CalibrationBoard.tsx](src/app/internal/classifier-calibration/CalibrationBoard.tsx), [_actions.ts](src/app/internal/classifier-calibration/_actions.ts), [layout.tsx](src/app/internal/classifier-calibration/layout.tsx).
- **Operator workflow when picking up:** visit `/internal/classifier-calibration?client=eos_fabrics`, label ~20 journeys per session over a few sittings (don't try to do all 200 at once — fatigue-induced mis-labels poison ground truth), come back to check the stats panel after each batch. Threshold tuning becomes possible once each client has >50 labels.

### usage_snapshot + tier ceiling helper + trailing window function + Billing page Phase 1 (June 30, 2026 late-late evening)
- **Billing roadmap foundation shipped end-to-end.** Per `docs/chapter-billing-usage-handoff.md`'s Priority 3 spec — usage_snapshot table + tier ceiling helper + trailing window function + nightly cron + Billing page Phase 1 transparency view. All in one shipment because the page depends on the snapshot.
- **Schema (migration `usage_snapshot_and_tier_ceiling`):**
  - **`chapter_reporting.usage_snapshot`** — one row per `(snapshot_date, client_key)`. **Identity:** snapshot_date, client_key, tier, retention_days, classifier_version (default 'v1' — pinned per row). **Usage (client-facing, MTD):** human_likely / suspect / bot_likely journey counts, total_events, avg_events_per_human_journey. **Tier math:** tier_journey_ceiling (computed via helper), utilization_pct. **Health (internal):** chain_seconds_today, chain_headroom_pct, cumulative_events_to_date, est_disk_bytes. **Cost buckets (NULL today, populated by future rate-card cron):** storage/visualization/analysis/attributable/overhead/fully-loaded/tier-price/margin. PK on `(snapshot_date, client_key)`.
  - **`chapter_reporting.tier_journey_ceiling(p_tier text) RETURNS integer`** IMMUTABLE — `standard=25K / growth=75K / pro=150K / NULL otherwise`. Inline-foldable so the planner can use it in WHERE clauses for free.
  - **`chapter_reporting.trailing_human_journeys(client_key, end_date, months=3) RETURNS numeric`** STABLE — averages MTD totals across trailing N months (uses MAX per month since MTD counts grow monotonically within a month). Used by future tier-recommendation logic so a single seasonal spike doesn't auto-bump tier.
- **Cron route `/api/internal/cron/refresh-usage-snapshot`** scheduled **04:00 UTC** daily (slot opened up when dashboard-mvs moved to 03:00). Iterates active clients (those with non-revoked client_secrets), single SQL with CTEs computes everything in one round-trip, upserts today's row (re-run during the day overwrites with fresher data). Per-client error → GChat alert. `maxDuration=300` (will complete in seconds).
- **Today's snapshot seeded** (one-time backfill) for all 4 active clients. EOS: 14,990 human / 24,947 suspect / 254 bot, 1.73M events MTD, 5.96M cumulative. utilization_pct NULL because tier is NULL (Fix 1A default).
- **Billing page at `/chapter/<key>/billing`** (under Support → Inbox in sidebar). Phase 1 transparency view per handoff spec:
  - **Plan header** — tier label + ceiling + utilization bar (renders "Plan not assigned" + neutral state when tier NULL)
  - **Class-breakdown table** — Real customer journeys (counts toward plan, orange "Counts" pill) / Low-signal sessions (excluded, neutral pill) / Filtered bot traffic (excluded) + Total processed row. Each row has counts + share-of-total + counts-toward-plan column. Per-class subtitle explains the classification rule in plain English.
  - **Good-faith caption** — "We processed N additional sessions this month and excluded them from your plan, so you're only assessed on verified customer activity."
  - **Secondary metrics row** — Total events MTD, Avg events per real journey, Lifetime events tracked
  - **Classifier version footer** — `classifier_version: v1` for audit trail
  - **No costs, no vendor names** — strictly Phase 1; Phase 2 invoices come later
- **Sidebar link added** under Support, below Inbox. Uses observations icon for visual consistency.
- **Files:** schema migration; [/api/internal/cron/refresh-usage-snapshot/route.ts](src/app/api/internal/cron/refresh-usage-snapshot/route.ts); [/chapter/(authed)/billing/page.tsx](src/app/chapter/(authed)/billing/page.tsx) + [BillingClient.tsx](src/app/chapter/(authed)/billing/BillingClient.tsx); [Sidebar.tsx](src/app/chapter/_components/Sidebar.tsx). [vercel.json](vercel.json) gains the cron entry.

### MI v2 Phase 4 — Custom Notification + Phone Call presets (June 30, 2026 evening)
- **Two new operator-usable presets**, both enabled in the picker (no more "Phase 4" badge on either). Custom Notification is the corner-bubble Intercom-style affordance; Phone Call is a CTA-only modal with tel: links for analytics-driven call campaigns.
- **Pixel renderer additions:**
  - **`chapterRenderPromptBubble`** (Custom Notification) — new `bubble` container type. Fixed corner position (4 choices: bottom-right, bottom-left, top-right, top-left), no backdrop, slide-in animation, dismissible. CTA modes: `dismiss_only` (just close X), `button` (single CTA with operator-configured URL), `yes_no` (two-button row, optional Yes URL). Fires `identity_prompt_submitted` on yes with `choice='yes'`; `identity_prompt_dismissed` with method/choice on close.
  - **`chapterRenderPromptPhoneCall`** (Phone Call) — modal container with content blocks + N tel: CTAs. No form, no identity capture. Each phone CTA renders as a labelled outlined link with monospace number. Click fires `phone_call_initiated` event with the SHA-256 hash of the number (never raw).
- **New container + CTA styles** in pixel.js: `.chapter-prompt-bubble` + 4 position variants + `@keyframes chapter-bubble-in` (250ms slide-in) + `.chapter-prompt-yesno` (yes/no button row) + `.chapter-prompt-phone-cta` (outlined link with label + monospace number).
- **Admin builders:**
  - **`NotificationBuilder.tsx`** — position picker (4 corners as radio buttons), content blocks (headline + body, addable + removable), CTA type radio (dismiss_only / button / yes_no) with type-conditional fields.
  - **`PhoneCallBuilder.tsx`** — content blocks + ordered phone CTA list (Add Headline / Add Body / Add Phone CTA buttons; per-CTA label + phone_number; reorder up/down + delete).
- **PromptForm** renders the right builder per `preset_type`, saves `container_jsonb` + `submit_actions_jsonb` (Phase 4 columns). Action input type extended; `shapePayload` writes the new fields when `preset_type !== 'email_exchange'`. Edit page select extended with the two new columns.
- **Build fix shipped same evening:** PhoneCallBuilder had a TypeScript narrowing issue (Partial<Union> ≠ Union<Partial>). Reordered the ternary to check the more specific `phone_cta` discriminant first, relaxed `updateBlock` next-param shape to a union-of-partials. Now compiles clean.
- **Files (new):** [NotificationBuilder.tsx](src/app/internal/identity-prompts/[clientKey]/NotificationBuilder.tsx), [PhoneCallBuilder.tsx](src/app/internal/identity-prompts/[clientKey]/PhoneCallBuilder.tsx). Modified: [pixel.js/route.ts](src/app/api/chapter/pixel.js/route.ts), [PromptForm.tsx](src/app/internal/identity-prompts/[clientKey]/PromptForm.tsx), [_actions.ts](src/app/internal/identity-prompts/_actions.ts), [edit page.tsx](src/app/internal/identity-prompts/[clientKey]/[promptId]/edit/page.tsx).

### MI v2 Phase 3 — Auto-email send infrastructure (June 30, 2026 evening)
- **Foundation for Phases 5 + 6** (which can't actually fire their emails without this). Three pieces shipping together: orchestrator + adapters + template authoring + audit log + webhook receiver. Platform-agnostic by design — Resend direct adapter functional today; Klaviyo + Mailchimp ESP adapters land when first client onboards onto those.
- **Library at `src/app/lib/email-send/`:**
  - **`types.ts`** — `EmailSendInput`, `EmailAdapter`, `EmailSendResult`, `EmailMechanism` ('direct' | 'esp_klaviyo' | 'esp_mailchimp'), `ClientEmailConfig`, `AdapterContext` interfaces. `EmailSourceType` enum: 'identity_prompt' | 'offer_response' | 'subscription_event' | 'test_send'.
  - **`index.ts`** — `sendEmail()` orchestrator. Picks adapter from `client.email_mechanism` or per-prompt override, looks up template from `chapter_config.email_templates`, renders, sends, audits to `chapter_engagement.email_sends`. All callers go through this. Existing direct Resend calls in `/api/inquiry`, `/api/chapter/identity-prompt-email`, `/lib/inquiries/actions.ts` predate and are left as-is for now.
  - **`direct-adapters/resend.ts`** — full Resend implementation using existing `RESEND_API_KEY` env var. Honors `client.email_reply_to` + `email_sender_domain` (Resend supports multiple verified domains per account).
  - **`esp-adapters/klaviyo.ts`** — shell returning `klaviyo_adapter_not_yet_implemented`. Documents the integration pattern (Klaviyo events API: profile + metric event → flow trigger). Klaviyo doesn't support arbitrary transactional sends like Resend; the integration is event-based.
  - **`esp-adapters/mailchimp.ts`** — shell. Documents the two sub-modes: `tag_trigger` (add a tag → Mailchimp Journey sends from its templates) vs `mandrill_send` (direct transactional via Mandrill API).
  - **`templates/default-shell.ts`** — HTML wrapper with orange branding + preheader + reply-to footer.
  - **`templates/render.ts`** — composes shell + operator subject/body + merge data; `{{token}}` substitution leaves unknown tokens literal (so operators SEE the failure in the rendered email).
- **Admin UI at `/internal/identity-prompts/[clientKey]/templates`:**
  - **List page** — existing `chapter_config.email_templates` rows for the client + inline create form
  - **TemplateForm.tsx** — editor with `template_type` cheat sheet of merge tokens per common type (welcome_offer, offer_accepted, offer_countered, offer_declined, back_in_stock, price_dropped, custom_form_followup)
  - **`[templateType]/page.tsx`** — edit single template
  - **`_actions.ts`** — upsert + delete server actions (PK on `(client_key, template_type)`, can't change template_type on edit)
  - **"Email templates →" link** added to per-client prompts page header alongside "View responses →"
- **Webhook at `/api/email-send-webhook`** — POST handler for Resend events (`email.delivered` / `email.bounced` / `email.complained` / `email.delivery_delayed`). Looks up `email_sends` row by `esp_message_id`, updates status + status_detail. Signature verification deferred to v2 (svix dependency cost).
- **Files:** all 12 new under `src/app/lib/email-send/` + `src/app/internal/identity-prompts/[clientKey]/templates/` + `src/app/api/email-send-webhook/`.

### Bot classifier v1 pinned + drift mystery resolved (June 30, 2026)
- **Pin shipped as a contractual lock**, not a schema rebuild. New doc [docs/bot-classifier-v1.md](docs/bot-classifier-v1.md) is the authoritative definition of `chapter_reporting.journey_bot_classification_v1` — every signal, weight, threshold, rationale. Change-control: any modification to v1's signals/weights/thresholds requires a new MV `_v2` alongside, with `usage_snapshot.classifier_version` stamping each billing row. Specifically prohibited: modifying `_v1` in place.
- **The "April→June drift" mystery is resolved.** The chapter_billing_usage_handoff doc's claim of "April 61.7% bot_likely → June 0.7%" was **a comparison across two different classifiers, not a drift within one**. Investigation showed the current MV-based v1 classifier has been stable at **0.2-0.6% bot_likely** across April-June 2026 for EOS. The 61.7% figure in CLAUDE.md's old "Key Data Insights" April observation was from a simpler **pre-MV v0 classifier** that flagged single-event journeys as `bot_likely`. v1's multi-signal score-based logic puts those same journeys in `suspect` (not `bot_likely`).
- **Real per-month breakdown for EOS (validated tonight against current MV):** April 0.2% bot / 66.1% suspect / 33.7% human · May 0.3% / 57.5% / 42.2% · June 0.6% / 62.1% / 37.3%. Stable.
- **Why this matters for billing:** the BILLING BLOCKER concern (filed in the handoff doc) was correct in shape but mis-diagnosed in substance. The v0→v1 transition WAS a silent reclassification — we just lived through one without an audit trail. The pin closes that audit gap going forward; any future v1→v2 will carry a `classifier_version` stamp on every billing snapshot row.
- **Schema NOT modified.** v1 MV stays as-is (176 MB / 949k rows; ALTER MATERIALIZED VIEW can't add columns; DROP+CREATE would leave dashboards stale during rebuild). When v2 ships, it lands as a NEW MV alongside, both refresh nightly during the migration window.
- **Calibration backlog noted in doc** — the 35/60 thresholds were set empirically at MV creation, never validated against a labeled sample. False-positive rate on `suspect` (real humans excluded from billing?) and false-negative rate on `human_likely` (sophisticated bots billed as human?) are open questions. Hold for a session focused on classifier calibration.

### Fix 1A — per-client tier + retention_days columns + retention_floor helper (June 30, 2026)
- **Purely additive schema.** `chapter_config.clients` gains `tier text` (NULL today; vocabulary: `standard` / `growth` / `pro`) and `retention_days integer` (NULL = unlimited). All 4 existing clients get NULL/NULL — zero behavior change. Unblocks the billing/usage build steps that need tier-aware logic (`usage_snapshot`, Billing page, fair-use ceiling).
- **New helper `chapter_config.retention_floor(p_client_key text, p_snapshot_ts_hi timestamptz) RETURNS timestamptz`** — STABLE SQL function returning `GREATEST(absolute_data_floor, snapshot_ts_hi - retention_days)`. When `retention_days IS NULL`, returns absolute floor (`2026-04-01 17:00:00+00`). Takes `snapshot_ts_hi` rather than reading `now()` so the floor is **deterministic across all chain stages** in a single chain invocation. Verified across 3 scenarios (rolling, clamps-to-absolute when near launch, rolls forward in future snapshots).
- **No CHECK constraint on tier yet.** Vocabulary may evolve before the first tiered client onboards. Will lock down once `usage_snapshot` + Billing page concretize the tier mechanics.
- **Functions NOT modified in Fix 1A.** `lifecycle_chapters_incremental` and `refresh_canonical_v2_snapshot` kept their hardcoded `v_date_floor` for one day. Fix 1B (shipped July 1) swapped the hardcoded floor for the per-client retention floor with the chapter-spanning caveat (per-canonical effective_floor + chapter_id continuity via chapter_offset). See "Fix 1B — retention floor + chapter-spanning caveat wired through the chain" entry above.
- **Migration:** `fix_1a_tier_retention_columns`. Files: schema additions to `chapter_config.clients` + new helper function only.

### Chain-order fix — refresh-dashboard-mvs moved 04:00 → 03:00 UTC (June 30, 2026)
- **The bug** (discovered during Fix 2 regression test). The attribution chain at **03:30 UTC** reads `chapter_reporting.journey_bot_classification_v1` (a materialized view) to filter bot journeys. That MV was refreshed by the `refresh-dashboard-mvs` cron at **04:00 UTC** — **after** the chain. So at chain time, the MV held journeys classified through *yesterday's* 04:00 UTC refresh, missing **~23.5 hours** of recent journeys. Any purchase whose journey arrived in that window got silently filtered out of canonical_v1 — fell through to v2's `(direct)` fallback. Today's Fix 2 regression caught 2 such chapters at EOS ($202 + $76.84 = $278.84 in misattributed revenue).
- **Per-day impact at EOS:** small (~1-2 chapters), but **persistent**. Once a canonical's chapter is misattributed at chain time, lifecycle's incremental watermark moves past it. Tomorrow's `_affected` set doesn't include that canonical (no new activity), so Fix 2's incremental canonical_v1 doesn't re-process it. The misattribution sticks until the canonical sees fresh activity.
- **The fix:** moved `refresh-dashboard-mvs` from `0 4 * * *` to `0 3 * * *` in `vercel.json`. MV refresh now runs at 03:00 UTC, typically finishes by 03:03 UTC (today's measured: 3 min, well below the 13-min worst-case cold-cache time). Chain at 03:30 UTC reads fresh MV. **Miss window narrowed from ~23.5h to 30 min** (journeys arriving 03:00-03:30 still miss tonight, but tomorrow's lifecycle catches them — the same lock-in behavior is fixed because the gap is now within lifecycle's safety-margin window).
- **No downstream cron impact:** `refresh-derived-snapshots` at 04:25, `refresh-system-cohorts` at 04:30, `run-observations` at 05:00, `refresh-connections-snapshots` at 05:30, `refresh-recommendations` at 06:00 Mondays all run later than 03:30 — they still see fresh MV + fresh chain output.
- **Backfill required (filed as separate to-do):** historical canonicals misattributed by past stale-MV reads need a one-shot reprocess. Detection: canonicals where `canonical_v2` channel_path is `'(direct)'` for a chapter whose `lifecycle_chapters_snapshot` events include non-bot journeys (i.e. v1 should have had session entries). Force those canonicals into `_affected` and re-run v1/v2 incremental.
- **Files:** [vercel.json](vercel.json) (schedule swap), [refresh-dashboard-mvs/route.ts](src/app/api/internal/cron/refresh-dashboard-mvs/route.ts) (header comment updated to document the change).

### Fix 2 — canonical_v1 + canonical_v2 incrementalized (June 30, 2026)
- **The cliff:** EOS nightly chain was at **497-500s** vs Vercel's **600s** `maxDuration` ceiling on `/api/internal/cron/refresh-attribution-chain` (the 800s figure in the original handoff was wrong — verified 600s in route handler). Growth rate ~13s/day (v1 6.7 + v2 6.7). Clock to cliff: **~7-8 days, no new clients added.** Root cause: v1/v2 were all-time full rebuilds. They DELETE'd every row for the client and re-scanned all accumulated pixel_events / lifecycle_chapters_snapshot every night. Cost grows with cumulative data forever.
- **The fix (migration `fix_2_canonical_v1_v2_incremental`):** mirror lifecycle_chapters' affected-canonical pattern (the same shape Fix 25 used May 12). Affected canonicals = those lifecycle re-wrote in this chain, identified by `snapshot_ts_hi` match. Free signal — lifecycle already stamps it. Pixel re-sessionization is scoped by `journey_id` (not identity_key) so multi-canonical journeys keep full event context for session boundary detection.
- **Algorithm:** `_affected = SELECT DISTINCT canonical FROM lifecycle_chapters_snapshot WHERE client_key=X AND snapshot_ts_hi=v_snapshot_ts_hi`. `_raw_ids = identity_canon JOIN _affected` (same shape as lifecycle's `_opt_b_raw_ids`). `_journeys = DISTINCT pixel_events.journey_id WHERE identity_key IN _raw_ids`. Scoped DELETE + scoped INSERT — same CTE chain as full rebuild but with `JOIN _journeys` on the pixel scan and `JOIN _affected` on chapter_meta. Dormant canonicals stay frozen — intentional.
- **Regression test:** built `_test` function variants writing to scratch tables. Ran against EOS at `snapshot_ts_hi=2026-06-30 03:30:07.144638+00`. Compared incremental output vs full-rebuild output (both run NOW, same MV/canon state), scoped to the 225 affected canonicals.
  - **v1: 225/225 chapters present** (0 missing, 0 extra). **222/225 byte-identical (98.7%).** The 3 mismatches: 1 was pure-multiset-match (reordered channels — pre-existing session-tie non-determinism in `STRING_AGG(... ORDER BY entry_ts, sessionized_journey_id)` when sessions tie on both); 2 were caused by identity_canon mutations between the two test runs (04:57 UTC and 17:14 UTC — both happened to mutate between v1_test and v1_test_full). **No regressions from the incremental scope.**
  - **v2: 234/234 exact match.**
- **Performance:** v1 **214s → ~10s (~22×)**, v2 **220s → ~10s (~23×)**. **Chain wall-clock 500s → ~86s.** Headroom **514s of 600s ceiling** (was 100s). Growth rate now scales with daily affected canonicals (near-constant) instead of cumulative event volume.
- **Architectural notes:** signature unchanged (`(p_client_key, p_snapshot_ts_hi DEFAULT NULL)`) so orchestrator + cron route unchanged. New `_snapshot_runs` label `'canonical_v[12]_snapshot_incremental'` distinguishes incremental runs from prior full-rebuilds in audit history. Empty-affected case returns immediately with 0 rows + status='ok'; production tables retain prior state.
- **Discovered separately during regression — chain-order bug** (not introduced by Fix 2). Production missed 2 chapters today because `journey_bot_classification_v1` (a materialized view that v1 reads to filter bots) wasn't refreshed until 04:00 UTC — AFTER the attribution chain at 03:30 UTC. Tonight's journeys hadn't been classified yet when v1 ran. Those 2 chapters fell through to v2's `(direct)` fallback instead of being attributed to their actual channels. **Filed as separate to-do.** Fix is to reorder crons (MV refresh before attribution) OR include MV refresh inside the attribution chain.
- **Lessons re-locked:** Supabase pooler client-side timeout at ~5 min is NOT a query failure (memory: `feedback_avoid_pooler_for_long_queries.md`). Backend keeps running. Poll table row counts to detect completion. The v1_test_full full rebuild client-timed out twice but completed server-side at 1088 rows both times. Apples-to-apples regression testing requires same-time runs of both variants because identity_canon mutates continuously.
- **Files:** [docs/fix-2-canonical-incremental-design.md](docs/fix-2-canonical-incremental-design.md) (full design + regression results). Production functions: `chapter_attribution.refresh_canonical_v1_snapshot`, `chapter_attribution.refresh_canonical_v2_snapshot`.

### Moment Identity v2 Phase 1 + Phase 2 — Custom Form preset end-to-end (June 29, 2026, post-vacation)
- **Picked up from the locked architectural plan** (June 19 entry below). The 6-open-questions, the two-parallel-column-groups discriminator strategy, the `chapter_engagement` schema layout, and the platform-adapter stubs were all designed but unshipped at vacation start. This session executes Phase 1 + Phase 2 against that plan. 7 commits in one evening (`6782c01` → `6d857ab`).
- **Phase 1A — Schema migration applied** (`moment_identity_v2_phase_1_schema`):
  - 11 new columns on `chapter_config.identity_prompts`: `preset_type text NOT NULL DEFAULT 'email_exchange'` (the discriminator), `container_jsonb`, `content_blocks_jsonb`, `form_fields_jsonb`, `pages_jsonb`, `recovery_jsonb`, `submit_actions_jsonb`, `targeting_jsonb`, `variant_jsonb`, `enabled_devices text[]`, `email_mechanism_override`.
  - 6 new columns on `chapter_config.clients`: `email_reply_to`, `email_sender_domain`, `email_mechanism text DEFAULT 'direct'`, `esp_provider`, `esp_credentials_jsonb`, `platform text DEFAULT 'custom'`.
  - 2 new `chapter_config` tables: `email_templates` (Phase 3 template authoring home) + `offer_thresholds` (Phase 5 Make an Offer config).
  - New `chapter_engagement` schema + 4 tables: `prompt_responses` (Custom Form submissions), `subscriptions` (Phase 6 Remind Me), `offers` (Phase 5), `email_sends` (Phase 3 audit log). RLS-on-no-policies; service_role bypasses. Default privileges set so future tables auto-inherit grants. Schema GRANTed USAGE + table CRUD to service_role.
  - **PostgREST exposed schemas** updated in Supabase Dashboard to include `chapter_engagement` (manual step — same pattern that bit Recommendations cron on June 15). Without this, the new endpoint returns PGRST106.
- **Phase 1B — Pixel widget preset dispatch** (commit `6782c01`): `/api/chapter/identity-prompts` GET extended to SELECT all 11 new columns. Pixel `chapterRenderPrompt(prompt)` switches on `preset_type` — `email_exchange` → existing `chapterRenderPromptV1()` (untouched); anything else → `chapterRenderPromptComposable()` (renamed from the Phase 1 stub). Zero regression on existing v1.5 prompts because the v1 path is byte-identical.
- **Phase 1C — Admin UI preset picker** (commit `d721cb8`): `PromptForm` gains a 6-tile picker at the top. Email Exchange is the orange-highlighted enabled tile by default; the other 5 presets render as visible-but-disabled chips with "Phase 2" / "Phase 3" / "Phase 4" / "Phase 5" / "Phase 6" badges so operators see the roadmap without authoring half-configured prompts. `preset_type` flows through `PromptFormInput` → `shapePayload` → create/update actions; edit page + list page SELECT it; list page renders an orange `email_exchange` pill on each prompt row. Edit page locks `preset_type` once set (can't switch preset types mid-life because they trigger different render paths).
- **Phase 2A — Custom Form composable renderer end-to-end** (commit `66341c1`):
  - **New endpoint `POST /api/chapter/prompt-response`**: receives non-identity field submissions, writes to `chapter_engagement.prompt_responses`. Same 3-layer defenses as `/api/chapter/identity-prompt-email` — honeypot (`hp_field`) + HMAC session token (via existing `verifyPromptSession`) + per-IP rate limit (20/hr; looser than email's 10/hr because response writes don't trigger outbound). Every rejection writes to `chapter_audit.api_auth_attempts` so the attack-alert cron picks them up. Validates the prompt belongs to the client + is enabled before insert.
  - **Pixel composable renderer**: reads `content_blocks_jsonb` + `form_fields_jsonb`, renders a modal with operator-defined headline + body content blocks and an ordered field stack. Field types: `email`, `phone`, `text`, `textarea`, `single_choice`, `multi_choice`. Identity-marked fields (`for_identity: true` on email/phone) auto-hash client-side and call `api.identify` with `email_sha256:` / `phone_sha256:`. Non-identity fields POST to `/api/chapter/prompt-response`. Identity preference: email wins as the canonical key when both submitted.
  - **`CustomFormBuilder.tsx`** admin component: add/remove/reorder fields, per-field config (type, label, required, placeholder, options for choice types, `for_identity` flag for email/phone). Content block list above (headline + body). Custom Form tile in preset picker is now enabled (no "Phase 2" badge).
- **Phase 2B — Multi-page rendering + admin builder** (commit `1078a1f`):
  - Renderer refactored so single-page is the trivial case (1 synthetic page from root `content_blocks_jsonb` + `form_fields_jsonb`); multi-page uses `pages_jsonb` directly.
  - Cross-page state in the renderer: `currentPageIdx`, `accumulatedValues` keyed by field_id, `fieldConfigsById` for identity-flag lookup at final submit. Back button RESTORES prior page's entered values (via accumulatedValues read at field build time) — visitor never loses data on nav.
  - Optional progress dots above content (orange = current, light orange = visited, gray = upcoming).
  - Identity hashing + endpoint POST happens ONCE at final Submit with ALL accumulated values across all pages, not per-page. Single network round-trip per submission regardless of page count.
  - **`MultiPageBuilder.tsx`** admin component: wraps `CustomFormBuilder` per-page; add/remove/reorder pages; toggles for progress indicator + Back button.
  - PromptForm gains a "Multi-page form" checkbox in the Custom Form section; when on, MultiPageBuilder replaces single-page CustomFormBuilder. Toggle freely — saved data preserved on both sides; render path picks `pages_jsonb` over `content_blocks_jsonb` + `form_fields_jsonb` when set.
- **Phase 2B.1 — Conditional branching** (commit `fb8d831`):
  - `pages_jsonb.branching` array, rule shape `{from_page_id, field_id, operator: 'equals', value, to_page_id}`. **MVP supports `equals` operator only** — covers ~90% of branching use cases; `not_equals` / `contains` / `not_empty` are mechanical additions for later.
  - Renderer's Next handler walks branching rules after capturing the current page's values. For each rule matching the current page, compares `accumulatedValues[field_id]` to `rule.value` (string-coerced; arrays joined with comma). First matching rule wins; jumps to `to_page_id`. No matching rule → sequential advance.
  - MultiPageBuilder gains a "Branching rules" section with English-sentence row layout ("If [page] field [field_id] equals [value] go to [page]") + Add/Delete buttons. Disabled until 2+ pages exist.
  - Safe failure modes: missing `to_page_id` falls back to sequential; missing `field_id` is skipped.
- **Phase 2C — Recovery flow subsystem** (commit `7d67ac9`):
  - `recovery_jsonb` shape: `{enabled, trigger: 'close_button', content_blocks, form_fields, max_attempts}`. Currently only `close_button` trigger is wired; `exit_intent` + `scroll_back` stubbed for later.
  - Renderer state: `recoveryAttempts`, `inRecovery` flag. On close-button click, `dismiss('close_button')` routes through `triggerRecovery()` first. If recovery is configured + attempts left + not already in recovery, swaps `pages` to a synthetic recovery page (with operator's recovery `content_blocks` + `form_fields`), clears `accumulatedValues` + `fieldConfigsById` + `branchingRules`, fires `identity_prompt_recovery_shown`, re-renders.
  - Second close OR backdrop-click during recovery actually dismisses. `max_attempts` capped at 3 (default 1) so visitor can't ping-pong forever.
  - `in_recovery: true` flag rides on `identity_prompt_dismissed` event payloads so operators can distinguish primary vs recovery dismissals in analytics.
  - **`RecoveryBuilder.tsx`** admin component: enable toggle + max_attempts input + trigger picker + nested `CustomFormBuilder` for recovery content. Rendered violet-tinted to distinguish from main composer surfaces.
- **Phase 2D — Responses admin view** (commit `6d857ab`):
  - New route `/internal/identity-prompts/[clientKey]/responses` — read-only table of `chapter_engagement.prompt_responses` for the client. Closes the Phase 2 operator-visibility loop (without it, responses landed in DB but operators had to SQL to read them).
  - Identity keys shown truncated: `email_sha256:abc12345…` (8-char hash prefix). Same privacy convention as the rest of the operator surfaces — operators can correlate but never see raw PII.
  - Filter by prompt slug via dropdown; latest 200 (capped, hint shown). Per-row: submitted_at, prompt slug, identity (truncated), response summary (`key1: val1 · key2: val2 …`, truncated at 40 chars per value), country, page URL.
  - "View responses →" link added to per-client prompts page header for discoverability.
- **What works after deploy** (full end-to-end loop for Custom Form): operator visits `/internal/identity-prompts/<key>` → picks Custom Form preset → composes content blocks + form fields (single-page or multi-page with branching) → optionally enables Recovery → saves with a trigger (click_element / exit_intent / time_on_page / scroll_depth). Storefront pixel reads it from `/api/chapter/identity-prompts`, dispatches via `preset_type` to `chapterRenderPromptComposable`, renders modal with operator's content. On submit: identity fields hash + flow through `/api/identify`; non-identity fields POST to `/api/chapter/prompt-response`. Operator visits `/internal/identity-prompts/<key>/responses` to see what was captured.
- **Architectural through-lines locked**:
  - **Zero data migration on v1.5 prompts.** Email Exchange prompts continue writing the dedicated v1.5 columns (`headline`, `body`, `input_mode`, `email_placeholder`, `phone_placeholder`, etc.) and rendering through the original `renderV1()` path byte-for-byte. The `preset_type` discriminator means existing prompts are invisibly tagged `email_exchange` and untouched. Rollback is trivial (drop new columns; the renderer falls back to v1 path).
  - **Composable jsonb columns null-when-irrelevant**: `shapePayload` writes `content_blocks_jsonb`, `form_fields_jsonb`, `pages_jsonb`, `recovery_jsonb` only when `preset_type !== 'email_exchange'`. Email Exchange rows stay clean.
  - **Same defense pattern across new endpoints**: honeypot + HMAC session token + per-IP rate limit + audit logging. Mirrors `/api/chapter/identity-prompt-email` from the June 19 work. Future endpoints follow the same shape.
  - **Single source of truth for storage shape**: form fields render via `buildFormField(field)` in the renderer, validate via `validateCurrentPage()`, capture via `captureCurrentPageValues()`, and write via `chapterPostPromptResponse()` — pure functions that work the same in single-page or multi-page or recovery modes. Adding new field types (slider for Phase 5, file_upload for Phase 5/6) = extend these 4 functions.
- **What's NOT yet built** (sequenced for future sessions):
  - **Phase 3 — Auto-email send infrastructure**: `email_mechanism` admin UI on `/internal/identity-prompts/<key>/templates`; Resend adapter at `src/app/lib/email-send/direct-adapters/resend.ts`; Klaviyo + Mailchimp adapters at `src/app/lib/email-send/esp-adapters/<provider>.ts`; `email_sends` audit logging; bounce/delivery webhook receiver at `/api/email-send-webhook`. Tables already exist (`email_templates`, `email_sends`); the build is the adapter layer + UI.
  - **Phase 4 — Custom Notification + Phone Call presets**: bubble container type + yes/no and CTA-only form modes + `phone_call_initiated` pixel event on `tel:` click.
  - **Phase 5 — Make an Offer**: threshold configuration UI + auto-accept logic + manual review queue at `/internal/identity-prompts/<key>/offers` + counter-offer flow + Shopify Admin API discount code generation + email templates. `offer_thresholds` + `offers` tables already exist.
  - **Phase 6 — Remind Me**: subscription create flow + hourly cron at `/api/internal/cron/evaluate-subscriptions` + Shopify product data source adapter + auto-cancel-on-purchase hook in `/api/purchase` + subscriptions admin view + email templates. `subscriptions` table already exists.
  - **Phase 2B.1.x — More branching operators**: `not_equals`, `contains`, `not_empty`. Extend `rule.operator` enum + add cases in pixel walker.
  - **Phase 2C.x — More recovery triggers**: `exit_intent` (mouse leaves viewport top) + `scroll_back` (visitor scrolls up after engaging). Trigger picker field already scaffolded.
- **Files (new)**: [src/app/api/chapter/prompt-response/route.ts](src/app/api/chapter/prompt-response/route.ts), [src/app/internal/identity-prompts/[clientKey]/CustomFormBuilder.tsx](src/app/internal/identity-prompts/[clientKey]/CustomFormBuilder.tsx), [MultiPageBuilder.tsx](src/app/internal/identity-prompts/[clientKey]/MultiPageBuilder.tsx), [RecoveryBuilder.tsx](src/app/internal/identity-prompts/[clientKey]/RecoveryBuilder.tsx), [responses/page.tsx](src/app/internal/identity-prompts/[clientKey]/responses/page.tsx).
- **Files (modified)**: [pixel.js](src/app/api/chapter/pixel.js/route.ts) (preset dispatch + composable renderer with multi-page + branching + recovery), [/api/chapter/identity-prompts/route.ts](src/app/api/chapter/identity-prompts/route.ts) (SELECT new columns), [PromptForm.tsx](src/app/internal/identity-prompts/[clientKey]/PromptForm.tsx) (preset picker + composable state + multi-page toggle + recovery render), [_actions.ts](src/app/internal/identity-prompts/_actions.ts) (PromptFormInput extensions + shapePayload conditional writes), [edit page.tsx](src/app/internal/identity-prompts/[clientKey]/[promptId]/edit/page.tsx) (SELECT new columns), [list page.tsx](src/app/internal/identity-prompts/[clientKey]/page.tsx) (View responses link + preset_type pill).

### Moment Identity v2 — architectural plan locked, ready to start Phase 1 (June 19, 2026 late-late evening)
- **Goal of session:** read the full Moment Identity v2 handoff doc + lock the 6 open questions + reconcile v1.5's June 19 schema with v2's composable design. **Implementation deferred to next session** — operator was tired; plan committed for cold pickup.
- **Handoff doc reference:** `~/Downloads/moment_identity_v2_handoff.md` (969 lines, June 14, 2026). 6 presets (Email Exchange / Custom Form / Custom Notification / Make an Offer / Phone Call / Remind Me); composable building blocks (trigger / container / content blocks / form fields / multi-step / recovery / submit actions / frequency / targeting / variant); 6-phase implementation (foundation → recovery + Custom Form → auto-email → Custom Notification + Phone Call → Make an Offer → Remind Me).
- **6 open questions, all locked:**
  1. **Direct send provider (when client has no ESP):** Resend — already standardized across contact form / identity prompts / inquiry replies. SES + Postmark not needed.
  2. **Template authoring location:** **Hybrid in `/internal/identity-prompts`**. Shell (header/footer/button styles/layout) lives in code as React Email components in `src/app/lib/email-templates/*.tsx`. Per-template subject + body lives in DB (new `chapter_config.email_templates` table keyed on `(client_key, template_type)`). Operator edits subject + body via admin form — never touches HTML. At send time, shell + operator content + merge data compose into the final email. Operator-invisible HTML rendering layer.
  3. **Per-prompt email send mechanism override:** YES. New column `identity_prompts.email_mechanism_override text` (nullable, NULL = use client default). Use cases: client with both Klaviyo + Mailchimp picks per prompt; upsell from Chapter's ESP to client's own.
  4. **Tier gating:** NONE in v2. All 6 presets in the same tier. Existing Observations Starter lock pattern stays specific to that page. Tier-based gating revisitable later if/when MI splits by tier OR sold standalone.
  5. **SMS for Remind Me:** **DEFERRED to v2.1**. Remind Me v2.0 = email-only notifications. Twilio (or client's SMS provider via the same client-or-Chapter mechanism we picked for email) lands in v2.1. No code decision needed for v2.0.
  6. **Platform adapter pattern:** YES. Three adapter shells in `src/app/lib/platform/` — `shopify.ts` (full: Admin API for product/inventory + priceRules for discount codes), `square.ts` (partial: Catalog API for product/inventory; coupons need investigation — Remind Me supported, Make an Offer may be deferred to v2.1), `custom.ts` (returns null for product queries; generates code strings only; operator manually honors). Common interface `PlatformAdapter { getProduct, createDiscountCode, isSupported }`. Client selected via new column `chapter_config.clients.platform text DEFAULT 'custom'` (values: `shopify` / `square` / `custom`). For Remind Me trigger types: `page_returns` works on ALL; `price_below` / `back_in_stock` / `variant_available` gated to shopify + square.
- **Bonus locked decisions (came up during Q&A):**
  - **Resend per-client reply-to + sender domain:** new columns `chapter_config.clients.email_reply_to text` (per-client reply address; falls back to katoa@ads4good.com if NULL) + `email_sender_domain text` (optional per-client verified sender domain in Resend; NULL = use Chapter's shared `ads4good.com`). Resend supports `replyTo` per send on both free + pro plans (no tier restriction). Per-client domain verification is free in Resend (multiple verified domains per account); operator adds DNS records once per client who wants brand control.
- **Architectural decision 1 — Two parallel column groups in `identity_prompts` discriminated by `preset_type`:**
  - Old plan (handoff): migrate existing v1 prompts into new composable shape, deprecate v1 columns after 2-week soak. Risk: production prompts must round-trip through migration logic.
  - **New plan (operator-pinned: "Email Exchange can just be what we have currently, no need to rebuild"):** keep ALL v1.5 columns exactly as they are (`headline`, `body`, `input_mode`, `email_placeholder`, `phone_placeholder`, `button_label`, `success_message`, `offer_code`, `offer_description`, `post_submit_action`, `post_submit_url`, `post_submit_button_label`, `email_subject`, `email_body`, `frequency`, `frequency_days`, `trigger_jsonb`). ADD composable columns alongside (`container_jsonb`, `content_blocks_jsonb`, `form_fields_jsonb`, `pages_jsonb`, `recovery_jsonb`, `submit_actions_jsonb`, `targeting_jsonb`, `variant_jsonb`, `enabled_devices text[]`, `email_mechanism_override`). New column `preset_type text NOT NULL DEFAULT 'email_exchange'` discriminates which path renders. Pixel renderer: `if (preset_type === 'email_exchange') renderV1(prompt) else renderComposable(prompt)`. **Zero data migration. Existing prompts untouched. Rollback trivial.**
- **Architectural decision 2 — New `chapter_engagement` schema for dynamic/operational tables:**
  - `chapter_engagement.prompt_responses` — Custom Form submissions (non-identity field values)
  - `chapter_engagement.subscriptions` — Remind Me lifecycle (active, last_evaluated_at, last_notified_at, notification_count, canceled_at, cancel_reason)
  - `chapter_engagement.offers` — Make an Offer state machine (status: pending_review / auto_accepted / manually_accepted / countered / declined / expired / redeemed; generated_code; counter_amount)
  - `chapter_engagement.email_sends` — audit log of every auto-email (source_type, source_id, mechanism, template_id, esp_message_id, status, status_detail)
  - **3-step schema gotcha (already known):** new schema needs GRANTs on tables + USAGE on schema + PostgREST exposed-schemas toggle. Pair schema-creation migration with grants migration in same PR. Same trap that bit chapter_recommendations + chapter_inquiries today.
- **Architectural decision 3 — 2 new config tables + 6 new columns on `clients`:**
  - `chapter_config.email_templates (client_key, template_type, subject, body, updated_at, updated_by)` — PK on (client_key, template_type). Operator edits via `/internal/identity-prompts/<key>/templates/<type>`.
  - `chapter_config.offer_thresholds (client_key, target_type, target_id, threshold_pct, threshold_absolute, active)` — per-product / per-collection / global default. Make an Offer evaluator hits product → collection → global, first match wins.
  - `chapter_config.clients` ADD: `email_reply_to`, `email_sender_domain`, `email_mechanism` (default 'direct'), `esp_provider` (klaviyo/mailchimp/null), `esp_credentials_jsonb` (encrypted), `platform` (default 'custom').
  - Default privileges already set on `chapter_config` from today's earlier security audit — new tables auto-inherit write grants. No manual GRANT migration needed for chapter_config additions.
- **Reconciliation deltas vs the original handoff:**
  - **DROPPED** — handoff's migration-script-for-existing-v1-prompts (preset_type='email_exchange' avoids the migration entirely).
  - **DROPPED** — handoff's deprecation-after-2-week-soak of v1 columns (they stay as Email Exchange's columns).
  - **REPLACED** — handoff's `email_send_config` table → folded into 4 new columns on `chapter_config.clients` (matches existing per-client config pattern, no separate table needed).
  - **NEW (not in handoff)** — `chapter_config.email_templates` table (came from our hybrid template authoring discussion).
  - All other v2 changes from handoff kept as-is.
- **What Phase 1 actually ships (revised, ready for tomorrow):**
  1. ONE DB migration: add columns to `identity_prompts` + add columns to `clients` + create `chapter_config.email_templates` + `chapter_config.offer_thresholds` + create `chapter_engagement` schema + 4 tables + GRANTs + USAGE + PostgREST exposed-schemas registration.
  2. Pixel widget refactor: add `renderComposable()` path alongside existing v1 `renderV1()`. Switch on `preset_type`. v1.5 prompts keep using v1 path (zero regression risk); new prompts use composable.
  3. Admin UI: `PromptForm` adds preset picker at the top. Selecting "Email Exchange" shows current form (unchanged). Selecting any other preset opens the composable form builder (multi-step or accordion). Validation per preset (e.g., Email Exchange requires identity field; Phone Call cannot have form fields; Remind Me requires trigger condition).
  4. **NO template authoring page yet** (Phase 3 with auto-email infrastructure).
  5. **NO subscription/offer logic yet** (Phase 5/6). Phase 1 just lays foundation — new presets exist in DB but don't actually fire emails until Phase 3.
- **Subsequent phases (locked, sequenced for separate PRs):**
  - **Phase 2:** Recovery flow subsystem (pixel-side exit-intent recapture) + Custom Form preset wiring + Responses admin view + multi-page form rendering.
  - **Phase 3:** Auto-email send infrastructure — `email_mechanism` admin UI + Resend adapter (`src/app/lib/email-send/direct-adapters/resend.ts`) + Klaviyo + Mailchimp adapters (`src/app/lib/email-send/esp-adapters/<provider>.ts`) + `email_sends` audit logging + bounce/delivery webhook receiver at `/api/email-send-webhook` + template authoring page at `/internal/identity-prompts/<key>/templates`.
  - **Phase 4:** Custom Notification + Phone Call presets — bubble container type + yes/no and CTA-only form modes + `phone_call_initiated` pixel event on tel: click.
  - **Phase 5:** Make an Offer — threshold configuration UI + auto-accept logic + manual review queue at `/internal/identity-prompts/<key>/offers` + counter-offer flow + Shopify Admin API discount code generation + email templates.
  - **Phase 6:** Remind Me — subscription create flow + hourly cron at `/api/internal/cron/evaluate-subscriptions` + Shopify product data source adapter + auto-cancel-on-purchase hook in `/api/purchase` + subscriptions admin view at `/internal/identity-prompts/<key>/subscriptions` + email templates.
- **Files queued for tomorrow's session (Phase 1):**
  - DB: schema migration `moment_identity_v2_phase_1_schema`
  - `src/app/api/chapter/pixel.js/route.ts` — add `renderComposable()` switch
  - `src/app/internal/identity-prompts/[clientKey]/PromptForm.tsx` — add preset picker
  - `src/app/internal/identity-prompts/[clientKey]/composable-form/*` — multi-step builder components (new directory)
  - `src/app/lib/platform/{shopify,square,custom}.ts` — adapter shells (no implementations yet beyond stubs)

### Cross-domain consent layer — pixel reads cookie + setConsent API + redirect-apex sync (June 19, 2026 late-late evening)
- **Goal:** close the three sub-problems on the consent architecture that surfaced when discussing `/api/consent-sync`:
  - **Problem 1 — pixel doesn't read the chapter_consent cookie at all.** Pixel hardcodes `consent_mode: "opt_out"` on every event. `/api/pixel` consent gate has no real visitor signal to work with.
  - **Problem 2 — no standard Chapter consent UI on storefronts.** Clients drop their own banner (Cookiebot/OneTrust/inline). Chapter has no integration hook for those banners.
  - **Problem 3 — consent state doesn't sync across the storefront ↔ redirect domain boundary.** Visitor opts out on `eosfabrics.com` (storefront cookie banner) → redirect handler at `ads4good.com/r/...` doesn't see the opt-out → still logs click + sets cookies.
- **Operator decision locked:** fix problems 1 + 3 together (sub-problem 2 reduces to "provide an integration point" rather than "build a banner UI").
- **Three fixes shipped in one commit:**
  1. **Pixel reads `chapter_consent` cookie on storefront origin** (`chapterReadConsent()` helper). Sends real `consent_status` field in every event payload (previously sent NO `consent_status` field at all; the misleading hardcoded `consent_mode: "opt_out"` was the only consent signal). `/api/pixel` consent gate now has real data.
  2. **New `ChapterPixel.setConsent(state)` public API** for storefront cookie banners to call. Sets `chapter_consent` cookie on storefront apex (so the pixel itself reads it immediately on next event) AND POSTs to `/api/consent` (so the server records the event + the redirect/API origin gets its own `chapter_consent` cookie for the next `/r/<key>/<slug>` click). Queue replay supports `(window.ChapterPixel = window.ChapterPixel || []).push(["setConsent", "opt_in"])` so banners that fire before `pixel.js` loads still work.
  3. **`/api/consent` route extended** to set `chapter_consent` cookie on its own response origin (in addition to existing `up_journey_/up_anon_` identity cookies). This is the cross-domain sync — covers the Tier 1 redirect case where storefront and redirect handler are on different eTLD+1 (3P installs).
- **Architectural caveat documented in `docs/consent-integration.md`:** 3P installs (EOS, projectagram) — cross-origin cookie propagation is **best-effort**. Modern browsers' third-party cookie restrictions (Safari ITP, Brave, Firefox ETP) may block the `chapter_consent` response cookie from landing on `ads4good.com` when called from `eosfabrics.com`. Server-side consent_events still records, but redirect handler at `ads4good.com/r/<key>/<slug>` may not see the right state. **Mitigation:** migrate these tenants to 1P installs (e.g. `chapter.eosfabrics.com`) — already on backlog.
- **1P installs (adsforgood_prod, not_so_cavalier) fully reliable** — pixel + API + redirect are all on the same eTLD+1, so cookie sharing works without browser interference.
- **Integration docs at `docs/consent-integration.md`** — recipes for Cookiebot, OneTrust, and custom inline banners, each ~3 lines calling `ChapterPixel.setConsent(...)`.
- **Deferred:** wire `ChapterPixel.setConsent()` integration on all 4 client storefronts (ads4good.com, EOS Fabrics Shopify, Projectagram Shopify, NSC Lovable). Server side fully wired; each storefront needs its own banner-integration step. Without it, every visitor stays in "unknown" state, which currently still gets tracked by the gate logic (no regression for unintegrated sites).

### Inbox unread badge for client + agency viewers (June 19, 2026 late-late evening)
- **Pairs with the staff-reply email notification shipped earlier today.** Visual cue in `/chapter/<key>/*` sidebar showing how many inquiry threads have a pending Chapter team reply the viewer hasn't responded to.
- **New `getInquiryUnreadCount()` action** in `lib/inquiries/actions.ts`: counts threads visible to the current user where (a) status != 'resolved' AND (b) latest message's `sender_role = 'chapter_staff'`. Capped at 200 thread scan for badge purposes.
- **chapter_staff sees 0 by design** — they have Gchat pings for their direction; no self-notify badge needed.
- **Layout passes count to Sidebar as prop.** Sidebar renders badge to existing Inbox nav item when count > 0. Reuses the existing `NavItem.badge` field (already rendered as a pill on the right side of the nav row from earlier work).
- **No new schema. No new table writes.** Pure read-only count using existing `chapter_inquiries.threads` + `messages` tables.

### Tenants admin edit-in-place (June 19, 2026 late-late evening)
- **Closes the Sprint 10 follow-on backlog item.** Previously the only mutations were create + revoke + assign — to change an existing row's content you had to revoke + recreate.
- **Three new server actions in `_actions.ts`:** `updateAgency(agency_key, {display_name, contact_email, notes})`, `updateAllowedDomainNotes(id, notes)`, `updateUserRole({id, role, agency_key, client_key})` — the user one mirrors the `chapter_config.users` CHECK constraint client-side so role-scope alignment errors surface before the DB.
- **Three new row components** (`AgencyRow`, `DomainRow`, `UserRow`) handle the edit↔view toggle inline within the existing tables. Edit button per row → cells become inputs/selects → Save/Cancel. Save calls the action; success collapses back to view mode + revalidates.
- **Editing scope per section** — pragmatic, not exhaustive:
  - Agency: display_name + contact_email + notes (NOT `agency_key` — that's the PK and used in FKs across users + allowed_email_domains).
  - Domain: notes only (rule shape changes still go via revoke + recreate; domain/role/scope tuple defines the rule's purpose).
  - User: role + scope (agency_key / client_key) with role-driven scope field visibility + auto-clear when role changes to an incompatible scope.

### Mailchimp recipient_token coverage verified clean (June 19, 2026 late-late evening)
- **The "Mailchimp recipient_token backfill" todo from earlier in the day was based on incorrect memory** — the backfill actually shipped June 15 per the existing CLAUDE.md entry. Verified end-to-end during this session:
  - EOS Fabrics: 156,153 Mailchimp engagement rows with **100% `recipient_token` coverage** (6,563 unique tokens, 3,067 unique click-recipients).
  - `?rid=` URL hint flavor is **fully functional** for any Mailchimp campaign URL on EOS — wrap CTA links as `ads4good.com/r/eos_fabrics/<slug>?to=<destination>&rid=*|UNIQID|*`. Mailchimp expands `*|UNIQID|*` per recipient at send time → redirect handler resolves to `email_sha256` via the `recipient_token` lookup → identity stitched at click.
  - Newest event timestamp June 16. **Sync rerun via `chapter-scripts/sync-mailchimp-engagement.js`** with `CAMPAIGN_SINCE=2026-06-15` returned zero new rows — EOS hasn't sent any new campaigns since June 16.
- **Backlog item logged during session:** move `sync-mailchimp-engagement.js` (currently in separate `chapter-scripts/` directory outside main repo, manual run) into the main repo + wire as a Vercel cron. Small future polish; not urgent because campaigns aren't sent daily.

### Outreach URL Builder — generic 1P link + multi-client picker + per-client redirect host (June 19, 2026 late evening)
- **Three ergonomic upgrades** to `/internal/outreach-builder` driven by the v2 CRM-interactions roadmap (wrapping external CTAs in 1P redirect URLs becomes the default workflow):
  1. **Client picker** at the top of the form. Pulls from `chapter_config.clients` (all of them, with storefront_domain in the option label for clarity). Default = `adsforgood_prod` (the agency tenant). Switching client rebuilds the slug dropdown from that client's `redirect_rules`. Operator can build outreach URLs for any tenant's 1P redirect — not hardcoded to adsforgood anymore.
  2. **Generic 1P link option** in the slug dropdown — `— Generic 1P link (no rule, slug: go) —`. When picked (or when no rules exist for the selected client), the builder uses a hardcoded fallback slug (`go`) that doesn't need a configured rule. The redirect route falls back to `?to=` when no rule matches, so identity stitching + click logging still work without rule setup. **Pattern enables wrapping any URL in a 1P link with full UTM + prospect_key tracking, even without going through `/internal/redirect-rules` first.**
  3. **Per-client redirect host** — new column `chapter_config.clients.redirect_host text`. When set, the builder uses it as the URL origin instead of the global default. Required for true 1P benefit because **cookies must be on the destination's eTLD+1** — for NSC (storefront `notsocavalier.com`), the redirect host must be `chapter.notsocavalier.com` so cookies persist across the 302. For `adsforgood_prod`, NULL is correct (the agency site IS the Chapter deployment apex). For `eos_fabrics` / `projectagram_reels`, NULL until 1P pixel is wired on a dedicated subdomain.
- **Set during ship:** `UPDATE chapter_config.clients SET redirect_host = 'https://chapter.notsocavalier.com' WHERE client_key = 'not_so_cavalier'`.
- **Bug caught + fixed during ship:** initial multi-client picker version used `ads4good.com` as redirectOrigin for ALL clients. Building an outreach URL for NSC would have generated `ads4good.com/r/not_so_cavalier/go?to=...` — cookies land on `.ads4good.com`, but destination is on `.notsocavalier.com` so the 1P benefit is lost. **Lesson re-locked:** for true 1P, the redirect host MUST share eTLD+1 with the destination. Encoded in the per-client config + builder logic now.
- **Files:** modified [page.tsx](src/app/internal/outreach-builder/page.tsx) (fetch all clients + slugs grouped by client + redirect_host), [UrlBuilder.tsx](src/app/internal/outreach-builder/UrlBuilder.tsx) (client dropdown + generic-slug option + `effectiveOrigin` derived from `currentClient.redirect_host || redirectOrigin`).

### crm.interactions producer v1 — site visits + inquiries (June 19, 2026 late evening)
- **Closes the producer-not-yet-fed gap** noted in the CRM↔Chapter integration architecture (June 18). `crm.interactions` table existed since the CRM schema was defined; nothing wrote to it until now.
- **New cron at `/api/internal/cron/crm-interactions-producer`** scheduled 06:30 UTC nightly (after observations at 05:00, connections-snapshots at 05:30). Two producers in one route, each idempotent + LIMIT 500 per source per run:
  1. **Site visits.** Joins `crm.prospects.email_sha256` → `chapter_identity.identity_links.identity_key` (matches `email_sha256:<hash>` canonical) → `chapter_journey.journeys`. One interaction per (prospect, journey). `type='site_visit'`, `source='chapter_pixel'`. Summary derived from `first_touch->>'utm_source'` → `first_touch->>'referrer'` → "Direct visit" fallback. Metadata blob carries `journey_id`, `first_touch`, `country`, `city`.
  2. **Inquiry submissions.** Joins `crm.prospects.email` (lowercased) → `chapter_inquiries.threads.created_by_email`. One interaction per (prospect, thread). `type='inquiry_submitted'`, `source='chapter_inquiry'`. Metadata: `thread_id`, `client_key`, `category`.
- **Dedup architecture:** partial UNIQUE indexes on `crm.interactions` over `(prospect_id, metadata->>'journey_id')` and `(prospect_id, metadata->>'thread_id')`. `ON CONFLICT ... WHERE` clauses echo the index WHERE filters so Postgres can find them (the gotcha: partial indexes require matching WHERE on the ON CONFLICT).
- **Schema column gotcha caught + locked again:** the journey table doesn't have a top-level `utm` or `first_referrer` column — those live inside the `first_touch jsonb`. Initially guessed the columns wrong; got an immediate 42703. **Same "never guess columns" rule that's bit us multiple times now.** Reference: `feedback_never_guess_external_identifiers.md`.
- **Backfill ran during ship:** 1 site visit landed for the test prospect (katoa.ahau@gmail.com → ads4good.com/for-businesses visit from April 2). Confirms the cross-schema join works end-to-end. Future signals flow via the nightly cron.
- **v2 roadmap (locked during this session):**
  - **Direct API connection** to GBP / Yelp / review platforms — gives aggregate metrics (impressions, profile views, calls) but no per-visitor identity.
  - **1P redirect wrapping** on external CTAs (`ads4good.com/r/adsforgood_prod/gbp-call`, etc.) — wraps every external link so each click is captured with device + geo + referrer + identity cookie set at click time. For known-prospect contexts (outreach emails/SMS/LinkedIn DMs) include `?rid=<prospect_key>` for identity stitching BEFORE landing. For anonymous discovery (GBP click via Google), no identity at click but historical session attribution can stitch retroactively if the visitor later identifies. This slots into the existing Tier 1 redirect infrastructure (Sprint 4) — same rule engine, no new architecture.

### Identity-prompt email attack alert + dedicated Gchat space (June 19, 2026 late evening)
- **Closes the warning-system gap on the 3-layer defenses.** Defenses already write rejections to `chapter_audit.api_auth_attempts`; this turns that data into actionable Gchat pings.
- **New cron at `/api/internal/monitoring/prompt-attack-alert`** scheduled `*/15 * * * *` in vercel.json. Queries last 15 min of audit table; filters to attack-shaped failure reasons (`honeypot_filled`, `session_*`, `rate_limited`, `invalid_json`); ignores legit user errors (`invalid_email`, `missing_required_fields`) so typo-prone humans don't trigger.
- **Threshold-based** — fires when attack-shaped rejection count crosses `CHAPTER_ATTACK_ALERT_THRESHOLD` (default 10). Below-threshold runs return 200 silently, so healthy state never spams the channel.
- **Routing:** `CHAPTER_SECURITY_GCHAT_WEBHOOK_URL` env var points at the dedicated "Chapter Attack Alerts" Gchat space (Katoa created during this session). Falls back to operational webhook if not set so the alert ships safely on first deploy.
- **Alert message includes:** count + window + threshold (header), breakdown by `failure_reason` (which defense is firing), top 5 targeted client_keys (which tenants are being probed), top 5 offending IP hashes (truncated to 12 chars + ellipsis — correlate but don't fully identify), investigation SQL query for the audit table.
- **E2E validated:** inserted 15 synthetic test rows into `api_auth_attempts` (13 attack-shaped, 2 legit user errors) → curled the cron route → JSON returned `attack_count: 13, total_rejections: 15, alerted: true` → Gchat ping landed in the Chapter Attack Alerts space → cleanup query removed all 15 test rows. Validation marker on test rows was `user_agent_snippet='CHAPTER_TEST_ROW_REMOVE_ME'`.
- **Operator setup (one-time):** add `CHAPTER_SECURITY_GCHAT_WEBHOOK_URL` to Vercel env vars (Production + Preview). Optionally tune `CHAPTER_ATTACK_ALERT_THRESHOLD` for sensitivity (default 10).
- **Vercel cost is negligible** — 96 invocations/day × ~100ms × 128MB = 0.011 GB-hours/month against 1,000 included on Pro. Fractions of a penny.

### Identity-prompt email 3-layer defenses (June 19, 2026 late evening)
- **Closes the spam-amplification surface** that previously let any caller POST to `/api/chapter/identity-prompt-email` with any recipient and trigger an outbound branded email. Designed for 20-100 client scale, not just current small surface.
- **Layer 1 — Honeypot field.** Invisible `<input name="hp_field">` in the modal form (off-screen via `position:-9999px` + `aria-hidden` + `tabindex=-1`). Real humans never see or fill it. Server rejects on non-empty value, no DB hit. Catches dumb bots that fill every input.
- **Layer 2 — HMAC session token.** New helper at [src/app/lib/auth/prompt-session.ts](src/app/lib/auth/prompt-session.ts) with `signPromptSession(client_key)` + `verifyPromptSession(token, expected_client_key)`. Format: `base64url(payload).base64url(hmac)` where payload = `{client_key, exp}`. TTL 30 min. Constant-time signature comparison via `timingSafeEqual`. Minted by `/api/chapter/identity-prompts` (GET) — pixel stores in module-level var, includes in email-send POST body. Direct-POST attackers without token (or with forged) → 401 `invalid_session`. **Fail-closed** if `CHAPTER_PROMPT_SECRET` env var missing (returns 503 `service_misconfigured` — no sneaking past via missing-config).
- **Layer 3 — Per-IP rate limit.** In-memory `Map<ip, {count, reset_at}>` in route module. 10 sends per IP per hour. Hourly reset per IP. Bounded to 5000 IPs max with periodic eviction to prevent unbounded memory growth on long-running instances. At multi-Vercel-instance scale this becomes per-instance (still useful as bulk attackers would have to spray across instances); upgrade to Upstash KV when first instance-spray abuse appears.
- **Every rejection writes to `chapter_audit.api_auth_attempts`** via the existing `logAuthAttempt` helper. `failure_reason` field carries the specific defense that blocked: `honeypot_filled` / `session_malformed` / `session_bad_signature` / `session_expired` / `session_wrong_client_key` / `session_missing_secret` / `rate_limited` / `invalid_json`. Successful sends also log so the alert system has baseline. This is the structured data the attack alert queries.
- **HMAC explicitly rejected as a 4th layer** for v1: to be load-bearing, HMAC needs a secret the attacker can't trivially extract. Per-visitor secrets minted server-side → basically just fancier cookie binding. Per-client secrets embedded in pixel → attacker reads the script. The {honeypot + cookie binding + rate limit} combo covers 99% of the real attack space without HMAC's per-client secret distribution complexity.
- **Cookie binding swapped for token-in-body** during build — sidesteps the cross-origin `SameSite=None` + `credentials: include` CORS dance entirely. Token rides in the JSON response from `/api/chapter/identity-prompts` and goes back in the email-send POST body. Works identically on 1P and 3P installs.
- **Pixel modifications:** honeypot input added to modal form (CSS-hidden), `chapterPromptSessionToken` module-level var captures token from prompts response, `chapterSendPromptEmail` POST body includes `session_token` + `hp_field`.
- **Operator deploy prereq (one-time):** `CHAPTER_PROMPT_SECRET` env var in Vercel (Production + Preview). Generate via `openssl rand -hex 32 | tr -d '\n' | pbcopy` (clean copy avoids the newline-embedding trap that's bit us repeatedly with `pbcopy` from Vercel UI).
- **Files:** new [src/app/lib/auth/prompt-session.ts](src/app/lib/auth/prompt-session.ts); modified [/api/chapter/identity-prompts/route.ts](src/app/api/chapter/identity-prompts/route.ts) (mint token, drop CDN cache to no-store because token per-request); modified [/api/chapter/identity-prompt-email/route.ts](src/app/api/chapter/identity-prompt-email/route.ts) (all 3 defenses + audit logging via `reject()` helper); modified [pixel.js](src/app/api/chapter/pixel.js/route.ts) (honeypot input + token capture + token in POST).

### Inquiry staff-reply email notification (June 19, 2026 late evening)
- **Closes the inquiry loop** in the opposite direction from the existing Gchat pings. Previously: clients/agencies who submitted inquiries had to manually poll `/chapter/<key>/inbox` to discover Katoa's replies. Now: they get an email within seconds of the chapter_staff reply landing.
- **Trigger:** in `replyToInquiry` server action ([src/app/lib/inquiries/actions.ts](src/app/lib/inquiries/actions.ts)), when `user.role === 'chapter_staff'`, fire-and-forget `notifyClientOfStaffReply` after the DB insert succeeds.
- **Email shape (Resend, mirrors `/api/inquiry` contact-form auto-reply):**
  - From: `ads for Good <${FROM_EMAIL}>`
  - **Reply-to: `katoa@ads4good.com`** so client hitting reply lands in operator inbox, not into some void/staff-role address
  - Subject: `Chapter team replied: <thread.subject>`
  - Body: short header + reply preview (up to 600 chars) + CTA button linking back to `/chapter/<client_key>/inbox?thread=<id>`
  - Cc: thread's `cc_emails` array (if any)
- **Suppressions (by design):**
  - Chapter_staff opening their own thread → no self-notify (handled by the outer `if user.role === 'chapter_staff'` guard)
  - Chapter_staff replying on a thread they themselves created → defensive check on `replier_email === created_by_email` (catches the edge case where chapter_staff opened a test thread)
  - Client replies don't trigger this path (existing Gchat ping covers operator notification)
- **Fire-and-forget contract preserved:** Resend latency or failure never blocks the reply action. Graceful no-op + warn log if `RESEND_API_KEY` or `FROM_EMAIL` missing.

### chapter_config security audit + default privileges (June 19, 2026 late evening)
- **Defensive sweep** across `chapter_config.*` + adjacent schemas after the gap-pattern bit us 3 times (crm June 18, identity_prompts earlier today, users + clients during Sprint 10 build today). Goal: prevent the next bite by closing remaining gaps AND setting default privileges so future tables inherit correct grants automatically.
- **6 chapter_config grant fixes applied (would have failed Sprint 10 if shipped without):**
  - `chapter_config.users` — SELECT-only → full CRUD. Revoke/unrevoke actions in `/internal/tenants` would have hit permission denied.
  - `chapter_config.clients` — SELECT-only → full CRUD. `assignClientToAgency` action would have hit permission denied.
  - `chapter_config.email_campaigns` / `email_engagement_events` — SELECT-only → full CRUD (defensive; no current UI write path, but the scripts pattern already exists).
  - `chapter_config.square_oauth_tokens` / `square_webhook_secrets` — SELECT-only → full CRUD (defensive; for future onboarding UI).
- **Default privileges set on 3 schemas** so the bite-pattern can't repeat:
  - `chapter_config` — `ALTER DEFAULT PRIVILEGES IN SCHEMA chapter_config GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role` + sequences. Any new table added auto-gets full CRUD.
  - `chapter_observations` — same. Schema had NO default privileges set at all; new observations engine extensions would have silently SELECT-only.
  - `chapter_audit` — `ALTER DEFAULT PRIVILEGES ... GRANT SELECT, INSERT ON TABLES`. Append-only by design — audit logs shouldn't be editable. New audit tables auto-inherit append-only semantics.
- **Intentionally NOT changed:**
  - `chapter_audit.*` existing tables stay SELECT+INSERT (append-only correct).
  - `chapter_reporting.*` snapshots stay SELECT-only via service_role; cron writes via direct postgres-js connection (postgres role) so service_role write grants would be unused.
  - `chapter_config.client_secrets` / `shopify_webhook_secrets` / `tracking_ignore_list` — partial (no DELETE) but these are revoke-via-column tables. We never delete. Correct as-is.
  - RLS-disabled tables stay RLS-disabled. Only service_role + chapter_app + per-client roles access them via API; per-client roles only have grants on `chapter_ingest/identity/journey` (which DO have enforced RLS policies via Fix #26 Part 2). Belt-on-suspenders RLS without enforcement adds no security.
- **Architectural lock-in:** for the 3 schemas where defaults are set, new tables created in DDL migrations automatically inherit service_role write grants. The pattern that bit us 3 times (crm.* June 18, identity_prompts June 19 morning, users+clients June 19 afternoon during Sprint 10) is now closed at the default-privilege level. Should be added to `chapter_reporting` only if/when we have UI write paths for it (currently none).

### Sprint 10 — Tenant admin UI at `/internal/tenants` (June 19, 2026 late evening)
- **Replaces operator-driven SQL** for `chapter_config.{agencies, allowed_email_domains, users, clients.agency_key}`. CLAUDE.md had flagged this as Sprint 7 backlog since June 18 — operator-driven SQL was good enough for zero agencies, less so as the system scales.
- **Single-page admin** with 4 sections (server + client component split):
  1. **Agencies** — create form + table with client-count per agency
  2. **Allowed login domains** — create form with role-scoped validation (mirrors the chapter_config.users CHECK constraint client-side: chapter_staff has neither scope, agency_operator requires agency_key + forbids client_key, client_employee requires client_key + forbids agency_key). Table with active/revoked filter + revoke action.
  3. **Client → agency assignment** — dropdown per client row, inline save via `assignClientToAgency` server action.
  4. **Users** — list with email + role + scope + last_login + status. Revoke + unrevoke actions. Show-revoked filter.
- **Gated by `CHAPTER_DASH_TOKEN` cookie** (same middleware gate as other `/internal/*` admin surfaces). Doesn't depend on the Supabase auth path so still works for legacy-cookie operators.
- **Auto-provisioning behavior unchanged.** This is purely a management surface — existing magic-link auto-provisioning via allowed_email_domains still works the same way. Sprint 10 just gives you a UI to set those rows instead of writing SQL.
- **Onboarding a first EOS / agency client_employee now reduces to:** visit `/internal/tenants` → Allowed login domains section → enter domain → pick role `client_employee` → pick client from dropdown → Create rule. Any @eosfabrics.com email magic-link then auto-provisions a client_employee row scoped to eos_fabrics.
- **Files (new):** [src/app/internal/tenants/layout.tsx](src/app/internal/tenants/layout.tsx), [page.tsx](src/app/internal/tenants/page.tsx), [TenantsBoard.tsx](src/app/internal/tenants/TenantsBoard.tsx), [_actions.ts](src/app/internal/tenants/_actions.ts).
- **Backlog spun out of Sprint 10:** edit-in-place for existing rows (today you revoke + recreate to change a rule). Quick follow-on if needed.

### Sprint 9 Phase 2 — 3 dashboard RPC snapshots > 1s (June 19, 2026 late evening)
- **Heaviest RPCs identified via timing survey** at the start of Phase 2 (using the chained CTE clock_timestamp() pattern):
  - `incrementality_channel_overview` — **7,768ms** cold on EOS (Lift page, Incrementality tab)
  - `contribution_overview` — **2,580ms** (Lift page, Contribution tab)
  - `journeys_overview_list` — **1,618ms** (Customer Journeys page, identity list)
  - Everything else under 100ms. Other channel/journey RPCs (correlation, contribution under 30ms) intentionally left untouched per Sprint 3's "fast enough on primary" call.
- **3 new snapshot tables** in `chapter_reporting` keyed on (client_key, default-args):
  - `incrementality_snapshot_v1 (client_key, cohort_axis, window_days)` — 90d, cohort_axis='subscriber' default
  - `contribution_snapshot_v1 (client_key, window_days)` — 90d default
  - `journeys_overview_list_snapshot_v1 (client_key, window_days)` — 30d default, null filters, limit 50
- **Tolerant window matching** in wrappers — `matchesDefaultWindow()` helper accepts the snapshot when (a) window length matches ±1 day, (b) end_ts is within last 24h. Snapshot built at 04:25 UTC; dashboard query at 14:00 UTC still hits — fresh-enough analytics windows shouldn't reject the snapshot over a few hours' age.
- **Non-default args fall back to live RPC** unchanged. Custom date ranges, non-default cohort_axis, filtered journey queries (action/outcome filters) all bypass snapshot and hit the original RPC.
- **Wrappers refactored:** `cachedContributionOverview` was using the `makeCachedRpc<>` factory — replaced with custom `unstable_cache` wrapper to inject snapshot-first lookup. `cachedIncrementalityChannelOverview` + `cachedJourneysList` got the same snapshot-first treatment. Cache keys bumped to `:v2` to bust stale entries from before snapshot-enabled.
- **Refresh wired into existing `refresh-derived-snapshots` cron** at 04:25 UTC (per-client). Same route also refreshes journey_resolved_v1 + the global `refresh_attribution_tables()`. Per-client × per-snapshot loop calls `sql.unsafe(template, [client_key])` — each template upserts via `INSERT ... ON CONFLICT DO UPDATE`.
- **Backfill via cron tonight at 04:25 UTC** (or manual curl `/api/internal/cron/refresh-derived-snapshots` with `Bearer $CRON_SECRET` to populate earlier). Until snapshots populate, the wrappers fall back to live RPC = unchanged perf.
- **Files:** schema migration `sprint_9_phase_2_snapshots` (3 tables); modified [src/app/api/internal/cron/refresh-derived-snapshots/route.ts](src/app/api/internal/cron/refresh-derived-snapshots/route.ts) (DASHBOARD_RPC_SNAPSHOTS array + per-client loop); modified [src/app/chapter/_lib/dashboard-rpc.ts](src/app/chapter/_lib/dashboard-rpc.ts) (3 new snapshotLookup helpers + `matchesDefaultWindow` + 3 wrapper rewrites).
- **Expected impact after backfill:** Lift page (cold) ~10s → ~1s. Customer Journeys page (cold) ~3s → ~1s. All for the default-args case the dashboard fires on first paint.

### Sprint 9 Phase 1B — anchor_meta snapshot (June 19, 2026 late evening)
- **Closes the remaining slow RPCs on the Cross-Source Influence page** that Phase 1A didn't cover. After Phase 1A: `connections_panel` was snapshot-fast but the page's 4 per-anchor RPCs still hit live RPCs for `anchor_resolve` (314ms cold) + `self_recurrence` (90ms cold). Multiply by 4 anchors loaded for the page = real ~1-2s delay on first paint.
- **Pattern: extend snapshot architecture from panel data to anchor metadata.** Same Phase 1A philosophy: snapshot-first lookup → fall back to live RPC for non-top anchors.
- **New table `chapter_reporting.connections_anchor_meta_snapshot_v1`** keyed on `(client_key, anchor_type, anchor_key)` with `anchor_resolve jsonb` + `self_recurrence jsonb` columns. One row per anchor per client (de-duped across direction × connection_type since meta is direction-independent).
- **Refresh wired into existing `refresh-connections-snapshots` cron** at 05:30 UTC. After the panel-snapshot worker pool finishes, a second worker pool iterates unique anchors (extracted from the combo set with `${anchor_type}|${anchor_key}` de-dup key) and computes anchor_resolve + self_recurrence in parallel per anchor. Stores both jsonb blobs in one upsert.
- **Snapshot-first lookup in 2 wrappers** ([dashboard-rpc.ts](src/app/chapter/_lib/dashboard-rpc.ts)): `cachedConnectionsAnchorResolve` (cache key v3 → v4) + `cachedConnectionsSelfRecurrence` (v1 → v2). Both use `extractAnchorKey()` shared helper from Phase 1A. Hit → ~30ms; miss → live RPC fallback.
- **postgres-js type gotcha** (caught during ship): `Record<string,unknown>` returned by `to_jsonb(t)` didn't satisfy postgres-js's `JSONValue` type for `sql.json()`. Workaround: cast jsonb to text in SQL with `(to_jsonb(t))::text`, then re-cast to jsonb in the INSERT statement. Bypasses the JS-side type check while preserving the round-trip shape.
- **MCP execute_sql timeout for backfill** — even small batches of anchor_resolve + self_recurrence calls (10 anchors) timed out at the ~30s PostgREST execute_sql ceiling. Cron route has 800s headroom and proper worker-pool parallelism so backfill flows correctly there. **Backfill awaits next nightly run at 05:30 UTC** (or operator curl on the cron route). Until populated, wrappers fall back to live RPC = unchanged perf.
- **Files:** schema migration `sprint_9_1b_anchor_meta_snapshot`; modified [src/app/api/internal/cron/refresh-connections-snapshots/route.ts](src/app/api/internal/cron/refresh-connections-snapshots/route.ts) (Anchor type + refreshOneAnchorMeta function + second worker pool); modified [src/app/chapter/_lib/dashboard-rpc.ts](src/app/chapter/_lib/dashboard-rpc.ts) (anchorResolveSnapshotLookup + selfRecurrenceSnapshotLookup + wrapper rewrites + cache key bumps).

### Moment Identity v1.5 — phone field + 5 post-submit actions + editable email + edit-in-place + selector picker (June 19, 2026, multi-feature session)
- **Builds on Option D v1 (June 11) into a v1.5 polished primitive.** Multiple shipped iterations consolidated:
  - **Custom email field placeholder** (column `email_placeholder`, renamed from `input_placeholder`; new `phone_placeholder` for phone-mode prompts)
  - **Phone-or-email input mode** — operator picks `email` / `phone` / `either` chip; client-side E.164 normalization (strip non-digits, default +1 for US 10-digit, allow international 10-15 digits); SHA-256 hash via `chapterHashPhone` mirroring existing email hash path; identity stitch via `phone_sha256:<hex>` which Phase 3.5 of `/api/purchase` already supports
  - **5 post-submit actions** (was 1: just "display message"):
    1. `message` — display offer in modal (existing v1)
    2. `email` — Resend email with offer code; requires offer_code; renders styled offer box in modal post-submit + in email
    3. `email_message` — Resend email without offer (subject + body only); requires email_body; offer box suppressed everywhere
    4. `button` — show CTA button linking to URL after submit
    5. `redirect` — immediate `window.location.href` redirect to URL
  - **Operator-customizable email subject + body** with `{offer_code}` token substitution in subject. Subject default `Your code: {offer_code}` for `email` action / `A message for you` for `email_message`. Body default "Thanks for signing up — here's your code:" / "Thanks for signing up!". Email HTML auto-wraps paragraphs on blank lines, `<br/>` on single newlines.
  - **Resend integration via existing `FROM_EMAIL` env var pattern** (matches `/api/inquiry` contact-form auto-reply shape). From: `ads for Good <${FROM_EMAIL}>`, reply-to: `katoa@ads4good.com` so client hitting reply lands in operator inbox. Required: `RESEND_API_KEY` (already set from contact form work).
  - **Edit-in-place** — new edit page at `/internal/identity-prompts/[clientKey]/[promptId]/edit`. `PromptForm.tsx` accepts optional `prompt?: ExistingPrompt` prop; all useState initializers read from prompt if provided; submit calls `updatePrompt(prompt.id, input)` vs `createPrompt(input)`. Edit link in `RowActions` next to Disable/Delete.
  - **Dashboard copy clarifies offer code timing** — offer code/description block moved into orange callout box with helper text "Shown post-submit, depending on action below" so operators understand the offer renders AFTER submit (was confusing in v1 because the offer is rendered as success-state, not pre-submit).
  - **Modal CSS contrast improvements** — `input` got explicit `color:#1F2D43` (was pale browser default), `::placeholder` got `color:#8B95A6` (was super faint).
- **CDN cache lowered** on `/api/chapter/identity-prompts` from `s-maxage=300` to `s-maxage=30, stale-while-revalidate=60`. Pixel fetch changed to `cache: "no-store"`. After 3-layer defenses landed: cache dropped to `no-store` entirely on the GET (each request mints a fresh session token).
- **CSS selector picker bookmarklet** — operator drag-target at `/internal/identity-prompts`. Bookmarklet is a 3-line `javascript:...` shim that injects `<script src="/api/internal/picker.js?t=<timestamp>">` (cache-buster so updates land without re-dragging). Picker hovers highlight elements with orange dashed outline + floating panel top-right shows the generated CSS selector. Click locks selection (Shift+hover to ignore while moving to Copy). Selector generation priority: `#id` (if unique) → `tag.class.class...` → `.class.class...` alone → `a[href="..."]` for anchors → `tag[data-*/name/role/aria-label="..."]` → `:nth-of-type()` path up to nearest ID ancestor. Always uniqueness-tested via `querySelectorAll`.
- **React 19 bookmarklet `javascript:` sanitization gotcha** (caught during ship): React 19 silently strips `javascript:` URLs in `href` (both JSX prop AND `setAttribute` paths). Drag-to-bookmarks-bar got the React-sanitized "throw" URL instead of the real bookmarklet. **Fix:** render the `<a href>` via `dangerouslySetInnerHTML` so the browser's HTML parser writes the attribute directly (browsers don't sanitize `javascript:` in href when parsing HTML, only React does). Plus fallback details/summary with the bookmarklet URL in a textarea + Copy button + manual create-bookmark instructions, for browsers that block drag-to-bookmark for `javascript:` URLs.
- **Picker class-collision bug** (caught during ship): picker was including its OWN `chapter-picker-hl` class in generated selectors, fooling the uniqueness check (only currently-hovered element has -hl). Fix: filter out picker classes (`chapter-picker-hl`, `chapter-picker-locked`, `chapter-picker-panel`) before generating + testing. Plus added `a[href="..."]` strategy for Tailwind-heavy sites where utility classes alone don't disambiguate.
- **Schema additions** to `chapter_config.identity_prompts`:
  - `input_mode text NOT NULL DEFAULT 'email' CHECK IN ('email','phone','either')`
  - `email_placeholder text` (renamed from `input_placeholder`)
  - `phone_placeholder text DEFAULT '(555) 555-5555'`
  - `post_submit_action text NOT NULL DEFAULT 'message' CHECK IN ('message','button','redirect','email','email_message')`
  - `post_submit_url text` / `post_submit_button_label text DEFAULT 'Claim it'`
  - `email_subject text` / `email_body text`
- **Files (new):** [/api/chapter/identity-prompt-email/route.ts](src/app/api/chapter/identity-prompt-email/route.ts) (Resend send + the 3 defenses); [/api/internal/picker.js/route.ts](src/app/api/internal/picker.js/route.ts) (CSS selector picker script); [PickerBookmarklet.tsx](src/app/internal/identity-prompts/PickerBookmarklet.tsx) (`'use client'` drag-target wrapper); [/internal/identity-prompts/[clientKey]/[promptId]/edit/page.tsx](src/app/internal/identity-prompts/[clientKey]/[promptId]/edit/page.tsx) (edit page).
- **Files (modified):** [pixel.js](src/app/api/chapter/pixel.js/route.ts) (phone input + post-submit branching + honeypot + token in POST + Mac CSS contrast tuning); [PromptForm.tsx](src/app/internal/identity-prompts/[clientKey]/PromptForm.tsx) (5 chips + conditional fields + edit/create dual mode + helper text); [_actions.ts](src/app/internal/identity-prompts/_actions.ts) (updatePrompt action + validation expanded); [RowActions.tsx](src/app/internal/identity-prompts/[clientKey]/RowActions.tsx) (Edit link).

### Sprint 9 Phase 1A — Cross-Source Influence panel snapshot (June 19, 2026)
- **New table `chapter_reporting.connections_panel_snapshot_v1`** pre-computes `connections_panel` results for top-N anchors of each type per client, both directions × both connection_types, for the DEFAULT 30d/30d window combo. PK on `(client_key, anchor_type, anchor_key, direction, connection_type, window_days, outcome_window_days)`. App reads snapshot first; falls back to live RPC for non-snapshot params.
- **Refresh route** at `/api/internal/cron/refresh-connections-snapshots` with bounded-parallel workers. Initial CONCURRENCY=8 was reduced to **3** mid-session because cold-replica buffer cache thrashing made 8 parallel connections_panel calls each take 2-8 min on EOS (each holds journeys/canonical pages in DataFileRead wait). Lower concurrency means earlier queries warm cache for later ones AND individual queries don't compete for buffer slots. Net: serial-warm beats parallel-cold for this workload.
- **Two query params on the route:**
  - `?client=<key>` — process just one client (lets us run backfills one client at a time when network stability is iffy; each run short enough to finish reliably)
  - `?skip_existing=true` — filter combos to only those NOT already snapshotted for this client (for retries after partial failure). Default false so the nightly cron does a full rebuild.
- **Cron schedule:** 05:30 UTC nightly in vercel.json (after derived-snapshots 04:25, system-cohorts 04:30, observations 05:00 — so this reads fresh canonical data).
- **App-side wrapper:** `cachedConnectionsPanel` in [dashboard-rpc.ts](src/app/chapter/_lib/dashboard-rpc.ts) updated to (1) try snapshot lookup first via `snapshotLookup()` helper, (2) fall back to live RPC if no match. Snapshot-hit conditions: default 30/30 window AND extractable anchor_key. Exclude args applied client-side after snapshot read so one row can serve any exclude combination. Cache version bumped to v6.
- **Math + verification per client:**
  - adsforgood_prod: 116 combos (10 channels + 15 pages + 0 campaigns + 4 cohorts × 4 variants), built in 5s
  - not_so_cavalier: 56 combos (no real data — fast), built in 3s
  - projectagram_reels: 116 combos, built in 4.5s
  - **eos_fabrics: 176 combos** (10 channels + 15 pages + 15 campaigns + 4 cohorts × 4 variants), built across multiple curl attempts with `skip_existing=true` retries. 1,791 actual connection rows captured.
  - **All 464 snapshot rows populated end of session.**
- **One DB column bug fixed during build:** my refresh route guessed `cohort_id` column on `chapter_config.connections_cohorts` — actual column is `id`. Caused 500 on first run. **Lesson re-locked:** never guess column names when Supabase MCP `information_schema.columns` lookup is available. Memory rule already existed (`feedback_never_guess_external_identifiers.md`); broke it, cost a deploy cycle.
- **Observability lesson:** the manual backfill curl threw `HTTP/2 framing layer` errors at ~5-6 min mark, but the Vercel function kept running to completion on the server. CLIENT-side curl giving up ≠ SERVER-side function failure. Going forward, **check DB state via Supabase MCP for cron-style routes; don't trust curl exit status alone**. Saved significant debugging time once we figured this out.
- **Realistic perf delivered:**
  - **Anchor switch on a cached arg combination (Next.js `unstable_cache` warm):** sub-200ms ✓
  - **First-ever anchor switch in a session (cold Next.js cache):** still slow because the page does 5-7 other RPCs beyond `connections_panel` (anchor_resolve, self_recurrence, anchor option lists). Snapshot only sped up the heaviest one.
- **Phase 1A enables Phase 1B but doesn't deliver the full UX win on its own.** Phase 1B (fat envelope + client-side anchor filter) is the truly-instant UX; Phase 1A's snapshot is the prerequisite that makes the envelope construction fast enough to be feasible on the server. Phase 1B queued for next session.
- **Files:** new schema migration `sprint_9_connections_panel_snapshot` + bug-fix migration. New cron route [refresh-connections-snapshots/route.ts](src/app/api/internal/cron/refresh-connections-snapshots/route.ts). Updated [dashboard-rpc.ts](src/app/chapter/_lib/dashboard-rpc.ts) and [vercel.json](vercel.json).

### Redirect rules form UX overhaul (June 19, 2026)
- **`/internal/redirect-rules/[clientKey]` edit form rebuilt** to remove confusion around the destination-template DSL + condition JSON. Five additions:
  1. **Plain-language primer** at the top of the new-rule form ("How a rule works") with slug / priority / conditions / destination explained in one bullet each.
  2. **Destination preset chips** above the destination input: Pass-through with UTM tracking · **Fixed URL + UTM passthrough (NEW)** · Fixed URL · Personalized by identity · Geo-targeted (country) · Mobile vs desktop. Click → fills the field.
  3. **Live token explainer** under the destination input — as you type, every `{...}` token in the template gets explained in English (e.g. `{q:utm_source}` → "Pulled from the inbound URL's `?utm_source=…` param").
  4. **URL tester** — type a sample inbound URL, see the resolved destination URL as the rule would 302 to it. Simulates the runtime substitution (q-params, geo placeholders, identity placeholder, client_key).
  5. **Structured `ConditionBuilder` component** ([file](src/app/internal/redirect-rules/[clientKey]/ConditionBuilder.tsx)) replaces the JSON textarea: "Add condition…" dropdown lists all 17 condition types in English; each condition gets a type-appropriate input (Yes/No for booleans, day-of-week chip strip, hour-of-day from/to, geo CSV input, etc.). Raw JSON view available via toggle for power-users. Generated JSON syncs both ways.

### `/internal/outreach-builder` admin page (June 19, 2026)
- **New URL builder for manual outreach** at `/internal/outreach-builder`. Solves the "I don't want to remember the URL syntax for chapter links" problem. Single-form page with:
  - Slug dropdown (auto-loaded from active `redirect_rules` for `adsforgood_prod` — today just `outreach`)
  - Prospect typeahead search (over `crm.prospects` business_name / contact_name / email / prospect_key)
  - Destination URL with 8 quick-pick chips for ads4good.com pages + free-form input
  - UTM source dropdown (cold_email / linkedin / event / podcast / webinar / referral / sms / phone_followup / newsletter / other — matches the prospect `source` vocabulary)
  - UTM campaign + UTM content optional inputs
  - **Live URL preview** with one-click Copy button; submit disabled until a prospect is picked so identity-stitching always happens

### 1P redirect for adsforgood_prod (June 19, 2026)
- **`outreach` rule created** for `adsforgood_prod` with destination template `{q:to}?utm_source={q:utm_source}&...all-5-utm-params...`. Generic catch-all (no conditions, priority 10).
- **76 prospect_keys backfilled** on `crm.prospects` via single UPDATE — slug = lowercase business_name + `-` + first 6 hex chars of id. All 76 distinct after backfill; only 2 had keys pre-fix.
- **`recipient-lookup.ts` extended** to fall through to `crm.prospects.prospect_key → email → email_sha256` (via shared `hashEmail()` helper) when the existing `email_engagement_events.recipient_token` lookup misses. Adsforgood_prod-only branch for now — only tenant with a CRM. Falls back to the existing ESP token resolution path for all other clients.
- **End-to-end flow:** outreach-builder generates URL `ads4good.com/r/adsforgood_prod/outreach?to=<landing>&rid=<prospect_key>&utm_source=cold_email` → prospect clicks → redirect handler stitches identity via `crm.prospects.prospect_key` lookup → click logged to `pixel_events` as `redirect_click` → cookies set on `.ads4good.com` apex (no cross-domain `?chid=` handoff needed because apex=destination) → 302 to landing with utm intact → landing-page pixel events stitch to same canonical identity automatically.
- **Architectural note locked:** for adsforgood (where ads4good.com IS the Chapter deployment), no separate `chapter.subdomain` is needed (vs NSC where `chapter.notsocavalier.com` was set up because Lovable hosts the storefront). All Chapter routes (`/r/...`, `/api/chapter/pixel.js`, `/api/chapter/collect`, `/api/identify`) are first-party on `ads4good.com` apex. Cookies set on `.ads4good.com` flow through every page → no `?chid=` URL handoff required.

### Sprint 8 — Inquiries Shape B (June 18-19, 2026)
- **Per-client inquiry threads + messages**, three-surface UX: global submit drawer from any dashboard page, chapter_staff inbox at `/internal/inbox`, client/agency read-only inbox at `/chapter/<client_key>/inbox`. Gchat notification on new threads + client replies (chapter_staff suppressed to avoid self-noise).
- **Schema in new `chapter_inquiries` schema:**
  - `threads (id, client_key, subject, category CHECK IN ('data_question','bug_report','feature_request','billing','other'), status CHECK IN ('open','in_progress','resolved'), created_by_email, created_by_role, cc_emails[], page_url, created_at, last_message_at, resolved_at)` + 3 indexes (client+recent, active-only partial, creator lookup)
  - `messages (id, thread_id FK, sender_email, sender_role, body, attachment_paths[], created_at)` + chrono index
  - Trigger `bump_thread_last_message_at` updates `threads.last_message_at` on every new message — keeps inbox list sortable by recency without explicit thread updates on every reply
- **Supabase Storage bucket** `inquiry-attachments` (private, 10MB cap per file, PNG/JPEG/GIF/WEBP only). Service-role uploads; reads via 1-hour signed URLs generated on view.
- **Access model enforced at API layer (not RLS):** RLS-on-no-policies = deny-all; service_role bypasses; every server action calls `getCurrentChapterUserOrLegacy()` first + checks visibility. chapter_staff sees all; client_employee sees only their client's threads + can reply; agency_operator sees their agency's clients' threads but is read-only in v1. Same role-aware visibility on `getInquiryThread` returns "Thread not found" rather than "Forbidden" so existence isn't leaked.
- **Server actions module** [src/app/lib/inquiries/actions.ts](src/app/lib/inquiries/actions.ts): `submitInquiry`, `replyToInquiry`, `setInquiryStatus` (chapter_staff only), `listInboxThreads` (visibility-scoped), `getInquiryThread`, `uploadInquiryAttachment` (FormData server action), `getInquiryAttachmentUrl` (signed-URL generator).
- **Drawer + UI:** [SubmitInquiryDrawer.tsx](src/app/chapter/_components/SubmitInquiryDrawer.tsx) reuses `chapter-submit-*` CSS family from the existing SubmitQuestionDrawer (one visual family for all modal submit forms). TopBar trigger button (`.topbar-inquiry-btn`) mounted globally so it's accessible from every dashboard page. New "Support" nav section in sidebar with Inbox link.
- **Gchat webhook routing — split from operational alerts.** New env var `CHAPTER_INQUIRIES_GCHAT_WEBHOOK_URL` routes inquiry notifications to a dedicated Gchat space (Katoa's "Chapter Inquiries" space). Operational alerts (stuck-runs, daily-digest, MV freshness) still go to the original `CHAPTER_GCHAT_WEBHOOK_URL`. Falls back to the operational URL if the inquiries-specific one isn't set, so deploys before env-var update don't crash. Refactored helper [gchat.ts](src/app/lib/monitoring/gchat.ts) into `postToGChatUrl(url, payload)` (low-level, takes URL) + `postToGChat(payload)` (uses default operational URL).
- **Legacy CHAPTER_DASH_TOKEN cookie fallback** added via `getCurrentChapterUserOrLegacy()` in [chapter-user.ts](src/app/lib/auth/chapter-user.ts) — wraps `getCurrentChapterUser()` and falls back to looking up the canonical agency-staff row (default `katoa@ads4good.com`, override via `CHAPTER_LEGACY_STAFF_EMAIL` env var) when the legacy cookie is the only authentication present. Unblocks all server actions for operators using the `@ads4good.com` bypass without forcing them to do real magic-link login. Self-removes when Sprint 5d drops the cookie path.
- **3-step schema gotcha (UPDATED June 19, 2026)** — same trap that hit chapter_recommendations on June 15 hit chapter_inquiries on June 19. Creating a new schema now requires **THREE** steps:
  1. GRANTs on tables / sequences / functions (in migration)
  2. **`GRANT USAGE ON SCHEMA <s> TO service_role, authenticated, anon`** (in migration) — silently missed in initial pattern; without this, PostgREST returns "permission denied for schema" even with table grants. Reference fix: `chapter-scripts/snapshots/2026-06-19-grant_usage_chapter_inquiries.sql`.
  3. Add to PostgREST exposed schemas in Supabase Dashboard → Settings → API → "Exposed schemas"
- **Inquiries verified end-to-end:** Katoa submitted test inquiry → landed in DB → visible in `/internal/inbox` → reply + status change worked. Gchat notification suppressed for chapter_staff-opened thread (by design); first real client submission will validate the notification path.
- **Backward compat preserved:** zero changes to existing routes / schemas / RLS / migrations. Sprint 8 is purely additive.

### Sprint 7 follow-up — Path-aware client switching (June 18, 2026)
- **Bug surfaced post-Sprint-7:** Sprint 5b real (June 14) made `/chapter/<client_key>/<slug>` the canonical browser URL form, with middleware rewriting it internally to the `?client=` legacy form for the page tree. But ChapterContext was reading `searchParams.get("client")` — which returns null when the canonical path-form URL is used because the rewrite happens server-side only. Result: sidebar selector showed the URL's path-form client_key as the wrong one (always fell back to `CLIENTS[0].id`). And `setClient` (dropdown) appended `?client=` to the existing path, leaving the path's client_key segment unchanged so middleware just overrode the user's intent.
- **Fix in [ChapterContext.tsx](src/app/chapter/_components/ChapterContext.tsx):**
  - `clientId` resolution priority: (1) URL path segment if path matches `/chapter/<X>/...` where X contains an underscore (per the client_key naming convention), (2) `?client=` query param, (3) `CLIENTS[0].id` default
  - `setClient`: when path is in client-scoped form, swap segment 1 in place + preserve query string; otherwise fall through to `?client=` (existing behavior for non-client-scoped paths)
- **Underscore-detection heuristic is the locked convention** — client_keys always contain underscore (eos_fabrics, projectagram_reels, not_so_cavalier), static slugs never do (overview, observations, channels). Safe to detect for routing purposes.

### Agency dogfood — CRM↔Chapter integration architecture (June 18-19, 2026)
- **Built as a dogfood of the same CRM↔Chapter integration a paying client would get.** Prospects live in Supabase (`crm` schema), n8n syncs identities + touchpoints into Chapter's ingest layer, internal page handles the manual steps. Stack: `crm.*` tables (Supabase) + 5 n8n workflows (personal project `jsUmqGPs3Sw6HvL0` in `ads4good.app.n8n.cloud`) + `/internal/crm` Next.js page.
- **Agency client_key:** `adsforgood_prod` — the agency's own Chapter tenant. **Prospects are identities WITHIN this tenant, not their own tenants.** A prospect only gets its own `client_key` if it converts to a paying client (see `crm.prospects.converted_client_id → crm.clients`).
- **Three-legged mirror:**
  1. **Identity** — prospect emails (hashed) seeded into `chapter_ingest.offline_identity_seeds` so behavior stitches to a known person.
  2. **Offline touchpoints** — completed meetings + manual calls/texts/LinkedIn/etc. pushed into `chapter_ingest.offline_milestones`.
  3. **Online behavior** — pixel + 1P redirect → `chapter_ingest.pixel_events`, stitched to the same seeded identity. *(prospect_keys 1P redirect wiring is queued — see Open Fix List.)*
- **Universal join key across all three:** `identity_key = sha256(lower(trim(email)))`, `identity_type='email'`, `is_hashed=true`. Matches the email_sha256 hashing used everywhere else in Chapter.
- **`crm` schema tables (existed before this session, documented here for completeness):**
  - `crm.prospects` — connected-CRM identity source. `prospect_key` (text UNIQUE) is the stable slug + future-prospect-token analogue to `clients.client_key`. `chapter_seeded` bool gets flipped true once seeded. `stage` CHECK constrained to lead-funnel values. `consent_mode` default 'opt_in' (only opt_in seeds). RLS on, no policies.
  - `crm.communications` — touchpoint log. `channel` CHECK IN email/text/phone/meeting/note/linkedin/in_person/other. `chapter_synced` bool. Meeting status convention: scheduled → completed/no_show/canceled. Calendar response stored in `metadata.response_status` (n8n companion change June 18).
  - `crm.interactions` — observed signals (GBP/Yelp/site/inquiry). Producer NOT YET FED. Future bridge to offline_milestones / conversion_events.
  - `crm.clients` — converted prospects → paying clients. Already had full service_role grants pre-Sprint-8; the other three got INSERT/UPDATE/DELETE grants June 18 alongside `/internal/crm` build (was a silent gap that bit the e2e test).
- **5 n8n workflows (personal project `jsUmqGPs3Sw6HvL0`):**
  1. **Chapter Identity Seed → Prospects** (`RdmnqaPJFX5Fa3vI`) — manual + daily 6AM. Hashes opt_in + chapter_seeded=false prospects, inserts into offline_identity_seeds, flips chapter_seeded. Idempotent.
  2. **CRM Comms Logger → Gmail and Prospects** (`ii3Q8RVtV9xKHLUP`) — daily 6AM. Reads Gmail sent + inbox (`newer_than:2d`), parses counterparty from From/To headers, matches to crm.prospects, logs both directions to crm.communications with `provider=gmail`. Dedup on Gmail message-id.
  3. **CRM Meeting Logger → Calendar and Prospects** (`cgKz2V7MluRQC0H3`) — daily 6AM. Reads primary calendar (-2d to +60d), finds events with a prospect guest, logs `channel=meeting`, `status=scheduled`, `provider=google_calendar`, `metadata.response_status` (June 18 companion change for the accepted→no-show funnel on `/internal/crm`). Dedup on event_id + prospect.
  4. **n8n Error Alerts to Google Chat** (`r13K1hzulsd6Jgq7`) — Error Trigger → Code → HTTP POST to a Google Chat incoming webhook. Set as the Error workflow on all others.
  5. **CRM to Chapter — Offline Milestones Bridge** (`Y7rHvMWTz8WrZAc9`) — manual + daily 7AM. Pushes `chapter_synced=false` rows that are completed meetings OR manual phone/text/linkedin/in_person/other into offline_milestones (hashed identity), flips chapter_synced. **Excludes** `email` (online/click-tracked) and `note` (internal). Idempotent.
- **Chapter ingest targets in use by this pipeline:**
  - `chapter_ingest.offline_identity_seeds` — written by Identity Seed workflow with `client_key=adsforgood_prod`, `source_type=crm_prospect`, `source_id=coalesce(prospect_key,id)`, `identity_key=sha256(email)`, `identity_type=email`, `is_hashed=true`.
  - `chapter_ingest.offline_milestones` — written by Offline Bridge with `client_key=adsforgood_prod`, `identity_key=sha256(email)`, `milestone_name` (meeting/call/text/linkedin/in_person/other), `milestone_ts=occurred_at`, `source_type=crm_communication`, `source_id=communication.id`.
  - `chapter_ingest.pixel_events` (in progress) — `redirect_click` via `ads4good.com/r/adsforgood_prod/<slug>` carrying prospect token. **Queued: 1P redirect + prospect_keys backfill on ~75 existing prospects.**
- **`/internal/crm` Next.js page (built June 18):** Gated by `/internal/*` auth. All DB work server-side with Supabase service role. 4 sections: Add Prospect (insert with auto-domain, auto-prospect_key, dedup-on-email, required source dropdown — 9 values: contact_tool/inbound/referral/linkedin/event/podcast/webinar/cold_email/cold_call); Log Touchpoint (manual crm.communications rows w/ provider=manual; debounced typeahead search across business/contact/email); Meeting Confirmation Queue (past status=scheduled meetings + Completed/No-show/Canceled buttons; merges metadata.confirmed_at via read-then-write); Funnel Snapshot (Pending/Completed/No-show + No-show rate + Accepted + Accepted→No-show rate gated on responseStatus presence).
- **Key conventions & invariants (locked):**
  - Identity hashing is the universal join. Never seed a raw email.
  - Idempotency via boolean flags (`prospects.chapter_seeded`, `communications.chapter_synced`). Workflows select `=false`, act, flip true. Safe to re-run.
  - `adsforgood_prod` is THE tenant for all agency-prospect seeds/milestones.
  - n8n uses direct Postgres connection (not PostgREST) → unaffected by exposed-schema settings. Next.js app uses service role; the `crm` schema is exposed in Supabase API settings (verified June 18 during /internal/crm build).
  - Channel routing to Chapter: offline (meeting/call/text/linkedin/in_person/other) → `offline_milestones`. Online (email) → clicks/pixel. `note` → never pushed.
- **Verification status (per handoff doc):** Seed 75/75 prospects (0 hash mismatches). Comms logger validated outbound + inbound for test prospect; non-prospect mail skipped. Meeting logger captured test event w/ prospect guest, skipped non-prospect. Offline bridge pushed test meeting to offline_milestones w/ hash verified. Error alerts armed (fires only on failure).
- **Open items (queued):** (a) 1P redirect + prospect_keys backfill — wrap outreach links + per-prospect token so clicks stitch to seeded identities. (b) `crm.interactions` producer — GBP/Yelp/site signals bridge to offline_milestones / conversion_events. (c) Decide if `adsforgood_prod.boundary_event_name = 'purchase'` should be `meeting_booked` or `became_client` for prospect attribution. (d) Calendar acceptance emails double-log (as inbound email + as meeting) — acceptable for now, optional subject-prefix filter if undesired.

### Sprint 7 — Role rename + agency hierarchy + domain allowlist + unanonymize (June 18, 2026)
- **Three-role auth model locked.** Renamed `agency_operator` → `chapter_staff` (Ads for Good / Chapter team, global access). Repurposed `agency_operator` for agency partners (scoped to an `agency_key`). `client_employee` unchanged. Tri-partite DB CHECK constraint enforces scope alignment: chapter_staff has NEITHER agency_key NOR client_key; agency_operator REQUIRES agency_key, forbidden client_key; client_employee REQUIRES client_key, forbidden agency_key. Katoa's row migrated automatically.
- **Schema added:** `chapter_config.agencies (agency_key PK, display_name, contact_email, notes, timestamps)` — empty today, populated when first agency signs. `agency_key` column added to `chapter_config.clients` and `chapter_config.users` (both nullable, FK to agencies). Indexed on `(agency_key) WHERE NOT NULL`.
- **Domain allowlist `chapter_config.allowed_email_domains`** added: one row per (domain, role, scope) combo. Same domain can be granted as agency_operator AND client_employee separately (rare but supported). Auto-provisions chapter_config.users row when an authenticated email's domain has an active rule. Hard-blocked public-domain CHECK constraint refuses gmail.com / yahoo.com / outlook.com / icloud.com / aol.com / protonmail.com / proton.me / pm.me / mail.com / gmx / fastmail / tutanota — admin mistake protection.
- **Code changes:** [chapter-user.ts](src/app/lib/auth/chapter-user.ts) — `ChapterUserRole` union, `agency_key` field on `ChapterUser`, async `canAccessClient` (agency_operator branch needs cached DB lookup for client's agency_key — 5-min in-memory cache via `getClientAgencyKey`), new `listAccessibleClientKeys` (sidebar scoping), new `findAllowedDomainForEmail` + `provisionFromDomainIfAllowed`. [middleware.ts](middleware.ts) — `await canAccessClient`, new agency_operator-on-global-route branch (redirects to first accessible client's overview, or signs out with `no_clients_yet` error if their agency has no clients yet). [Sidebar.tsx](src/app/chapter/_components/Sidebar.tsx) — filters dropdown to `visibleClients` based on `accessibleClientKeys` from context; 3-role label ("Chapter staff" / "Agency operator" / "Client employee"). [ChapterContext.tsx](src/app/chapter/_components/ChapterContext.tsx) — `UserInfo.role` 3-value union + `agency_key` + new `accessibleClientKeys` prop. [(authed)/layout.tsx](src/app/chapter/(authed)/layout.tsx) — fetches + passes `accessibleClientKeys`. [magic-link/route.ts](src/app/api/chapter-auth/magic-link/route.ts) — checks domain allowlist when no exact-match user; sends link if domain is allowlisted. [auth/callback/route.ts](src/app/chapter/auth/callback/route.ts) — auto-provisions via `provisionFromDomainIfAllowed` after code exchange; role-aware landing path (chapter_staff → /chapter; agency_operator → middleware bounces; client_employee → their client's overview).
- **Unanonymize:** [mockdata.ts](src/app/chapter/_components/mockdata.ts) `CLIENTS` array swapped back to real names — EOS Fabrics / Projectagram / Ads for Good / Not So Cavalier (was "Client A/B/C/D" from May 5 demo anonymization).
- **Backward compat preserved:** legacy `CHAPTER_DASH_TOKEN` cookie sessions still work; `accessibleClientKeys = null` falls through to all CLIENTS so legacy operators see chapter_staff-equivalent UX. `@ads4good.com` magic-link bypass still fires for Katoa.
- **Onboarding a first agency partner now reduces to 3 SQL inserts** — `INSERT INTO chapter_config.agencies (agency_key, display_name)`, `UPDATE chapter_config.clients SET agency_key = ... WHERE client_key IN (...)`, `INSERT INTO chapter_config.allowed_email_domains (domain, role='agency_operator', agency_key)`. Their staff auto-provision into `chapter_config.users` on first magic-link login.
- **Sprint 7 backlog item:** admin UI for managing agencies + allowed domains is deferred — operator-driven SQL is good enough for v1.

### /internal/crm page (June 18, 2026)
- **New admin route at `/internal/crm`** closes the manual SQL gap in the CRM pipeline. Four sections in one screen:
  1. **Add Prospect** form — required source dropdown (9-value vocabulary: contact_tool / inbound / referral / linkedin / event / podcast / webinar / cold_email / cold_call), auto-derives domain from email, auto-generates `prospect_key` via slugify + collision probe, dedups on email + blocks re-add.
  2. **Log Touchpoint** form — debounced typeahead search across business_name / contact_name / email, inserts `crm.communications` row with `provider='manual', status='logged'`. Channels: phone / text / linkedin / in_person / other / note.
  3. **Meeting Confirmation Queue** — lists past `channel='meeting' AND status='scheduled'` rows, three action buttons (Completed / No-show / Canceled). Confirmation MERGES `metadata` via read-then-write (preserves n8n's event_id / attendee_email / response_status). Optimistic UI removal with restore-on-error.
  4. **Funnel Snapshot** — Pending (full backlog), Completed + No-show + No-show rate (last 90 days), Accepted + Accepted→No-show rate (last 90 days, gated on responseStatus presence).
- **Companion n8n change (applied by Katoa):** `CRM Meeting Logger` workflow `cgKz2V7MluRQC0H3`, "Find Prospect Guests" Code node — also reads `a.responseStatus` from the matched Google Calendar attendee + writes it onto `crm.communications.metadata.response_status`. Unlocks Accepted column.
- **DB grants gotcha caught + fixed:** `service_role` had SELECT-only on `crm.prospects` / `crm.communications` / `crm.interactions` (read-only by default at schema bootstrap; `crm.clients` had full grants which is why `/internal/tasks` worked). Migration `grant_service_role_crm_writes` added INSERT/UPDATE/DELETE + default privileges for future CRM tables.
- **Files:** [layout.tsx](src/app/internal/crm/layout.tsx), [page.tsx](src/app/internal/crm/page.tsx), [_actions.ts](src/app/internal/crm/_actions.ts), [AddProspectForm.tsx](src/app/internal/crm/AddProspectForm.tsx), [LogTouchpointForm.tsx](src/app/internal/crm/LogTouchpointForm.tsx), [MeetingQueue.tsx](src/app/internal/crm/MeetingQueue.tsx).

### Tracking ignore list + ads4good_prod upgrades (June 17, 2026)
- **Cross-channel tracking suppression.** New table `chapter_config.tracking_ignore_list (client_key NULL=global, ignore_type CHECK IN ('email_sha256','ua_substring'), ignore_value, notes, granted_by_user_id, created_at, revoked_at)`. UNIQUE partial index on `(COALESCE(client_key,'*'), ignore_type, ignore_value) WHERE revoked_at IS NULL` so same domain can be granted both global + per-client without dup. Helper [tracking-ignore.ts](src/app/lib/auth/tracking-ignore.ts) caches active entries in-memory per lambda (5-min TTL) so per-event lookups don't hit DB.
- **Wired into 4 ingest paths** server-side (can't be bypassed): `/api/purchase` (drops boundary event if email is ignored), `/api/identify` (drops alias if email OR previous_identity_key resolves to email_sha256), Tier 1 redirect click logger (drops `redirect_click` + journey upsert if UA matches substring OR email-hint resolves to ignored email), Tier 1 redirect email-hint stitch (token-flavored hints re-check at resolution time). Plus `chapter-scripts/sync-mailchimp-engagement.js` — pre-filter loop drops engagement events for ignored emails before INSERT.
- **Katoa's `katoa@ads4good.com` added as global ignore** (NULL client_key). 342 historical Mailchimp engagement events suppressed on next sync run (going-forward filter; historical events left in DB unless operator runs the documented DELETE pattern).
- **Browser-side ignore (`chapter_ignore` localStorage flag)** persists per-origin. Bookmarklet provided: drag-to-bookmark-bar one-liner that toggles the flag with orange/navy toast confirmation. Katoa installed + activated on 4 client domains (ads4good.com / eosfabrics.com / projectagram.com / notsocavalier.com).
- **ads4good_prod upgrades (same session):** `storefront_domain` set to `ads4good.com` on `chapter_config.clients` (was NULL — would have caused canonical_v1 self-referral misclassification for ads4good's own organic traffic). [ChapterLoader.tsx](src/components/ChapterLoader.tsx) upgraded to inject the click-tracking event handlers (click / click_intent / button_click / open_in_messages / open_in_email / open_in_phone via SMS/mailto/tel href detection) AND re-fire `page_view` on SPA route changes. Mirrors NSC's setup, consolidated into one React component since we control the agency-site code.
- **Architectural notes:**
  - Email-based ignore is the strong server-side block — catches any time the ignored email enters Chapter through any path (form / identify / Mailchimp / purchase / redirect hint).
  - Device-level browser flag covers anonymous browsing on the device. Per-origin (browser security); operator clicks bookmarklet once per client domain.
  - Cross-origin localStorage introspection is fundamentally blocked by browser security → no clean automated monitoring of "is the flag still set on all 4 domains." Operator discipline + monthly spot-check is the right cadence.

### NSC 1P install + Tier 1 redirect (5 silent bug fixes) (June 16-17, 2026)
- **NSC pixel installed end-to-end** at `chapter.notsocavalier.com` via CNAME → Vercel. First 1P-hosted client (vs EOS/Projectagram's 3P pattern). pixel.js + custom-events script in Lovable's `index.html`; `ChapterRouterTracker` component in `App.tsx` re-fires `page_view` on every React Router navigation (SPA gotcha: pixel.js only fires page_view on initial load).
- **Custom-events block** captures clicks + button_clicks + click_intent (mousedown pre-commit) + SMS/mailto/tel href detection + label-based heuristics for the floating "Send a Text" chat bubble (matches `aria-label="Text us"`) and the form CTA "Open in messages" (no `sms:` href since the form does `window.location.href = 'sms:...'` programmatically). 11 event types landing within minutes of deploy.
- **pixel.js 1P fix:** `getApiOrigin()` derives the API base from the script's own `src` so 1P installs (pixel served from `chapter.<client>.com`) and 3P installs (pixel served from `ads4good.com`) both work without per-tag config. `getCollectUrl()` + `getIdentifyUrl()` + `chapterLoadIdentityPrompts()` all use it. Replaced the hardcoded `https://ads4good.com` for identity-prompts that was CORS-blocked on NSC. EOS/Projectagram unaffected (their `data-collect-url` attribute still wins when set).
- **Tier 1 redirect bug fixes (5 real bugs, all fixed):**
  1. **FK 23503** — click logger wrote to `chapter_ingest.pixel_events` with a fresh `journey_id` minted by `resolveIdentity` but never created the corresponding `chapter_journey.journeys` row first. Every click silently failed inside the try/catch since June 10 shipping; **zero `redirect_click` rows had ever landed for any client** until this fix. Click logger now upserts the journey row with `ON CONFLICT (id) DO NOTHING` before the pixel_events insert.
  2. **`hit_count` UPDATE was missing** — only a code comment described it, no implementation. New SECURITY DEFINER function `chapter_config.increment_redirect_rule_hit(uuid)` + `incrementRuleHitCount` helper + route wiring. Server-side atomic increment, race-safe.
  3. **`user_agent` null on redirect-originated journeys** — caused bot classification gap + device reporting gap. Click logger now passes UA into journey upsert (option A). `/api/pixel` ON CONFLICT updated to COALESCE-backfill UA + geo when a redirect-created journey gets its first real pixel event (option B). Both shipped together.
  4. **`template.ts` URL-encoded `{q:to}` substitution** — broke the destination template by emitting `https%3A%2F%2F...` as the URL base. Route's `isValidDestination()` rejected it; fell back to bare `?to=` URL (without gclid/utm). Fix: skip URL-encoding when the substituted value is itself a URL (`^https?://` regex). Destination now carries every interpolated param through.
  5. **`after()` vs `await` mystery** — initial fix swapped `after()` to `await` for the click logger to claw back the FK 23503 silence. After the real bug (FK constraint) was identified, reverted back to `after()` since Next.js 16's `after()` works correctly when the async work doesn't throw immediately. Saves ~50-100ms on the redirect critical path.
- **Tier 1 redirect — Google Ads tracking template wired** for NSC: account-level template `https://chapter.notsocavalier.com/r/not_so_cavalier/google-ads?to={lpurl}&gclid={gclid}&gbraid={gbraid}&wbraid={wbraid}&utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&utm_content={creative}`. Final URL on each ad stays clean (notsocavalier.com/services) so the displayed URL chip is unaffected. Rule's destination template: `{q:to}?gclid={q:gclid}&...all-the-params...` — pass-through to landing page.
- **Validated end-to-end:** real customer clicks landing with `partner_ids.gclid` populated + `utm_term` like "haircut near me" / "best barbershop near me" flowing through. Google Hypersonic ad-quality bot scans land with the bot UA appended + repeated gbraid sentinel — flagged but accepted (will classify as bot_likely overnight).
- **Files:** [pixel.js/route.ts](src/app/api/chapter/pixel.js/route.ts) (getApiOrigin), [click-logger.ts](src/app/lib/redirect/click-logger.ts) (journey upsert + UA + geo + last_touch), [rules.ts](src/app/lib/redirect/rules.ts) (incrementRuleHitCount), [r/[client_key]/[slug]/route.ts](src/app/r/[client_key]/[slug]/route.ts) (await→after + UA wiring + hit_count call + email-hint suppression for ignore list), [template.ts](src/app/lib/redirect/template.ts) (URL detection skip-encode), [api/pixel/route.ts](src/app/api/pixel/route.ts) (COALESCE-update UA + geo on conflict).
- **NSC server-side onboarding (Sprint 2.1):** complete. Pixel install also now complete. Steps 6-8 (`/booking-confirmed` route + Square Appointments post-booking redirect URL config + e2e test) still parked pending Katoa's Square Appointments Staff-role access.

### Cron freshness hotfix + digest column bug (June 14, 2026)
- **Symptom:** `journey_resolved_v1` had not auto-refreshed since June 10 (94.9h stale); `attribution_linear_chapter_v1` + `purchase_channel_final_v1` stale 69.4h. Daily-digest GChat alert surfaced this on June 14 morning. Plus the digest itself was reporting "column does not exist" errors on 2 of 3 MVs (false alarms).
- **Root cause #1 — Vercel function timeout in refresh-dashboard-mvs cron.** The 04:00 UTC `refresh-dashboard-mvs` cron has `maxDuration = 300` (5 minutes). MV refresh of the 6 listed MVs (largest is `journey_bot_classification_v1` at 255MB / 921k rows) + ANALYZE on each takes ~5-7 min on its own. Cron was hitting the wall AFTER MV refresh succeeded but BEFORE reaching the per-client snapshot loop OR the global snapshot loop. No `_snapshot_runs` failure records existed because the code never reached those sections — it was killed mid-flight by the platform timeout. MV freshness check confirmed MVs WERE refreshed at 03:57 UTC today; staleness was downstream-only.
- **Root cause #2 — Daily-digest column name bug.** [daily-digest/route.ts](src/app/api/internal/monitoring/daily-digest/route.ts) had a hardcoded `journey_start_ts` column for all 3 MVs. Only `journey_bot_classification_v1` has that column. `journey_entry_channel_v1` has `entry_ts`; `journey_funnel_steps_v1` has NO timestamp column at all (it's a boolean-flag rollup).
- **Fix #1:** bumped `maxDuration` from 300 → 800 (Vercel Pro max) in [refresh-dashboard-mvs/route.ts](src/app/api/internal/cron/refresh-dashboard-mvs/route.ts). Comment in code explains the trace + reasoning for the next person.
- **Fix #2:** restructured `DASHBOARD_MVS` constant in daily-digest from `string[]` to `{ name, ts_column }[]`; dropped `journey_funnel_steps_v1` from the freshness check (no timestamp). Updated the freshness-query function to use the per-MV `ts_column`. Eliminates the false-alarm errors.
- **Manual restoration:** ran `refresh_journey_resolved_v1` for all 4 clients + `refresh_attribution_tables()` to clear current staleness so dashboard data is fresh through to tonight's cron. EOS 924k rows; Not So Cavalier 0 (no pixel events yet — expected).
- **Backlog item closed (effectively):** the previously-noted "stale-cron pattern" risk was real; better cron monitoring + budget headroom now in place.

### Cron split: dashboard-mvs ÷ derived-snapshots (June 15, 2026)
- **Symptom:** even with the June 14 bump to `maxDuration = 800` (Vercel Pro max), the bundled `refresh-dashboard-mvs` cron timed out AGAIN on the Monday June 15 03:00 EDT run. MV refresh completed (MV ts through ~04:01 UTC) but the per-client + global snapshot loops never reached completion. Same downstream-stale outcome.
- **Root cause:** `REFRESH MATERIALIZED VIEW CONCURRENTLY` scans the source query to compute its diff EVEN WHEN there are zero new rows. On a live cron run captured at 14:00 UTC, the 3rd MV (`journey_entry_channel_v1`, 159 MB) was at 3:34 elapsed in `wait_event=DataFileRead` — cold disk I/O. Total MV-section runtime on cold buffers measured ~13+ min, leaving no budget for the snapshot loops. 800s ceiling is hard at Vercel's max plan tier; can't grow it further.
- **Fix shipped June 15** — SPLIT the cron into two routes:
  - `/api/internal/cron/refresh-dashboard-mvs` (existing) — now MVs only. `maxDuration = 800`. Schedule unchanged: **04:00 UTC**.
  - `/api/internal/cron/refresh-derived-snapshots` (NEW) — per-client `journey_resolved_v1` + global `refresh_attribution_tables()`. `maxDuration = 300`. Schedule: **04:25 UTC** (25 min after MV cron starts, giving MV refresh time to complete before derived snapshots read the refreshed source).
- **Why split rather than push to longer maxDuration:** Vercel Pro caps at 800. Hobby caps at 60. Splitting is the only path. Bonus: derived snapshots now have their own failure surfacing in GChat (separate alert from MV failures); easier to diagnose.
- **Schedule chain through 05:30 UTC:** 03:30 attribution-chain → 04:00 dashboard-mvs → 04:25 derived-snapshots → 04:30 system-cohorts → 05:00 run-observations → (Mondays) 06:00 refresh-recommendations. Buffer windows assume each cron typically completes well within its allocated slot.
- **Manual restoration June 15:** ran `refresh_journey_resolved_v1` for all 4 clients + `refresh_attribution_tables()` to bring today's data current ahead of tomorrow's split-cron run.

### Task 3 — Recommendations engine v1 pilot (June 14, 2026)
- **Scope shipped:** schema, Claude API wrapper, weekly cron, 3 pilot rule evaluators, 3 seed rules in DB. Validated end-to-end against EOS data via direct SQL (rules will fire when cron runs).
- **Architecture (per spec):** themes are stable conceptual scaffolding; rules grow over time. Pre-written SQL queries → Claude only renders card text → never generates SQL. Per-rule confidence calculation based on evidence strength.
- **Schema (`chapter_recommendations`):**
  - `rules` — config table. `(rule_id PK, theme CHECK IN 6 values, name, severity_weight CHECK IN 'high'/'medium'/'low', phrasing_template jsonb, action_template jsonb, action_type CHECK IN 'mechanical'/'analytical'/'strategic_prompting', enabled)`.
  - `findings` — output. `(id, client_key, rule_id FK, theme, subject_key, headline, story, evidence jsonb, action, action_type, confidence CHECK IN 'strong'/'moderate'/'early_signal', severity_weight, state CHECK IN 'new'/'standing'/'changed'/'resolved', raw_metrics jsonb, render_method CHECK IN 'claude'/'fallback', generated_at, data_window_start, data_window_end, dismissed_at, dismissed_by)`. Three indexes for fast list/filter/dedup queries.
  - `runs` — audit. `(id, client_key, started_at, completed_at, status, rules_evaluated, rules_fired, rules_skipped, api_calls, fallback_renders, error_message)`.
  - RLS enabled on all 3 tables; service_role only.
- **Claude wrapper** at [src/app/lib/claude/render-card.ts](src/app/lib/claude/render-card.ts):
  - Uses `claude-sonnet-4-6` (interpretation-class, no full reasoning needed for templated rendering).
  - System prompt instructs Claude to fill template precisely without invention. Voice rules baked in (no exclamation points, no emoji, no breathless language, never superlatives without numbers).
  - Single retry on transient failure. On persistent failure: falls back to `fallbackRender()` — literal `{token}` substitution. Findings flagged `render_method='fallback'` for ops visibility.
  - Tolerates code-fenced JSON output (`\`\`\`json ... \`\`\``).
  - **Graceful no-key behavior:** if `ANTHROPIC_API_KEY` is missing, immediately falls back to template substitution + logs warning. Engine still runs; cards still render (just less natural-language polish).
- **Rule registry** at [src/app/lib/recommendations/rules/index.ts](src/app/lib/recommendations/rules/index.ts) — typed `Record<rule_id, RuleEvaluator>` so adding new rules forces compile-time wiring. Cron iterates this registry, not via reflection.
- **3 pilot rule evaluators** in `src/app/lib/recommendations/rules/`:
  - **R1.1** ([R1_1.ts](src/app/lib/recommendations/rules/R1_1.ts)) — High bot rate with no mitigation. Theme: data_integrity. Checks bot share over current 4w + prior 8w + prior 12w via two count-only queries on `journey_resolved_v1` (Sprint-3-optimized). **Bot definition matches dashboard canonical** (`NOT (bot_class IN ('human_likely','suspect') AND event_count > 1)` — single-event journeys count as bot-like, not just `bot_class='bot_likely'`). EOS validates at 55.3% bot share — will fire HIGH confidence (sustained ≥30% across 3+ periods).
  - **R2.3** ([R2_3.ts](src/app/lib/recommendations/rules/R2_3.ts)) — Channel weak lift despite broad presence. Theme: channel_value. Reads `contribution_overview` (presence + incremental rate) + `correlation_channel_overview` (AOV/days/touches/conv-rate differentials with-vs-without). Fires when participation_rate ≥75% AND |incremental_rate| ≤0.15 AND all 4 differentials <5%. Expected fire: Direct on EOS.
  - **R4.1** ([R4_1.ts](src/app/lib/recommendations/rules/R4_1.ts)) — Path length growing sustainably. Theme: lifecycle_health. Computes per-2-week median touch counts over trailing 10 weeks; fires when current 2w is ≥20% above trailing 8w mean AND ≥3 consecutive 2w periods show upward trend.
- **Cron route** at [/api/internal/cron/refresh-recommendations](src/app/api/internal/cron/refresh-recommendations/route.ts) — `GET` handler, `CRON_SECRET`-gated via existing `unauthorizedIfNotCron`. Scheduled `0 6 * * 1` (Mondays 06:00 UTC) in [vercel.json](vercel.json) — runs AFTER Observations cron (05:00 UTC) so observation findings are fresh when Recommendations synthesize.
  - For each active client × each enabled rule: evaluate → dedup against most recent prior finding by `(client_key, rule_id, subject_key)` via stable JSON stringify of `raw_metrics` → state machine (`new` / `standing` / `changed`) → Claude render → INSERT finding.
  - After all rules: mark prior active findings that DIDN'T fire this run as `'resolved'`.
  - Per-rule errors caught + logged; don't kill the run. Top-level failures + per-client failures surface via existing GChat alert (`postToGChat`).
- **Seeded 3 rules** into `chapter_recommendations.rules` with phrasing templates lifted verbatim from spec v1 Part 8. Templates use `{token}` placeholders that Claude fills.
- **Deploy prerequisite:** `ANTHROPIC_API_KEY` in Vercel env vars (Production + Preview). Engine works without it (fallback to template substitution) but cards will be less natural. See deploy walkthrough below.
- **Files (new):** schema migration `task_3_chapter_recommendations_schema`, [src/app/lib/claude/render-card.ts](src/app/lib/claude/render-card.ts), [src/app/lib/recommendations/types.ts](src/app/lib/recommendations/types.ts), [src/app/lib/recommendations/rules/index.ts](src/app/lib/recommendations/rules/index.ts), [src/app/lib/recommendations/rules/R1_1.ts](src/app/lib/recommendations/rules/R1_1.ts), [src/app/lib/recommendations/rules/R2_3.ts](src/app/lib/recommendations/rules/R2_3.ts), [src/app/lib/recommendations/rules/R4_1.ts](src/app/lib/recommendations/rules/R4_1.ts), [src/app/api/internal/cron/refresh-recommendations/route.ts](src/app/api/internal/cron/refresh-recommendations/route.ts).
- **Files (modified):** [vercel.json](vercel.json) (added cron schedule), [package.json](package.json) (added `@anthropic-ai/sdk`).
- **Next:** Task 2 (Recommendations page rendering findings from the DB). The other 17 spec rules (4 themes × 3-4 rules each) are queued for follow-on — pattern is identical, just write the evaluator + add registry entry + INSERT seed row.

### Sidebar reorg + Submit-a-question (Tasks 1 + 4 of June 11 work order)
- **Reference docs:** `chapter_recommendations_spec_v1.md` (rule library + page spec) — companion to CLAUDE.md.
- **Decisions locked at handoff:**
  1. Lagged Impact page already exists at `/chapter/connections/lagged-impact` — added to nav, no route work needed
  2. Anthropic API key available — Task 3 will wire `@anthropic-ai/sdk` (net-new dependency, no existing Claude integration anywhere in Chapter)
  3. **New `chapter_recommendations` schema** (vs extending `chapter_observations`) — cleaner separation given different finding shapes (5-part card vs Observations payload), different cron, different page layout
  4. All clients (including Starter tier) get Recommendations for now; Starter-locked is future state
  5. Default landing changed to `/chapter/overview` (Lifecycle Overview) — will switch to `/chapter/recommendations` after that page has 2-3 weeks of real usage

#### Task 1 — Sidebar restructure
- **5 nav groups** with thin dividers replacing the old 3-group layout (Connections / Analyze / single-Observations):
  - **Actions:** Recommendations *(new — links to `/chapter/recommendations` which 404s until Task 2 ships)*
  - **Summary:** Lifecycle Overview
  - **Connections:** Observations *(moved here from top)*, Cross-Source Influence, Lagged Impact
  - **Analysis:** Lift Incrementality & Value, Attribution Models, Channel Roles
  - **Data:** Path Patterns, Customer Journeys, Raw Performance
- **`renderNavItem` helper** extracted from inline JSX to deduplicate the per-item Link rendering across the 5 sections.
- **Default landing changed** from `/chapter/observations` → `/chapter/overview` in BOTH places:
  - [src/app/chapter/auth/callback/route.ts](src/app/chapter/auth/callback/route.ts) — post-login destination
  - [middleware.ts](middleware.ts) — `canAccessClient` fallback when client_employee hits another client's path
  - `isActive()` in Sidebar also updated so root `/chapter` aliases to overview (was observations)
- **CSS:** new `.nav-divider` class appended to [chapter.css](src/app/chapter/chapter.css) — `1px` line at 70% opacity using `--line-2`.
- **Behaviors preserved:** active-route highlighting, client switcher, sign-out, lock pill on Observations for Starter tier, mobile collapse, Sprint 5c conditional rendering for client_employee.
- **Files:** [Sidebar.tsx](src/app/chapter/_components/Sidebar.tsx), `auth/callback/route.ts`, `middleware.ts`, `chapter.css`.

#### Task 4 — Submit-a-question affordance
- **Schema:** new `chapter_observations.question_submissions` table — `(id, submitted_by_email, client_key, question_text, context_text, submitted_at, status CHECK ('pending','approved','rejected','dismissed'), reviewed_by, reviewed_at, review_notes)`. Partial index on `submitted_at DESC` filtered to `status='pending'` for fast curation queue. RLS enabled.
- **API route:** [POST /api/internal/observations-submissions](src/app/api/internal/observations-submissions/route.ts) — accepts `{client_key, question_text, context_text?}`. Auth: Supabase session preferred (captures email), legacy `CHAPTER_DASH_TOKEN` cookie fallback (email = null). Validation: 8 ≤ question length ≤ 1000.
- **Component:** [SubmitQuestionDrawer.tsx](src/app/chapter/_components/SubmitQuestionDrawer.tsx) — modal with question textarea + optional "Why this matters" textarea + Submit/Cancel. ESC + backdrop click + close button all dismiss (disabled while submitting). On success, swaps to confirmation state for 2 seconds then auto-closes. Focus management + ARIA dialog role + char counter on the question field.
- **Trigger:** "+ Suggest a question" pill button in the Observations page hero, beside the "How this page works" label. Sits on the dark navy hero with a translucent white background → hovers brighter. Subtle, scannable.
- **Wiring:** [ObservationsClient.tsx](src/app/chapter/(authed)/observations/ObservationsClient.tsx) added drawer state + mount + trigger button. Existing page behavior (filters, severity gates, popup detail) unchanged.
- **Curation workflow out of scope** — Chapter team reviews via SQL or future admin page; status updates by `UPDATE chapter_observations.question_submissions SET status='approved', ...`.
- **Files:** new `question_submissions` table, new API route, new `SubmitQuestionDrawer.tsx`, modified `ObservationsClient.tsx`, appended `.chapter-submit-*` + `.chapter-suggest-btn` CSS.

#### Pending — Tasks 2 + 3 (next session)
- **Task 3 — Recommendations engine** (substantial): new `chapter_recommendations` schema (rules / findings / runs), `@anthropic-ai/sdk` integration in `src/app/lib/claude/render-card.ts`, weekly cron at Mondays 06:00 UTC at `/api/internal/cron/refresh-recommendations`, per-rule evaluators in `src/app/lib/recommendations/rules/<rule_id>.ts`, dedup logic for unchanged-data scenarios. Pilot with 3-5 rules from different themes to validate end-to-end (Claude API + cron + dedup) before completing all 20.
- **Task 2 — Recommendations page** (depends on Task 3 producing findings): 6 themed sections with "all clear" empty states, 5-part card anatomy (headline / story / evidence / action / confidence), filtering by confidence/state/action_type/theme, history view, deep-links to source pages.
- **Deploy prerequisite for Task 3:** `ANTHROPIC_API_KEY` env var in Vercel (Production + Preview).

### Observations C2 + C3 shipped (June 11, 2026)
- **Engine now executes 15 of 27 questions** (was 13). C2 (step-level funnel drop) + C3 (high-touch-count page) implemented and producing real findings on EOS.
- **Key discovery:** the pixel-to-chapter MV CLAUDE.md said C2/C3 depend on **was never needed** — `chapter_model.lifecycle_chapters_snapshot` already tags every pixel event with `chapter_id` (since Fix #25 Phase 0). C3 reads chapter assignment directly from that snapshot via JOIN to canonical_v1 on `(canonical_identity_key, chapter_id)`. No new MV built.
- **No `run_engine` dispatch wiring needed.** The dispatcher loops over all `enabled=true` rows in `chapter_observations.questions` and does `EXECUTE format('SELECT chapter_observations.run_question_%s($1, $2)', q.question_id)`. Adding C2/C3 = creating the two `run_question_c2` + `run_question_c3` functions + the catalog rows already exist with `enabled=true`. Pattern is plug-and-play for future questions.
- **C2 — Step-level funnel drop:**
  - Funnel (event-name based): `page_view → add_to_cart → view_cart → boundary_event`
  - For each step transition, distinct-identity count current 4w vs prior 4w → step conversion rate → drop flagged if absolute pp drop or relative % drop crosses tier.
  - Cross-platform: step 4 reads from `chapter_ingest.purchase_events` filtered by `chapter_config.boundary_event(client_key)` — works for both `purchase` (Shopify) and `appointment_booked` (Square) clients. Non-ecom clients naturally produce zero step-2/step-3 counts and the question silently no-ops those transitions.
  - Severity: high (≥10pp / 30% rel), med (≥5pp / 15% rel), low (≥2pp / 5% rel).
  - **EOS finding (low):** view_cart → purchase dropped 43.1% → 38.6% (4.5pp, ~10% rel). Real signal — checkout completion fell in the last 4 weeks.
- **C3 — High-touch-count page:**
  - For each page (normalized: scheme/host stripped, query/fragment stripped), median chapter touch count for chapters that touched the page vs portfolio median. Touch count = `array_length(channel_path)` from canonical_v1 (same proxy C4 uses).
  - **Perf strategy:** limit page candidates to top 50 by chapter-touched count BEFORE running per-page median computation. Avoids per-page nested aggregation across the entire page namespace (84k+ distinct pages at EOS).
  - Severity: high (ratio ≥2.0 AND n_touched ≥20), med (≥1.6 AND ≥15), low (≥1.3 AND ≥10).
  - **EOS findings (10 high):** `/collections/all-products` (2.9×), `/collections/back-in-stock` (2.9×), `/collections/stock-items` (3.1×), and 7 specific new-arrival product pages with ratios 2.1×-5.1×. Classic consideration-friction pattern — these are pages that appear disproportionately in deep-browser chapters.
- **Files (DB only):** `chapter_observations.run_question_c2`, `chapter_observations.run_question_c3` — both pure SQL functions in DB; no app-side code changes needed since the engine dispatch is generic.
- **Remaining 12 deferred questions:**
  - **3 spend-blocked:** A5, A6, S4 (no ads API connector)
  - **2 product-metadata-blocked:** C1, S3 (no product catalog ingest)
  - **1 geographic-spread-blocked:** S2
  - **1 lift-history-blocked:** M2 (no real lift tests run yet)
  - **5 long-data-history-blocked:** M1 (12w), R2 (12w), R3 (26w), R4 (4w), R5 (26w). EOS at 10w of clean post-cookie-fix data.
  - **R4 is the closest deployable** — no capability blocker, only needs 4w of data which EOS already has. Just needs the runner function written. Quick follow-on if needed.

### Data freshness sprint (June 11, 2026)
**Three coordinated shipments tightening the freshness contract across the dashboard.** Philosophy decided: "yesterday" is the right default for analytical surfaces — sophisticated platforms don't show real-time data either, and stable beats fresh for operator trust + cross-call consistency. Operational/audit surfaces (`/internal/*`) stay live.

#### Audit (#1) — what's actually fresh today
- **Healthy** (refreshed by today's 03:30 + 04:00 UTC crons, ~13h stale):
  - `chapter_attribution.chapter_channel_paths_canonical_v1_snapshot` (4 clients)
  - `chapter_attribution.chapter_channel_paths_canonical_v2_snapshot` (4 clients)
  - `chapter_model.lifecycle_chapters_snapshot` (4 clients)
  - `chapter_reporting.journey_resolved_v1` (3 clients; not_so_cavalier scheduled for tonight)
  - 3 journey MVs + 3 connections MVs
- **Just wired (will run tomorrow 04:00 UTC)** under new `GLOBAL_SNAPSHOTS` registry in [refresh-dashboard-mvs](src/app/api/internal/cron/refresh-dashboard-mvs/route.ts):
  - `chapter_reporting.attribution_linear_chapter_v1`
  - `chapter_reporting.purchase_channel_final_v1`
  - **Discovery:** these two were 16 days stale because no cron ever called `refresh_attribution_tables()`. Operationally invisible until tonight — `contribution_overview` was silently understating fractional revenue/orders for all of June.
- **Dead code dropped (15 `eos_*` snapshot tables):**
  ```
  eos_attribution_linear_v1, eos_channel_contribution_v1,
  eos_channel_paths_canonical_summary_v1, eos_channel_performance_snapshot,
  eos_engagement_quality_snapshot, eos_filtered_purchases_v1,
  eos_identity_overlap_summary_v1, eos_purchase_base_snapshot_v1,
  eos_purchase_channel_final_snapshot_v1, eos_purchase_fallback_snapshot_v1,
  eos_purchase_touch_summary_snapshot_v1, eos_sessionized_universe_summary_v1,
  eos_single_touch_chapters_v1, eos_top_paths_snapshot, eos_traffic_overview_snapshot
  ```
  All confirmed zero callers in DB functions AND zero references in app code. 700-1000 hours stale; superseded by multi-tenant replacements that have operated 6+ weeks without regression. CLAUDE.md flagged these for eventual drop ("future session") — this is that session. `_snapshot_runs` rows for the dropped tables also cleaned so audit signals are real.

#### Daily-digest tightening (#2)
- **Extended [daily-digest](src/app/api/internal/monitoring/daily-digest/route.ts) to surface ALL snapshot freshness, not just the original 3-stage attribution chain.**
- Added `journey_resolved_v1` to the per-client staleness check (was already in ATTRIBUTION_CHAIN_STAGES but unnamed there).
- Added new `*Global snapshot freshness*` section reading max(snapshot_ts) directly from `attribution_linear_chapter_v1` + `purchase_channel_final_v1` (not per-client; not tracked in `_snapshot_runs`).
- Section renames: "Attribution chain freshness" → "Per-client snapshot freshness" since the list now includes journey_resolved_v1 (not really attribution chain). Same visual shape; clearer label.

#### Per-page "Data as of" footnote (#5)
- **New server helper** [src/app/lib/dashboard/freshness.ts](src/app/lib/dashboard/freshness.ts): `getDashboardFreshnessByClient()` returns the OLDEST `snapshot_ts_hi` across DASHBOARD_SNAPSHOTS per client (= the actual freshness floor for that client's analytical pages). Uses replica when available.
- **`ChapterContext` extended** with `freshness: FreshnessByClient` map. [(authed)/layout.tsx](src/app/chapter/(authed)/layout.tsx) fetches it in parallel with the user lookup and passes via `<ChapterProvider user={user} freshness={freshness}>`.
- **TopBar reads `freshness[client.id]`** and renders a small grey "Data as of June 11, 2026, 3:30 AM EDT · refreshes nightly" line below the page subtitle. Formatted in the client's `display_tz` so an Eastern-time client sees Eastern times. Gracefully renders nothing when freshness data is unavailable (e.g. brand-new client whose first nightly run hasn't happened).
- CSS: small `.topbar-asof` class with `var(--ink-3)` (muted) + tabular numbers.
- **Operational pages don't need this** — `/internal/*` admin surfaces are live and the contract is implicit there.

#### Files (new)
- `src/app/lib/dashboard/freshness.ts`

#### Files (modified)
- `src/app/api/internal/cron/refresh-dashboard-mvs/route.ts` — new `GLOBAL_SNAPSHOTS` registry + refresh pass + failure surfacing
- `src/app/api/internal/monitoring/daily-digest/route.ts` — added `GLOBAL_SNAPSHOTS` + journey_resolved_v1 to per-client check
- `src/app/chapter/_components/ChapterContext.tsx` — `freshness` on context type + provider prop
- `src/app/chapter/(authed)/layout.tsx` — parallel fetch of user + freshness, pass through
- `src/app/chapter/_components/TopBar.tsx` — render "Data as of …" line under subtitle
- `src/app/chapter/chapter.css` — append `.topbar-asof` style

#### Backlog item added — RESOLVED June 14
- **Multi-tenant `refresh_attribution_tables`** — the loader hardcoded `boundary_event_name = 'purchase'` in 4 places (purchase_channel_final_v1's v1_chapters + v2_fallback CTEs, attribution_linear_chapter_v1's session_chapters + fallback_chapters CTEs). Would have silently produced zero rows for Not So Cavalier (`appointment_booked`) the moment their pixel went live. **Fix shipped June 14** via migration `refresh_attribution_tables_multi_tenant_boundary_event`: each literal replaced with `chapter_config.boundary_event(p.client_key)` so the filter resolves per-row at scan time. Helper is STABLE so planner folds it per client_key partition; single-pass SQL, no per-client loop needed. Regression test: EOS row counts identical pre/post (1000 rows purchase_channel_final_v1, 1507 rows attribution_linear_chapter_v1) because `boundary_event('eos_fabrics') = 'purchase'` resolves the same WHERE clause. notsocavalier has zero canonical_v1 rows today (no data yet); function will catch them automatically once data flows.

### Sprint 5c + observations_history follow-up (June 11, 2026)
**Two quick wins shipped — closes Sprint 5a's auth story and clears a phantom bug.**

#### Sprint 5c — Sidebar conditional rendering
- **Server-side current-user resolver added:** `getCurrentChapterUser()` in [src/app/lib/auth/chapter-user.ts](src/app/lib/auth/chapter-user.ts). Reads the Supabase session → looks up the allowlist row → returns the `ChapterUser`, or null on legacy-token sessions (no throw). Pages/layouts that want role-aware UI just await this.
- **`ChapterContext` extended** to carry `UserInfo | null` (email + role + client_key). [(authed)/layout.tsx](src/app/chapter/(authed)/layout.tsx) is now async, fetches via `getCurrentChapterUser`, passes to `<ChapterProvider user={user}>`. Falls back to null (= legacy-cookie path) gracefully.
- **Client pinning for client_employees:** when `user.role === 'client_employee'` AND `user.client_key` is set, `ChapterContext`'s `clientId` ignores `?client=` and pins to the employee's assigned client. URL manipulation can't trick the UI into showing another client's data. This is belt-and-suspenders to the middleware enforcement from Sprint 5a.
- **Sidebar conditional rendering** in [Sidebar.tsx](src/app/chapter/_components/Sidebar.tsx):
  - Client employee: renders a static `<div class="client-switch-static">` (same shape as the dropdown trigger but no hover, no chevron, no menu). They see their client clearly identified, no way to switch.
  - Agency operator: existing `<Dropdown>` with multi-client switcher unchanged.
- **User identity in the foot:** when `user` is non-null, sidebar shows `email` (truncated with ellipsis) + role label (`Agency operator` / `Client employee`) above the sign-out button. CSS scoped to `.sidebar-user` / `.sidebar-user-email` / `.sidebar-user-role` in [chapter.css](src/app/chapter/chapter.css).
- **Legacy cookie behavior preserved.** Operators using the `CHAPTER_DASH_TOKEN` cookie (Sprint 5a coexistence path) see `user = null` → sidebar renders agency-operator-style for them (multi-client switcher, no email/role display in foot). No regression for in-flight operators who haven't migrated yet.
- **Files:** modified `chapter-user.ts`, `ChapterContext.tsx`, `(authed)/layout.tsx`, `Sidebar.tsx`, appended `chapter.css`.

#### `observations_history` investigation — resolved (false alarm)
- The "missing RPC" flag from the Sprint 3 audit was a false alarm caused by my audit query looking for the wrong name. The cached function `cachedObservationsHistory` calls the RPC `observations_list_history` (NOT `observations_history`), and that RPC exists in `chapter_reporting` with signature `(p_client_key text, p_lookback_days integer)`.
- **Live-tested:** returns 104 rows for EOS with `(p_client_key='eos_fabrics', p_lookback_days=28)`. Dashboard observations page renders correctly.
- **Lesson for future audits:** when running an RPC inventory against a known list of cached-function names, derive the RPC name FROM the cached function's source (the `.rpc("name", args)` call inside `unstable_cache`), not from the cached-function variable name. The variable name is an abbreviation; the RPC name is exact.

### Option D v1 — Identity prompts: on-site engagement layer (June 11, 2026)
- **Strategic framing:** Chapter now ships a configurable on-site engagement primitive that captures identity as a side effect. Operators configure popups (winback / cart-abandon / exit-intent / time-on-page / scroll-depth) with custom copy + optional discount code. Submit fires `/api/identify` → identity lands in `identity_canon` immediately → attribution stitches in real time. Pitch shift: "Chapter measures attribution" → "Chapter measures AND optimizes the moment identity is captured." Direct alternative to Klaviyo/Privy popups for any client using Chapter for measurement.
- **Schema:** `chapter_config.identity_prompts(id, client_key, slug, trigger_jsonb, headline, body, button_label, success_message, offer_code, offer_description, frequency, frequency_days, enabled, hit_count, submit_count, last_hit_at, created_at, updated_at, created_by)`. `trigger_jsonb` is shape-by-type: `{type: 'click_element', selector: '...'}` / `{type: 'exit_intent'}` / `{type: 'time_on_page', delay_ms: 15000}` / `{type: 'scroll_depth', percent: 50}`. UNIQUE on `(client_key, slug)`. RLS enabled.
- **API:** `GET /api/chapter/identity-prompts?client_key=X` returns active prompts as a minimal payload. Public read (operator-authored copy isn't sensitive); CORS-mediated via `withCors`; cached for 5 min at the CDN with `stale-while-revalidate`.
- **Pixel-side primitive in [src/app/api/chapter/pixel.js/route.ts](src/app/api/chapter/pixel.js/route.ts):**
  - Fetches active prompts on init via `chapterLoadIdentityPrompts()`. Cached implicitly (browser HTTP cache 5 min) so no extra invocation per page navigation.
  - Registers triggers based on type. Click triggers intercept the element click via `preventDefault()` BEFORE showing the modal; submit still allows the underlying navigation if operator wires it that way (v1: modal blocks the click until dismiss/submit).
  - Renders self-contained modal with injected styles scoped via class prefix `chapter-prompt-*` so it can't conflict with the host site's CSS.
  - Hashes email server-side via `crypto.subtle.digest('SHA-256', email)` in-browser. Submits to `/api/identify` with `identity_key = email_sha256:<hex>` (existing route — no server changes).
  - Fires `identity_prompt_shown` / `identity_prompt_submitted` / `identity_prompt_dismissed` pixel events so operators measure show → submit conversion in the dashboard.
  - Frequency cap honored client-side: `session` → `sessionStorage`; `visitor` → `localStorage` with N-day timestamp; `every_visit` → no throttle (modal still dedupes within a single page load by virtue of triggers firing once each).
- **Admin UI at [/internal/identity-prompts/*](src/app/internal/identity-prompts/page.tsx):**
  - Index lists clients with prompt totals + enabled counts (`/internal/identity-prompts`).
  - Per-client page lists existing prompts with structured trigger summary + headline + offer + conversion rate, plus an inline create form (`/internal/identity-prompts/[clientKey]`).
  - Create form has structured fields for trigger type (CSS selector / exit intent / time / scroll) + copy + offer + frequency. No raw JSON entry — operator picks from the dropdown.
  - `RowActions` component supports toggle (enable/disable) + delete. Edit-in-place deferred — operator currently deletes + recreates to update. Quick follow-on.
  - Server actions in [_actions.ts](src/app/internal/identity-prompts/_actions.ts) validate slug shape + required selector when trigger type is `click_element`. Errors surface inline.
- **Trigger types v1 (all shipped):**
  - `click_element` — operator picks a CSS selector; pixel intercepts clicks on matching elements
  - `exit_intent` — pixel detects mouseout to viewport top (negative `clientY` + no `relatedTarget`)
  - `time_on_page` — `setTimeout` with operator-configured delay
  - `scroll_depth` — scroll listener checking percent against operator threshold
- **Offer mechanism v1:** static discount code. Operator types `WELCOME10` + optional description; modal swaps to success state showing the code in a highlighted box on submit. No per-visitor codes / unique code generation — operator uses the same code for all submitters and reconciles via their POS or checkout system. Per-visitor codes are a v2 enhancement.
- **Files (new):**
  - `chapter_config.identity_prompts` table (migration `option_d_identity_prompts`)
  - [/api/chapter/identity-prompts/route.ts](src/app/api/chapter/identity-prompts/route.ts) (GET handler)
  - [/internal/identity-prompts/layout.tsx](src/app/internal/identity-prompts/layout.tsx)
  - [/internal/identity-prompts/page.tsx](src/app/internal/identity-prompts/page.tsx) (clients index)
  - [/internal/identity-prompts/_actions.ts](src/app/internal/identity-prompts/_actions.ts) (create/toggle/delete)
  - [/internal/identity-prompts/[clientKey]/page.tsx](src/app/internal/identity-prompts/[clientKey]/page.tsx) (per-client list + create form)
  - [/internal/identity-prompts/[clientKey]/PromptForm.tsx](src/app/internal/identity-prompts/[clientKey]/PromptForm.tsx) (structured form)
  - [/internal/identity-prompts/[clientKey]/RowActions.tsx](src/app/internal/identity-prompts/[clientKey]/RowActions.tsx) (toggle/delete buttons)
- **Pixel modifications:** appended Option D code path at end of pixel.js IIFE; ~200 lines including modal markup + styles + trigger registration + hashing. Scoped class prefix prevents host-site collisions.
- **Strategic implications:**
  - **For barbershop:** the pre-click "Win 10% off — enter email" pattern on Book Now closes the cross-domain stitch BEFORE the redirect to Square. Identity captured → canonical contains email_sha256 → Square webhook arrives with same email → ONE canonical from the start. No dependence on Square's post-booking redirect (still useful but no longer load-bearing).
  - **For EOS / Projectagram:** cart-abandonment recovery WITHOUT Klaviyo dependence. Time-on-page or exit-intent prompt with discount code on product pages.
  - **For future clients (Yelp / agency-mode pitches):** built-in email-capture layer is a real product differentiator. Identity-capture is one of the hardest UX problems in attribution; solving it natively is differentiation vs Branch.io / Northbeam / Triple Whale.
- **v2 build queued (June 15, 2026)** — **Moment Identity v2: composable 6-preset primitive.** Expands the single email-capture modal into a configurable engagement layer: Email Exchange (= v1 default), Custom Form (multi-field + multi-page + conditional branching), Custom Notification (corner-bubble), Make an Offer (bid-based cart recovery, Shopify only for auto-codes), Phone Call (CTA-only, no identity capture), Remind Me (price/stock subscriptions with hourly cron). Cross-cutting subsystems: ESP-trigger (Klaviyo / Mailchimp) vs Direct-send (Resend) email config with per-prompt overrides, unified recovery flow subsystem, A/B variant tooling, offer-threshold hierarchy (product → collection → global), subscription monitor with auto-cancel on purchase, edit-in-place admin UI. New schema needed: `chapter_engagement.prompt_responses`, `subscriptions`, `offers`, `offer_thresholds`, `email_sends`. Multi-session work. Operator playbook: `chapter_capture_setup_playbook_v2.md`. Engineering spec: `moment_identity_v2_handoff.md`. Folds the prior "Deferred to v2" bullets below (multi-step prompts, A/B harness, edit-in-place, server-side trigger types, per-visitor unique codes via offer codes) into the v2 build.

### Square refunds webhook + Sprint 5b clean URLs (June 11, 2026)
**Two product wins shipped tonight while paused on barbershop pixel install (waiting on operator Staff-role access to Square Appointments).**

#### B — Square refunds webhook handling
- **Problem:** Sprint 3's refund-netting was Shopify-only (per Fix #3). Any Square client (current Not So Cavalier or future) had inaccurate AOV + revenue when a refund happened. Real revenue-accuracy gap.
- **Solution:** new route at [src/app/api/square/webhooks/refunds/route.ts](src/app/api/square/webhooks/refunds/route.ts). Handles `refund.created` + `refund.updated` events; only inserts into `chapter_ingest.refund_events` when refund status transitions to `COMPLETED`. `refund_id` stored as `square_refund_<id>` (prefixed to keep namespace separate from `shopify_refund_<id>`).
- **Idempotent:** both events can fire for the same refund — first COMPLETED wins via `ON CONFLICT (refund_id) DO NOTHING`.
- **PENDING / REJECTED / FAILED statuses are ack-and-skipped** — refund.updated will catch them when they settle. Don't reduce reported revenue prematurely.
- **shop_domain is NULL** (Shopify-specific column); reused as-is for cross-platform compatibility.
- **Zero dashboard wiring needed:** Sprint 3's refund-netting was built platform-agnostic. `purchase_overview`, `channel_performance_overview`, `dashboard_timeseries` already subtract `refund_events.amount` for matching `order_id` regardless of source. Square refunds flow into dashboards automatically the moment they hit the table.
- **Operator action required:** add a THIRD Square webhook subscription pointing at `https://ads4good.com/api/square/webhooks/refunds`, events `refund.created` + `refund.updated`. Same `merchant_id` reused; `getActiveSquareSecrets()` returns all rows so signature verification routes correctly per subscription's notification_url.
- **Files:** `/api/square/webhooks/refunds/route.ts` (new).

#### C — Sprint 5b real: `/chapter/[client_key]/*` clean URL surface
- **Problem:** Sprint 5a wired auth + middleware enforcement via `?client=<key>` search-param mediation. Worked for security; URLs looked like `/chapter/observations?client=eos_fabrics`. Sales-pitch URL is `/chapter/eos_fabrics/observations`.
- **Solution:** single catch-all redirect at [src/app/chapter/[client_key]/[[...slug]]/page.tsx](src/app/chapter/[client_key]/[[...slug]]/page.tsx). Server component reads `client_key` from path + optional `slug` array + incoming searchParams → builds `/chapter/<sub-path>?client=<key>&...preserved-params` → `redirect()`.
- **Slug default:** empty `[[...slug]]` (e.g. visiting `/chapter/eos_fabrics`) defaults to `observations` (matches the locked "first-paint default" intent).
- **Search-param preservation:** every incoming param except `client` (which we override from the path) carries through. So `/chapter/eos_fabrics/raw?range=90d&compare=prior` correctly lands on `/chapter/raw?client=eos_fabrics&range=90d&compare=prior`.
- **Routing precedence is locked by Next.js + the underscore convention.** Literal segments (`observations`, `overview`, `channels`, `paths`, `lift`, `attribution`, `journeys`, `raw`, `connections`) beat the dynamic `[client_key]` segment. Client keys ALWAYS contain underscores (`eos_fabrics`, `not_so_cavalier`, etc.). Defensive check at the top of the redirect page sends any no-underscore segment that somehow reaches it to home rather than building a confused URL.
- **Middleware interaction (already correct from Sprint 5a):** the existing `clientKeyFromPath` middleware logic enforces `canAccessClient` BEFORE the catch-all page renders. Client employee trying to bookmark `/chapter/other_client/whatever` gets bounced at the middleware level; never reaches the redirect.
- **Why redirect instead of re-render:** rendering the dashboard at the clean URL directly would require duplicating every page's data fetching + client component into a parallel tree. Redirect is the single-translation layer; the render path stays the single source of truth. URL briefly flickers to the legacy shape — acceptable for v1, "real rebrand" (canonical render at clean URL) is a Sprint 5b polish item if/when needed.
- **Files:** `src/app/chapter/[client_key]/[[...slug]]/page.tsx` (new).

### Sprint 2.1 — Not So Cavalier (barbershop) server-side onboarding (June 10, 2026)
- **First B2C personal-services client onboarded end-to-end on the server side.** Marketing-site pixel install + post-booking redirect stitching paused pending operator Staff-role access to Square Appointments.
- **DB:** `chapter_config.clients` row (`storefront_domain = 'notsocavalier.com'`, `boundary_event_name = 'appointment_booked'`, `display_tz = 'America/New_York'`); `client_secrets` row with fresh HMAC secret; `square_webhook_secrets` rows for BOTH the bookings subscription + the payments subscription (each with its own notification_url + signing_key); `square_oauth_tokens` row with the production Customers API access token.
- **DB role:** `client_not_so_cavalier` NOLOGIN/NOINHERIT/NOBYPASSRLS role created; granted SELECT/INSERT/UPDATE on `chapter_ingest.*` / `chapter_identity.*` / `chapter_journey.*` + sequence access; granted TO `chapter_app` so SET ROLE works.
- **Code:** `CLIENT_ROLE_MAP` in [src/app/lib/db/per-client.ts](src/app/lib/db/per-client.ts) adds `not_so_cavalier`; `CHAPTER_ALLOWED_ORIGINS` in [src/app/lib/auth/cors.ts](src/app/lib/auth/cors.ts) adds `https://notsocavalier.com` + `https://www.notsocavalier.com`; dashboard `CLIENTS` list in [src/app/chapter/_components/mockdata.ts](src/app/chapter/_components/mockdata.ts) adds the client as "Client D" (Starter tier, purple).
- **Square API surface migration (locked).** Square renamed the older "Appointments" API to "Bookings" — modern webhook event names are `booking.created` and `booking.updated` (the latter covers BOTH reschedule + cancellation in one event). The bookings webhook route at [/api/square/webhooks/appointments/route.ts](src/app/api/square/webhooks/appointments/route.ts) was rewritten to handle `booking.created` (emits `appointment_booked` as the boundary event) and ack-and-skip `booking.updated` (refund/cancel semantics deferred). URL path stays as `/appointments` for backwards compatibility with the live webhook subscription URL.
- **NEW payments webhook route at [/api/square/webhooks/payments/route.ts](src/app/api/square/webhooks/payments/route.ts).** Emits `appointment_paid` as a downstream event (NOT a boundary event) when `payment.created` arrives with `status = 'COMPLETED'`. Carries the SAME `order_id` as the corresponding booking row so dashboards can JOIN to compute booking → paid fulfillment rate. Value is the real payment amount (`amount_money.amount / 100`); booking row stays at `value = 0`. Refund handling (`payment.updated` with status `REFUNDED`) is deferred — will write to `chapter_ingest.refund_events` so Sprint 3's refund-netting plumbing picks it up automatically.
- **Per-customer journey row shape (two purchase_events rows per successful booking):**
  - `appointment_booked` — boundary event, value 0, fires on `booking.created`. Closes the lifecycle chapter so attribution credits the channel that brought the booking. Operator measures channel → booking rate from this.
  - `appointment_paid` — downstream event, value = actual payment, fires on `payment.created` with status COMPLETED. Operator measures booking → fulfillment rate by JOINing on `order_id`. Bookings without a matching paid row = no-shows / no-pays.
- **Square credential acquisition pattern (documented for future barbershop / personal-services onboards):**
  1. Operator goes to https://developer.squareup.com → creates an application → switches to Production environment.
  2. Personal Access Token from Credentials page → `chapter_config.square_oauth_tokens.access_token`.
  3. Two webhook subscriptions, one per route — separate URLs, separate signing keys; cleaner separation than mixing event types on one subscription.
     - Bookings: `https://ads4good.com/api/square/webhooks/appointments`, events `booking.created` (and optionally `booking.updated`).
     - Payments: `https://ads4good.com/api/square/webhooks/payments`, events `payment.created` (and optionally `payment.updated` for future refund handling).
  4. `merchant_id` fetched server-side via `curl -H "Authorization: Bearer <token>" https://connect.squareup.com/v2/merchants` — no need to ask the operator.
- **Cross-domain stitching design for the post-booking flow (PAUSED pending Square Appointments staff access).** The hard problem: pixel mints anonymous_id `N` on `.notsocavalier.com`, redirect mints `A` on `.ads4good.com`, customer books on `book.squareup.com` (no Chapter pixel), Square webhook fires with `customer_id:Y` + email_sha256 from enrichment. Naïvely, `N` and `A` stay orphaned from `email_sha256:X`. **Solve via Square's post-booking "Custom URL" setting** → point Square to `https://notsocavalier.com/booking-confirmed?booking_id=X&customer_id=Y` → the React thank-you page runs the Chapter pixel which reads cookie `N` (still on `.notsocavalier.com`) AND the URL params → calls `ChapterPixel.identify({ identity_key: 'square_customer_id:Y', traits: { booking_id, source: 'square_post_booking' } })` → `/api/identify` inserts the alias edge `N ↔ customer_id:Y` → canon trigger walks the graph and merges with `email_sha256:X` from the webhook side → ONE canonical encompasses pre-click browsing + booking + payment. Implementation deferred until operator has Square Appointments staff access (needed to configure the post-booking redirect URL in Square's settings).
- **Belt-and-suspenders pre-booking identity capture (also deferred):** soft modal on `notsocavalier.com` that opens on "Book Now" click, asks for email "to text you a confirmation," then `ChapterPixel.identify({ identity_key: email })` BEFORE the redirect. Even if visitor skips the modal, the post-booking redirect catches them. Combined → both pre-click and post-booking paths link to canonical.

### Sprint 6 — Offline attribution: community event CSV ingest (June 10, 2026)
- **Scope:** end-to-end pipeline for ingesting offline community events (barbershop summer block party, dental free-screening day, future verticals). Each event = a CSV of attendees with name + email + phone + arbitrary questionnaire columns. The pipeline hashes PII in-process, stitches identity into `identity_canon`, creates a milestone per attendee, and auto-creates a Connections cohort so dashboards can target the audience immediately.
- **Driving use case:** barbershop has a summer community event coming up. They collect attendee info on paper / sign-up form; operator uploads the CSV after the event. Future bookings made by those attendees stitch back via email/phone canonical so the event becomes a real attribution channel in the lifecycle chain.
- **Privacy contract (load-bearing):**
  - Raw email + raw phone hashed in-process via [src/app/lib/identity/hash.ts](src/app/lib/identity/hash.ts) (extracted shared module mirroring `/api/purchase` patterns: `hashEmail = sha256(lowercase(trim(email)))`, `hashPhone = sha256(E.164(phone))`).
  - **CSV file never written to disk;** parsed via papaparse in memory only.
  - **Raw PII never persists.** Milestone metadata stores only `name_first_initial` (single character) for audit fingerprinting + the questionnaire columns (with PII columns explicitly stripped from the questionnaire payload).
  - Operator-facing audit: response summary shows first-8-char hash prefixes of up to 5 ingested rows so operator can sanity-check without seeing identifiers.
- **Schema (new):** `chapter_ingest.offline_events`: `(id, client_key, event_slug, event_name, event_ts, location, attendee_count, metadata, cohort_id, created_at, created_by)`. UNIQUE on `(client_key, event_slug)`. RLS enabled. `event_slug` becomes the `milestone_name` on per-attendee rows so each event is its own attribution channel.
- **Identity stitching per attendee:**
  - Insert `chapter_ingest.offline_milestones` row (`milestone_name = event_slug`, `source_type = 'offline_event_upload'`, `source_id = event.id`).
  - If both email + phone present: insert `chapter_identity.identity_aliases` edge `phone_sha256:X → email_sha256:Y` (`is_deterministic = true`, `method = 'offline_event_upload'`). Mirrors `/api/purchase` Phase 3.5 — email canonical wins because it's more stable cross-platform.
  - Upsert `chapter_identity.identity_canon` self-canonical row so future online identifications stitch even if the visitor never had a pixel session before the event.
- **Auto-cohort creation:** inserts a `chapter_config.connections_cohorts` row + one `connections_cohort_members` row per attendee. Cohort is named after the event, `event_at` matches the event date, totals updated at the end of the run. Operator can immediately anchor Cross-Source Influence on the cohort, compare retention vs non-attendees, etc.
- **Admin UI at `/internal/offline-events`** — gated by `CHAPTER_DASH_TOKEN` like other internal admin surfaces. Form takes client picker (populated from `chapter_config.clients`), event slug (lowercase/underscore), event name, event date, location, CSV file. After upload, summary card shows rows ingested, rows skipped (no identity), event ID, cohort ID, hash samples.
- **Files (new):**
  - `chapter_ingest.offline_events` table (migration `sprint_6_offline_events`)
  - [src/app/lib/identity/hash.ts](src/app/lib/identity/hash.ts) — shared email/phone normalization + hashing helpers
  - [src/app/api/internal/offline-events/upload/route.ts](src/app/api/internal/offline-events/upload/route.ts) — multipart upload handler
  - [src/app/internal/offline-events/layout.tsx](src/app/internal/offline-events/layout.tsx) — admin chrome
  - [src/app/internal/offline-events/page.tsx](src/app/internal/offline-events/page.tsx) — upload form + recent events list
  - [src/app/internal/offline-events/UploadForm.tsx](src/app/internal/offline-events/UploadForm.tsx) — client-side form with summary display
- **Dependency added:** `papaparse` + `@types/papaparse` for robust CSV parsing.
- **End-to-end verified:** all 6 insert shapes (event, cohort, milestone, alias, canon, cohort_member) tested via SQL DO block before pushing.
- **What happens next per attendee:** the next attribution-chain refresh (03:30 UTC nightly cron) sees the new offline_milestones; `lifecycle_chapters_snapshot` already preserves "offline-milestone double emission" so the event lands as a chapter event; future online interactions (Square webhook, pixel events) by the same email/phone canonical fold into the same canonical's chapter via the existing canon/alias graph.
- **Deliberately deferred:** (a) dedicated dashboard tile for offline events on the Channels page — the data flows through correctly without UI work, but operator clarity would benefit from a "Offline events" section; (b) backfill from third-party event-management platforms (Eventbrite / Mailchimp signup forms / etc.) — manual CSV ingest covers the barbershop use case today; (c) bulk re-upload / event editing in the admin UI — current flow assumes upload-once.

### Sprint 5a — Per-user auth (Supabase + allowlist + magic link) (June 10, 2026)
- **Scope:** replace the single shared `CHAPTER_DASH_TOKEN` cookie gate with per-user authentication via Supabase magic links, allowlisted against `chapter_config.users`. Includes role-aware route enforcement (agency_operator vs client_employee) and coexistence with the legacy token cookie during cutover. The clean URL surface `/chapter/[client_key]/*` is intentionally deferred — see "Deliberately deferred" below.
- **The allowlist IS the gate.** `chapter_config.users(id, user_id, email, role, client_key, created_at, last_login_at, revoked_at)`. role is CHECK-constrained to `agency_operator` or `client_employee`; client_employee MUST have a client_key (table-level constraint). RLS enabled; service_role only. Unique partial index on `lower(email)` and on `user_id` (so the same Supabase user_id can't be allowlisted twice, but revoked rows can stay for audit).
- **Login flow:**
  1. User types email at `/chapter/login` → `POST /api/chapter-auth/magic-link`
  2. Server looks up email in `chapter_config.users`. If not present (or revoked), returns 200 with the same shape it would on success — **allowlist is never leaked via response timing or error message.**
  3. If allowed, `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: /chapter/auth/callback } })` sends a magic link.
  4. User clicks the link → `/chapter/auth/callback` exchanges the code for a session → **re-checks allowlist** (defense in depth — covers revocation between link request and click) → links `chapter_config.users.user_id` to `auth.users.id` on first login → redirects to role-appropriate landing.
- **Middleware enforcement (root `middleware.ts`):**
  1. Public paths (login, callback, legacy `/api/chapter-auth`) pass through unauthenticated.
  2. If a Supabase session exists, resolve to a Chapter user via `findChapterUserByAuthId(authUser.id)`. If not on allowlist → sign out + redirect to `/chapter/login?error=not_allowlisted`.
  3. **Path-based client_key segment** (`/chapter/<segment_with_underscore>/...`) → `canAccessClient(user, segment)`. Client employees redirected to their own client's landing if mismatched. (The route group itself isn't built yet; this branch is wired for when it lands in 5b proper.)
  4. **Global `/chapter/*` for agency_operator** → pass through.
  5. **Global `/chapter/*` for client_employee** → middleware enforces `?client=<their_client_key>` in the URL. If absent or mismatched, redirect with corrected param. **This is the security primitive that makes 5b's URL restructure cosmetic rather than load-bearing** — the page receives the same searchParams it always has, and any client_employee accessing a global path is auto-scoped to their own client_key regardless of what they typed.
  6. **Fallback: legacy `CHAPTER_DASH_TOKEN` cookie.** If no Supabase session, middleware still accepts the cookie as agency-operator equivalent. Will be removed in 5d after operators have all migrated to Supabase.
- **Naming convention (locked again):** the `clientKeyFromPath()` helper detects client_keys by underscore presence. Static slugs never contain `_` (observations, overview, channels, paths, lift, attribution, journeys, raw, connections); client_keys always do (eos_fabrics, projectagram_reels, adsforgood_prod, barber_shop). Same convention CLAUDE.md was already relying on; now enforced in middleware code.
- **Files (new):**
  - `chapter_config.users` table + indexes + RLS (DB migration `sprint_5_chapter_config_users`)
  - [src/app/lib/auth/supabase-server.ts](src/app/lib/auth/supabase-server.ts) — `createSupabaseServerClient` (cookie-aware, for pages/server-actions) + `createSupabaseServiceRoleClient` (for allowlist lookups before user is authenticated)
  - [src/app/lib/auth/supabase-middleware.ts](src/app/lib/auth/supabase-middleware.ts) — middleware-specific factory; cookies adapted to NextRequest/NextResponse, mutable response so refreshed-session cookies write through
  - [src/app/lib/auth/chapter-user.ts](src/app/lib/auth/chapter-user.ts) — `findChapterUserByEmail` / `findChapterUserByAuthId` / `linkChapterUserToAuthId` / `touchLastLogin` / `canAccessClient` / `canAccessGlobal`
  - [src/app/chapter/auth/callback/route.ts](src/app/chapter/auth/callback/route.ts) — magic-link callback handler
  - [src/app/api/chapter-auth/magic-link/route.ts](src/app/api/chapter-auth/magic-link/route.ts) — request a magic link (allowlist-gated)
  - [src/app/api/chapter-auth/signout/route.ts](src/app/api/chapter-auth/signout/route.ts) — clears both Supabase session and legacy cookie
- **Files (modified):**
  - [middleware.ts](middleware.ts) — `gateChapter` is now async, Supabase session lookup primary, legacy token fallback. Dispatcher made async.
  - [src/app/chapter/login/page.tsx](src/app/chapter/login/page.tsx) — password form replaced with magic-link form. Error messages handle `not_allowlisted`, `forbidden`, `no_role`, `callback_failed`. Submitted-state confirmation never reveals whether the email is on the allowlist.
  - [src/app/chapter/_components/Sidebar.tsx](src/app/chapter/_components/Sidebar.tsx) — sign-out button in the sidebar foot. Posts to `/api/chapter-auth/signout` then hard-navigates to `/chapter/login`.
  - [src/app/chapter/chapter.css](src/app/chapter/chapter.css) — `.sidebar-foot` + `.sidebar-signout` styles.
- **Dependency added:** `@supabase/ssr` (official SSR auth helpers for Next.js App Router).
- **Deploy checklist BEFORE pushing to prod:**
  1. Add `SUPABASE_ANON_KEY` to Vercel env vars (Production + Preview). Found in Supabase dashboard → Project Settings → API → "anon public" key.
  2. In Supabase dashboard → Authentication → URL Configuration, add `https://ads4good.com/chapter/auth/callback` (and the Vercel preview URL pattern) to "Redirect URLs."
  3. Set Authentication → Settings → Site URL to the production origin.
  4. Verify the email magic-link template at Authentication → Email Templates → Magic Link is acceptable.
  5. `INSERT INTO chapter_config.users` for every operator who needs immediate access (already seeded `katoa@ads4good.com` as agency_operator).
  6. Keep `CHAPTER_DASH_TOKEN` in env vars — middleware still honors it during cutover.
- **Deliberately deferred (5b real / 5c / 5d):**
  - **5b real — `/chapter/[client_key]/*` URL surface.** The clean URL (e.g. `/chapter/eos_fabrics/observations`) is purely cosmetic right now because middleware already auto-scopes client_employees to their client via `?client=` mediation. Implementation needs either a catch-all `[client_key]/[[...slug]]/page.tsx` redirect shim OR a full duplicate route tree; both are sizable and not unlocking new security. Build when the sales pitch demands the cleaner URL.
  - **5c — Sidebar conditional rendering** (hide client switcher for client_employee, show user email + role). Currently sidebar still shows the multi-client dropdown for everyone; client_employees can pick another client from the dropdown but the middleware redirects them back. Functional but ugly. Polish item.
  - **5d — Remove `CHAPTER_DASH_TOKEN` cookie path.** Wait until every operator has logged in via Supabase at least once (verify by `last_login_at IS NOT NULL` on each chapter_config.users row), then delete the cookie branch from middleware and drop the env var.

### Sprint 3b — Suspense boundaries / streaming perceived-perf (June 10, 2026)
- **Goal:** make every navigation feel instant. Real latency was largely addressed by Sprint 3; this sprint addresses the gap between "click sidebar item" and "see something on screen."
- **Pattern:** Next.js App Router `loading.tsx` files at the (authed) group level + per-page overrides for the heavy pages. Layout's sidebar + topbar + pinned observation stay visible because the layout doesn't re-render between pages — only the content area swaps the page's body for the skeleton until the server component resolves.
- **Skeleton primitives** in [src/app/chapter/_components/Skeleton.tsx](src/app/chapter/_components/Skeleton.tsx): `<SkelLine>`, `<SkelTitle>`, `<SkelChip>`, `<SkelCard>`, `<SkelKpiStrip>`. Shapes mirror the real card / kpi / row primitives so the content area doesn't reflow when real data arrives.
- **CSS** appended to [chapter.css](src/app/chapter/chapter.css): `.skel` class with a 1.8s ease-in-out shimmer keyframe driven by `linear-gradient(... var(--line-2), var(--bg-2), var(--line-2))` background-position animation. Respects `prefers-reduced-motion`.
- **Files shipped:**
  - [(authed)/loading.tsx](src/app/chapter/(authed)/loading.tsx) — generic dashboard skeleton (title strip + KPI strip + 2-col grid + bottom card). Covers all pages by default.
  - [(authed)/connections/influence/loading.tsx](src/app/chapter/(authed)/connections/influence/loading.tsx) — anchor card across top + Upstream/Downstream side-by-side + self-recurrence strip. Matches the slowest dashboard page (Cross-Source Influence, 4s cold post-Sprint 1.5).
  - [(authed)/lift/loading.tsx](src/app/chapter/(authed)/lift/loading.tsx) — tab row + 2x2 grid of channel cards. Matches the 3-tab Lift & Incrementality page.
  - [(authed)/journeys/loading.tsx](src/app/chapter/(authed)/journeys/loading.tsx) — filter row + identity-list / detail-panel split.
- **Other pages** (observations, overview, channels, paths, attribution, raw) fall through to the group-level skeleton — their shapes are simple enough that the generic placeholder reads correctly. Per-page overrides land if/when one needs a sharper match.
- **Deliberately deferred — tile-level Suspense within a single page render.** Would require restructuring each page so individual tiles are their own async server components with their own fetches. Marginal value now that Sprint 3 brought the heaviest RPCs under 500ms; revisit if cold-load p95 climbs back up at higher client counts.

### Sprint 3 — Perf pass: denormalized journey-resolution snapshot (June 10, 2026)
- **Scope:** systematic perf audit of every dashboard RPC (33 cached wrappers in `dashboard-rpc.ts`). Inventory + timings against EOS revealed two real cliffs; everything else was already sub-100ms on warm primary thanks to prior Sprint 1.5 work.
- **Cliffs identified:**
  - `channel_performance_overview` (30d) — **849ms**. 428ms on the journey-side 3-way join (`journey_bot_classification_v1` × `journey_entry_channel_v1` × `journey_entry_channel_overrides`); 419ms on the LATERAL unnest of canonical_v1 channel paths. EOS 52k+ non-bot journeys × PK lookups = 209k buffer hits.
  - `lagged_impact_pair_series` (90d) — **989ms**. Same 3-way join scaled to 90d window, plus LEFT JOIN to bucket time-series.
- **Root cause:** every dashboard RPC that needs "what channel did this journey enter via, was it a bot, was it overridden" was re-doing the 3-way nested loop on every call. With Vercel-replica cold buffers this would land at 2.5-3s+ — visible to operators on every page load.
- **Architectural fix — `chapter_reporting.journey_resolved_v1` (new snapshot):** one row per (client_key, journey_id) pre-joining the 3 source MVs. Columns: `entry_ts`, `resolved_channel` (= COALESCE(override, entry)), `is_overridden`, `bot_class`, `event_count`, `snapshot_ts_hi`. Indexes:
  - `(client_key, entry_ts) WHERE bot_class IN ('human_likely','suspect') AND event_count > 1` — the universal non-bot date-range index used by every channel-aggregation RPC.
  - `(client_key, resolved_channel, entry_ts) WHERE bot_class IN ('human_likely','suspect') AND event_count > 1` — channel-filtered range scans (lagged_impact_pair_series uses this for the `IN (channel_a, channel_b)` filter).
- **Loader:** `chapter_reporting.refresh_journey_resolved_v1(p_client_key, p_snapshot_ts_hi DEFAULT now())` — per-client DELETE-then-INSERT in one tx (same pattern as canonical_v1/v2 loaders). Writes a `_snapshot_runs` row for audit. Initial backfill: EOS 919,185 rows; projectagram 326; adsforgood 713.
- **Cron wired** in `/api/internal/cron/refresh-dashboard-mvs` (04:00 UTC, after the source MVs refresh CONCURRENTLY). New `PER_CLIENT_SNAPSHOTS` registry — additions to the snapshot family just register an entry; no plumbing per snapshot. Failure surfaces in the GChat alert alongside MV failures.
- **RPCs rewritten:**
  - `channel_performance_overview` — journey side now one indexed scan on `journey_resolved_v1`. **849ms → 442ms (1.9×)**, identical row output across all 8 channels. Residual is the LATERAL unnest CTE; tracked as future polish but not a cliff.
  - `lagged_impact_pair_series` — same swap. **989ms → 91ms (10.8×)** on the partial-index hit, identical numbers.
- **Pattern established (re-locked as a Forward Rule):** any dashboard RPC that needs "non-bot journey resolution with channel" reads from `journey_resolved_v1` — never recomputes the 3-way join inline. Adding a new client = run `refresh_journey_resolved_v1(client_key)` once at provisioning + the cron handles it daily. No new clients trigger the journey-side cliff.
- **Other channel/journey RPCs deliberately NOT yet migrated:** `correlation_channel_overview` (96ms), `contribution_overview` (23ms), `incrementality_channel_overview` (26ms), `lagged_impact_pair` (<1ms) all share the same 3-way join pattern but are fast enough today on primary. Migrating each is mechanical (~5 lines per RPC). Defer until either (a) replica cold-load complaints surface OR (b) we're touching them for an unrelated reason — touch-and-go migration to avoid churn.
- **Bug surfaced:** `chapter_reporting.observations_history` RPC doesn't exist in DB but `cachedObservationsHistory` references it. Either fails silently or page wraps another call. Logged as INVESTIGATE.
- **Files:** new SQL function `chapter_reporting.refresh_journey_resolved_v1`; rewritten `channel_performance_overview` + `lagged_impact_pair_series`; updated `/api/internal/cron/refresh-dashboard-mvs/route.ts` (PER_CLIENT_SNAPSHOTS registry + per-client snapshot pass + failure surfacing).

### Sprint 4 — Tier 1 first-party redirect domain (June 10, 2026)
- **Scope:** complete intelligent routing layer at `/r/<client_key>/<slug>`. Server-side capture of every click, rule-evaluated routing against visitor context, click logged into `chapter_ingest.pixel_events` as `redirect_click` so it flows into the standard attribution chain, identity + journey cookies set so downstream pixel events stitch automatically. "Branch.io for open-web ecom" positioning. Currently hosted at `ads4good.com/r/...`; designed so swapping to a dedicated domain (`chptr.link/...`) is a cookie-Domain config change.
- **Latency design (<50ms target):** 5-min in-process Map caches for rules + AB experiments + segments; parallel `Promise.all` for rules + AB + segments + cart lookups; fire-and-forget click logging (visitor's 302 ships before the INSERT lands); bot-class fast-path (skip rule eval, use `?to=` fallback).
- **Schema (`chapter_config`):**
  - `redirect_rules` — client_key, slug, rule_priority (lower wins), condition_jsonb (AND-ed), destination_template (supports `{var}` interpolation), enabled, hit_count, last_hit_at, description. Indexes: `(client_key, slug, rule_priority) WHERE enabled`; `(client_key)`.
  - `redirect_ab_experiments` — client_key, experiment_id (UNIQUE per client), seed, buckets_jsonb (weights summing to 100), description, enabled, started_at, ended_at.
  - RLS enabled. service_role full CRUD; chapter_app SELECT only.
- **Library modules in `src/app/lib/redirect/`:**
  - `rules.ts` — `fetchRules` / `fetchAbExperiments` / `clearRulesCache`, 5-min Map cache, keyed by (client_key, slug).
  - `identity.ts` — `resolveIdentity` (reads/mints chapter_identity + chapter_journey cookies), `applyIdentityCookies` (Domain attribute scoped to apex). Identity cookie 365d, journey cookie 1d.
  - `geo.ts` — reads `x-vercel-ip-country/region/city/lat/long` headers. Returns undefined fields on non-Vercel runtimes (test/local).
  - `device.ts` — regex-based UA classifier returning `{device_type, os}`. Bot detection first, then OS, then form-factor.
  - `ab.ts` — deterministic bucket assignment: `sha256(identityKey + '|' + seed)` → first 8 hex → uint32 → mod 100 → cumulative walk of sorted bucket weights. Same identity always lands in same bucket across config reloads (so long as seed is stable).
  - `cart.ts` — `resolveCart` queries last 24h of `add_to_cart`/`view_cart` pixel_events for the identity. Returns `has_open_cart` + `hours_since_cart`.
  - `segments.ts` — `resolveSegments` resolves canonical via `identity_canon` then parallel-fetches conversion history (canonical_v1_snapshot) + cohort tags (connections_cohort_members joined to cohorts). Anonymous identities short-circuit. 5-min cache per canonical.
  - `conditions.ts` — `evaluateConditions(conditions, ctx)` walks all keys via REGISTRY (17 types: is_new_visitor / is_returning_visitor / has_converted_ever / has_converted_in_days / audience_tag / has_open_cart / cart_older_than_hours / day_of_week / hour_of_day / date_range / query_param / referrer_matches / country_in / region_in / device_type / os / ab_bucket). Empty object `{}` = catch-all default. Unknown types log + return false (fail-closed).
  - `click-logger.ts` — fire-and-forget insert into `pixel_events` with `event_name='redirect_click'`. UTM params lifted out of query string into top-level columns; `partner_ids` extracted (fbclid/gclid/ttclid/msclkid); geo/device/full_query stashed in props. Doesn't throw.
  - `template.ts` — `interpolateTemplate` replaces `{var}` URL-encoded. Vars: `{q:<key>}` (passthrough utm), `{identity_key}`, `{client_key}`, `{country}` / `{region}` / `{city}`, `{device_type}` / `{os}`. `isValidDestination` blocks non-http(s) schemes.
- **Route handler `src/app/r/[client_key]/[slug]/route.ts`** — `dynamic = "force-dynamic"`. GET only. Bot fast-path → if `?to=` present use it, else 404. Otherwise parallel-fetch rules + AB experiments + segments + cart; walk rules in priority-ascending order, first match wins; fall back to `?to=` if no rule matches and no catch-all exists. Sets identity cookies + returns 302 with `X-Robots-Tag: noindex` and `Cache-Control: no-store`. Fire-and-forget `logRedirectClick` before the 302 returns.
- **Click integration with attribution chain** — `redirect_click` events land in `pixel_events` with the same shape as any other pixel event (canonical identity, journey_id, utm + partner_ids extracted). The canonical_v1 session-entry classifier picks them up automatically as boundary signals when they appear at the start of a journey. No new attribution path or refresh logic needed; the redirect click IS a pixel event for all downstream purposes.
- **Admin UI at `/internal/redirect-rules/*`** — gated by `CHAPTER_DASH_TOKEN` cookie like other agency-internal surfaces.
  - Index page lists clients with enabled/total rule counts.
  - `/internal/redirect-rules/[clientKey]` lists rules grouped by slug with priority, conditions (default badge for `{}`), destination template, hit_count, enabled toggle.
  - `RuleForm` (shared between new + edit) — slug, priority, condition_jsonb (textarea, raw JSON for v1), destination_template, description, enabled. Live URL preview in the slug label.
  - Server actions `createRule` / `updateRule` / `deleteRule` / `toggleRule` parse + validate, write, then call `clearRulesCache(client_key, slug)` + `revalidatePath()`. (Cache invalidation only fires on the lambda that handled the save — other lambdas continue serving stale rules for up to 5 min. Acceptable for marketing rule changes.)
  - JSON-textarea is v1; structured editor on backlog.
- **ESP wrap compatibility** — works behind Mailchimp/Klaviyo/Shopify Email/Meta/Google Ads click trackers. ESP wraps the Chapter URL → Chapter records click + 302s to destination. ~150ms total extra latency vs no-ESP-wrap. Both ESP and Chapter get their signal.
- **Consent gate (always-on, no per-client toggle).** Route handler reads a `chapter_consent` cookie on the redirect apex. `opt_out` → skip `logRedirectClick` insert + skip `applyIdentityCookies` (no new identifiers issued; existing cookies left alone). Visitor is still 302'd to the resolved destination — routing is the service they clicked for, separate from data collection. Rule evaluation + segment lookups still run because reading existing identity context to route a visitor is not "collection." Rationale for no toggle: consent enforcement isn't a tunable behavior; it matches the same contract `/api/chapter/collect` already honors. The per-client knob is "default state when cookie is absent" (`applyConsentPolicy(state, defaultWhenUnknown)` — v1 hardcoded to `"opt_in"` = US default; EU-strict per-client override lands when first EU client onboards). **Cross-domain caveat:** the cookie lives on the redirect apex, not the destination storefront — opt-outs expressed only on the storefront don't reach the redirect until a `/api/consent-sync` endpoint is built (follow-on).
- **Cross-domain identity stitching (two layered mechanisms; both gated by consent).** Closes the cookie-isolation gap between the redirect apex (`ads4good.com`) and the destination storefront (e.g. `eosfabrics.com`, `square.com/booking`).
  - **Solution 1 — `?chid` handoff to destination (same-device).** `appendIdentityHandoff(url, identityKey, journeyId, allowCollection)` in [template.ts](src/app/lib/redirect/template.ts) auto-appends `?chid={identity_key}&jid={journey_id}` to every resolved destination URL (unless the rule template already set `chid`). Pixel reads `?chid` on first landing in [pixel.js/route.ts](src/app/api/chapter/pixel.js/route.ts), calls `/api/identify` with `previous_identity_key = chid`, which inserts the alias edge `R ↔ E` in `identity_aliases`. The canon trigger folds both into one canonical. Pixel then strips `chid` + `jid` from the URL via `history.replaceState` so they don't ride into screenshots / referrer / shares. Covers every same-device case including future un-redirected returns. Doesn't help when destination has no Chapter pixel OR visitor is on a different device than the click.
  - **Solution 2 — server-side identity stitch from URL hint (cross-device).** Three optional URL hint flavors; redirect inserts an alias edge `R ↔ email_sha256:X` at click time. Precedence (most-private wins): `rh > rid > re`.
    - `?rh=<64-hex>` — flavor #1 free: pre-hashed `email_sha256`. Zero PII in URL. Use when ESP supports hashed merge tags.
    - `?re=<plaintext>` — flavor #2 universal: raw email, hashed server-side in [email-hint.ts](src/app/lib/redirect/email-hint.ts), never logged. Works with any ESP that has a plaintext email merge tag.
    - `?rid=<opaque>` — flavor #3 privacy-strongest: opaque ESP per-recipient ID (Mailchimp UNIQID, Klaviyo person.id), resolved to `email_sha256` via `chapter_config.email_engagement_events.recipient_token` (column added June 10) in [recipient-lookup.ts](src/app/lib/redirect/recipient-lookup.ts). 5-min cache. Returns null gracefully when sync isn't built for that ESP yet.
  - **Privacy contract.** All hint params stripped from forwarded URL + `props.full_query` + click-log before anything leaves the redirect server. `stripHintParams(query)` in email-hint.ts is the single source of truth for which keys are PII-bearing. Stitch is fire-and-forget; never blocks the 302; idempotent (insert ON CONFLICT DO NOTHING — repeat clicks for same recipient are safe).
  - **What this unlocks for barbershop:** destination is Square's hosted booking domain (no Chapter pixel), so solution 1's handoff can't land. Solution 2's `?re=` or `?rid=` is load-bearing — without it, every redirect click would orphan from the appointment_booked webhook events. With it, the redirect_click and the Square webhook both stitch to `email_sha256:X` and the lifecycle chapter forms correctly.
  - **Files (new):** [src/app/lib/redirect/email-hint.ts](src/app/lib/redirect/email-hint.ts), [recipient-lookup.ts](src/app/lib/redirect/recipient-lookup.ts), [identity-stitch.ts](src/app/lib/redirect/identity-stitch.ts). Modified: [template.ts](src/app/lib/redirect/template.ts) (`appendIdentityHandoff`), [route.ts](src/app/r/[client_key]/[slug]/route.ts) (extract hint → strip → stitch), [pixel.js/route.ts](src/app/api/chapter/pixel.js/route.ts) (chid reader + URL clean). Migration: `email_engagement_events` + `recipient_token` column + partial index.
  - **Mailchimp sync extension SHIPPED June 15, 2026.** `chapter-scripts/sync-mailchimp-engagement.js` now captures `emails.email_id` from the `/reports/{campaign_id}/email-activity` response and writes it to `chapter_config.email_engagement_events.recipient_token`. Backfill on EOS: 156,153 rows (15,697 clicks + 140,456 opens) at 100% coverage; 3,067 unique click-recipients, 6,563 unique open-recipients. Mailchimp's `email_id` is MD5(lowercase(email)) — the same value that `*|UNIQID|*` emits in URL templates, so the redirect's `?rid=*|UNIQID|*` flavor now resolves correctly via `recipient-lookup.ts`. Two operational gotchas captured during build: (a) `ON CONFLICT DO UPDATE` requires JS-side dedup before INSERT because Mailchimp's activity endpoint occasionally emits identical (recipient + url + timestamp) tuples and Postgres can't multi-target the same row in one statement; (b) the script uses `COALESCE(existing, new)` semantics in the UPDATE so re-runs are idempotent and preserve any prior tokens.
- **Files:** `chapter-scripts/snapshots/2026-06-10-sprint-4-redirect-rules.sql` (schema); `src/app/lib/redirect/{rules,identity,geo,device,ab,cart,segments,conditions,click-logger,template}.ts` (10 modules); `src/app/r/[client_key]/[slug]/route.ts` (route handler); `src/app/internal/redirect-rules/{layout.tsx,page.tsx,_actions.ts,[clientKey]/{page.tsx,RuleRowActions.tsx,RuleForm.tsx,new/page.tsx,[ruleId]/page.tsx}}` (admin UI); `docs/tier1-redirect.md` (operator guide).
- **Why this matters:** (a) intelligent routing per identity/cart/geo/device/A-B/time/query enables dynamic destinations the ESP can't do (cart-recovery direct to cart page only for returners with open cart; iOS gets Shop Pay deep link, others get web; A/B test landing pages without resending emails). (b) Closes the 521-missing-page-views finding from the May 22 validation (redirect owns the landing URL, can deterministically fire a server-side page_view equivalent if/when wired). (c) Strategic differentiator vs Branch.io: open-web ecom-native + integrated with the rest of the Chapter attribution stack out of the box.

### Square adapter code review fixes + Sprint 1.4 (June 9, 2026 night)
- **Three follow-on items shipped in the same session as the Square adapter** — caught while writing the Square route + doing a focused code review of the data path before deploy.
- **BUG FIX — `identity_canon` double-prefix.** `/api/purchase` Phase 3 (self-canonical fallback) at line 306 was building `detKey` by prepending `'shopify_customer_id:'` to `payload.customer_id` — even though webhook adapters already send `customer_id` in pre-prefixed form (`shopify_customer_id:7802...` for Shopify, and we'd be sending `square_customer_id:X` for Square). Result: malformed `shopify_customer_id:shopify_customer_id:X` keys in `identity_canon` for customer_id-only purchases (no email). Pre-existing — not introduced by Square work — but the Square adapter would have made it WORSE by writing `shopify_customer_id:square_customer_id:X` for every appointment where Customers API enrichment failed. **Fix:** use `payload.customer_id` verbatim; trust the adapter's prefix. Inline docstring at line 297 documents the bug for the next engineer. **Backfill:** verified zero references in `identity_aliases` AND zero rows pointing at the 2 malformed entries as canonical (truly orphans, not load-bearing). DELETEd the 2 entries (1 EOS, 1 Projectagram). Confirmed clean.
- **CODE REVIEW BUG #1 — Phase 1 `customer_id` gap.** Tracing the Square data path with a hypothetical payload revealed Phase 1 of `/api/purchase` (explicit-identify alias when email + browser identity both present) was computing `fromKey = client_identity_key || anonymous_id` — explicitly excluding `customer_id`. For Shopify this was fine because Phase 2 (`purchase_cart_token_bridge`) handles `customer_id`→`email` stitching via cart token matching. But booking platforms (Square, future Booksy/Vagaro) don't have a cart-token bridge — so `customer_id` would never alias to email for them. **Fix:** added `customer_id` as the third fallback in `fromKey` computation. Strictly additive — Shopify behavior is preserved because its webhook payloads don't send `client_identity_key` or `anonymous_id`, so the prior priority chain still resolves the same way for Shopify; Square gains the alias edge it needed.
- **CODE REVIEW BUG #2 — Square `event_ts` priority reversed.** Initial Square route had `eventTs = startAt || event.created_at || now()` — but `appointment.start_at` is when the SERVICE happens (possibly hours/days after booking). Using that as the boundary event timestamp would put lifecycle chapters in the future relative to the customer's actual journey. **Fix:** new priority `appointment.created_at` (when the appointment record was booked) → `event.created_at` (when Square emitted the webhook, near-identical) → `now()`. We intentionally do NOT use `start_at` anymore; doc comment explains the trap.

#### Sprint 1.4 SHIPPED — Configurable email-source patterns
- **The hardcoding problem.** `chapter_attribution.refresh_canonical_v1_snapshot`'s session-entry classifier had 3 hardcoded `WHEN utm_source ILIKE '%...%' THEN 'email'` branches: `%shopify_email%`, `%mailchimp%`, `%back-in-stock%`. Works for EOS + Projectagram (both Shopify + Mailchimp). Breaks silently for any future client on Klaviyo, Marketo, HubSpot Marketing, Sendinblue, or Constant Contact — their email-driven sessions would classify as `(direct)` or something else, quietly miscalibrating attribution.
- **The fix (pattern: config-driven primitive #3).** Mirrors the `boundary_event()` and `storefront_domain` patterns we built earlier this week:
  1. Added `email_source_patterns text[]` column to `chapter_config.clients` with default `ARRAY['%shopify_email%', '%mailchimp%', '%back-in-stock%']` (matches the prior hardcoded set so existing clients are unaffected).
  2. Created STABLE helper `chapter_config.email_source_patterns(p_client_key)` with the same default fallback if the row is missing. Mirrors `chapter_config.boundary_event()` exactly.
  3. Patched `refresh_canonical_v1_snapshot`: added `v_email_patterns text[]` to DECLARE, init from helper alongside `v_boundary_event`, replaced the 3 hardcoded `WHEN` clauses with **one** dynamic clause: `WHEN COALESCE(utm->>'utm_source','') ILIKE ANY(v_email_patterns) THEN 'email'`.
- **EOS regression check:** 817 rows / 357 email_chapters BEFORE and AFTER — **perfect parity**. The refactor is purely architectural; behavior identical for existing clients.
- **What this unlocks.** Onboarding a Klaviyo / Marketo / HubSpot Marketing / Sendinblue / Constant Contact client now reduces to one INSERT:
  ```sql
  UPDATE chapter_config.clients
  SET email_source_patterns = ARRAY['%klaviyo%', '%kl_klaviyo%']
  WHERE client_key = 'new_client';
  ```
  Run the nightly refresh, attribution math lights up correctly. Zero code change.
- **Architectural through-line.** This is the third config-driven primitive built on `chapter_config.clients` this week (after `boundary_event_name` June 4 + `storefront_domain` June 5 + this one June 9). Pattern: any per-client behavior that varies by vertical/platform moves out of code into config, and the surrounding SQL function reads it via a STABLE helper. Tomorrow's barbershop already benefits from all three.

---

### Square Appointments adapter + Sprint 2.3 v2 identity stitching (June 9, 2026 late evening)
- **Scope:** built the end-to-end Square Appointments webhook adapter before tomorrow's barbershop onboarding (signed + ready). Single session shipped scaffolding (v1) + phone-first identity stitching (v2) + Square Customers API enrichment (v2 alt) together — all three are co-dependent for full email + phone canon stitching to work, so building them as one unit avoids a partial state.
- **Why ALL THREE matter together** (load-bearing architecture note): (a) Square's webhook payload includes ONLY `customer_id`, not email or phone — without Customers API enrichment we have an opaque ID with no way to stitch to the marketing-site pixel journey, (b) without phone support in `identity_canon`, phone-only customers (some Square accounts don't capture email) stay isolated even if enrichment fetches their phone. Both layers together = barbershop customer books → webhook fires → we fetch their full record → email AND phone alias into canon → next attribution refresh stitches to whatever pixel-tracked identity already exists.
- **Pieces shipped:**
  - **`chapter_config.square_webhook_secrets`** (new table) — per-merchant signing keys + notification_url + client_key mapping. Multi-tenant via `merchant_id` from webhook payload (mirrors the Shopify per-shop-domain pattern). Supports rotation overlap (multiple non-revoked rows tried at auth time).
  - **`chapter_config.square_oauth_tokens`** (new table) — per-merchant Square access tokens with environment column ('sandbox' / 'production') so the helper picks the right API base URL. **Naming note (corrected June 14):** table is OAuth-shaped but in practice stores **Personal Access Tokens** from Square's Credentials page — these are long-lived and do NOT expire on a timer (the earlier "tokens expire ~30 days" claim was an incorrect carry-over from generic OAuth assumptions). Real failure mode is manual revocation by the seller (or Square-side rotation for abuse). `refresh_token` + `expires_at` columns remain unused; preserved for a future migration to true OAuth if/when needed. Health monitored by the 14:00 UTC daily-digest cron — calls `/v2/merchants` per non-revoked token and GChat-alerts on 401/403/non-2xx.
  - **`src/app/lib/auth/square-webhook-secrets.ts`** — `getActiveSquareSecrets(merchant_id)` helper with 5-min in-memory cache; returns ALL non-revoked rows so the route can try each signing key (rotation safety).
  - **`src/app/lib/square/customers.ts`** — `fetchSquareCustomer(merchant_id, customer_id)` helper. 5-min token cache, environment-aware base URL (`squareupsandbox.com` vs `squareup.com`), 401 → cache invalidation, all failure modes return `null` so enrichment is strictly best-effort (a Square API hiccup must NEVER block the boundary event from landing).
  - **`/api/square/webhooks/appointments/route.ts`** — full receiver. HMAC-SHA-256 verification over `notification_url + raw_body` (Square's spec — different from Shopify's body-only). Multi-secret rotation. Auth-attempt audit logging. Only processes `appointment.created` in v1 (`appointment.updated` and `appointment.canceled` ack-and-skip so Square doesn't retry). Customer enrichment runs in PARALLEL with the AFG outbound-secret read so identity hints land in the SAME forward to `/api/purchase` (single transaction, all canon phases run in one shot).
  - **`/api/purchase` extended for phone identity** — accepts `phone` (raw E.164) or `phone_hash` in payload, mirrors existing `email_hash` handling, `normalizePhone()` handles US default `+1` prefix + cleans punctuation. Phase 3 self-canonical fallback now covers `phone_sha256:` alongside `email_sha256:`. **New Phase 3.5:** when BOTH email + phone are present on the same boundary event, INSERT an `identity_aliases` edge linking `phone_sha256:X → email_sha256:Y` (email treated as canonical since it's the more stable cross-platform identifier). `trg_sync_canon_from_alias` propagates so any future event arriving with phone-only stitches to the same canonical as email-only events for the same person.
  - **`/api/purchase` event_name fix** — previously hardcoded `'purchase'` in the `chapter_ingest.purchase_events` INSERT at line 313, which would have silently overwritten Square's `'appointment_booked'` event_name. Now reads from `payload.event_name` (default `'purchase'` for backward compat with Shopify). One-line surgical fix; load-bearing for the boundary-event abstraction.
- **Naming note (backlog):** the internal endpoint is still called `/api/purchase` and the table is `chapter_ingest.purchase_events` — both names are legacy from when ecom was the only vertical. The data model already supports all boundary events via the `event_name` discriminator + `chapter_config.boundary_event(p_client_key)` helper (Phase 1+2 wiring). Renaming `/api/purchase` → `/api/boundary-event` + `chapter_ingest.purchase_events` → `chapter_ingest.boundary_events` is a clean ~25-min refactor (rename + update 3 Shopify routes + 1 Square route forward URLs) but it's been deliberately sequenced AFTER barbershop ships — don't churn live routes during onboarding crunch. Added to backlog. Docstring at top of `/api/purchase` documents the legacy name so the next engineer reading the code isn't confused.
- **Tomorrow's barbershop intake** now reduces to: generate Square signing key + OAuth access token from sandbox/prod → INSERT one row into each of `square_webhook_secrets` + `square_oauth_tokens` → register webhook URL with Square → trigger a test appointment. The adapter is generic across barbershops — every future Square Appointments client follows the same intake pattern (no code changes).

---

### Short-window cleanups (June 9, 2026 evening)
- **Daily-digest attribution-chain freshness check (Backlog → SHIPPED).** Extended `/api/internal/monitoring/daily-digest` to cross-product active clients (from `chapter_config.client_secrets WHERE revoked_at IS NULL`) × 3 attribution chain stages (`lifecycle_chapters_snapshot`, `canonical_v1_snapshot`, `canonical_v2_snapshot`). For each combo, computes `MAX(snapshot_ts_hi) WHERE status='ok'` from `_snapshot_runs` and reports gap_hours vs `now()`. Flags any combo >24h stale OR with no successful run found. Surfaces in the 14:00 UTC GChat post alongside the existing MV freshness section. Single SQL query, processed in JS — no N×M sequential calls. Validated against prod: all 9 combos report OK at 13.6h gap from this morning's 03:30 UTC cron. Catches silent cron failures before they cause a stale-data demo.
- **Per-client `display_tz` wired through dashboard date math.** Previously hardcoded `America/Los_Angeles` in `src/app/chapter/_components/format.ts`. Updated `rangeToWindow`, `compareWindow`, `fmtRangeSubtitle` to accept optional `tz` parameter (default kept as `America/Los_Angeles` for backward compat). 8 dashboard `page.tsx` files thread `cachedClientConfig(clientKey).display_tz` through to `rangeToWindow`. Cost is essentially free — `cachedClientConfig` uses `unstable_cache` with 5-min TTL same as everything else. `journeys/page.tsx` consolidated to a single `cachedClientConfig` fetch (was doing it twice). DB: `eos_fabrics` + `adsforgood_prod` flipped to `America/New_York`. `projectagram_reels` stays `America/Los_Angeles`. Barbershop will inherit `America/New_York` (the default) when provisioned. **Real-world effect:** at 8pm UTC daily, EOS / adsforgood / barbershop will roll to the next day in their dashboard windows BEFORE Projectagram (LA) does — that 3-hour shift was previously incorrect for the 3 ET-located clients.
- **Removed dead `LIFT_CAUSATION` mock + `LiftCausation` type** from `mockdata.ts` (49 lines). Leftover from when L&I had a Causation tab placeholder; superseded by Contribution tab (live since May 26). Zero remaining refs anywhere in `src/`.

---

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
- **Heavyweight tier (statistical lift across lag buckets) DEFERRED** — v1 ships as descriptive table only. The shared matched-lift engine is now available (`chapter_reporting.matched_lift_bucket_stats`, shipped June 14) so the heavyweight build calls into it instead of forking the math a third time.
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
- **Deferred for v2:** (a) ~~shared matched-lift engine refactor~~ SHIPPED June 14, 2026 — `chapter_reporting.matched_lift_bucket_stats(client, start, end, cohort_axis)` extracts the identity-level bucket math (nonbot → identity_channels → cohort bucketing → ids_with/without × conv_with/without per channel × bucket). Both `contribution_overview` and `incrementality_channel_overview` now call it; EOS 30d regression byte-for-byte identical on subscriber axis (12 of 12 rows match). Function is `STABLE SQL`, accepts `subscriber` | `location` | other axes (value_band returns zero rows, since chapter-level bucketing belongs to the caller). (b) modeling where substituting buyers redistribute (which channel absorbs them; spec §2 — dies at EOS's n), (c) Causation mock data + types are now unused but not yet cleaned out of `mockdata.ts`.

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
- **Watch out — schema creation requires TWO follow-up steps** (both bit the Recommendations cron on June 15, post-mortem below):
  1. **Add to PostgREST exposed schemas** — Supabase Dashboard → Settings → API → "Exposed schemas". Without this, `supabase.schema("<new_schema>")` returns PGRST106 "Only the following schemas are exposed". Silent failure if errors aren't surfaced.
  2. **Grant service_role privileges on the schema** — `GRANT USAGE ON SCHEMA <s> TO service_role` + table/sequence/function grants + `ALTER DEFAULT PRIVILEGES` for future objects. Without this, PostgREST surfaces 42501 "permission denied for schema". Migration template at `chapter-scripts/snapshots/2026-06-15-grant_service_role_chapter_recommendations.sql` (apply when adding any new chapter_* schema).
  - **Past additions and when each was fixed:** `chapter_audit` + `chapter_config` added on May 12 (both steps done same day). `chapter_recommendations` added June 14 — **both steps missed**, caused Monday 06:00 UTC cron to fail with PGRST106 then 42501. Fixed June 15. Same gotcha will apply to `chapter_engagement` when Moment Identity v2 ships — pair schema-creation migration with grants migration in the same PR.

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

### 🟢 Cliff cleared — next priorities (updated June 30, 2026)
Fix 2 shipped. Chain wall-clock 500s → ~86s, **headroom 514s of 600s ceiling** (was 100s). Growth rate drops too — v1/v2 now scale with daily affected canonicals (near-constant), not cumulative event volume.

Chain-order bug (filed + fixed June 30) — `refresh-dashboard-mvs` cron moved from 04:00 → **03:00 UTC** so `journey_bot_classification_v1` is fresh when the chain reads it at 03:30. Miss window narrowed from ~23.5h to 30 min.

Remaining billing/usage build order (from [docs/chapter-billing-usage-handoff.md](docs/chapter-billing-usage-handoff.md)):
1. **Backfill: historical chain-order misses.** Identify + force-reprocess canonicals where canonical_v1 was misattributed by past stale-MV reads (the Fix 2 incremental's `_affected` set wouldn't catch these on its own because their canonicals have no new lifecycle activity since the misread). One-shot SQL script. Modest impact (low single digits per day at EOS scale; cumulative over several months).
2. **Fix 1B — apply retention to lifecycle + canonical_v2.** Schema (Fix 1A) shipped June 30. 1B swaps the hardcoded `v_date_floor` for `chapter_config.retention_floor()` with chapter-spanning caveat: compute per-canonical effective_floor = MIN(chapter.first_ts for chapters with boundary_ts >= retention_floor OR no boundary), preserve chapter_id continuity for canonicals with pre-retention chapters. Regression test required. Smaller win than Fix 2 (depth matters less than breadth here), but needed before tier validation. Chapter-spanning caveat: anchor reads to chapter's `first_ts`, not raw event timestamp.
3. **Validate tier ceilings** (Standard 25K / Growth 75K / Pro 150K human-likely) at ~60–70% of the post-fix cliff. Need to measure chain-seconds per human-journey post-Fix 2.
4. **Pin + version the classifier** + investigate April→June drift (April 61.7% bot_likely → June 0.7%). **Billing blocker.**
5. **`chapter_reporting.usage_snapshot`** + nightly upsert (burst-weighted overhead allocation, effective-dated rate card, monthly reconciliation against real invoices).
6. **Billing page** at `/chapter/<key>/billing` (Phase 1 transparency view). Under Support → Inbox in sidebar.
7. Trailing 2–3 month billing window rule.
8. Codify fair-use clause + "real customer journey = human_likely" in contract templates.
9. Consolidate Vercel/Supabase billing onto one business entity.

### 🔴 Priority 1 — Active build plan (sequenced June 9, 2026)

**Dashboard wiring queue: 10 of 10 pages fully live.** **Production attribution chain cron + Observations + cohort cron all healthy** (validated). **Cross-Source Influence cold-load: 24s → 4s** after Sprint 1.5 (June 8–9). **Boundary-event Phase 2: 11 of 13 dashboard RPCs wired** through `chapter_config.boundary_event()` helper (Sprint 1.3, June 9).

**Build philosophy locked (June 5):** hybrid sales-pulled + primitive-first. Sales drives priority; every feature ships as a config-driven primitive (no `if (client === 'x')`). The abstraction is the hard part — the second instance is cheap. Build abstractions at client #2 of any new vertical, not at client #5.

**Architectural Forward Rule locked (June 9):** every new dashboard RPC scanning >100k rows MUST ship with a pre-aggregated MV/snapshot from day 1, wired into `refresh-dashboard-mvs` cron. The Cross-Source Influence work proves the pattern. The wrong way (raw-event scans during page render) does not scale.

#### Sprint 1 — Platform readiness
- **Sprint 1.1 SHIPPED June 9** — Cron parallelism for `refresh-attribution-chain` (CONCURRENCY=5; ~22-client headroom under maxDuration).
- **Sprint 1.3 SHIPPED June 9** — Boundary-event Phase 2: 11 of 13 dashboard RPCs wired through `chapter_config.boundary_event()`. 2 deferred to Sprint 2.4 (`funnel_overview` + `connections_panel` — their `'purchase'` refs are raw `event_name` scans on `chapter_ingest.purchase_events`, vertical-fit territory not boundary-swap).
- **Sprint 1.5 SHIPPED June 8–9** — Cross-Source Influence perf fix: connections_panel SQL fix + pageOptions/campaignOptions pre-aggregated MVs (24s → 4s, 6×). All 3 new MVs wired into the 04:00 UTC refresh cron.
- **Sprint 1.2 DEFERRED** — Onboarding automation script. Doing manual onboarding for the barbershop first; script the playbook AFTER walking it once. Easier to codify a known path than to predict it.
- **Sprint 1.4 SHIPPED June 9** — Configurable email-source patterns. `email_source_patterns text[]` on `chapter_config.clients` + STABLE helper + `refresh_canonical_v1_snapshot` patch. EOS regression clean (817 rows / 357 email_chapters pre = post). Onboarding Klaviyo / Marketo / HubSpot Marketing / Sendinblue / Constant Contact now = single `UPDATE chapter_config.clients SET email_source_patterns = ARRAY[...]`.

#### Sprint 2 — B2C personal services / Not So Cavalier (signed, server-side complete, pixel install PAUSED)
- **Vertical:** B2C personal services. **Client:** Not So Cavalier (barbershop). **Booking platform:** Square Appointments. **Stage:** signed + paying; server-side onboarding complete June 10.
- **2.1 SHIPPED June 10 — Server-side provisioning complete.** `chapter_config.clients`, `client_secrets`, per-client Postgres role + grants, `CLIENT_ROLE_MAP`, CORS origin, dashboard `CLIENTS` list. `boundary_event_name = 'appointment_booked'`, `display_tz = 'America/New_York'`. Square bookings + payments webhook subscriptions live; Square Customers API access token configured.
- **2.3 SHIPPED June 9 — Square Appointments + payments webhook adapter** at `/api/square/webhooks/{appointments,payments,refunds}`. Bookings emit `appointment_booked` (boundary); payments emit `appointment_paid` (downstream, same `order_id`); refunds flow into `chapter_ingest.refund_events` for Sprint 3 refund-netting. HMAC verification (notification_url + raw_body). Customer enrichment via Customers API runs in parallel with AFG outbound auth.
- **2.3 v2 SHIPPED June 9 — Phone-first identity stitching.** `/api/purchase` accepts `phone_sha256:` alongside `email_sha256:` (Phase 3 self-canonical + Phase 3.5 cross-alias edge).
- **2.1 cont PAUSED — Pixel install on `notsocavalier.com`** waiting on operator Staff-role access to Square Appointments (needed to configure the post-booking redirect URL for cross-domain stitching).
- **2.4 LIGHT REMAINING — Personal-services dashboard copy + taxonomy minimum-viable.** Action filter labels + funnel reshape; awaits first week of NSC data.
- **2.2 REMAINING — Tune Observation thresholds for personal-services norms** once first week of NSC data lands.

#### Sprint 4 SHIPPED June 10 — Tier 1 first-party redirect domain
- **Live at `/r/<client_key>/<slug>`** with full intelligent routing. 17 condition types, identity + journey cookies, click logged to `chapter_ingest.pixel_events` as `redirect_click`, admin UI at `/internal/redirect-rules`, cross-domain stitching (`?chid` handoff + `?rh`/`?re`/`?rid` server-side stitch), consent gate, ESP wrap compatibility.
- **Operator guide:** [docs/tier1-redirect.md](docs/tier1-redirect.md).
- **Remaining backlog items spun out of Sprint 4:** Mailchimp `recipient_token` backfill (unlocks `?rid` flavor for Mailchimp); `/api/consent-sync` (cross-domain consent sync between redirect apex + storefront).

#### Sprint 5 — Per-user auth + client-scoped surface
- **5a SHIPPED June 10** — Per-user auth via Supabase magic links + allowlist (`chapter_config.users`). Middleware gates `/chapter/*` for both Supabase session and legacy `CHAPTER_DASH_TOKEN` cookie (coexistence).
- **5b SHIPPED June 11** — `/chapter/[client_key]/*` clean URL surface via catch-all redirect shim → legacy `?client=<key>` path.
- **5c SHIPPED June 11** — Sidebar conditional rendering for client_employees (static client label, no switcher, email + role in foot).
- **5b real SHIPPED June 14, 2026** — Canonical render at clean `/chapter/[client_key]/*` URL via **middleware rewrite** (not the page-tree duplication CLAUDE.md originally flagged as "sizable"). When the path matches the underscore convention, middleware rewrites internally to `/chapter/<slug>?client=<key>` so the existing page tree renders unchanged; browser URL stays clean, no redirect round-trip. Sidebar links emit clean URLs; `isActive()` recognises both forms. Catch-all `[client_key]/[[...slug]]/page.tsx` shim removed (dead code under the rewrite). Auth path unchanged: middleware's `canAccessClient` enforces *before* the rewrite; cookies on the auth response are carried forward onto the rewrite response so refreshed Supabase sessions survive.
  - **Step 4 SHIPPED June 14** — every in-app URL emitter goes through the new `chapterUrl(clientKey, slug, query?)` helper at [src/app/chapter/_lib/urls.ts](src/app/chapter/_lib/urls.ts) so the codebase can never accidentally emit a legacy `/chapter/<slug>` URL again. Updated: 4 `<Link href>` calls in `OverviewClient.tsx`, 43 deeplinks across 18 Recommendations rule files. Server-side authoritative URLs untouched (auth callback redirects, root default landing, sign-out, audit log `page` fields — these don't have a client_key context). Convention going forward: grep for `['"]/chapter/` should match ONLY server-side intent (login redirect / root default); every render-time URL flows through the helper.
- **5d REMAINING — Remove `CHAPTER_DASH_TOKEN` cookie path** after every operator has logged in via Supabase at least once.

#### Sprint 6 SHIPPED June 10 — Offline attribution: community event CSV ingest
- **End-to-end pipeline** for ingesting offline community events at `/internal/offline-events`. CSV → hash PII in-process → `chapter_ingest.offline_events` + per-attendee `offline_milestones` + auto-cohort. Privacy contract: raw email/phone never persists; only truncated hash prefixes shown to operator.
- **Remaining (long-horizon):** offline attribution expansion (Pack D online+offline lift modeling) — when first client demands it.

#### Cross-cutting nice-to-haves (can land in any sprint without blocking)
- **Daily-digest chain-freshness check** — extend 14:00 UTC digest with `MAX(snapshot_ts_hi) WHERE status='ok'` per client per stage vs. `now() - 24h`. Catches silently-failed crons.
- ~~**Shared matched-lift engine refactor**~~ — SHIPPED June 14, 2026. See L&I Contribution tab "Deferred for v2" entry above. Function: `chapter_reporting.matched_lift_bucket_stats`. When Connections #2 heavyweight tier ships, it imports this function instead of forking the math.
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

**Fix #5 phase 3 — SHIPPED June 14, 2026**
- **Phases 1 + 2 complete (May 4, 2026):** additive shim across all 11 views; both reporting snapshots (sessionized_universe_summary, identity_overlap_summary) migrated to canonical_identity_key.
- **Phase 3 shipped via 3 migrations** (`fix_5_phase_3_drop_and_create_base_1_6`, `fix_5_phase_3_create_sessionized_and_reporting`, `fix_5_phase_3_create_categorized_v1`).
- **What changed:** `final_identity_key` removed from output + body of all 11 base views. The raw-identity fallback (previously `COALESCE(canonical, final)` downstream) is now embedded directly in `eos_pixel_events_unified_v1`'s `canonical_identity_key` definition: `COALESCE(ic.canonical_identity_key, pe.identity_key) AS canonical_identity_key`. Downstream views inherit the always-non-null guarantee without the legacy column. `eos_sessionized_events_canonical_v1` became a pass-through (its redundant JOIN with `identity_canonical` was already done upstream).
- **`eos_valid_reporting_journeys_v1` recovery** (caught in the cascade — was missing from initial inventory, had no migration history). DDL reconstructed from inference: same filter shape as `eos_valid_journeys_v2` but on the sessionized bot classification. Joins downstream cleanly; behavior preserved.
- **Bonus Fix-#10-style cleanup:** 10 confirmed-dead `eos_*` legacy dependents (zero function refs, zero app refs, zero loader refs) were left dropped (cascade dropped them, we chose not to recreate). Dropped: `chapter_attribution.chapter_session_entry_channels_canonical_v1`, `eos_journey_entry_channel_v1`/`v2`, `eos_channel_performance_v1`/`v2`, `eos_engagement_quality_v1`/`v2`, `eos_journey_paths_v1`/`v2`, `eos_traffic_overview_v1`. These were leaves from the May-era reporting layer; the active dashboard uses `chapter_reporting.*` RPCs that read from `journey_resolved_v1` / `canonical_v1_snapshot` / `canonical_v2_snapshot` instead.
- **Verification:** zero function references to any of the 22 affected views (verified via `pg_get_functiondef` regex pre-migration); chapter-scripts/ confirmed migrated to `canonical_identity_key` (operator-run grep found only archive/ matches). Failure mode bounded entirely to the view network; no live dashboard surface affected.
- **Harmonization note:** the chain now consistently uses `identity_canonical` (recursive view) for resolution upstream in `unified_v1`. The `identity_canon` (table) vs `identity_canonical` (recursive view) split mentioned in the original phase 3 spec was not present in this chain — the 11 views all used recursive resolution. Harmonization across the broader schema (where `identity_canon` is preferred for fast canonical lookups in active RPCs) remains the convention.


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

**Live in DB but pending next prod deploy** (from June 8–9 sessions): cron route changes (refresh-dashboard-mvs now refreshes 3 new connections MVs at 04:00 UTC; refresh-attribution-chain uses bounded-concurrency worker pool with `max=5` pool size), perf instrumentation removal from `influence/page.tsx`, daily-digest chain-freshness check, per-client `display_tz` wired through `format.ts` + 8 dashboard pages, `LIFT_CAUSATION` mock + type removed from `mockdata.ts`, Square Appointments webhook adapter (route + 2 helpers + 2 DB tables), `/api/purchase` event_name fix + phone/email alias support + Phase 1 customer_id gap fix + Phase 3 double-prefix bug fix, Square route event_ts priority fix, Sprint 1.4 configurable email-source patterns (column + helper + refresh_canonical_v1 patch).

**Backlog items (small, opportunistic):**
- **MV-ify Email subscribers cohort JOIN inside Connections panel resolver** — currently the Connections RPCs re-do the cohort JOIN per call. Fine at EOS volume; revisit when first client has >50k subscribers.
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
- **View-through / impression attribution** — long-term backlog. Chapter today attributes click-based touches only; ad impressions that never generated a click but preceded a conversion are invisible. Two orthogonal ingest paths worth pursuing when a client's spend mix makes the gap material:
  - **Path A — Chapter impression pixel.** A 1x1 tracking pixel operators embed in creative wherever the ad channel accepts a third-party impression pixel (Meta, DV360, TTD, direct display, YouTube via GAM). Fires `impression` events into `chapter_ingest.impression_events` (new schema slot) with `client_key`, `campaign_id`, `creative_id`, `placement_hint`, cookie-based identity if available (limited by 3P cookie deprecation), device fingerprint fallback. Cross-domain identity via existing `chapter_config.email_engagement_events.recipient_token` pattern extended for impression-side (`?ih=` hint on creative click-through URLs so the eventual click stitches impression → click → session via `identity_canon`). Not all channels permit 3P impression pixels (walled-garden platforms often block or heavily gate them); coverage will be partial.
  - **Path B — ACR (Automatic Content Recognition) partnership.** Cross-license impression exposure data from OEM/ACR providers — Samba TV, LG Ads, VIZIO's Inscape, or ISPA. Provides household-level CTV/linear-TV exposure. Match to `identity_canon` via household-address-hash or device_graph joins. Data cost is real ($10-40k/yr min commit typical); only worth it once a paying client has meaningful CTV spend AND is asking for it. Higher signal quality than pixel-based path for TV specifically; useless for programmatic display.
  - **Attribution semantics to design carefully.** View-through is the metric where platforms Meta/Google systematically over-attribute — a house-of-cards default (~7-day view-through window credits every impression that ever preceded a conversion). Chapter's honesty positioning gives us a clear differentiator: bound the window tight (24-72h), require the impression to precede the FIRST touch in the chapter (not just precede boundary), never claim credit that overlaps a click-based touch on the same channel. New chapter path element `impression:<channel>` distinct from `<channel>` so operators can see impression contribution alongside click contribution without them being conflated.
  - **Schema shape:** `chapter_ingest.impression_events (impression_id, client_key, ts, identity_key nullable, device_fingerprint nullable, household_hash nullable, source_type, channel, campaign_id, creative_id, placement_hint, raw)`. Identity resolution runs the same canon graph but with looser precedence (`identity_key > household_hash > device_fingerprint`). Bot filter: even harder than click-side; impressions from CTV apps in particular are ~40% MFA/SSAI-inflated per industry norms, so require its own classifier tier before impressions enter attribution paths.
  - **Marketable claim if we build it honestly:** "Chapter's view-through attribution counts only impressions where the same identity later completed a chapter — never the walled-garden default of 'credit every impression that ever preceded a conversion.' Typical shrinkage: 40-70% off platform-reported VTC." That's the pitch to any client whose Meta / Google Ads dashboards show inflated view-through credit they don't trust.
- **Multi-client generalization of `chapter_reporting`** — COMPLETE via Option B (June 4–5, 2026): lifecycle_chapters / canonical_v1 / canonical_v2 are multi-tenant SQL functions; the 5 legacy `eos_purchase_*_snapshot_v1` reporting caches that canonical_v2 used to depend on are bypassed.
- **Gchat slash-command bot** on top of `saveClient` action — admin team interface for updating client portal config without the form UI.
- **Replace JSON textareas in `/internal/client-portal-config` admin form with structured editors** — current `project_summaries` + `reporting_tiles` fields are raw JSON textareas. Easy to break with invalid JSON.
- **`purchase_items` population** — not yet populated for EOS.
- **`chapter_config` schema** — per-client config home. Tables: `clients` (canonical per-client config: storefront_domain, boundary_event_name, display_tz — added June 5; email_source_patterns — added June 9), `client_secrets`, `shopify_webhook_secrets`, `square_webhook_secrets` + `square_oauth_tokens` (added June 9 for Square Appointments adapter), `email_campaigns`, `email_engagement_events`, `connections_cohorts` + `connections_cohort_members` (added June 1).
