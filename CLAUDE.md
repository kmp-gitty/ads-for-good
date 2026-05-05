# CLAUDE.md — Chapter Project Context
> This file is the living source of truth for Claude Code sessions.
> Updated at the end of each working session. Do not modify manually.
> Last updated: April 29, 2026

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
- **`src/app/api/pixel/route.ts`** — serves the pixel.js script to clients
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

## ✅ Completed Fixes (as of May 1, 2026)

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

### 🔴 Priority 1 — Data Integrity Blockers

**Fix #5 phase 3 — Cleanup (deferred until Looker audit)**
- **Phases 1 + 2 complete (May 4, 2026):** additive shim across all 11 views; both reporting snapshots (sessionized_universe_summary, identity_overlap_summary) migrated to canonical_identity_key.
- **Phase 3 work:** drop `final_identity_key` from view outputs and body references; harmonize `identity_canon` (table) vs `identity_canonical` (recursive view) across the chain.
- **Blocked on:** Looker tile audit — confirm no dashboard reads `final_identity_key` directly. Once verified, phase 3 is a series of CREATE OR REPLACE VIEWs removing the column + a final pass to swap upstream JOIN/COALESCE refs from final to canonical.


---

### 🟡 Priority 2 — Attribution Quality

**Fix #7b — Materialize `chapter_channel_paths_canonical_v1`** *(promoted-priority from Fix #17 cascade — May 3, 2026)*
- **Problem:** `canonical_v1` is a chained view. Snapshots reading it take 24+ min.
- **Now also blocking:** the May 3 Fix #17 cascade hit a Supabase pooler connection drop at ~15 min on `channel_paths_canonical_summary` — that snapshot is currently un-refreshable through `run-snapshot.js` until canonical_v1 is materialized.
- **Fix:** Same pattern as Fix #7 — create `chapter_channel_paths_canonical_v1_snapshot`, rewrite `canonical_v1` as a facade, refresh via `run-snapshot.js`.
- **Location:** Supabase — `chapter_attribution`

**Fix #18 — Invert canonical_v2 → reporting layer dependency** *(spawned from Fix #17 on May 3, 2026)*
- **Problem:** `chapter_attribution.chapter_channel_paths_canonical_v2` joins `chapter_reporting.eos_filtered_purchases_v1` and `chapter_reporting.eos_purchase_channel_final_snapshot_v1` — i.e., an attribution-layer view depends on reporting-layer snapshot tables. Backwards from the typical layering (reporting consumes attribution, not the other way around).
- **Symptom this caused:** Fix #17's data lag — when the reporting snapshots went stale, attribution coverage capped at the stale row count.
- **Fix:** Lift the dependency upstream — derive the equivalent of filtered_purchases / purchase_channel_final from `chapter_attribution.purchase_chapters_base` directly inside canonical_v2's chain. Reporting snapshots become pure consumers.
- **Why not Priority 1:** Fix #17's cascade gives us a working pattern (refresh both layers together at one cutoff). Bigger refactor; not blocking analysis right now.
- **Location:** Supabase — `chapter_attribution.chapter_channel_paths_canonical_v2`

**Fix #4 — Null / unknown attribution cleanup**
- **Problem:** `null`/`unknown` channels exist in attribution output.
- **Fix:** Investigate why these chapters have missing attribution. Classify as direct, unknown, or recovered.
- **Location:** Supabase — `chapter_attribution`

**Fix #9 — Linear attribution decision**
- **Problem:** Linear is the current canonical model but hasn't been compared to a session-entry linear model.
- **Fix:** Keep linear for V1. Set up side-by-side test of canonical vs session-entry linear before replacing.
- **Location:** Supabase — `chapter_attribution`

---

### 🟢 Priority 3 — Housekeeping & Documentation

**Fix #13 — Pixel enrichment for element context**
- **Problem:** `hover_intent` events only capture `tag` and `label`. No `href`, `element_id`, `element_class`, `aria_label`, or `page_section`.
- **Fix:** Update `getClickableLabel` → `getElementProps` in pixel.js and update the mouseover listener.
- **Exact code change:**
  ```javascript
  // REPLACE the existing getClickableLabel function and mouseover listener with:
  
  function getClickableLabel(el) {
    if (!el) return null;
    return (
      el.innerText?.trim()?.slice(0, 100) ||
      el.getAttribute("aria-label") ||
      el.getAttribute("data-label") ||
      el.id ||
      el.className ||
      el.tagName
    );
  }
  
  function getElementProps(el) {
    if (!el) return {};
    return {
      label: getClickableLabel(el),
      tag: el.tagName,
      href: el.tagName === "A" ? (el.getAttribute("href") || null) : null,
      element_id: el.id || null,
      element_class: el.className || null,
      aria_label: el.getAttribute("aria-label") || null,
      page_section: (function() {
        var parent = el.closest("section, nav, header, footer, main, aside");
        return parent ? (parent.getAttribute("aria-label") || parent.id || parent.tagName) : null;
      })()
    };
  }
  
  document.addEventListener("mouseover", function (e) {
    var el = e.target.closest("a, button");
    if (!el) return;
    hoverTarget = el;
    hoverTimer = setTimeout(function () {
      if (hoverTarget === el) {
        api.track("hover_intent", getElementProps(el));
      }
    }, 500);
  });
  ```
- **Location:** `src/app/api/pixel/route.ts` — inside the pixel script string, find and replace the hover_intent section

**Fix #14 — Extract `browser_ip` from raw into proper column on `purchase_events`**
- **Problem:** IP address is buried in `raw -> order -> browser_ip` and `raw -> order -> client_details -> browser_ip` on Shopify orders. Not queryable without JSON parsing.
- **Fix:** Add a migration to extract and store `browser_ip` as a proper column on `chapter_ingest.purchase_events`.
- **Location:** Supabase migration

**Fix #15 — Extract `client_details.user_agent` from raw on purchase events**
- **Problem:** Purchase-time user agent is buried in raw Shopify payload, separate from browse session user agent on journeys.
- **Fix:** Extract and store as a proper column on `chapter_ingest.purchase_events`.
- **Location:** Supabase migration

**Fix #16 — Consider hashed/truncated IP on pixel events**
- **Problem:** IP is discarded after geo-lookup at pixel ingest. Storing it (even partially) would improve bot detection.
- **Fix:** Consider storing last-octet-zeroed IP (e.g., `71.237.147.0`) on `pixel_events` for bot detection utility while remaining GDPR/CCPA compliant.
- **Location:** `src/app/api/chapter/collect/route.ts` + Supabase migration

**Fix #10 — Cleanup old/experimental views**
- **Views to evaluate:** `chapter_session_entry_channels_v1`, `_v2`, `chapter_channel_paths_v2`, `v3`, `canonical_v1`, `canonical_v2`
- **Action:** Once stable, decide what to keep/rename/archive.
- **Location:** Supabase — `chapter_analysis` and `chapter_attribution`

**Fix #8 — Historical identity gap documentation**
- **Note:** Early EOS data had identity persistence gaps. Cookie fixes applied April 1 (identity) and April 14 (journey). Fallback paths are needed for older chapters. Future data should have full coverage.
- **Action:** Document formally. No code change required.

**Fix #11 — Document definitions**
- **Write clear definitions for:** first touch, last touch, linear, channel contribution, only touch, middle touch, unknown, chapter, journey/session.
- **Location:** `/docs/chapter-definitions.md` (create this file)

**Fix #19 — POS / Quick Sale orders rejected by Shopify webhook adapter** *(discovered + diagnosed May 3, 2026; moved here May 4)*
- **Problem:** `src/app/api/shopify/webhooks/orders-create/route.ts` line 201-203 returns 400 `missing_purchase_identity` when an order has neither `email` nor `customer_id`. POS / Quick Sale orders (in-person walk-ins) typically have neither, so they are silently dropped. Confirmed in production: order #102256 (Apr 9, 2026, $78, source_name=`pos`) was missed — only one of 444 in the live window, but the bug is recurring (every future POS order will miss).
- **Backfill applied May 3, 2026:** `chapter_ingest.purchase_events` now includes #102256 with synthetic identity `customer_id=shopify_pos_anonymous:7802309804325` and `identity_reason='pos_anonymous_backfill'`. `raw->_backfill_note` flags it as a manual backfill.
- **Fix:** Update the adapter to branch on `order.source_name`. For `pos`, generate a synthetic `customer_id` like `shopify_pos_anonymous:{order_id}` instead of rejecting. Tag POS orders so reporting/journey-based snapshots can filter them out by default (POS has no online journey → no attribution).
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

## 🔜 Future Work (Not Started)

- **Dashboard build** — Chapter dashboard to be built in this repo under a new route (e.g., `src/app/chapter/`) and deployed to Vercel alongside the agency site
- **Multi-client generalization** — `chapter_reporting` is currently EOS-specific. Future clients need generic reporting primitives
- **Offline attribution expansion** — Pack D / online+offline modeling via `offline_milestones`
- **`purchase_items` population** — not yet populated for EOS
- **`chapter_config` schema** — reserved for future client-level configuration (event mapping, attribution rules, channel normalization, feature flags)
