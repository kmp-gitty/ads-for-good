# Fix #25 — Incremental Snapshot Refresh

> **Status:** Design — pre-implementation, **scope expanded May 8 2026** to include Phase 0 (materialize `lifecycle_chapters`).
> **Authored:** 2026-05-08
> **Audience:** Internal — Chapter team & future employees
> **Approach:** Phase 0 (materialize `lifecycle_chapters`) → Phase 1 (port snapshots to incremental).

---

# Phase 0 — Materialize `chapter_model.lifecycle_chapters` (May 8 addendum)

## Why this phase exists

Initial design (below) assumed the source views (`purchase_chapters_base`, `chapter_summary_v1`, etc.) were reasonably fast and the bottleneck was rebuilding from full date range each time.

**Diagnostic on May 8, 2026 (after this doc was written) found otherwise:**

- `purchase_chapters_base` view query timed out at 5 min even for `COUNT(*)` over the full date range.
- Narrowing to last 7 days didn't help — same 5-min timeout.
- Filtering by 3 specific canonical_identity_keys didn't help — same 5-min timeout.
- EXPLAIN plan cost: ~20 million.

Root cause: `chapter_model.lifecycle_chapters` is a **VIEW** that runs a window function (`SUM(boundary) OVER (PARTITION BY (client_key, canonical_identity_key) ORDER BY event_ts, created_at)`) over `chapter_model.unified_timeline_v1` — which itself is a view union over pixel_events (2.77M rows for EOS), purchase_events, conversion_events, and offline_milestones. Every consumer query against `lifecycle_chapters` recomputes this window from scratch.

Predicates on the view's output (date range, canonical_identity_key) do NOT push down through the window function, so filtering doesn't reduce work.

## What changes in Phase 0

Materialize `chapter_model.lifecycle_chapters` into a real table with proper indexes. This becomes the foundation for everything downstream:
- `chapter_summary_v1` — currently a view that groups `lifecycle_chapters`. After Phase 0, it reads from the snapshot table → fast.
- `purchase_chapters_base` — same deal.
- `chapter_attribution.chapter_channel_paths_canonical_v1_snapshot` and `_v2_snapshot` (Fix #7 / #7b) — already snapshots, but their loaders read from `lifecycle_chapters`. After Phase 0, those reloads become fast.
- All `chapter_reporting.eos_*` snapshots.

## Phase 0 scope

1. **Create snapshot table** `chapter_model.lifecycle_chapters_snapshot` mirroring the view's 22 columns, plus `snapshot_ts_hi` per Fix #1 contract. PK and indexes for downstream access patterns.

2. **Write full-rebuild loader.** Initial population will be slow (~30-60 min, same order as today's view scan). One-time cost.

3. **Write incremental refresh loader.** Class B — affected canonicals = canonicals with new events in `pixel_events`, `purchase_events`, `conversion_events`, `offline_milestones`, OR new alias edges. DELETE + re-INSERT for those canonicals.

4. **Migrate consumers.** Two options per consumer:
   - **Option A (preferred):** rewrite `chapter_model.lifecycle_chapters` view as a thin facade over the snapshot table (Fix #7 / #7b pattern). No consumer changes; transparent speedup.
   - **Option B:** point each consumer directly at the snapshot table, drop the view.
   - Going with **A** by default — same trick used for `canonical_v1` and `canonical_v2`, no surprises.

5. **Validate parity** as in original Fix #25 design — run rebuild, capture checksum; run incremental, capture checksum; compare.

## Phase 0 multi-day plan

**Day 1 (today):**
- Write the CREATE TABLE DDL.
- Write the full-rebuild loader.
- Kick off initial population in background.
- (Optional, if loader finishes today) sketch the incremental loader.

**Day 2:**
- Verify initial population completed successfully.
- Write incremental loader (Class B against `unified_timeline_v1`'s sources + `identity_aliases`).
- Parity-test incremental vs full-rebuild on a small recent window.

**Day 3:**
- Rewrite `chapter_model.lifecycle_chapters` view as a facade over the snapshot.
- Verify all downstream consumers still produce correct output.
- Time downstream queries — should drop from minutes to sub-second.

**Day 4+:**
- THEN the original Fix #25 plan resumes — port `eos_purchase_base_snapshot_v1`, then canonical_v1/v2, etc. With the source view chain now fast, Class B incremental for those should work as originally designed.

---



---

## Problem

Every Chapter snapshot today does `TRUNCATE TABLE` + `INSERT INTO target SELECT FROM source` over the full live data window (since 2026-04-01). Refresh time is **`O(all data)`**, not `O(new data)`.

Concrete pain: `chapter_attribution.chapter_channel_paths_canonical_v1_snapshot` takes ~50 min to rebuild for ONE client (EOS, ~96K monthly journeys). Tolerable for on-demand use; untenable for any regular cadence or multi-client scale.

## Goals

1. Refresh time becomes `O(new data since last refresh)`, not `O(all data ever)`.
2. Preserves existing `_snapshot_runs` contract from Fix #1 — no breaking changes to monitoring or run telemetry.
3. Works inside the current `chapter-scripts/run-snapshot.js` shape — incremental is layered on, not a rewrite.
4. Validates against full-rebuild parity per snapshot before declaring it done.
5. Has an explicit force-full-rebuild override for after logic-bug fixes.

## Non-goals

- Auto-detecting which class a snapshot falls into. Pattern selection is per-snapshot, by hand.
- Migrating ALL snapshots in this fix. Framework + one worked example here; the rest port mechanically afterward.
- Changing snapshot schemas or column shapes.
- Real-time / streaming snapshots. Refresh remains discrete-run.

---

## Framework

### 1. Watermark source: `_snapshot_runs` itself

The high-water mark for any snapshot is the latest successful `snapshot_ts_hi` for its `target_table`. No new infrastructure table — `_snapshot_runs` already has everything.

```sql
SELECT COALESCE(
  MAX(snapshot_ts_hi),
  '2026-04-01'::timestamptz   -- bootstrap default for never-run-before
) AS last_high_watermark
FROM chapter_reporting._snapshot_runs
WHERE target_table = 'chapter_reporting.eos_purchase_base_snapshot_v1'
  AND status = 'ok';
```

Why `_snapshot_runs` instead of a new table:
- One source of truth for what a snapshot "knows."
- Already monitored (Fix #27 alerts).
- Rolls back cleanly on failed runs (failed runs don't update the watermark).
- No new schema to maintain.

### 2. WHERE clause shape (safety margin pattern)

Naïve incremental — `WHERE event_ts > last_watermark` — misses **late-arriving data** (an event with `event_ts = 13:50` written at 14:00, after a 13:55 snapshot).

Fix: re-process a small window backward from the watermark on each run.

```sql
SET reprocess_from = last_high_watermark - INTERVAL '1 hour';

-- Step 1: drop the reprocess window from target.
DELETE FROM <target>
WHERE event_ts > :reprocess_from;

-- Step 2: re-INSERT everything in [reprocess_from, SNAPSHOT_TS_HI].
INSERT INTO <target> (...)
SELECT ...
FROM <source>
WHERE event_ts > :reprocess_from
  AND event_ts <= :SNAPSHOT_TS_HI;
```

**Why DELETE-then-INSERT instead of UPSERT or `NOT EXISTS`:**
- Simpler — no per-row dupe check, no ON CONFLICT plumbing.
- Identical semantics to a partial TRUNCATE+INSERT bounded to the reprocess window.
- Works regardless of whether target has a unique constraint.
- Easy to reason about: "the last hour gets rebuilt; everything older is untouched."

**Safety margin choice:** 1 hour is a reasonable default. Tune per-snapshot if needed:
- Append-only ingest data (`pixel_events`, `purchase_events`): 1 hour is generous; events typically write within seconds.
- Late-arriving offline / CRM data: maybe 24 hours.
- Aggregations across windows that can shift: case by case.

### 3. Three classes of snapshot, three handling patterns

Not all snapshots are append-only. Pattern selection per snapshot:

#### Class A — Append-only

New source rows = new target rows. Existing target rows never change once written.

Examples: filtered raw events (purchase_events filtered to a client + date window), `_snapshot_runs` itself.

**Pattern:** the safety-margin pattern above. DELETE the reprocess window, INSERT the new range.

#### Class B — Mutable-per-key

A new source row can mutate existing target rows by *changing how a key resolves*. Most common shape: a new identity alias re-canonicalizes existing purchases; a new event extends an existing in-progress chapter.

Examples: `chapter_channel_paths_canonical_v1_snapshot` (chapter paths can extend with new session entries), anything keyed by `canonical_identity_key`.

**Pattern:** identify the *set of affected keys* since last watermark, DELETE all rows in target for those keys, re-INSERT for those keys only.

```sql
-- Step 1: find affected keys.
WITH affected_keys AS (
  SELECT DISTINCT canonical_identity_key
  FROM <source_with_recent_changes>
  WHERE event_ts > :reprocess_from
)
-- Step 2: drop those keys from target.
DELETE FROM <target>
WHERE canonical_identity_key IN (SELECT canonical_identity_key FROM affected_keys);

-- Step 3: re-INSERT only those keys.
INSERT INTO <target> (...)
SELECT ...
FROM <source>
WHERE canonical_identity_key IN (SELECT canonical_identity_key FROM affected_keys);
```

This re-processes more than strictly necessary (if a canonical_identity_key has 10 chapters and only 1 was affected, all 10 get re-built) but is much simpler than per-chapter watermarking and still vastly faster than full rebuild.

**Affected-key detection** depends on the snapshot's source. For canonical_v1: changes can come from new events in `chapter_model.lifecycle_chapters` OR new alias edges in `chapter_identity.identity_aliases`. Both feed in.

#### Class C — Aggregate-rebuild

Full rebuild is fast enough that incrementalizing isn't worth the complexity.

Examples: small summary tables (`eos_traffic_overview_snapshot`, `eos_engagement_quality_snapshot`), tables under ~10K rows where a full rebuild is sub-second.

**Pattern:** keep the existing TRUNCATE+INSERT. Skip incrementalization.

Decision rule: if a full rebuild takes < 10 seconds and the table has < 10K rows, leave it alone.

### 4. Force-full-rebuild override

After a logic-bug fix, watermarks lie — they say "I've processed up to time X" but the rows in target are wrong. Need an explicit way to force a full rebuild.

**Pattern (env var):**

```bash
FORCE_FULL_REBUILD=true SNAPSHOT_TS_HI=... node run-snapshot.js
```

When set:
- Script ignores the watermark and runs the legacy TRUNCATE+INSERT pattern.
- The new `_snapshot_runs` row is labeled with `force_rebuild=true` (extend the table or stuff into the existing `label` column — implementation detail).

This is also the pattern for the **first run** of any snapshot after migrating to incremental. Since there's no prior `_snapshot_runs` row to derive a watermark from, the first incremental run is essentially a full rebuild — set `FORCE_FULL_REBUILD=true` for the cutover, then drop the flag for subsequent runs.

### 5. Validation pattern (per snapshot)

Before declaring an incremental migration complete:

1. Capture row count and a checksum of the target table BEFORE migration: `SELECT COUNT(*), MD5(STRING_AGG(...)) FROM target`.
2. Run incremental refresh.
3. Re-run with `FORCE_FULL_REBUILD=true` against the same `SNAPSHOT_TS_HI`.
4. Compare counts and checksums. They MUST match exactly.

If checksums diverge: incremental has a bug. Don't ship.

---

## Worked Example: `eos_purchase_base_snapshot_v1`

This is the simplest snapshot to migrate first (Class A, append-only).

### Current pattern (assumed shape)

```sql
TRUNCATE TABLE chapter_reporting.eos_purchase_base_snapshot_v1;

INSERT INTO chapter_reporting.eos_purchase_base_snapshot_v1
  (id, client_key, event_ts, value, currency, customer_id, email_hash, snapshot_ts_hi)
SELECT
  pe.id,
  pe.client_key,
  pe.event_ts,
  pe.value,
  pe.currency,
  pe.customer_id,
  pe.email_hash,
  $1::timestamptz AS snapshot_ts_hi
FROM chapter_ingest.purchase_events pe
WHERE pe.client_key = 'eos_fabrics'
  AND pe.event_ts >= '2026-04-01'::timestamptz
  AND pe.event_ts <= $1::timestamptz;
```

(I haven't read the actual loader; this is the assumed shape per CLAUDE.md. If the real one differs significantly, adapt — the pattern still applies.)

### Incremental pattern

```sql
-- All inside the same transaction as the existing _snapshot_runs INSERT/UPDATE
-- (preserve atomicity from Fix #1's contract).

WITH last_run AS (
  SELECT COALESCE(
    MAX(snapshot_ts_hi),
    '2026-04-01'::timestamptz
  ) AS last_high_watermark
  FROM chapter_reporting._snapshot_runs
  WHERE target_table = 'chapter_reporting.eos_purchase_base_snapshot_v1'
    AND status = 'ok'
),
reprocess_window AS (
  SELECT (last_high_watermark - INTERVAL '1 hour') AS reprocess_from
  FROM last_run
)

-- Step 1: drop the reprocess window.
DELETE FROM chapter_reporting.eos_purchase_base_snapshot_v1 t
USING reprocess_window rw
WHERE t.event_ts > rw.reprocess_from;

-- Step 2: re-INSERT [reprocess_from, SNAPSHOT_TS_HI].
INSERT INTO chapter_reporting.eos_purchase_base_snapshot_v1
  (id, client_key, event_ts, value, currency, customer_id, email_hash, snapshot_ts_hi)
SELECT
  pe.id,
  pe.client_key,
  pe.event_ts,
  pe.value,
  pe.currency,
  pe.customer_id,
  pe.email_hash,
  $1::timestamptz AS snapshot_ts_hi
FROM chapter_ingest.purchase_events pe, reprocess_window rw
WHERE pe.client_key = 'eos_fabrics'
  AND pe.event_ts > rw.reprocess_from
  AND pe.event_ts <= $1::timestamptz;
```

### Estimated impact (back-of-envelope)

Assumptions for EOS Fabrics:
- Total purchase rows: ~672 (April–May 2026).
- New purchases per day: ~5-15.
- Daily refresh window: 24 hours back from now plus 1 hour safety = 25 hours of reprocess window.
- Rows in reprocess window per refresh: ~20-50.

Refresh time: from "scan + insert ~672 rows" (sub-second already, this snapshot is small) to "scan + insert ~50 rows" (still sub-second). For purchase_base specifically the absolute time savings are negligible — purchase_base is small enough that it borderlines Class C (aggregate rebuild).

**The bigger payoff is on canonical_v1 / canonical_v2** (Class B, ~50 min today). Incremental there should drop refresh to seconds for typical daily deltas.

But starting with purchase_base is right for *validating the framework* — small, append-only, easy to parity-test.

---

## `run-snapshot.js` integration sketch

The script today is a single-purpose loader (one snapshot, one run). For incremental, the per-snapshot SQL changes but the script wrapper stays largely the same.

Conceptual diff:

```js
// Existing (preserved):
const SNAPSHOT_TS_HI = process.env.SNAPSHOT_TS_HI || new Date().toISOString()
const FORCE_FULL = process.env.FORCE_FULL_REBUILD === 'true'  // NEW

// Inside the run() function transaction:
if (FORCE_FULL) {
  await tx`TRUNCATE TABLE chapter_reporting.eos_purchase_base_snapshot_v1`
  // ... existing full INSERT path
} else {
  // ... new incremental DELETE + INSERT path (per snapshot)
}

// _snapshot_runs row writes are unchanged; the contract holds.
```

Each snapshot's loader file (one per snapshot, in `chapter-scripts/snapshots/`) gets two paths: the legacy full-rebuild one (kept for `FORCE_FULL_REBUILD`) and the new incremental one (default).

---

## Rollout plan

1. **Implement the worked example** (`eos_purchase_base_snapshot_v1`).
2. **Validate parity:** run incremental, then `FORCE_FULL_REBUILD=true`, against the same `SNAPSHOT_TS_HI`. Confirm row counts and a checksum match exactly.
3. **Ship to production** — first incremental snapshot live.
4. **Monitor for one week.** Look for: any weekday/weekend asymmetries, late-arriving events that the safety margin missed, unexpected row count drift.
5. **Port the rest, in order of impact:**
   - `eos_purchase_touch_summary_snapshot_v1` (Class A or B — depends on `chapter_summary_v1`'s mutability characteristics).
   - `eos_purchase_fallback_snapshot_v1` (Class A).
   - `eos_purchase_channel_final_snapshot_v1` (Class A).
   - `chapter_channel_paths_canonical_v2_snapshot` (Class B — biggest payoff).
   - `chapter_channel_paths_canonical_v1_snapshot` (Class B — biggest payoff per single snapshot).
   - `eos_filtered_purchases_v1` (Class A).
   - `eos_attribution_linear_v1` (Class A — derived from canonical_v1+v2 outputs).
   - `eos_channel_contribution_v1` (Class C? — small aggregate, evaluate).
   - `eos_single_touch_chapters_v1` (Class A or C — evaluate by row count).
   - Remaining smaller snapshots — likely Class C, leave alone.

Each port follows the same Implement → Validate → Ship → Monitor cycle.

6. **After all ports done:** revisit Fix #28 (snapshot scheduling). Stagger per-client refreshes; with each refresh now small enough to fit in a stagger window, scheduling becomes feasible.

---

## Open questions / decisions deferred

### 1. Where to track FORCE_FULL_REBUILD in `_snapshot_runs`?

Options:
- Add a new column: `force_rebuild boolean`.
- Stuff into existing `label` (e.g., `LABEL=canonical_paths_v1_force_rebuild`).
- New `notes` text column.

Recommendation: **new column** — cleanest for monitoring queries.

### 2. Class B affected-key detection: which sources to scan?

For canonical_v1 specifically, affected keys can come from:
- New events in `chapter_model.lifecycle_chapters` (`event_ts > reprocess_from`).
- New aliases in `chapter_identity.identity_aliases` (`ts > reprocess_from`).
- New rows in upstream reporting snapshots (e.g., `eos_purchase_base_snapshot_v1` if canonical_v2 still depends on it post-Fix-#18 deferral).

Need to enumerate all sources per snapshot. Defer to per-snapshot port.

### 3. Should the safety margin be configurable per snapshot?

Yes. Add as env var: `SAFETY_MARGIN_HOURS` (default 1). Or hard-code per snapshot in its loader. Probably the latter — different snapshots have inherently different late-arrival profiles.

### 4. What about `chapter_attribution.chapter_summary_v1`?

It's a view, not a snapshot, so it's not in scope for Fix #25. But canonical_v2 reads `eos_purchase_touch_summary_snapshot_v1` which is a *cache* of `chapter_summary_v1`. That cache's mutability is an open question — needs investigation when porting `eos_purchase_touch_summary_snapshot_v1`.

### 5. Cross-snapshot dependencies

Several snapshots read other snapshots:
- canonical_v2 reads `eos_filtered_purchases_v1` and the four `eos_purchase_*_snapshot_v1` family.
- `eos_attribution_linear_v1` reads canonical_v1 + canonical_v2.

Port order matters: leaf snapshots first, then their dependents. The rollout plan above respects this.

### 6. Do we need an "incremental loaders archive"?

Today, `chapter-scripts/snapshots/archive/` holds historical full-rebuild loader SQL (per Fix #1 reconciliation work). After Fix #25, each snapshot has TWO loader paths (full + incremental). Probably want both archived — and clearly labeled. Implementation detail.

---

## Success criteria

- ✅ `eos_purchase_base_snapshot_v1` runs incrementally in production for at least 1 week with no parity drift.
- ✅ At least one Class B snapshot (canonical_v1 or canonical_v2) ports successfully and shows ≥ 10× speedup on typical daily refresh.
- ✅ `FORCE_FULL_REBUILD` works for every ported snapshot (parity-validated).
- ✅ Fix #28 design becomes feasible (per-client stagger windows fit).
