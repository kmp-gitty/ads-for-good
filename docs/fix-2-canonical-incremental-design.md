# Fix 2 — Incremental canonical_v1 + canonical_v2

> Shipped: June 30, 2026. Migration `fix_2_canonical_v1_v2_incremental`.
> Companion to Fix 25 (lifecycle_chapters incremental, May 12, 2026).
> See `docs/chapter-billing-usage-handoff.md` for the full billing/usage roadmap this unblocks.

## The cliff
At ship time, EOS nightly attribution chain was at **~500s** (lifecycle 66s + v1 214s + v2 220s) vs Vercel's **600s `maxDuration`** ceiling on `/api/internal/cron/refresh-attribution-chain`. v1 + v2 grew ~6.7s/day each (~13s/day combined). Clock to cliff: **~7-8 days, with no new clients added**. Root cause: `canonical_v1` and `canonical_v2` were **all-time full rebuilds** — every night they `DELETE WHERE client_key = X` and re-scanned all accumulated pixel_events + lifecycle_chapters_snapshot for that client. Cost grows with cumulative data forever.

## The fix
Mirror lifecycle_chapters' affected-canonical pattern (Fix 25). The set of canonicals that need v1/v2 reprocessing each night = the set of canonicals lifecycle re-wrote = the canonicals whose `lifecycle_chapters_snapshot` rows carry the current run's `snapshot_ts_hi`. This is a free signal lifecycle already stamps.

Pixel re-sessionization is scoped by **journey_id** (not identity_key) so multi-canonical journeys keep their full event context for session classification — protects against an edge case where an event belongs to a journey whose first event resolves to a different canonical, but the journey still touches an affected canonical further in.

```
affected = { canonical_identity_key
             FROM chapter_model.lifecycle_chapters_snapshot
             WHERE client_key = X AND snapshot_ts_hi = v_snapshot_ts_hi }

# v1:
_raw_ids = { (identity_key, canonical) FROM identity_canon WHERE canonical IN affected
             UNION SELECT a.canonical, a.canonical FROM affected a
             WHERE a not in identity_canon }  # self-row fallback
_journeys = DISTINCT journey_id FROM pixel_events WHERE identity_key IN _raw_ids

DELETE chapter_channel_paths_canonical_v1_snapshot WHERE canonical IN affected
INSERT ... FROM pixel_events JOIN _journeys ... GROUP BY chapter

# v2:
DELETE chapter_channel_paths_canonical_v2_snapshot WHERE canonical IN affected
INSERT ... FROM lifecycle_chapters_snapshot JOIN affected
       LEFT JOIN canonical_v1_snapshot (which is now fresh for affected)
       — chapters without session entries fall through to '(direct)'
```

Dormant canonicals' rows stay frozen — that's intentional. Their attribution doesn't change until their lifecycle does.

## Regression test
Built `_test` function variants writing to scratch tables. Ran against EOS at `snapshot_ts_hi=2026-06-30 03:30:07.144638+00`. Compared incremental output vs full-rebuild output (both run NOW against current MV/canon state), scoped to the 225 affected canonicals.

**Result:**
| Bucket | v1 | v2 |
|---|---|---|
| Test-only (incremental extra) | 0 | 0 |
| Full-rebuild-only (incremental missing) | 0 | 0 |
| Byte-identical | 222 | 234 |
| Mismatched | 3 (1.3%) | 0 |
| Total affected | **225/225** | **234/234** |

The 3 mismatched v1 chapters were all explainable by inter-run drift:
- **30f2652e** — `multiset_matches=true`, same channels but reordered. Pre-existing **session-tie ordering non-determinism** in `STRING_AGG(... ORDER BY entry_ts, sessionized_journey_id)` — when two sessions tie on entry_ts AND tie on sessionized_journey_id (rare), ordering is unspecified. Affects production v1 the same way; would diff between two consecutive production runs too.
- **16bb940e** — identity_canon was mutated at 2026-06-30 04:57 UTC (after the 03:30 chain ran). The two test runs happened either side of that mutation.
- **d4e23f48** — identity_canon was mutated at 2026-06-30 17:14 UTC (between the v1_test_incremental run and the v1_test_full run).

**None are regressions introduced by the incremental scope reduction.** When the chain runs sequentially in production at 03:30 UTC, all stages see the same in-flight identity_canon state — the temporal drift across stages is shorter (10s incremental vs 220s full rebuild), which is a net win for cross-stage consistency.

## Performance
| Stage | Full rebuild | Incremental | Speedup |
|---|---|---|---|
| v1 | 214s | ~10s (147 affected canonicals) | **~22×** |
| v2 | 220s | ~10s (147 affected canonicals) | **~23×** |
| Chain total | ~500s | **~86s** | **~5.8×** |

New headroom: **514s of 600s ceiling** (instead of 100s). Growth rate drops correspondingly — the cost of v1/v2 now scales with **daily affected canonicals** (a near-constant signal) instead of cumulative event volume.

## Architectural notes
- **Signature unchanged.** Orchestrator `chapter_reporting.refresh_full_attribution_chain` works without modification. Cron route unchanged.
- **Empty-affected case handled.** If lifecycle wrote no rows for a client tonight (no source data changed), v1/v2 return immediately with 0 rows and `status='ok'`. Production tables retain prior state — correct semantics.
- **`_snapshot_runs` bookkeeping preserved.** Same INSERT/UPDATE pattern; new label `'canonical_v[12]_snapshot_incremental'` distinguishes incremental runs from the prior full-rebuild runs in audit history. Daily-digest freshness checks unaffected.

## Discovered separately during regression: chain-order bug
Production missed 2 chapters today because `journey_bot_classification_v1` (a materialized view that v1 reads to filter bots) wasn't refreshed until 04:00 UTC — **after** the attribution chain at 03:30 UTC. Tonight's journeys hadn't been classified yet when v1 ran. Those 2 chapters fell through to v2's `(direct)` fallback instead of being attributed to their actual channels.

**Not introduced by Fix 2.** Pre-existing bug. Fix is to either reorder the crons (MV refresh first, then attribution chain) or include MV refresh inside the attribution chain. Filed as separate to-do.

## Followups
- **Pre-existing session-tie non-determinism** (mismatch #30f2652e). Could add a stable tiebreaker (e.g. `ORDER BY entry_ts, sessionized_journey_id, ts` — already done — plus a final tiebreaker on identity_key or event_id). Low priority; cosmetic only.
- **MV refresh ordering** — reorder so journey_bot_classification_v1 + journey_funnel_steps_v1 + journey_entry_channel_v1 refresh BEFORE the attribution chain. Critical for end-to-end attribution correctness on same-day events. **SHIPPED June 30** — cron schedule swap 04:00 → 03:00 UTC.
- **Fix 1** — per-client retention floor, chapter-aware. Caps how far back any single canonical is re-read. Smaller win than Fix 2 (depth matters less than breadth), but needed before tier validation.

## Postmortem — July 1 temp table collision (fix_2_canonical_v1_v2_incremental_v2)

**Failure:** first nightly cron run of the incremental functions (July 1 03:30 UTC) failed for all 4 clients with `relation "_affected" already exists`. Chain elapsed 186s, 0 clients succeeded. GChat alert fired.

**Root cause:** `canonical_v1` and `canonical_v2` both used `CREATE TEMP TABLE _affected ON COMMIT DROP AS ...`. Same name in both. When called sequentially by `refresh_full_attribution_chain`, both functions run in the SAME transaction. `ON COMMIT DROP` only fires at transaction commit (after v2). So v2's `CREATE TEMP TABLE _affected` collided with v1's still-live temp table.

**Blast radius:** v2's exception raised, which rolled back the ENTIRE transaction — including lifecycle + v1's `_snapshot_runs` INSERTs AND their DELETE + INSERT operations against the snapshot tables. So NO snapshots updated for July 1, and NO `_snapshot_runs` rows exist for that date. Dashboards were 1 day stale until manual recovery.

**Regression test blind spot:** the `_test` function variants shipped alongside Fix 2 wrote to SEPARATE scratch tables (`_v1_test`, `_v2_test`) and were called independently, not chained together via the orchestrator. So the ON-COMMIT-DROP-timing-across-stages scenario never materialized in test. The chain-in-one-transaction behavior only manifests when the production orchestrator runs both stages back-to-back.

**Fix:** migration `fix_2_temp_table_collision`. Added `DROP TABLE IF EXISTS _affected` (and defensively `_raw_ids`, `_journeys`) at the top of each function's inner BEGIN block. If the temp table exists from a prior stage in the same transaction, drop it first; otherwise no-op. `ON COMMIT DROP` still handles post-transaction cleanup.

**Recovery:** manual `refresh_full_attribution_chain(client_key)` per client. All 4 clients ran clean:
- adsforgood_prod: 1.2s, 0 rows (no new activity)
- not_so_cavalier: 0.08s, 0 rows (no new activity, no purchases ever)
- projectagram_reels: 0.1s, 0 rows (no new activity)
- eos_fabrics: ~4 min total (lifecycle 107s + v1 119s + v2 12s) — 209 canonical_v1 rows, 223 canonical_v2 rows, 514,322 lifecycle rows

**Lesson for future regression tests:** when function bodies share a transaction with sibling functions (via an orchestrator), test EACH ORCHESTRATOR PATH, not each function individually. The `_test` variants should have been called by a test-orchestrator that chains them in the same transaction — that would have surfaced this collision immediately.

**Lesson for the incremental pattern:** temp table names are shared across sibling function calls in the same transaction. Either (a) namespace them per-function (`_affected_v1`, `_affected_v2`) or (b) `DROP TABLE IF EXISTS` at the top of each function. Both work; we chose (b) because it's defensive without renaming.
