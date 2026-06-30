# Bot Classifier v1 — pinned definition + change-control contract

> Pinned: June 30, 2026. This document is the authoritative description of `chapter_reporting.journey_bot_classification_v1`.
> **This is revenue logic.** Future changes require a new version (see Change Control below).

## Why this is pinned

Bot classification gates billing. Per the [billing/usage handoff](chapter-billing-usage-handoff.md), tier ceilings are measured in `human_likely` journeys per month — `suspect` + `bot_likely` are excluded as "scope, not credit." A silent reclassification can re-tier a client without their knowledge or ours.

We have already lived through one such silent reclassification: the original "v0" classifier in April 2026 flagged single-event journeys as `bot_likely`, producing **61.7% bot_likely** on EOS. The current MV-based "v1" classifier (multi-signal score-based, defined below) has consistently produced **0.2-0.6% bot_likely** for the same months. The shift was not a data drift — it was a definitional change with no audit trail.

This document closes that audit gap going forward.

## v1 definition (verbatim from `chapter_reporting.journey_bot_classification_v1`)

Per-journey rollups computed over `chapter_ingest.pixel_events` partitioned by `(client_key, journey_id)`:

- `event_count` — total events in journey
- `distinct_event_types` — distinct `event_name` values
- `page_view_count`, `scroll_depth_count`, `hover_intent_count`, `time_on_page_count`, `page_exit_count`, `identify_count` — counts by event type
- `journey_duration_seconds` — `journey_end_ts - journey_start_ts`
- `avg_gap_seconds`, `min_gap_seconds` — per-event gap statistics (excludes the first event)
- `has_identity` — 1 if any event has a non-null `identity_key`, else 0
- `events_per_minute` — `event_count / max(duration_minutes, 0.1)`

### Bot score (additive, all signals start at 0)

| Signal | Weight | Rationale |
|---|---|---|
| `event_count >= 10 AND duration <= 10s` | **+35** | High event-rate burst — only scripts produce 10+ events in <10s |
| `min_gap_seconds < 0.5s` | **+20** | Sub-half-second between consecutive events — beneath human reaction |
| `avg_gap_seconds < 1.5s` | **+15** | Sustained sub-1.5s pacing — robotic cadence |
| no engagement events (no `scroll_depth`, `hover_intent`, `time_on_page`, `identify`) | **+20** | Headless / non-interactive — humans always emit at least one engagement event |
| `event_count >= 3 AND duration <= 3s` | **+20** | Short burst — multiple events in seconds |
| `distinct_event_types <= 2 AND page_view_count >= 1 AND no engagement` | **+15** | Crawler pattern — page_view + maybe one other type, nothing else |
| `has_identity = 0` | **+10** | Anonymous journey — humans more likely to identify (but anonymous is also legit, hence low weight) |
| `identify_count > 0` | **−25** | Identification event — strong human signal |
| `time_on_page_count > 0` | **−10** | Time-on-page beacon — strong human signal |
| `scroll_depth_count > 0` | **−5** | Scroll-depth beacon — mild human signal |

Theoretical score range: **−40** (full human engagement) to **+135** (full bot signals stack).

### Class assignment

```
bot_score >= 60  → 'bot_likely'
bot_score >= 35  → 'suspect'
else             → 'human_likely'
```

## What v1 does NOT do (intentional gaps)

- **No UA inspection.** April's "Chrome/142.0.0.0 China bot network" finding (CLAUDE.md → Key Data Insights) was flagged by ad-hoc UA-based analysis, not by v1. v1 catches them via behavioral signals (no engagement + short bursts) but doesn't read UA strings. If a sophisticated bot mimics human behavior, v1 misses it.
- **No IP-based detection.** Per [Fix #16 closed-without-change decision](../CLAUDE.md), Chapter does not store IP. v1 cannot use IP-derived signals.
- **No cross-journey correlation.** v1 classifies one journey at a time. A bot farm running 10 journeys with mildly different behavior each evades v1 if each individual journey scores below 60.
- **No score calibration against ground truth.** Thresholds (35 / 60) were set empirically at MV creation, never validated against a labeled dataset. Calibration is an open todo.

## v1 historical performance (EOS Fabrics, April–June 2026)

| Month | `bot_likely` | `suspect` | `human_likely` | Total journeys |
|---|---|---|---|---|
| April 2026 | 257 (0.2%) | 97,927 (66.1%) | 49,945 (33.7%) | 148,129 |
| May 2026 | 398 (0.3%) | 69,345 (57.5%) | 50,926 (42.2%) | 120,669 |
| June 2026 | 254 (0.6%) | 24,947 (62.1%) | 14,990 (37.3%) | 40,191 |

**Observations:**
- `bot_likely` % has been stable at 0.2–0.6% across all three months — v1 is NOT drifting.
- `suspect` carries the bulk of low-engagement traffic (57–66%) — that's where the threshold of 60 is "filtering out" the borderline cases.
- The bot-likely-dominant phrasing in CLAUDE.md's April observation (61.7%) was from the simpler v0 classifier, not v1.

## Change-control contract

**Any modification to v1's signals, weights, or thresholds requires a new version.** That includes:

- Adding a signal
- Removing a signal
- Changing a weight
- Changing a threshold (60 / 35)
- Changing one of the per-event-type counts (e.g. categorizing a new event as "engagement")

The new version ships as:

1. A new materialized view `chapter_reporting.journey_bot_classification_v2` alongside `_v1`.
2. A new document `docs/bot-classifier-v2.md` describing v2's deltas vs v1.
3. An updated `chapter_reporting.usage_snapshot` (when it ships) row writer that stamps `classifier_version='v2'` on rows.
4. A migration window where both MVs are refreshed nightly so any in-flight billing query can choose.
5. Eventual retirement of v1 once no consumer references it.

**Specifically prohibited:**

- Modifying `chapter_reporting.journey_bot_classification_v1` in place. Any thresholds change = v2.
- Recreating `_v1` with different logic during a refresh failure / fix.
- Reading the old "61.7% bot_likely" April figure as if it were today's v1 behavior — it wasn't.

## Calibration backlog

These are open questions about v1's accuracy that should be addressed before tier ceilings ride on it for high-value billing:

1. **False positive rate on `suspect` bucket.** What percentage of `suspect` journeys are actually human? v1 puts most low-engagement-but-not-script traffic here. If a meaningful fraction is human, we are under-billing.
2. **False negative rate on `human_likely` bucket.** What percentage of `human_likely` journeys are actually bots? Sophisticated bots that mimic engagement (fake time_on_page beacons, fake scroll events) would land here.
3. **Threshold sensitivity.** What does the histogram look like around the 35 and 60 thresholds? Is there a meaningful cluster just under 35 (i.e. real bots slipping into human)?
4. **Multi-journey patterns.** Are there clients with bot farms producing N journeys with score 55-59 each? v1 misses these.

A ground-truth labeled sample (e.g. 200 manually-classified journeys) would let us put numbers on the above. Hold for a session focused on classifier calibration.
