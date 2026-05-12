# Chapter — Historical Data Gaps

> **Purpose:** Document the periods of EOS Fabrics data that have known integrity issues from early Chapter deployment, what each gap means for analysis, and how to filter when running historical reports.
> **Audience:** Internal — Chapter team, anyone running historical analyses against EOS data.
> **Last updated:** 2026-05-12

---

## Summary

EOS Fabrics is Chapter's first production client. During the rollout, two cookie persistence bugs caused systematic identity / journey integrity issues for early data. **Both bugs are fixed in production**, but the historical data they affected remains in `chapter_ingest.pixel_events`, propagating into derived snapshots. This doc names the gaps, their impact, and how to handle them.

---

## Gap 1 — Identity cookie not persistent (BEFORE 2026-04-01 17:00 UTC)

**What was happening:** the pixel script's `chapter_anon_<client_key>` cookie was not properly persisted across page loads. Every page visit created a brand-new anonymous identity. A single user browsing 20 pages produced 20 distinct `identity_key` values, none of which would later stitch together via the alias graph.

**Fixed:** 2026-04-01 17:00 UTC (Tab 12, pixel.js patched).

**Impact on data BEFORE the fix:**
- `chapter_ingest.pixel_events` rows have one-off `identity_key` values that aren't part of any identity stitching chain.
- `chapter_identity.identity_aliases` is sparse for the pre-fix period — there are no `purchase_cart_token_bridge` or `explicit_identify_call` edges to stitch users together.
- `chapter_journey.journeys` rows have `last_identity_key` values that disagree even within the same actual person's activity.
- Returning-user analyses are unreliable: someone who came back 3 times appears as 3 distinct identities.
- Linear / first-touch / last-touch attribution is biased toward direct entry because session-entry channels were never linked to identity chains.

**Impact on data AFTER the fix:**
- Identity stitching works as intended. Each browser session has a stable `chapter_anon_<client_key>` UUID. Cross-session linking via email_hash (purchase) and explicit identify calls succeeds.

**How to filter when running historical analyses:**
- Default to `event_ts >= '2026-04-01 17:00:00+00'::timestamptz` for any analysis sensitive to identity continuity.
- This is the same date floor used by all `chapter_reporting.eos_*` views and the `lifecycle_chapters_snapshot` rebuilder, so any analysis derived from these is already gap-filtered.
- For analyses against raw `chapter_ingest.pixel_events` directly, add the filter explicitly.

---

## Gap 2 — Journey cookie not persistent (BEFORE 2026-04-14 18:15 UTC)

**What was happening:** the pixel script's `chapter_journey_<client_key>` cookie was not properly persisted. Every event created a brand-new `journey_id`, so each event was treated as its own session.

**Fixed:** 2026-04-14 18:15 UTC (Tab 12, pixel.js patched).

**Impact on data BEFORE the fix:**
- `chapter_journey.journeys` has many more rows than actual sessions — each "journey" is one event.
- Bot detection in `chapter_analysis.eos_bot_scores_24h_v5` over-counts bot-likely journeys because the heuristics rely on "few events in a session = bot" — between Apr 1 and Apr 14, even legitimate users showed 1 event per journey.
- Journey-level engagement analytics (events per journey, scroll depth, etc.) are unreliable for this 13-day window.
- Sessionized attribution (Fix #21 model) sees no multi-event session boundaries before Apr 14.

**Impact on data AFTER the fix:**
- Journeys work as intended. Each page visit starts a session; subsequent events on the same page or follow-on pages accumulate to the same `journey_id` until the journey times out / user closes the tab.

**How to filter when running historical analyses:**
- For journey-level analyses (engagement, session depth, sessionized attribution), use `journey.first_seen >= '2026-04-14 18:15:00+00'::timestamptz`.
- For identity-only analyses, Gap 1's filter is the binding constraint and Gap 2 is already covered by it being later.

---

## Combined recommendation

For any reporting or attribution work that crosses both layers:

```sql
WHERE event_ts >= '2026-04-14 18:15:00+00'::timestamptz
```

is the safest single filter — it sits after both fixes. Any analysis that includes data between Apr 1 and Apr 14 is identity-clean but journey-broken; outside the trusted window (before Apr 1) both are broken.

The existing reporting layer (`chapter_reporting.eos_pixel_events_valid_v1` etc.) already uses Apr 1 as the floor. If a downstream consumer needs the stricter journey-aware floor, they should add it.

---

## Related items

- **Fix #20 (May 4, 2026)** — identity_canon staleness fix and trigger. Restored canonical identity coverage for purchases that had identity signals but were missing from `identity_canon`. Affected data prior to May 4 was backfilled.
- **44-row attribution gap (May 12, 2026, resolved)** — separate from the cookie gaps. This was a code bug in `/api/purchase` (canon-upsert not firing for guest-checkout paths). Affected ~9% of purchases until fixed today via SQL backfill + code fix (the unconditional self-canonical upsert added to `/api/purchase`).
- **Fix #15 (May 7, 2026)** — added `user_agent` column to `purchase_events`. Pre-fix purchase data has the UA in `raw->'order'->'client_details'->>'user_agent'` instead of the proper column. Backfilled 664 of 672 historical rows; 8 nulls are non-browser orders (POS / mobile_app) that genuinely never had a UA.
