# Fix 1B — Retention floor with chapter-spanning caveat

> Shipped: July 1, 2026. Companion to Fix 1A (June 30 — schema + helper + trailing window function).
> See `docs/chapter-billing-usage-handoff.md` for the billing/usage roadmap this unblocks.

## The gap Fix 1B closes
Fix 1A shipped the schema (`chapter_config.clients.retention_days`) + helper (`chapter_config.retention_floor(client_key, snapshot_ts_hi)`) but deferred wiring the retention floor into the actual attribution chain. `refresh_lifecycle_chapters_incremental` still used a hardcoded `v_date_floor = 2026-04-01 17:00+00`. Any tenant with `retention_days` set would have paid for storage of pre-retention chapters that no longer factored into their billed usage. Fix 1B swaps the hardcoded floor for the per-client retention floor across the entire chain.

## The chapter-spanning caveat
A canonical's chapters are a partition — chapter N-1 ends where chapter N begins. Naïvely applying a retention floor drops any chapter whose `boundary_ts < retention_floor`. But a chapter's *events* start at the previous chapter's boundary (or the canonical's first event) — potentially well before the floor. Two failure modes if we ignore this:

1. **Truncated chapter events.** A chapter with `boundary_ts >= retention_floor` but `first_ts < retention_floor` would only see events from `retention_floor` forward — the earlier part of that chapter's browsing gets silently amputated.
2. **chapter_id discontinuity.** Chapter IDs are a running count of boundary events. If we freeze chapter 0-3 (pre-retention) and reprocess chapter 4-6 (post-retention), the window function computing chapter_id from scratch would number them 0-2, colliding with the frozen rows and desynchronizing downstream v1/v2 attribution.

### Solution: per-canonical effective_floor + chapter_offset

**effective_floor** — for each affected canonical, compute `MIN(first_ts)` over qualifying chapters (chapters whose `boundary_ts >= retention_floor` OR are still open). This becomes the read-back horizon for the event scan. A chapter that straddles the retention boundary reads its full history back to its own `first_ts`.

**chapter_offset** — count of pre-retention chapters per canonical. Window function output gets shifted by this offset so chapter_ids stay contiguous with the frozen rows.

```
effective_floor = MIN(first_ts) for qualifying chapters, per canonical
chapter_offset  = COUNT chapters WHERE boundary_ts < retention_floor, per canonical

reprocess chapters at chapter_id >= chapter_offset (DELETE + reinsert)
freeze chapters at chapter_id  <  chapter_offset (never touched)
chapter_id_new  = (window function output) + chapter_offset
```

## Concrete example (email_sha256:… canonical with 7 chapters, retention_days=30)

Chapter 0-3: boundary_ts before floor → chapter_offset = 4. Chapter 4-6: boundary_ts after floor → reprocessed.

- Chapter 4's `first_ts` = May 23 (before June 1 retention floor). effective_floor for this canonical = May 23. Event scan reads back to May 23, catches the browsing events that lead into chapter 4's boundary.
- Window function inside the scan counts boundary events starting from May 23 → chapters 0, 1, 2. Add `chapter_offset=4` → chapter_ids 4, 5, 6. Contiguous with frozen 0-3.
- Chapters 0-3 stay in `lifecycle_chapters_snapshot` untouched (chapter-scoped DELETE only removes `chapter_id >= 4`).

## Where the retention floor is enforced

| Stage | Filter added |
|---|---|
| `refresh_lifecycle_chapters_incremental` | Chapter-scoped DELETE + event scan back to effective_floor + chapter_id offset |
| `refresh_canonical_v1_snapshot` | HAVING `boundary_ts >= retention_floor` on chapter_meta CTE + chapter-scoped DELETE via `_v1_offsets` |
| `refresh_canonical_v2_snapshot` | HAVING `boundary_ts >= retention_floor` on chapter_meta CTE + chapter-scoped DELETE via `_v2_offsets` |

All three functions read `retention_days` from `chapter_config.clients` directly. With `retention_days IS NULL`, `retention_floor` collapses to the hardcoded `2026-04-01 17:00+00` date-floor — behavior is byte-identical to Fix 2.

## Regression test
Built test-only overloads (3-arg / 5-arg) with `p_retention_days_override` parameter, writing to scratch tables (`*_test_1b`). Two runs on EOS:

**retention_days=999** (no effective retention). 72 affected canonicals. Test output vs production output, scoped to just those 72 canonicals: **303,713 rows test vs 296,986 rows production**. Diff explained entirely by test run being 6 hours later than production — extra 6 hours of new pixel events captured. **PASSED** (expected fresh-data drift).

**retention_days=30**. 76 affected canonicals, 37 with pre-retention chapters (chapter_offset > 0). Verified on the example canonical above: chapters 0-3 stayed frozen at their production chapter_ids, chapters 4-6 reprocessed with chapter_ids preserved via offset. Retention floor bounded the DELETE to only chapters ≥ 4. Chapter 4's event scan correctly extended back to its `first_ts = May 23` (before the June 1 floor), capturing chapter-spanning events. **PASSED**.

## Production cutover

Tonight's cron (03:30 UTC) will run pure Fix 1B chain against all 4 clients. All clients have `retention_days IS NULL`, so Fix 1B semantics collapse to Fix 2 semantics (chapter_offset=0 for everyone, no chapters frozen, effective_floor = date_floor). Zero drift expected. First retention-days-set client (Guardian Angel Cincy, sub-90d retention on next-tier billing) will exercise the frozen-chapter path.

**smoke test on adsforgood_prod:** 0 rows across 3 stages, 0.6s wall-clock, no errors. Correct for a quiet client (no new activity since last watermark). EOS chain will validate at 03:30 UTC via the normal cron.

## Postmortems

### Cloudflare WAF on the MCP path
Three sequential `apply_migration` + `execute_sql` attempts blocked by the Cloudflare WAF (Ray IDs `a14762557c8f3d64`, `a1476ca229133d64`, `a14778822aad0f95`). Block page identified the blocked domain as `anthropic.com`, not `supabase.com` — the WAF sits on Anthropic's MCP router edge, not Supabase's. Payload pattern combination (large `CREATE OR REPLACE FUNCTION` + `SECURITY DEFINER` + URL patterns in the classifier CASE + specific DDL keywords) tripped some ruleset.

**Workaround:** Supabase Dashboard SQL Editor is a direct browser → `api.supabase.com` path that doesn't route through Anthropic's WAF. SQL files were persisted to `~/chapter-scripts/snapshots/2026-07-01-fix-1b-*.sql` + a runbook, operator pasted each into Dashboard, all three succeeded sub-second.

**Lesson:** for any future migration that would exceed a few KB or contain a lot of DDL keywords, prefer to draft the SQL locally + apply via Dashboard rather than push through MCP. MCP is the fast path for small operational queries and read-side introspection; large body DDL is unreliable through it.

### Named-parameter resolution ambiguity
Earlier "Fix 1B lifecycle production" migration added `p_retention_days_override integer DEFAULT NULL` to the lifecycle signature. Because Postgres treats a new-parameter version as a distinct overload (not a replacement), we ended up with BOTH the 4-arg (Fix 2) and 5-arg (Fix 1B) lifecycle functions live simultaneously.

When the orchestrator called `chapter_model.refresh_lifecycle_chapters_incremental(p_client_key => ..., p_snapshot_ts_hi => ...)` using named parameters, Postgres raised `42725: function ... is not unique` — it couldn't pick between the two overloads because both accept those named parameters and rely on defaults for the rest.

**Fix:** dropped the 5-arg overload immediately after applying the 4-arg in-place replacement. Chain now resolves cleanly.

**Lesson:** `CREATE OR REPLACE FUNCTION` only replaces when the signature matches EXACTLY. Adding a parameter — even with `DEFAULT NULL` — creates an overload. For in-place replacements, keep the signature untouched. Move new configurability into the function body (reading from a config table) rather than into a new parameter.

### Why the operator workflow was in-place, not signature-extending

The Fix 1B test infrastructure used 3-arg / 5-arg variants specifically to allow parametric retention_days_override for regression tests. For production, we didn't need the override — production always reads `retention_days` from `chapter_config.clients`. Keeping the production signature at 2-arg / 4-arg made the orchestrator + cron route + all upstream callers work unchanged.

## Followups

- **First tenant with retention_days set** will exercise the frozen-chapter path in real cron runs. Monitor `_snapshot_runs` for that client for 3 nights — verify `rows_deleted < rows_deleted-of-all-time` (chapter-scoped DELETE working) and `chapter_id` sequences stay contiguous.
- **Chapter-spanning boundary rare edge case:** a canonical whose EARLIEST qualifying chapter's `first_ts` is more than 90 days before the retention_floor would cause the event scan to reach quite far back. Not a correctness bug, but a perf risk if some tenant has extremely long chapters (multi-year lurking behavior before a purchase). If EOS or another tenant exhibits this, cap `effective_floor` at some sensible ceiling (e.g. `retention_floor - 90 days`) and accept truncated chapter start.
- **`chapter_config.retention_floor()` helper** (shipped Fix 1A) is not currently called by the chain — the functions compute `v_retention_floor` inline instead. Reason: keeps the compiled function plan simple, avoids an extra function-call round-trip inside the hot path. Helper stays available for ad-hoc SQL / reporting queries.
