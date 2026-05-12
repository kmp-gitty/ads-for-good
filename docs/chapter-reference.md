# Chapter Reference

> **Purpose:** Living reference for the Chapter platform — schema, definitions, audit history, and open work.
> **Audience:** Internal — Chapter team & future employees. Uses schema names; references fix numbers.
> **Last updated:** 2026-05-08 (post-Fix #24 read-replica work, post-Fix #11 definitions integration)

---

# Data Flow Summary

## Chapter Data Flow

```
chapter_ingest    (raw events)
   ↓
chapter_identity  (identity resolution)
   ↓
chapter_journey   (session grouping)
   ↓
chapter_model     (unified events + lifecycle chapters)
   ↓
chapter_attribution (paths + attribution + reporting)
   ↓
chapter_reporting (dashboard outputs — EOS-specific today)

(chapter_analysis sits to the side — QA, experimental, and debug objects)
(chapter_config — reserved for future client config, currently empty)
```

## Mental Model

Chapter is built around 3 core concepts:

1. **Identity (who)**
2. **Events (what happened)**
3. **Chapters (why it matters)**

Events are grouped by identity, segmented into chapters by boundary events (purchase / conversion), and attributed to channels.

---

# Considerations

## 1. Modeling pipeline is now standardized on v2

After the April 6, 2026 audit, the legacy `unified_events` was removed from `chapter_model` (relocated to `chapter_analysis` as `unified_events_legacy`). Canonical pipeline is `unified_events_v2` → `unified_events_resolved_v2` → `unified_timeline_v1` → `lifecycle_chapters`.

## 2. Identity is graph-based, not flat

Alias chains exist; canonical identity is *derived* from `identity_aliases`, not stored at write time. The `identity_canon` table is a fast lookup cache; `identity_canonical` (view) is the authoritative recursive resolver. Since Fix #20 (May 4, 2026), a trigger on `identity_aliases` keeps `identity_canon` in sync automatically — and the API write paths (`/api/purchase`, `/api/conversion`, `/api/identify`) all upsert canon directly as defense in depth.

## 3. Chapters are the foundation of attribution

Everything depends on `lifecycle_chapters`. Chapter IDs reset per `(client_key, canonical_identity_key)` (verified in Fix #12, April 29, 2026) — so a returning customer's second purchase is `chapter_id = 1`, not a globally incremented number.

## 4. Raw data is preserved (append-only)

The ingest layer should never be mutated; this enables reprocessing and debugging.

## 5. Snapshot architecture lives across two schemas

Materialization snapshots (e.g., `chapter_channel_paths_canonical_v2_snapshot`) live in `chapter_attribution`, but reporting-layer snapshots (`eos_purchase_base_snapshot_v1`, etc.) live in `chapter_reporting`. There's a known cross-layer dependency (canonical_v2 reads reporting snapshots) flagged for future refactor — see Fix #18 (deferred until Fix #25).

## 6. Identity persistence had two cookie gaps

- Identity cookie was non-persistent before **2026-04-01 17:00 UTC** (new identity per event).
- Journey cookie was non-persistent before **2026-04-14 18:15 UTC** (new journey per event).
- Data before these dates is unreliable for identity/journey-level analysis.

---

# Definitions

> Glossary of conceptual terms. Pair with the schema sections below for "where in the data does this live."

## Identity

**Identity (raw).** Any non-canonical identifier observed for a user — anonymous UUID from the pixel, email_hash from a purchase, Shopify `customer_id`, journey-cookie ID. Stored as `identity_key` in `chapter_ingest.*` tables. A single user generates many raw identities; stitching connects them.

**Canonical identity.** The single resolved identity for a user, derived by walking the alias graph from any starting raw identity. **`canonical_identity_key` is the primary identity column for all modeling and attribution downstream.** Stored in `chapter_identity.identity_canon` (cache) and resolved by `chapter_identity.identity_canonical` (recursive view).

**Identity stitching.** Writing an alias edge to `chapter_identity.identity_aliases` to connect two raw identities. Triggered by signals: a purchase event carrying both anonymous_id and email_hash, an explicit `identify()` pixel call, a cart-token bridge, or a CRM seed.

**Deterministic vs probabilistic stitching.** Deterministic means *known* same-person (verified via shared identifier in a single event); probabilistic means *inferred* (device fingerprint, IP, timing). Chapter today is almost entirely deterministic — `is_deterministic = true` on essentially all alias rows.

**Anonymous identity.** A pixel-generated UUID stored in `localStorage` under `chapter_anon_<client_key>`. Persists across sessions on the same browser until storage is cleared. Becomes a raw identity that gets stitched to canonical when the user identifies (purchase, login, form submit).

## Journey / Session

**Journey (raw).** The session container observed at ingest. One row per browser session in `chapter_journey.journeys`, bounded by a journey cookie. Limited historically by cookie persistence (April 14 fix). Carries geo (country, city, region), user_agent, and last_identity_key.

**Sessionized journey.** A *derived* session created by attribution-side logic (Fix #21, May 6, 2026) — a new sessionized journey starts whenever an external referrer arrives, even if the same raw journey cookie is in flight. Used by `chapter_attribution.chapter_session_entry_channels_canonical_v1`.

**Session entry.** The first event of a sessionized journey — the moment of arrival. Carries the entry channel (UTM, click ID, referrer, or direct). The unit of credit in linear attribution: a chapter with three sessionized journeys has three session entries.

**Journey vs session vs identity (the confusing trio).**
- **Identity** = who the person is (canonical), persists across devices.
- **Journey** = one browser session for one cookie. May or may not carry an identity.
- **Sessionized journey** = derived from journey events, splits on external referrer arrivals. Used for attribution.

A canonical identity can have many journeys; a journey can be split into multiple sessionized journeys.

## Events & Chapters

**Event.** Any tracked action: page view, hover, add-to-cart, purchase, form submission, offline milestone. Source of truth in `chapter_ingest.*`; unified into `chapter_model.unified_events_v2`.

**Boundary event.** An event that closes a lifecycle chapter and opens a new one. Today: **purchase** (from `purchase_events`) and **conversion** (lead, form, appointment from `conversion_events`). `is_boundary_event = true` in `chapter_model.lifecycle_chapters`. Attribution is computed on the path leading up to a boundary.

**Lifecycle chapter.** A run of events from one canonical identity, ending at a boundary event. Conceptually: "everything this person did until they bought / submitted a lead / converted." Materialized in `chapter_model.lifecycle_chapters`.

**Chapter ID.** Sequential integer per `(client_key, canonical_identity_key)`, starting at 0. **Resets per-identity, not global.** The natural key for joining is `(canonical_identity_key, chapter_id)`.

## Channels

**Channel.** The marketing source/medium that drove a session — `paid_search`, `email`, `organic_search`, `direct`, `referral`. Not stored as a single column; resolved from a hierarchy of signals. Resolution today is EOS-specific in `chapter_reporting.eos_pixel_events_categorized_v1`.

**Channel resolution (priority order).**
1. **UTM parameters** (`utm_source`, `utm_medium`, `utm_campaign`) — most authoritative.
2. **Click IDs** (`gclid`, `fbclid`, etc. in `partner_ids`) — strong signal.
3. **Referrer** (`document.referrer`) — classified internal vs external; external referrers map to channels.
4. **Fallback to `(direct)`** — no signal.

> Confirm priority order against the actual logic in `eos_pixel_events_categorized_v1` if/when it gets cracked open — this captures intent.

**Internal vs external referrer.** Internal = referrer is the client's own domain (navigation, not acquisition — should not count as a channel touch). External = a different host. Filtered in `eos_pixel_events_categorized_v1`.

**Direct vs (unknown) vs (none).**
- **`(direct)`** — real signal, user arrived with no UTM, click ID, or external referrer (type-in / bookmark / loyalty / app-switch). Real customer behavior.
- **`(unknown)`** — explicit bucket from Fix #9 (May 7, 2026): chapter exists in canonical_v2 but has no session data (typically email-bridge or cart-token purchases where the session wasn't captured). Previously hidden in `(direct)`; now an honest "we can't attribute this."
- **`(none)`** — legacy; should not appear in new data.

## Traffic Quality

**Bot-likely.** Journey scored as automated / non-human traffic — single event with no engagement, very short duration (~1 second), no scroll/time-on-page beats, fingerprint patterns matching bot user agents. `bot_class = 'bot_likely'` in `chapter_analysis.eos_bot_scores_24h_v5`. ~62% of EOS journeys (April 2026).

**Human-likely.** Journey with multi-event engagement (scrolls, time-on-page, multiple page views), realistic duration, no bot fingerprint matches. `bot_class = 'human'`. ~38% of EOS journeys.

**Suspect.** Marginal — could be a quick legitimate visit OR a more sophisticated bot. `bot_class = 'suspect'`. <1% of EOS journeys.

> Replace these heuristics with the actual scoring rules from `eos_bot_scores_24h_v5` when documenting precisely — the above is observational shorthand from CLAUDE.md, not the algorithm.

**Active bot networks.** EOS saw a coordinated network in late April 2026: 3,056 journeys spoofing `Chrome/142.0.0.0` (a non-existent Chrome version) from China, zero purchases. Detection emphasis is journey `user_agent` + behavior heuristics; explicit decision NOT to store IP for this purpose (Fix #16).

## Attribution Models

> All canonical attribution today is computed against `chapter_attribution.chapter_channel_paths_canonical_v2` (~442 chapters). This includes the 132 fallback chapters from `canonical_v1` and the `(unknown)` bucket. Computing over `canonical_v1` alone misses ~30% of the cohort.

**First touch.** 100% of revenue → first session-entry channel in the chapter. Top-of-funnel weighting. Implemented in `chapter_reporting.eos_attribution_first_touch_v1`.

**Last touch.** 100% of revenue → last session-entry channel before the boundary event. Bottom-of-funnel weighting. Implemented in `chapter_reporting.eos_attribution_last_touch_v1`.

**Linear (Chapter's canonical multi-touch model).** Per-session-entry credit, with repeats accumulating proportionally. Each session entry gets `1 / N` of credit, where N = number of session entries in the chapter.

Worked example. Chapter has session entries `direct → direct → email`, purchase = $120.
- 3 entries total: 2 direct + 1 email
- Direct credit: $80 (2/3 share)
- Email credit: $40 (1/3 share)

Why this shape (Fix #9, May 7, 2026):
- Per-event linear over-weights deep direct browsing sessions (was inflating direct to ~70% before Fix #9).
- Distinct-channel linear under-weights actual repeat marketing touches.
- Per-session-entry honors that each visit is one "intent unit."

Implemented in `chapter_reporting.eos_attribution_linear_v1`. Common mistake: computing linear over `chapter_attribution.chapter_channel_paths` (the older per-event view). Always use `canonical_v2`.

**Single touch (only touch).** A chapter where only ONE distinct session-entry channel appears across all entries. Trivially attributed. Tracked separately in `chapter_reporting.eos_single_touch_chapters_v1` because the single-touch share is itself a useful signal.

**Middle touch.** Channels that aren't first or last in the chapter path. Get **0 credit** under first-touch / last-touch; full proportional credit under linear. The point of multi-touch models is precisely to surface these.

**Channel contribution.** Aggregated revenue and orders per channel under linear, rolled up. Implemented in `chapter_reporting.eos_channel_contribution_v1`. Answers: "Across all chapters, how much revenue does each channel account for?"

**(unknown) bucket.** Explicit category for chapters with no session-entry data — typically email-bridge or cart-token purchases. ~28% of EOS revenue as of May 2026. Surfaces as a row in `eos_attribution_linear_v1` with `channel = '(unknown)'`. Possible future split: `(unknown - email-bridge)` / `(unknown - cart-token)` / `(unknown - other)`.

---

# Schema: chapter_ingest

## Schema summary

Raw data intake layer. Captures all inbound events before any identity resolution, transformation, or attribution. **Source of truth — append-only.**

Lives here:
- Browser events (pixel)
- Server events (purchase, conversion)
- Offline data (milestones, identity seeds)
- Consent tracking
- Transaction line items

Downstream dependencies:
- `chapter_model.unified_events_v2`
- `chapter_model.unified_events_resolved_v2`
- `chapter_model.pixel_events_resolved`
- Identity resolution layer

## Tables

### `pixel_events` (CORE TABLE)

**Purpose.** All browser-side user interactions captured by the Chapter pixel.
**Grain.** One row per event fired from the client.
**Primary key.** `id`.

**Key columns.**
- `client_key` — tenant identifier
- `journey_id` — session/journey grouping
- `ts` — event timestamp (NB: pixel uses `ts`; purchase uses `event_ts`)
- `event_name` — `page_view`, `add_to_cart`, `hover_intent`, `scroll_depth`, `time_on_page`, `visibility_change`, `page_exit`, etc.
- `identity_key` — initial identity (often anonymous)
- `utm` — JSON marketing attribution payload (utm_source, utm_medium, etc.)
- `partner_ids` — JSON click IDs (gclid, fbclid, etc.)
- `props` — JSON custom event metadata

**Inputs.** Chapter pixel via `/api/chapter/collect`.
**Used by.** `pixel_events_resolved`, `unified_events_v2`, all downstream behavioral analysis.

**Notes.**
- Identity is often incomplete at ingestion.
- `hover_intent` events were enriched in Fix #13 (May 7, 2026): now carry `href`, `element_id`, `element_class`, `aria_label`, `page_section` in `props`.
- Truncated IP storage was scoped (Fix #16) and **explicitly declined** — bot detection relies on `journey.user_agent` instead.

**Why critical.** Primary browser-side behavioral feed; if this breaks, touchpoint visibility breaks.

### `purchase_events` (CORE TABLE)

**Purpose.** Server-side purchase events (typically Shopify orders-create webhook).
**Grain.** One row per purchase event.
**Primary key.** `id`.

**Key columns.**
- `event_ts`
- `order_id`, `payment_id`, `event_id`
- `value`, `currency`
- `email_hash`, `customer_id`
- `resolved_identity_key`
- `user_agent` — added in Fix #15 (May 7, 2026); extracted from `raw->'order'->'client_details'->>'user_agent'`. 664/672 historical rows backfilled; 8 nulls are non-browser POS / mobile-app / Quick-Sale orders.
- `raw` — sanitized Shopify payload (IPs stripped before insert per `sanitizeShopifyOrderForRaw`)

**Inputs.** `/api/purchase` and Shopify orders-create webhook (`/api/shopify/webhooks/orders-create`).
**Used by.** `unified_events_v2`, attribution layer, revenue modeling.

**Notes.**
- Primary revenue signal; identity confidence is highest here.
- `browser_ip` is NOT stored — sanitized out at the webhook adapter for GDPR/CCPA compliance (Fix #14 closed without code change because the strip already worked).
- POS / Quick Sale orders without email or customer_id are now accepted with synthesized `customer_id = shopify_<source_name>_anonymous:<order_id>` (Fix #19, May 5, 2026).

**Why critical.** Primary revenue signal and main purchase-boundary feed; if this breaks, revenue attribution breaks.

### `conversion_events` (CORE TABLE)

**Purpose.** Non-purchase conversions (leads, forms, appointments).
**Grain.** One row per conversion.

**Key columns.** `event_name`, `lead_id`, `form_id`, `appointment_id`, `value`, `currency`, identity fields parallel to `purchase_events`.

**Constraints.** Must have at least one identity signal AND one dedup ID.
**Used by.** `unified_events_v2`, lifecycle modeling.

**Notes.** Mid-funnel conversion signal. Writes also upsert to `identity_canon` (Fix #20).

**Why critical.** Non-revenue lifecycle attribution; if this breaks, lead/form/appointment chapters break.

### `purchase_items` (SUPPORT TABLE)

**Purpose.** Line items associated with a purchase.
**Grain.** One row per item per purchase.
**Key columns.** `purchase_event_id`, `sku`, `product_name`, `qty`, `price`.
**Used by.** Future product-level reporting, AOV analysis.
**Status.** **Not currently populated for EOS** — known gap.

### `consent_events` (SUPPORT TABLE)

**Purpose.** User consent state for GDPR/CCPA.
**Grain.** One row per consent update.
**Key columns.** `consent_status`, `consent_mode`, `consent_ts`, `client_event_id`.
**Used by.** Compliance logic, future filtering layer.

### `offline_identity_seeds` (IDENTITY SUPPORT)

**Purpose.** Seed identity graph from offline systems (CRM, imports).
**Grain.** One row per seed.
**Key columns.** `identity_key`, `source_type`, `source_id`, `identity_type`, `is_hashed`.
**Used by.** `unified_timeline_with_seeds_v1`, identity resolution.
**Why critical.** Bridge for offline → online identity expansion.

### `offline_milestones` (CORE TABLE)

**Purpose.** Offline events tied to identities (sales calls, deals closed, etc.).
**Grain.** One row per milestone.
**Key columns.** `milestone_name`, `milestone_ts`, `value`, `currency`, `identity_key`.
**Used by.** `unified_events_v2`, `unified_timeline_v1`, future offline attribution.
**Why critical.** Pack D / online+offline modeling backbone.

## Critical tables

`pixel_events` · `purchase_events` · `conversion_events` · `offline_milestones` · `offline_identity_seeds`

## Data contracts (summarized)

- `pixel_events`: `id` unique, `client_key` + `journey_id` + `ts` + `event_name` always populated. JSON columns (`utm`, `partner_ids`, `props`) remain JSON, not mixed primitives.
- `purchase_events`: `id` unique; `client_key` + `event_name` + `event_ts` + `source_platform` + `value` + `currency` always populated; at least one dedup ID (`order_id` / `payment_id` / `event_id`); at least one identity signal; `value` non-negative unless modeling refunds; `raw` sanitized (no PII, no IP).
- `conversion_events`: same shape as purchase, parallel rules.
- `offline_identity_seeds`: `(client_key, source_type, source_id, identity_key)` membership unique; identity_key in normalized namespace.
- `offline_milestones`: `client_key` + `identity_key` + `milestone_name` + `milestone_ts` + `source_type` + `source_id` always populated.

## Upstream dependencies

- `pixel_events` ← Chapter pixel `/api/chapter/collect`, journey/session assignment.
- `purchase_events` ← `/api/purchase`, Shopify orders-create webhook, identity-resolution upsert.
- `conversion_events` ← conversion endpoints, identity-resolution upsert.
- `offline_identity_seeds` ← CRM imports, identity seeding jobs.
- `offline_milestones` ← offline conversion ingestion, CRM event export.

---

# Schema: chapter_identity

## Schema summary

Identity resolution and stitching across all data sources. Connects anonymous users, hashed emails, CRM identifiers, and session/journey IDs into a single canonical identity graph.

**Key principle:** identity is append-only and traceable, not overwritten.

## Tables & views

### `identity_aliases` (IDENTITY TABLE)

**Purpose.** Alias edges between identity keys — the core identity graph.
**Grain.** One row per linkage.
**Key columns.** `from_identity_key`, `to_identity_key`, `confidence`, `is_deterministic`, `reason`.

**Common stitching reasons today.**
- `purchase_cart_token_bridge` — deterministic.
- `purchase_email_bridge` — deterministic.
- `explicit_identify_call` — deterministic when verified, marked accordingly.
- Offline seed reasons — deterministic.

**Notes.**
- Primary edge table; all stitching writes here.
- Trigger `trg_sync_canon_from_alias` (Fix #20, May 4, 2026) fires on every insert and propagates the edge into `identity_canon`, including multi-hop forward resolution (A→B then B→C produces A→C).

### `identity_canon` (IDENTITY TABLE)

**Purpose.** Fast cache mapping `identity_key → canonical_identity_key`.
**Grain.** One row per identity_key.
**Used by.** `unified_events_resolved_v2`, all downstream joins.

**Notes.**
- Pre-Fix #20 (May 4, 2026): canon was only written by `/api/identify`; `/api/purchase` and `/api/conversion` wrote to `identity_aliases` only. Result: canon was missing aliases from purchase email-bridge / cart-token bridge / conversion explicit-identify, dragging purchaser↔session overlap to a misleading 10.4%. Fix #20 added the trigger AND made the API write paths defense-in-depth upsert canon directly. After fix + backfill: overlap moved to 65.8%.

### `identity_canonical` (CORE VIEW)

**Purpose.** Recursive resolution engine for the identity graph.
**How it works.** Walks `identity_aliases`, finds deepest canonical node, tracks path + hop count.
**Outputs.** `root_identity_key`, `canonical_identity_key`, `path`.

**Notes.**
- This is the *true* resolver; `identity_canon` is a cache of its output.
- Some downstream views use `identity_canon` (faster); others use `identity_canonical` (more thorough). Phase 3 of Fix #5 will harmonize this.

### `identity_links` (IDENTITY SUPPORT)

**Purpose.** Bridges identity keys to journey IDs.
**Grain.** One row per identity ↔ journey relationship.
**Key columns.** `identity_key`, `journey_id`, `first_linked_at`, `last_linked_at`.
**Used by.** Joining session-level data to identity-level data.

## Critical tables / views

`identity_aliases` · `identity_canonical` · `identity_canon` · `identity_links`

## Data contracts

- `identity_aliases`: `id`, `ts`, `client_key`, `from_identity_key`, `to_identity_key`, `reason` always populated; `confidence` in valid range; deterministic links have `is_deterministic = true` with explanatory reason; no self-links unless intended; append-only.
- `identity_canon`: `(client_key, identity_key)` unique; `canonical_identity_key` always populated; reflects latest accepted mapping; auto-refreshed via trigger.
- `identity_canonical`: exactly one canonical per `(client_key, root_identity_key)`; recursion avoids loops; bounded hop count.
- `identity_links`: `(client_key, identity_key, journey_id)` unique; `last_linked_at >= first_linked_at`; `journey_id` references valid journey.

## Upstream dependencies

- `identity_aliases` ← purchase identify logic, offline seed logic, identity stitching jobs.
- `identity_canon` ← `trg_sync_canon_from_alias` (Fix #20) + direct upserts from `/api/purchase`, `/api/conversion`, `/api/identify`.
- `identity_canonical` ← `identity_aliases` (recursive).
- `identity_links` ← journey creation logic, event-to-journey assignment.

---

# Schema: chapter_journey

## Schema summary

Session/journey-level container for user activity. Identity resolution applied in downstream views, not here.

**Audit note (April 6, 2026):** `journeys_filtered_v1` and `journeys_filtered_v2` were removed; bot filtering belongs downstream in reporting.

## Tables & views

### `journeys` (CORE TABLE)

**Purpose.** Session-like containers for user behavior.
**Grain.** One row per journey/session.
**Key columns.** `id`, `client_key`, `first_seen`, `last_seen`, `first_touch`, `last_touch`, `country`, `city`, `region`, `user_agent`, `last_identity_key`.

**Notes.**
- `last_identity_key` = most recent observed identity signal for the journey (pre-resolution).
- `user_agent` is the strongest single bot-detection signal we have at journey grain — emphasized over IP storage (Fix #16).

**Why critical.** Session/journey container; if this breaks, event grouping becomes unstable.

### `journeys_resolved` (CORE VIEW)

**Purpose.** Adds canonical resolved identity to journeys via the identity resolution layer.
**Logic.** Calls `resolve_identity()`.
**Output.** `resolved_identity_key` joined to journey row.

## Critical tables / views

`journeys` · `journeys_resolved`

## Data contracts

- `journeys`: `id` + `client_key` always populated; `first_seen` <= `last_seen`; JSON `first_touch` / `last_touch` valid; `last_identity_key` in normalized namespace.
- `journeys_resolved`: at most one resolved identity per journey; uses same resolution policy as elsewhere; doesn't mutate base facts.

## Upstream dependencies

- `journeys` ← journey/session assignment logic, pixel ingest, geo derivation.
- `journeys_resolved` ← `journeys` + `resolve_identity()` function.

---

# Schema: chapter_model

## Schema summary

Transforms raw ingest data into a canonical, identity-aware event model used for normalization, identity-based sequencing, lifecycle modeling (chapters), and attribution inputs.

**Audit note (April 6, 2026):** Legacy `unified_events`, EOS-specific objects, and bot-classification objects were moved out to `chapter_analysis`. Pipeline standardized on v2.

## Core data flow

```
unified_events_v2
   ↓
unified_events_resolved_v2
   ↓
unified_timeline_v1
   ↓
lifecycle_chapters
```

## Core views

### `unified_events_v2` (CORE VIEW)

**Purpose.** Standardized event stream combining pixel, purchase, conversion, and offline events.
**Grain.** One row per event.
**Key columns.** `client_key`, `event_ts`, `event_name`, `event_source`, `source_type`, `source_id`, `journey_id`, `identity_key` (raw), `value`, `currency`, `page_url`, `referrer`, `utm` (normalized JSON), `props`, `metadata`.
**Notes.** Primary event modeling foundation; supports both online and offline event sources.

### `unified_events_resolved_v2` (CORE VIEW)

**Purpose.** Adds canonical identity to unified events.
**Key columns.** Adds `canonical_identity_key`.
**Logic.** Resolves `identity_key` via `identity_canonical`.
**Notes.** Identity-safe event layer used downstream.

### `unified_timeline_v1` (CORE VIEW)

**Purpose.** Chronological timeline of events per identity.
**Grain.** One row per event.
**Key columns.** `canonical_identity_key`, `event_ts`, `event_type`, `event_name`, `source_platform`, `source_id`, `value`, `currency`, `utm_*`, `raw`.
**Notes.** Identity-based, not journey-based. Combines online + offline into a single ordered stream.

### `unified_timeline_with_seeds_v1` (CORE VIEW)

**Purpose.** Extends the timeline with offline identity seeds.
**Adds.** Pre-event identity context for CRM-first scenarios.

### `lifecycle_chapters` (CORE VIEW)

**Purpose.** Segments events into conversion-bounded "chapters."
**Grain.** One row per event.
**Key columns.** `chapter_id`, `is_boundary_event`, `canonical_identity_key`, `event_ts`.
**How it works.** Cumulative boundary logic: each boundary event closes a chapter; `chapter_id` is sequential per `(client_key, canonical_identity_key)` (Fix #12).
**Notes.** Bridge between events and attribution. Chapters are derived, not stored as aggregates.

### `journey_events` (SUPPORT VIEW)

**Purpose.** Ordered event sequencing per identity (`event_seq`).
**Used for.** Path analysis, debugging.

### `pixel_events_resolved` (SUPPORT VIEW)

**Purpose.** Pixel events with resolved identity via journey linkage.
**Used for.** Debugging identity resolution.

## Critical views

`unified_events_v2` · `unified_events_resolved_v2` · `unified_timeline_v1` · `lifecycle_chapters`

## Data contracts

- `unified_events_v2`: `client_key`, `event_ts`, `event_name`, `event_source` always populated; `identity_key` normalized; `source_id` stable per event; UTM structure consistent across online/offline events.
- `unified_events_resolved_v2`: `canonical_identity_key` exists for nearly all events; resolution matches identity-layer rules; no mutation of base data.
- `unified_timeline_v1`: strict chronological ordering; operates on canonical_identity_key; not dependent on journey_id; event_type clearly distinguishes source origin.
- `lifecycle_chapters`: `chapter_id` deterministic; `is_boundary_event` only on defined boundary events; each boundary closes exactly one chapter; ordering stable.

## Upstream dependencies

- `unified_events_v2` ← `chapter_ingest.{pixel_events, purchase_events, conversion_events, offline_milestones}`.
- `unified_events_resolved_v2` ← `unified_events_v2` + `identity_canonical`.
- `unified_timeline_v1` ← `unified_events_resolved_v2` + `identity_canonical`.
- `unified_timeline_with_seeds_v1` ← `unified_timeline_v1` + `offline_identity_seeds`.
- `lifecycle_chapters` ← `unified_timeline_v1`.

---

# Schema: chapter_attribution

## Schema summary

Channel extraction, normalization, journey path construction, and attribution modeling. Operates on top of `chapter_model.lifecycle_chapters` and `chapter_identity`.

**Audit note (April 6, 2026):** Non-canonical `_v2` attribution variants and EOS-specific objects were moved out to `chapter_analysis`. One canonical model per attribution type.

**Major architecture changes (May 2026):** canonical_v1 and canonical_v2 path views were materialized to snapshot tables (Fix #7 and Fix #7b) to avoid 25-50 minute view scans. The original views were rewritten as thin facades over the snapshots — same column shape, no consumer changes needed.

## Core data flow

```
chapter_model.lifecycle_chapters
   ↓
chapter_channel_events
   ↓
chapter_channel_compressed
   ↓
chapter_channel_paths
   ↓
chapter_session_entry_channels_canonical_v1
   ↓
chapter_channel_paths_canonical_v1 (facade) ←→ chapter_channel_paths_canonical_v1_snapshot
   ↓
chapter_channel_paths_canonical_v2 (facade) ←→ chapter_channel_paths_canonical_v2_snapshot
   ↓
attribution models (first_touch, last_touch, linear)
```

## Core tables & views

### `chapter_channel_events` (VIEW)

**Purpose.** Maps lifecycle events to marketing channels.
**Inputs.** `lifecycle_chapters`.
**Logic.** Assigns `channel` from UTM → click ID → referrer → fallback `(direct)`. Preserves `event_ts`, `is_boundary_event`, `event_name`, `value`, `currency`.

### `chapter_channel_compressed` (VIEW)

**Purpose.** Removes redundant consecutive channel touches while preserving journey integrity.
**Critical rule.** **Boundary events are always retained**, even if channel repeats (fixed during the April 6 audit; loss of purchase events was the bug).
**Logic.** `lag(channel)` to detect duplicates; keep where boundary OR first row OR channel change.

### `chapter_channel_paths` (VIEW)

**Purpose.** Ordered channel paths per chapter (per-event grain).
**Output example.** `paid_search → email → direct`.
**Notes.** Older view; Chapter's canonical attribution now uses canonical_v1/v2 (session-entry grain), not this. Still alive for debugging and legacy queries.

### `chapter_channel_paths_canonical_v1` (VIEW + SNAPSHOT)

**Purpose.** Session-entry-grain path for chapters that have at least one matching session entry. The "high-confidence" path layer.
**Grain.** One row per `(client_key, canonical_identity_key, chapter_id)` purchase chapter that has session data.
**Implementation (Fix #7b, May 5, 2026).** Materialized as `chapter_channel_paths_canonical_v1_snapshot`; the view is a thin facade over the snapshot. Refreshed via `chapter-scripts/run-snapshot.js` with `LABEL=canonical_paths_v1`. First population: 311 rows, ~52 min.
**Schema.** PK on `(client_key, canonical_identity_key, chapter_id)`, indexes on `boundary_ts` and `snapshot_ts_hi`.

### `chapter_channel_paths_canonical_v2` (VIEW + SNAPSHOT)

**Purpose.** Hybrid path layer — canonical_v1 + 132 fallback chapters with no session data. The full-coverage attribution input.
**Grain.** One row per purchase chapter (currently 442 rows for EOS).
**Implementation (Fix #7, May 1, 2026).** Materialized as `chapter_channel_paths_canonical_v2_snapshot`; view is a facade. Refreshed with `LABEL=canonical_paths_v2`. First population: 283 rows, 7m 13s; grew to 443 rows after Fix #17 (May 3) when filtered_purchases data lag was closed.
**Schema.** PK on `(client_key, canonical_identity_key, chapter_id)`, indexes on `boundary_ts` and `snapshot_ts_hi`.
**Architectural note.** Reads four reporting-layer snapshot tables (`eos_filtered_purchases_v1`, `eos_purchase_*_snapshot_v1`) — known cross-layer dependency, deferred to Fix #25 design (Fix #18 closed without action May 7).

### `chapter_session_entry_channels_canonical_v1`

**Purpose.** One row per sessionized journey entry with its entry channel — the building block under canonical_v1's path construction.
**Used by.** Canonical_v1 path generation, Fix #21 sessionization logic.

### `chapter_channel_exploded` (VIEW)

**Purpose.** Channel paths split into individual rows for attribution modeling.
**Filters.** Only `boundary_event_name = 'purchase'`.

### `purchase_chapters_base` (VIEW)

**Purpose.** Source-of-truth purchase chapters.
**Logic.** Filters `chapter_summary_v1` to `boundary_event_name = 'purchase' AND boundary_value IS NOT NULL`.
**Output.** `client_key`, `canonical_identity_key`, `chapter_id`, `revenue`, `currency`.

## Attribution models

### `attribution_first_touch` (VIEW)

100% revenue → first channel in chapter path.

### `attribution_last_touch` (VIEW)

100% revenue → last non-boundary channel before conversion.

### `attribution_linear` (VIEW) — canonical multi-touch

**Per-session-entry credit, repeats accumulate.** See Definitions → Attribution → Linear for full spec and rationale (Fix #9, May 7, 2026).

**Validation.** Revenue fully reconciles with purchase base under canonical_v2; ratio = 1.0; no leakage; no duplication.

## Analytics & supporting views

- `chapter_channel_presence` — whether a channel appears in a chapter.
- `chapter_channel_paths` — ordered channel sequences (per-event).
- `chapter_channel_exploded` — channel-level rows for modeling.

## Removed / relocated

The following are **NOT in `chapter_attribution`**:
- EOS-specific (`attribution_last_touch_eos_v1`, `chapter_channel_events_eos_v1`) — relocated to `chapter_analysis`.
- `_v2` attribution model variants — removed entirely (Fix #10).
- Exploratory views (`channel_correlation_v1`, `chapter_correlation_base`, `chapter_paths`, `top_chapter_paths`, `top_chapter_paths_dashboard`) — relocated to `chapter_analysis`.

## Attribution contract (finalized)

- **Input dataset:** `purchase_chapters_base`.
- **Identity grain:** `client_key`, `canonical_identity_key`, `chapter_id`.
- **Channel source:** `chapter_channel_events` (or canonical_v1 session entries for newer models).
- **Path logic:** ordered event timestamps + compressed channel transitions; for canonical_v1/v2, session-entry grain.
- **Revenue rules:** revenue originates only from boundary events; no inferred or synthetic revenue.
- **Guarantees:** revenue conservation (sum = purchase total); no duplication across chapters; deterministic.

---

# Schema: chapter_config

**Status.** Reserved for future Chapter configuration and client-specific rules.
**Currently empty.**
**Intended use.** Client-level event mapping, attribution rules, channel normalization, feature flags, pack enablement.

---

# Schema: chapter_reporting

## Schema summary

Dashboard and analysis layer for client-facing reporting. Designed to:
- Filter and summarize trusted traffic
- Classify channel/source performance
- Support purchase and path analysis
- Provide fast dashboard-ready outputs

Contains a mix of filtered event views, channel classification views, bot/journey quality tables, purchase stitching tables, dashboard outputs, and snapshot tables.

**Key principle.** This is a **presentation layer**, not the primary attribution truth. Source-of-truth attribution still originates upstream.

**Currently EOS-specific in practice** even though the schema name is generic. Will generalize when the second client is onboarded.

## Snapshot architecture (Fix #1, April 29, 2026)

All snapshot-shaped tables share a contract enforced by `chapter-scripts/run-snapshot.js`:
- A row in `_snapshot_runs` opens (`status='running'`) at the start of each refresh.
- Source queries are bounded by `SNAPSHOT_TS_HI` env var as the upper cutoff.
- Every output row carries `snapshot_ts_hi` matching the run.
- The `_snapshot_runs` row is closed (`status='ok'` or `'failed'`) with `row_count` and timing.

Tables with `snapshot_ts_hi` column (14 total): the 8 named `*_snapshot` tables plus `channel_contribution_v1`, `attribution_linear_v1`, `single_touch_chapters_v1`, `sessionized_universe_summary_v1`, `identity_overlap_summary_v1`, `channel_paths_canonical_summary_v1`.

Reconciliation is now a single SQL filter: `WHERE snapshot_ts_hi = '<cutoff>'`.

## Core views

### `eos_pixel_events_valid_v1` (CORE VIEW)

**Purpose.** Trusted EOS pixel event input layer — filters raw pixel events to EOS client + post-cookie-fix trusted date window.
**Grain.** One row per pixel event.
**Key columns.** `id`, `ts`, `client_key`, `journey_id`, `event_name`, `page_url`, `page_path`, `referrer`, `utm`, `partner_ids`, `props`.
**Used by.** Multiple downstream EOS reporting views.
**Why critical.** Trusted reporting event window. If wrong, all EOS event reporting is wrong.

### `eos_pixel_events_categorized_v1` (CORE VIEW)

**Purpose.** Adds reporting-layer channel categorization to trusted EOS pixel events.
**Key features.** Extracts UTM parts; classifies referrers internal vs external; derives `resolved_source`, `resolved_medium`, `resolved_campaign`, `attribution_source_type`, `resolved_channel`.
**Why critical.** Current cleaned channel categorization layer for EOS reporting.

### `eos_journey_entry_channel_v1` (CORE VIEW)

**Purpose.** Single entry channel per journey (first categorized event).
**Grain.** One row per journey.
**Why critical.** Bridge from event-level categorization to journey-level acquisition reporting.

### `eos_lifecycle_chapters_valid_v1` (CORE VIEW)

**Purpose.** EOS-specific filtered slice of `chapter_model.lifecycle_chapters` — pass-through filter (no re-numbering, per Fix #12 verification).
**Why critical.** EOS reporting bridge into lifecycle chapter modeling.

## Dashboard views

### `eos_traffic_overview_v1` / `eos_traffic_overview_v2`

Total/human/suspect/bot journey counts; events per journey.

### `eos_engagement_quality_v1`

Total journeys, percent with time-on-page, average events, bounce rate.

### `eos_channel_performance_v1`

Sessions and engagement rate by channel.

### `eos_funnel_v1`

Onsite step counts: page view → product view → add to cart → checkout → purchase.

### `eos_purchase_overview_v1`

Total orders, total revenue, AOV.

### `eos_top_paths_v1`

Top conversion paths.

### `eos_full_paths_readable_v1`

Full path strings, human-readable.

## Attribution views

### `eos_attribution_first_touch_v1`

100% revenue → first session-entry channel per chapter.

### `eos_attribution_last_touch_v1`

100% revenue → last session-entry channel per chapter.

### `eos_attribution_linear_v1` (UPDATED Fix #9, May 7, 2026)

**Per-session-entry credit, repeats accumulate.** Built from `chapter_attribution.chapter_channel_paths_canonical_v1` UNION ALL with a `(unknown)` row per chapter that's in canonical_v2 but missing from canonical_v1 (132 fallback chapters with no session data).

**Result at SNAPSHOT_TS_HI=2026-05-03T18:00:00Z:** 6 rows, 442 orders, $44,074.74. Distribution:
- `(direct)` 35.1% revenue (was 69.3% under per-event model — bias eliminated)
- `(unknown)` 28.3% revenue (newly visible)
- `email` ~20% revenue
- `organic_search` 14.4% revenue
- Smaller channels balance the rest

**Loader.** `chapter-scripts/snapshots/2026-05-07-fix-9-linear-model-d.sql`. Cascade SQL `2026-05-06-fix-21-cascade.sql` Block 4 also updated for future cohort runs.

### `eos_channel_contribution_v1`

Aggregated revenue/orders per channel under linear, rolled up.

### `eos_single_touch_chapters_v1`

Chapters with only one distinct session-entry channel.

## Snapshot tables

### `_snapshot_runs` (Fix #1)

Tracks every snapshot refresh: `(run_id, label, target_table, snapshot_ts_hi, started_at, finished_at, status, row_count, error_message)`. Watched by application-layer monitoring (Fix #27): stuck-runs alert at 60 min running, daily digest at 14:00 UTC.

### Purchase snapshot family

- `eos_purchase_base_snapshot_v1` — purchase chapter base.
- `eos_purchase_touch_summary_snapshot_v1` — per-purchase touch summary (cache of `chapter_summary_v1` query).
- `eos_purchase_fallback_snapshot_v1` — purchase fallback channel logic.
- `eos_purchase_channel_final_snapshot_v1` — final purchase channel attribution.

### `eos_filtered_purchases_v1` (Fix #17, May 3, 2026)

Purchase-side filtering. Was the bottleneck behind canonical_v2 data lag — added `snapshot_ts_hi` column, recovered loader SQL (Version A — `purchase_chapters_base` source), aligned at the May 3 cohort cutoff.

### Other snapshots in scope

`eos_engagement_quality_snapshot`, `eos_traffic_overview_snapshot`, `eos_channel_performance_snapshot`, `eos_top_paths_snapshot`, `eos_channel_paths_canonical_summary_v1`, `sessionized_universe_summary_v1`, `identity_overlap_summary_v1`.

### Out of scope (deferred snapshot alignment)

Per Fix #1, these 5 reporting tables haven't been confirmed snapshot-shaped yet — extend if/when needed: `eos_filtered_purchase_channels_v1`, `eos_full_paths_readable_v1` (depending on shape), `eos_top_paths_v1` (current), `eos_valid_journey_ids_v3`, and one more.

## Support tables

### `eos_bot_scores_24h_v5`

Journey-level bot scoring: `journey_id`, `total_events`, `page_views`, `scroll_events`, `time_events`, `duration_seconds`, `bot_score`, `bot_class`. Current surviving version.

### `eos_valid_journey_ids_v3`

Curated EOS journey IDs valid for reporting.

### `eos_purchase_stitched_events_v2`

Purchase events stitched to journey context.

### `eos_purchase_last_journey_v2_clean`

Purchase-to-last-journey relationships.

### `eos_purchase_paths_v2`

Purchase path records.

### `eos_purchase_channel_presence_v3`

Purchase-level channel participation records.

### `eos_purchase_attribution_v6`

Surviving EOS purchase attribution snapshot.

## Removed (Fix #10, May 7, 2026)

These objects were dropped and no longer exist:

**Tier 1 (`_deprecated` in `chapter_analysis`):** `eos_attribution_linear_v1_deprecated`, `eos_bot_scores_24h_v5_deprecated`, `eos_bot_scores_v1_deprecated`, `eos_purchase_attribution_v6_deprecated`, `eos_purchase_channel_presence_v3_deprecated`, `eos_purchase_last_journey_v2_clean_deprecated`, `eos_purchase_paths_v2_deprecated`, `eos_purchase_stitched_events_v2_deprecated`, `unified_events_legacy`.

**Tier 2 (older numbered variants):** `chapter_attribution.chapter_channel_paths_v2`, `chapter_channel_paths_v3`, `chapter_session_entry_channels_v2`, `chapter_analysis.attribution_first_touch_v2`, `attribution_last_touch_v2`, `attribution_linear_v2`.

**Tier 3 (17 of 25 candidates dropped):** in `chapter_analysis` — `attribution_last_touch_eos_v1`, `chapter_channel_events_eos_v1`, `chapter_correlation_base`, `chapter_paths`, `eos_journey_summary_v1`, `eos_pixel_events_clean_v1`, `eos_pixel_events_postfix`, `eos_pixel_events_recent`, `eos_postfix_journey_bot_scores_v1`, `eos_postfix_journey_bot_scores_v2`, `journey_bot_scores_v1`, `unified_events_clean_v1`. In `chapter_attribution` — `attribution_first_touch`, `attribution_last_touch`, `chapter_channel_presence`, `purchase_channel_fallbacks_v1`, `purchase_channel_final_v1`.

**Kept as scaffolding for future dashboard work** (8 candidates): `public.dashboard_snapshot_v1` and 6 dependents (don't drop without first deciding whether the planned `src/app/chapter/` dashboard will reuse it); `chapter_attribution.chapter_channel_events` (genuinely live); `chapter_analysis.eos_pixel_journey_bot_scores_v1` (consumed by `eos_valid_journeys_v2`, which is itself unaudited).

## Critical objects

`eos_pixel_events_valid_v1` · `eos_pixel_events_categorized_v1` · `eos_journey_entry_channel_v1` · `eos_bot_scores_24h_v5` · `eos_lifecycle_chapters_valid_v1` · `eos_purchase_attribution_v6` · `eos_attribution_linear_v1` (post-Fix-#9) · `_snapshot_runs`

## Known considerations

### 1. Channel logic is not fully unified yet

Some EOS reporting views use `resolved_channel` from `eos_pixel_events_categorized_v1`; others still use raw `utm_source` with `COALESCE(utm_source, 'direct')`. Not all dashboard outputs use the same channel taxonomy. Targeted for unification when reporting generalizes.

### 2. Two reporting patterns coexist

Cleaner path: `eos_pixel_events_valid_v1` → `eos_pixel_events_categorized_v1` → `eos_journey_entry_channel_v1`.
Older path: several attribution/path outputs still read directly from `lifecycle_chapters` without using newer reporting-layer cleanup.

### 3. Bot/suspect/human filtering varies

Several summary views reference `eos_bot_scores_24h_v5`, but not all EOS views consistently filter on the same reporting-valid traffic concept. Should standardize.

### 4. Reporting schema is EOS-specific in practice

Generic name, EOS-specific objects. Acceptable for now; revisit when second client onboards.

## Data contracts

- `eos_pixel_events_valid_v1`: only EOS events in trusted window; stable journey_id; structured JSON fields.
- `eos_pixel_events_categorized_v1`: deterministic channel resolution; UTM precedence over referrer; internal referrers not misclassified.
- `eos_journey_entry_channel_v1`: one row per journey; entry = chronologically first categorized event.
- `eos_bot_scores_24h_v5`: each `journey_id` once; `bot_class` consistent with policy.
- `eos_lifecycle_chapters_valid_v1`: filtered EOS slice; chapter ordering and IDs stable with upstream.

## Upstream dependencies

- `eos_pixel_events_valid_v1` ← `chapter_ingest.pixel_events`.
- `eos_pixel_events_categorized_v1` ← `eos_pixel_events_valid_v1`.
- `eos_journey_entry_channel_v1` ← `eos_pixel_events_categorized_v1`.
- Dashboard views (`traffic_overview_v1`, `engagement_quality_v1`, `channel_performance_v1`) ← `eos_pixel_events_valid_v1` + `eos_bot_scores_24h_v5`.
- `eos_funnel_v1` ← `eos_pixel_events_valid_v1` + `eos_purchase_stitched_events_v2`.
- `eos_purchase_overview_v1` ← `chapter_ingest.purchase_events`.
- `eos_lifecycle_chapters_valid_v1` ← `chapter_model.lifecycle_chapters`.
- `eos_attribution_linear_v1` ← `chapter_attribution.chapter_channel_paths_canonical_v1` (UNION) `chapter_channel_paths_canonical_v2`.
- `eos_attribution_first_touch_v1` / `last_touch_v1` ← `chapter_model.lifecycle_chapters` (currently — keep-but-refactor).
- `_snapshot_runs` ← written by `chapter-scripts/run-snapshot.js`.

---

# Schema: chapter_analysis

## Schema summary

QA, experimental, and debug objects. Created during the April 6, 2026 audit as the destination for non-canonical objects relocated out of core schemas. **Not production.**

After Fix #10 (May 7, 2026) cleanup, this schema is dramatically smaller — most experimental and `_deprecated` items were dropped.

## Notable surviving objects

- `eos_pixel_journey_bot_scores_v1` — consumed by `chapter_reporting.eos_valid_journeys_v2`. Itself unaudited; if `eos_valid_journeys_v2` ends up dead, this can drop too.

## Removed in Fix #10

See `chapter_reporting → Removed` section above for the full list (32 objects across `chapter_analysis` and other schemas).

## Audit lesson recorded

The first Tier 3 audit pass joined `pg_depend` through `pg_stat_all_tables`, which **excludes views**. This under-reported dependencies on every view candidate, making them all appear droppable. Postgres's transactional DROP rolled back the entire migration on first failure (zero state change), and a corrected query joining through `pg_class` directly revealed the real picture.

**For future audits:** use `pg_class` + `pg_depend` + `pg_rewrite`. Never use `pg_stat_all_tables` for view dependency checks.

---

# Audit & Cleanup History

## April 6, 2026 — Schema cleanup audit

### Ingest

UTMs live in JSON — needed correct parsing downstream (fallback to referrer, props, raw). Pixel and purchase timestamps differ (`pixel_events.ts` vs `purchase_events.event_ts`) — known. Downstream consistently uses `resolved_identity_key`. Known gap: `purchase_items` not populated for EOS.

### Identity

No code changes during audit; structure was already clean.

### Journey

Removed temporary bot-filtering views (`journeys_filtered_v1`, `journeys_filtered_v2`); confirmed no downstream dependencies. Restored `chapter_journey` to its raw observation role: no bot classification, no quality scoring, no attribution logic, no engagement interpretation.

### Model

Moved to `chapter_analysis`: all `eos_*` objects, bot scoring objects, clean/debug/legacy modeling objects. Standardized on v2 pipeline — `journey_events` and `lifecycle_chapters` repointed off legacy `unified_events`. Restored model layer to identity-first modeling (canonical_identity_key, unified timeline, lifecycle chapters).

### Attribution

Removed non-canonical `_v2` attribution variants. Moved EOS-specific objects to `chapter_analysis`. Restored single canonical model per attribution type. Kept `purchase_channel_fallbacks_v1` and `purchase_channel_final_v1` as part of the attribution correction layer (NB: subsequently dropped in Fix #10). Fixed boundary-event bug in `chapter_channel_compressed`.

### Reporting

Established canonical attribution reporting outputs (`eos_attribution_first_touch_v1`, `eos_attribution_last_touch_v1`). Marked old objects with `_deprecated` suffix (subsequently dropped in Fix #10).

## April 29, 2026 — Fix #1 (snapshot timing contract)

Built the contract enforced by `chapter-scripts/run-snapshot.js`: `_snapshot_runs` table, `snapshot_ts_hi` column on 14 snapshot tables, `SNAPSHOT_TS_HI` env var bounds source queries, transactional TRUNCATE+INSERT. End-to-end verified against scratch table.

## April 29, 2026 — Fix #12 (chapter_id resets per identity)

Verified `chapter_model.lifecycle_chapters` partitions by `(client_key, canonical_identity_key)` — chapter_id resets per identity. Confirmed with two real multi-purchase identities.

## May 1, 2026 — First reconciliation pass + Fix #7 (canonical_v2 materialization)

All 14 snapshot tables aligned to `SNAPSHOT_TS_HI=2026-05-01T03:46:50.986Z`. Total compute ~88 min.

Fix #7 created `chapter_channel_paths_canonical_v2_snapshot` and rewrote the view as a facade. 283 rows initial, 7m 13s. Reads now return in milliseconds.

## May 3, 2026 — Fix #17 (canonical_v2 data lag)

Root cause: `eos_filtered_purchases_v1` was stale and missing `snapshot_ts_hi`. Added column, recovered loader SQL, ran 9-snapshot cascade at the new cutoff. canonical_v2 grew 283 → 443 rows; max boundary_ts moved Apr 20 → May 3.

## May 4, 2026 — Fix #20 (identity canon staleness)

Symptom: identity_overlap_summary showed 10.4% purchaser↔session overlap. Root cause: `/api/purchase` and `/api/conversion` wrote only to `identity_aliases`, not `identity_canon`. Fix: added trigger `trg_sync_canon_from_alias` on `identity_aliases` that propagates to canon (with multi-hop forward resolution); also added direct upsert to canon in API write paths as defense in depth. Backfill recovered 476 mappings. Overlap moved 10.4% → 65.8%.

## May 4, 2026 — Fix #5 phase 1+2 (canonical_identity_key shim)

Audit found 13 views referencing `final_identity_key`. Phase 1: 2 dropped as dead; 9 shimmed (added `canonical_identity_key` alongside `final_identity_key`); 1 already shimmed; 1 got an analogous count column. Phase 2: migrated `sessionized_universe_summary_v1` and `identity_overlap_summary_v1` to use canonical_identity_key.

## May 5, 2026 — Fix #7b (canonical_v1 materialization)

Same pattern as Fix #7, one layer deeper. `chapter_channel_paths_canonical_v1_snapshot` + facade view. 311 rows initial, ~52 min compute. Unblocked the deferred `channel_paths_canonical_summary` snapshot (was 15-min timeout, now 0.75s).

## May 5, 2026 — Fix #19 (POS / Quick Sale orders)

Root cause: orders-create webhook returned 400 `missing_purchase_identity` for orders with no email or customer (POS / Quick Sale). Fix: synthesize `customer_id = shopify_<source_name>_anonymous:<order_id>` for orders with `source_name` and `id` but no email/customer. Strict 400 only when both source_name and order_id are missing.

## May 5, 2026 — Fix #4 closed (null/unknown attribution gone)

Verified zero chapters have `NULL` or `(unknown)` channel_paths after the Fix #17 cascade. The fallback in canonical_v2's view hardcodes `(direct)` so nothing falls through to `(unknown)`.

## May 6, 2026 — Fix #21 closed (direct dominance is real)

Hypothesis: widen `eos_pixel_events_categorized_v1`'s entry-channel classifier to scan ALL events in a chapter for UTM/click_id/referrer signals, recovering "direct" chapters with non-direct signals buried mid-journey.

Result: post-fix, `(direct)` is in 73% of chapters and gets 69.3% of linear revenue — essentially unchanged from pre-fix. EOS's direct dominance is genuine customer behavior (loyal/return/bookmark traffic, no paid spend), NOT a classification gap.

Lesson recorded (memory): Dashboard SQL Editor "Failed to fetch (api.supabase.com)" is a UI-layer HTTP timeout (~5 min), NOT a query failure. Backend keeps running and commits on its own schedule. Filter `pg_stat_activity` by `application_name = 'supabase/dashboard-query-editor'` AND `state = 'active'` ORDER BY `xact_start`.

Snapshot contract bug surfaced: `_snapshot_runs.elapsed = finished_at - started_at` is always `00:00:00` in a single-tx DO block because both columns resolve to `now()` = transaction-start time. Fix: use `clock_timestamp()` for `finished_at`.

## May 7, 2026 — Fix #9 (linear attribution redefinition)

Linear is now per-session-entry at the chapter level, with a `(unknown)` bucket for chapters lacking session data. Repeats accumulate proportional credit. Loader change: `eos_attribution_linear_v1` built from `chapter_channel_paths_canonical_v1` UNION ALL `(unknown)` rows from canonical_v2 fallback chapters.

Distribution shift: `(direct)` 69.3% → 35.1%; `(unknown)` new at 28.3%; `organic_search` 8.2% → 14.4%; `email` ~unchanged.

## May 7, 2026 — Fix #10 (32 objects dropped)

Tier 1: 9 `_deprecated` items dropped. Tier 2: 6 older numbered variants dropped. Tier 3: 17 of 25 candidates dropped (8 kept as scaffolding for future dashboard).

## May 7, 2026 — Fix #13 (pixel hover_intent enrichment)

`hover_intent` now carries `href`, `element_id`, `element_class`, `aria_label`, `page_section` in `props`. Defensive guard for SVG elements (`el.className` returns `SVGAnimatedString`, not string).

## May 7, 2026 — Fix #14 closed (browser_ip scope-creep avoided)

Webhook's `sanitizeShopifyOrderForRaw` already strips both IP locations from `raw` before `purchase_events` write. No `browser_ip` in `raw` for new rows to extract. Closed without code change.

## May 7, 2026 — Fix #15 (user_agent on purchase_events)

Added `user_agent text` column. Backfilled 664/672 historical rows from `raw->'order'->'client_details'->>'user_agent'`. Webhook + `/api/purchase` updated to write to the column.

## May 7, 2026 — Fix #16 closed (truncated IP declined)

Bot detection from journey `user_agent` + new purchase `user_agent` (Fix #15) is sufficient. Added IP storage doesn't add detection capability proportional to the PII surface area increase. Principled decline.

## May 7, 2026 — Fixes #22, #23 (statement_timeout + direct connection)

Fix #22: `ALTER ROLE postgres SET statement_timeout = '30min'` applied (DB-level default). `run-snapshot.js` overrides to 60min per-session for legitimate long ops.

Fix #23: `DATABASE_DIRECT_URL` added to chapter-scripts, IPv4 add-on enabled (~$4/mo). Direct connection bypasses pooler orphan issue at 15-20 min. URL-encoding lesson recorded for special chars in passwords.

## May 7, 2026 — Fix #27 (production monitoring & alerting)

Application-layer alerting on `_snapshot_runs` posted to Google Chat. Vercel cron jobs: stuck-runs alert at 60 min running, daily digest at 14:00 UTC. Plumbing: `src/app/lib/monitoring/{gchat,auth,types}.ts` + routes under `src/app/api/internal/monitoring/`. Per-resource Supabase metric alerts deferred (part a — not blocking).

## May 8, 2026 — Fix #24 (read replica + analytical isolation)

Supabase read replica provisioned in us-west-2 (~$16/mo). All Looker connections repointed to replica direct host. In-repo monitoring and demo routes (`stuck-runs`, `daily-digest`, `demo/snapshot`) now read from `SUPABASE_REPLICA_URL` with fallback to primary. `chapter-scripts/run-snapshot.js` correctly stays on primary (its INSERT-FROM-SELECT pattern can't split). Replica is the analytical isolation layer that prevents future May-5-style cascades; primary now insulated from heavy analytical load.

## May 8, 2026 — Fix #11 (this doc)

Schema reference + definitions consolidated into `/docs/chapter-reference.md`.

---

# Open Follow-ups

## Priority 1 — Scale readiness

**Fix #25 — Incremental snapshot refresh.** Today every snapshot does TRUNCATE + INSERT over the full live window (`O(all data since 2026-04-01)`). Refactor to track `last_processed_event_ts` per snapshot so each refresh processes only new data (`O(today's new data)`). Required for daily refreshes at multi-client scale. ~2-3 days of refactor work. Biggest single payoff for scale; until done, 30-client × full rebuilds = guaranteed exhaustion.

**Fix #26 — Multi-tenant isolation.** Add leading `client_key` indexes everywhere; add Row Level Security on `chapter_ingest.*` and `chapter_identity.*` (service role bypasses); rotate `AFG_CLIENT_SECRETS_JSON` to per-client API keys; add audit logging on `client_key` resolution. Required before signing the dentist or school accounts (compliance / data isolation). ~2-4 days.

**Fix #28 — Snapshot scheduling + per-client isolation.** `pg_cron` or Vercel scheduled functions; stagger per-client refreshes (client A 1am UTC, client B 1:30am, etc.); never simultaneous. Fix #25 must land first to make each refresh small enough to fit in a stagger window. ~1-2 days.

**Fix #5 phase 3 — Drop final_identity_key.** Remove `final_identity_key` from view outputs and body references; harmonize `identity_canon` (table) vs `identity_canonical` (recursive view). Blocked on Looker tile audit — confirm no dashboard reads `final_identity_key` directly.

## Priority 2 — Attribution quality

**Fix #18 — Deferred until Fix #25.** Original framing: invert canonical_v2's dependency on reporting-layer snapshots. Investigation revealed the reporting snapshots `canonical_v2` reads are caches of attribution-layer computation (specifically `chapter_summary_v1`), not pure reporting business logic. The "right" fix (Path B — relocate caches to attribution layer) is a 2-3 hr refactor for a smell that isn't blocking anything. Fix #25's incremental refresh redesign will rethink this whole snapshot architecture, so doing #18 now risks doing the work twice. Reopen if Fix #25 changes scope or Fix #17-style data-lag incidents recur.

## Priority 3 — Housekeeping & documentation

**Fix #8 — Historical identity gap documentation.** The pre-April-1 (identity) and pre-April-14 (journey) cookie gaps are noted in this doc. Formalize if needed — no code change required.

**Fix #19 — POS / Quick Sale verification.** Code-complete (May 5). Verify after deploy: next non-web order should land in `purchase_events` with `customer_id` matching `shopify_<source_name>_anonymous:<order_id>` pattern.

---

# Cookie Fix History

## 2026-04-01 17:00 UTC — Identity cookie persistence fix

Before this date, the identity cookie was not persistent — a new identity was created per event. Identity-level analyses for data before this point should be treated with extreme caution.

## 2026-04-14 18:15 UTC — Journey cookie persistence fix

Before this date, the journey cookie was not persistent — a new journey was created per event. Journey-level analyses for data before this point should be treated with extreme caution.

## Implications

- True returning-customer counts and identity stitching only become reliable after April 1, 2026.
- True session/journey-level analyses only become reliable after April 14, 2026.
- Attribution that depends on either (most of it) gets meaningfully more reliable after April 14.

---

# Pricing Reference

## Current model (May 2026)

**Billing metric:** raw journeys per month (includes bots; matches `chapter_journey.journeys` count filtered to `client_key`).

**Tier 1 (up to 100K raw journeys/mo):** $399/mo flat.
**Overage between 100K and 200K:** $25 per additional 10K journeys (linear).
**Tier 2 (at 200K raw journeys/mo):** $799/mo flat.
**Above 200K:** not yet priced. Likely revisit when first dentist (2K-location) approaches that scale.

## EOS Fabrics today

~96K raw journeys/mo → $399 tier.

## Unit economics

- Stack cost per client at 5-7 small clients: ~$130-180/mo.
- Margin at $399 tier: ~55-65% gross.
- Per-unit cost at this scale: ~$0.003 per journey, ~$0.19 per tracked purchase, ~0.27% of attributed revenue.

## Bot caveat

~62% of EOS raw journeys are bot-likely. Two possible future levers:
1. Bill on `human_likely + suspect` only (drops EOS billable journeys to ~36K → still well within $399).
2. Keep raw + improve bot filtering at ingest so the count is honestly lower.

Decision needed before onboarding scale clients where bot ratio could differ significantly.

## Multi-tier pricing (proposed, not active)

This is exploratory thinking, not a current contract. Useful as a starting point for the conversation when the next client lands.

| Tier | Price | Margin (est) | For | Up to | Attribution | Access | Retention | Support |
|---|---|---|---|---|---|---|---|---|
| Standard | $149 | 83% | Small / low complexity | 25K journeys | First / last / linear | Dashboard-only | 30 days | Email |
| Growth | $399 | 75% | Mid / ecomm | 100K journeys | + 1 custom model | Dashboard + weekly insights (async) | 60 days | Priority email + monthly call |
| Pro | $799 | 73% | Advanced / heavy query | 200K journeys | + advanced (causation/correlation) | Dashboard + consulting (meetings) | 60 days | Phone + dedicated consulting |

**Add-ons:** $99 for 180-day retention; $25 per 10K over tier journey limit (auto-scaling).

## Internal limits (estimates from EOS)

- 1MM-3MM events per month per client.
- 100K identities per client (lifetime safe max).
- 300-500 unoptimized non-cached queries per month.

---

# Multi-tier Scaling Architecture (Year 2+ reference)

**Pattern.** Supabase (OLTP — real-time writes, identity stitching) → ETL every 15 min (Fivetran / Airbyte) → Warehouse (Snowflake / BigQuery — heavy aggregations, columnar, MPP) → Looker reads warehouse only.

**Stays in Supabase.** Raw event ingest, `identity_aliases` + `identity_canon` (live triggers), customer-support per-record lookups.

**Moves to warehouse.** All `chapter_attribution` + `chapter_reporting` compute; all Looker queries.

**Migration triggers (when to actually do it).**
- Any single client > 100M events/month.
- Looker dashboards still slow even after Fix #25 (incremental refresh).
- Postgres compute add-ons exceed warehouse-stack alternative cost.

**Cost at projected Chapter scale** (5 ecommerce + dentist + school + B2B startup, ~50-100M events/mo): $500-1500/mo total. ETL biggest variable (Fivetran $300-700 vs Airbyte self-hosted ~$30); warehouse compute $100-300; dbt $0-300; Looker $200-400.

**Storage scaling is trivial.** Snowflake $25/TB/mo; BigQuery $20/TB ($10 long-term). At 5-year Chapter scale (~200GB raw → ~25GB warehouse-compressed), storage < $1/mo. Postgres storage is 10× more expensive AND forces compute upgrades — this is why Postgres-only ages worse than the split.

**Compute scales sub-linearly** with smart architecture (incremental refresh + materialized aggregates). Fix #25 is the prep move that makes a future warehouse migration a config change rather than a refactor.

**Pruning lever (Year 5+).** Retain raw events 12-18 months; aggregates forever; archive cold history to S3 ($0.023/GB/mo). BigQuery auto-discounts long-term storage; ClickHouse supports per-table TTL.
