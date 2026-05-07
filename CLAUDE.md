# CLAUDE.md — Chapter Project Context
> This file is the living source of truth for Claude Code sessions.
> Updated at the end of each working session. Do not modify manually.
> Last updated: May 7, 2026

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
| `chapter_reporting` | Dashboard-ready outputs (currently EOS Fabrics specific) |
| `chapter_analysis` | Experimental, QA, debug objects — not production |
| `chapter_config` | Reserved for future client config — currently empty |

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

### Current Client
- **EOS Fabrics** (`client_key = 'eos_fabrics'`) — only active client as of April 2026
- All `chapter_reporting` objects are EOS-specific for now

### Known Data Gaps
- Identity cookie was not persistent before **April 1, 2026 17:00 UTC** (new identities per event)
- Journey cookie was not persistent before **April 14, 2026 18:15 UTC** (new journeys per event)
- Data before these dates should be treated with caution for identity/journey analysis
- `purchase_items` table not populated for EOS yet

---

## ✅ Completed Fixes (as of May 7, 2026)

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
Pipeline of clients on the horizon: 300-location school, 2K-location national dentist, B2B startup, more ecommerce. Goal: prevent the "single runaway query melts the DB" pattern from May 5 (Fix #21 cascade) and similar issues at 5-30 clients with high per-client volume. Build for scale + security NOW, not after the next blowup. Fixes #22, #23, #27 done May 7; #24, #25, #26, #28 below.

### 🔴 Priority 1 — Data Integrity Blockers

**Fix #24 — Enable Supabase read replica + route analytics to it** *(scale roadmap — strategic)*
- **Problem:** Real-time pixel/webhook ingest and heavy analytical reads share the same primary DB. A runaway analytical query degrades ingest performance. As clients scale, this gets worse.
- **Fix:** Enable Supabase Pro read replica. Route analytical workloads (Looker, snapshot reads, `run-snapshot.js` non-INSERT queries) to replica. Writes (pixel ingest, purchase webhooks, identity_aliases) stay on primary. Primary becomes insulated from analytical load.
- **Effort:** ~2-4 hours. Supabase setting + connection routing + test.
- **Cost:** ~$10-25/mo extra depending on instance size.
- **Why P1:** Single biggest "this can't take us down" lever as client count grows.

**Fix #25 — Incremental snapshot refresh pattern** *(scale roadmap — biggest refactor)*
- **Problem:** Every snapshot today does `TRUNCATE + INSERT` over the full live window. Refresh time is `O(all data since 2026-04-01)`. With 30 clients × daily refreshes × growing per-client volume, that's untenable. Today's canonical_v1 took 50+ min for one client.
- **Fix:** Track `last_processed_event_ts` per snapshot table. Each refresh only processes events with `event_ts > last_processed`. Refresh time becomes `O(today's new data)`. For canonical_v1 specifically: track per-(client_key, canonical_identity_key) max processed boundary_ts, INSERT only chapters with newer boundaries.
- **Effort:** ~2-3 days of refactor work — biggest payoff. Required for daily refreshes at scale.
- **Why P1:** Without this, 30 clients × full rebuilds = guaranteed exhaustion.

**Fix #26 — Multi-tenant isolation hardening** *(scale roadmap — security + scale)*
- **Problem:** Currently all queries filter by `client_key` in the WHERE clause, but there's no enforcement at the schema level. If a future query forgets a `client_key` filter, it scans all clients' data. Plus no RLS policies. Plus shared API key for all clients.
- **Fix:**
  1. **Indexes:** ensure every query path on chapter_ingest, chapter_identity, chapter_model, chapter_attribution has a leading index on `client_key`.
  2. **RLS policies:** add Row Level Security on `chapter_ingest.*`, `chapter_identity.*`, etc. — service role bypasses but app-tier connections are confined to their client_key.
  3. **Per-client API keys:** rotate `AFG_CLIENT_SECRETS_JSON` away from a single dict; make each client's key independently rotatable + revocable.
  4. **Audit logging:** log every `client_key` resolution attempt, especially failures, for security forensics.
- **Effort:** ~2-4 days. Security-sensitive — needs careful testing.
- **Why P1:** Required before signing the dentist or school accounts (compliance/data isolation expectations).

**Fix #28 — Snapshot scheduling + per-client isolation** *(scale roadmap — depends on Fix #25)*
- **Problem:** Currently snapshots are run manually + on-demand. With many clients, manual coordination doesn't scale. Concurrent refreshes for multiple clients would hit resource exhaustion.
- **Fix:** `pg_cron` or Vercel scheduled functions. Stagger per-client refreshes (client A 1am UTC, client B 1:30am, etc.) — never all simultaneous. Run during off-peak (UTC night). Fix #25 (incremental refresh) makes each refresh small enough to fit in a stagger window.
- **Effort:** ~1-2 days. After Fix #25 is done.
- **Why P2:** Optimization layer on top of Fix #25.

---

**Fix #5 phase 3 — Cleanup (deferred until Looker audit)**
- **Phases 1 + 2 complete (May 4, 2026):** additive shim across all 11 views; both reporting snapshots (sessionized_universe_summary, identity_overlap_summary) migrated to canonical_identity_key.
- **Phase 3 work:** drop `final_identity_key` from view outputs and body references; harmonize `identity_canon` (table) vs `identity_canonical` (recursive view) across the chain.
- **Blocked on:** Looker tile audit — confirm no dashboard reads `final_identity_key` directly. Once verified, phase 3 is a series of CREATE OR REPLACE VIEWs removing the column + a final pass to swap upstream JOIN/COALESCE refs from final to canonical.


---

### 🟡 Priority 2 — Attribution Quality

**Fix #18 — Deferred until Fix #25 (decision recorded May 7, 2026)**
- **Original framing:** invert canonical_v2's dependency on reporting-layer snapshots (`eos_filtered_purchases_v1`, `eos_purchase_channel_final_snapshot_v1`).
- **What investigation revealed (May 7):** the four reporting snapshots `canonical_v2` reads from (`eos_purchase_base`, `eos_purchase_touch_summary`, `eos_purchase_fallback`, `eos_purchase_channel_final`) are **caches of attribution-layer computation**, not reporting-layer business logic. Specifically, `eos_purchase_touch_summary_snapshot_v1` caches a query against `chapter_attribution.chapter_summary_v1` that's heavy enough to time out at 60s+ standalone. The "cross-layer dependency" is a caching pattern in the wrong schema — not pure architectural badness.
- **Why not just invert it now:** removing the cache and reading `chapter_summary_v1` directly from canonical_v2 would push canonical_v2's runtime from ~7 min to plausibly 15-30 min. Real performance regression for marginal architectural cleanup. The "right" fix is **Path B** (relocate the cache from `chapter_reporting` to `chapter_attribution` + facade view) — but that's a 2-3 hr refactor for a smell that isn't blocking anything.
- **Why deferred:** **Fix #25 (incremental snapshot refresh)** completely redesigns the snapshot architecture — `chapter_summary_v1`, `purchase_chapters_base`, and the four reporting caches all get rethought during that refactor. Doing Fix #18 now risks doing the work twice. The right place to address layering is during Fix #25's design.
- **Reopen criteria:** if Fix #25 changes scope or gets deferred indefinitely AND Fix #17-style data-lag incidents recur, revisit Fix #18 as an independent project (likely as Path B — relocate caches to attribution layer).

**Fix #9 — Linear attribution decision**
- **Problem:** Linear is the current canonical model but hasn't been compared to a session-entry linear model.
- **Fix:** Keep linear for V1. Set up side-by-side test of canonical vs session-entry linear before replacing.
- **Location:** Supabase — `chapter_attribution`

---

### 🟢 Priority 3 — Housekeeping & Documentation

**Fix #8 — Historical identity gap documentation**
- **Note:** Early EOS data had identity persistence gaps. Cookie fixes applied April 1 (identity) and April 14 (journey). Fallback paths are needed for older chapters. Future data should have full coverage.
- **Action:** Document formally. No code change required.

**Fix #11 — Document definitions**
- **Write clear definitions for:** first touch, last touch, linear, channel contribution, only touch, middle touch, unknown, chapter, journey/session.
- **Location:** `/docs/chapter-definitions.md` (create this file)

**Fix #19 — POS / Quick Sale orders rejected by Shopify webhook adapter** *(code-complete May 5, 2026 — pending deploy + real-world verification)*
- **Problem:** orders-create webhook returned 400 `missing_purchase_identity` when an order had neither email nor customer_id. POS / Quick Sale walk-ins typically have neither, so they were silently dropped. Confirmed by the Apr 9 order #102256 ($78, source_name=`pos`) miss.
- **Backfill applied May 3, 2026:** order #102256 inserted into `chapter_ingest.purchase_events` with synthetic identity `customer_id=shopify_pos_anonymous:7802309804325`.
- **Code fix (May 5, 2026):** `src/app/api/shopify/webhooks/orders-create/route.ts` now generalizes the identity-missing branch — for any order with a `source_name` and `id` but no email/customer, synthesizes `customer_id = shopify_{source_name}_anonymous:{order_id}`. Covers POS, mobile_app, draft_order, and future non-web sources. Strict 400 only fires when both source_name and order id are missing (malformed webhook).
- **To verify after deploy:** wait for next non-web order (or trigger one). Confirm `purchase_events` has a row with `customer_id` matching the `shopify_*_anonymous:` pattern. Reporting/snapshot scripts can filter POS via `raw->'order'->>'source_name'`.
- **Location:** `src/app/api/shopify/webhooks/orders-create/route.ts`

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

## 🔜 Future Work (Not Started)

- **Dashboard build** — Chapter dashboard to be built in this repo under a new route (e.g., `src/app/chapter/`) and deployed to Vercel alongside the agency site
- **Multi-client generalization** — `chapter_reporting` is currently EOS-specific. Future clients need generic reporting primitives
- **Offline attribution expansion** — Pack D / online+offline modeling via `offline_milestones`
- **`purchase_items` population** — not yet populated for EOS
- **`chapter_config` schema** — reserved for future client-level configuration (event mapping, attribution rules, channel normalization, feature flags)
