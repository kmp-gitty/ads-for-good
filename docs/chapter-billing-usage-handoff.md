# Chapter — Billing & Usage Tracking + Attribution-Chain Fix (Claude Code Handoff)

> **What this is:** a build document for three pieces of work, in priority order: (1) fix the `canonical_v1/v2` rebuild before it hits a cron timeout, (2) codify the re-based pricing tiers + bot/fair-use model, (3) build a per-client usage/cost tracker surfaced on a new Billing page.
> **Status:** spec only — no build started. Decisions are locked; numbers anchored on EOS Fabrics (the only client with real human volume — see §5 for the measured baseline) and should be re-validated as Growth-sized clients onboard.
> **Project:** Supabase `bvvmmhekdgskeilczeuy`. Repo: the shared Next.js app (Chapter lives alongside the Ads for Good agency site — don't touch agency pages).
> **Source:** cost-analysis session June 29–30, 2026 (May 23–Jun 22 invoices + live queries).

---

## Priority 1 — Fix the attribution chain (do this first; there's a ~2-week clock on it)

### The problem, measured
The nightly chain `chapter_reporting.refresh_full_attribution_chain(client_key)` runs three stages: `lifecycle_chapters` (already incremental), then `canonical_v1`, then `canonical_v2`. For EOS the chain is **~497s and growing ~7–11s/day** — heading for the `refresh-attribution-chain` cron's `maxDuration` ceiling (600–800s) in **~2 weeks to ~1.5 months, with no new clients added.** Root cause: `canonical_v1` and `canonical_v2` are **all-time full rebuilds** — they `DELETE` every row for the client and re-scan all accumulated `pixel_events` / `lifecycle_chapters_snapshot` every night. Cost grows with cumulative data forever (ingest is append-only, never pruned). `lifecycle_chapters` doesn't have this problem because it only reprocesses *changed* canonicals.

### The fix in one sentence
Make `canonical_v1` and `canonical_v2` incremental the same way `lifecycle_chapters` already is — reprocess only the canonicals that changed tonight, not the whole client — and (phase 2) cap how far back any single canonical is re-read to the client's retention window.

### Fix 2 first (incremental scope — this is the big win, low risk)
This is sequenced before Fix 1 because it removes the dominant cost (breadth: processing *all* canonicals) with no correctness risk, whereas Fix 1 (depth) needs more care.

- **The affected-canonical set is already available for free.** When `lifecycle_chapters` runs in a given chain invocation, it stamps every row it (re)writes with that run's `snapshot_ts_hi`. So "the canonicals that changed tonight" = the distinct `canonical_identity_key`s in `lifecycle_chapters_snapshot` carrying the current run's `snapshot_ts_hi`. No new parameters, no recomputation — `canonical_v1/v2` just read this set at the top.
- **`canonical_v1` changes:** (a) replace the blanket `DELETE WHERE client_key = X` with a delete scoped to the affected canonicals only; (b) scope the pixel re-sessionization so it only reads events belonging to affected canonicals (map affected canonicals → their `identity_key`s via `identity_canon` → their journeys, the same mapping `lifecycle` builds in its `_opt_b_raw_ids` temp); (c) scope the `chapter_meta` read of `lifecycle_chapters_snapshot` to affected canonicals; (d) insert only the affected rows. Dormant canonicals keep their existing rows untouched (frozen) — that's the intended behavior and it's why dashboard depth is unaffected.
- **`canonical_v2` changes:** same shape — scope the `DELETE` and the `chapter_meta` read to affected canonicals, keep the existing `LEFT JOIN` to `canonical_v1` (which is now freshly rebuilt for exactly those canonicals), insert only affected rows.
- **Safety property:** both functions reprocess *whole* canonicals (all of a canonical's chapters/sessions), just far fewer of them — so there's no partial-chapter or path-truncation risk. On a mature client most canonicals are dormant on any given night, so this should collapse v1+v2 from ~432s to tens of seconds.
- **Preserve the existing `_snapshot_runs` bookkeeping** (the `running`/`ok`/`failed` row each function writes) — the usage tracker and the daily-digest freshness checks depend on it.

### Fix 1 second (retention boundary — caps history depth)
Both `lifecycle` and `v2` currently use a hardcoded floor `v_date_floor = '2026-04-01 17:00:00+00'`, meaning every reprocessed canonical is re-read from the dawn of data. Replace that hardcoded floor with a **rolling, per-client retention floor** = `snapshot_ts_hi − retention_window`, clamped to the absolute data floor.

- **Add per-client config:** `chapter_config.clients` currently has **no tier and no retention column** — add `tier` (standard/growth/pro) and `retention_days` (30/60/180 incl. the $99 add-on). Default existing clients to their current tier; backfill retention from tier.
- **Chapter-spanning caveat (important):** don't hard-cut event reads mid-chapter, or a chapter that began before the floor but converts inside the window gets a truncated path. Anchor reads to the *chapter's* `first_ts` for any canonical still being retained, and only fully stop reprocessing canonicals whose entire activity is older than the retention floor. Frozen older rows stay in place.
- Fix 1 is a smaller win than Fix 2 (depth matters less than breadth here) and carries the correctness nuance above, so ship Fix 2, confirm the regression, then layer Fix 1.

### Before building
- **Read `vercel.json` and confirm the real `refresh-attribution-chain` `maxDuration`.** The 600–800s ceiling is inferred from CLAUDE.md, not verified. If it's lower, the cliff is closer than two weeks.
- **Regression test (gating):** for EOS, the incremental v1/v2 must produce **identical row counts and identical `channel_path` values** to a full rebuild on the same `snapshot_ts_hi`. Run the existing full-rebuild once into a scratch copy, run the new incremental, diff. CLAUDE.md's prior regression baselines: EOS canonical_v1 ≈ 1,000 rows, canonical_v2 fed downstream identically. Don't ship until the diff is clean.
- Keep the orchestrator signature unchanged so the cron route and `vercel.json` need no edits.

---

## Priority 2 — Pricing model (decisions locked)

### New tiers — ADOPTED (prices unchanged, ceilings re-based to human-likely journeys)
The meter switches from raw journeys to **human-likely journeys only**. Because human journeys carry ~67 events each vs ~1 for the stripped junk, each tier now admits *more* real analytical load than the old raw ceiling did — these are not raw ÷ 3.

| Tier | Price/mo | Ceiling (human-likely journeys) | Old (raw) |
|---|---|---|---|
| Standard | $149 | 25,000 | 25K |
| Growth | $399 | 75,000 | 100K |
| Pro | $799 | 150,000 | 200K |
| 180-day retention add-on | +$99 | — | — |

EOS at ~12.8K human/mo = Standard ($149). **Margin is never the constraint** (all tiers ~90% gross); the lever was always capacity, not price.

- **`VALIDATE AFTER FIX 1+2`:** Growth/Pro at these levels are **not serveable on today's architecture** — a 75K-human client implies a nightly chain past the cron ceiling. Standard/25K is fine now. After the fix, measure chain-seconds per human-journey and confirm the ceilings sit at ~60–70% of the real cliff before treating them as final. These numbers are EOS-anchored (n=1).
- **Billing window:** bill on a trailing 2–3 month average (or peak-with-grace), not the instantaneous month — EOS swings ~13K–36K seasonally and would otherwise flap between tiers.

### Bot handling — DECIDED
- **Bill on `human_likely` only.** `suspect` + `bot_likely` are **excluded from the tier calculation**, framed as *scope, not a dollar credit* (never use the word "credit" — it implies a redeemable rate).
- **Show all three classes** on the Billing page as good-faith justification, with suspect/bot presented as a value-add ("we filtered N junk sessions so your attribution stays clean"). Client never needs to know these cost essentially nothing.
- **Why it's free to exclude them:** suspect+bot are ~67% of EOS journeys but only ~3.6% of events, and `canonical_v1` already filters them out of the expensive rebuild (it only processes `bot_class IN ('human_likely','suspect')`). Total cost of all ~26K of them ≈ $0.10–0.30/mo.

### Fair-use ceiling — DECIDED
- Public anchor stays **journeys**. Internal cost metric is **analyzed events** (compute+storage proxy), tracked but never the public headline.
- Each tier carries an internal **fair-use allowance of ~100 events/journey** (EOS blended ~45, so it sits <50% of its own allowance — only a pathological client trips it). It's a circuit-breaker that triggers a tier-up *conversation*, never an automatic per-event charge.
- **Contract framing:** recessed near the AUP, not in the rate table. Draft language: plan includes up to [25K/75K/150K] real customer journeys/mo plus a fair-use allowance averaging ~100 events/journey measured monthly; "typical implementations fall well within this"; sustained excess triggers an outreach about the right plan; no automatic per-event charges. Define "real customer journey = a session classified `human_likely` by Chapter's traffic-quality model (vN)."

### Classifier is now billing-critical — BLOCKER for billing
- Once `bot_class` decides a client's tier, the classifier is revenue logic. **Pin and version it**, and record the classifier version on every billing snapshot so a threshold change can't silently re-tier someone.
- **Investigate the drift:** April was 61.7% `bot_likely`; the May 23–Jun 22 window is 0.7% `bot_likely` / 66.3% `suspect`. Resolve (thresholds moved? traffic changed?) before billing depends on it.

---

## Priority 3 — Usage/cost tracker + Billing page

### Storage: nightly snapshot table
New table `chapter_reporting.usage_snapshot`, **one row per client per night**, upserted by the nightly chain after the attribution stages finish (it can read the stages' durations straight out of `_snapshot_runs`). History is just rows by date — the "headroom-to-cliff" trend chart becomes a single query. Group the columns as:

- **Identity:** snapshot_date, client_key, tier, classifier_version.
- **Usage (client-facing):** human-likely / suspect / bot / raw journey counts MTD; events MTD; avg events per human journey; tier journey ceiling; **journey utilization % (computed on human-likely vs ceiling)**.
- **Health (internal):** nightly chain seconds; **chain headroom % vs the cron ceiling** (the early-warning metric); cumulative events; estimated disk bytes.
- **Cost (internal):** the three buckets below + attributable total, allocated overhead share, fully-loaded total, tier price, gross margin %.

### Cost model
- **Three vendor-neutral buckets** (display names; never show vendor names or dollars to clients):
  - **Storage** = the database layer (compute-hours + disk + egress + IPv4). *Note for internal use: this is mostly compute and is the biggest bucket — the real analytical work lives here, despite the "Storage" label.*
  - **Visualization** = the app layer (dashboard delivery + cron execution + ingest functions).
  - **Analysis** = the AI layer (findings/recommendations). Smallest bucket (~$0.37/mo) — the AI only writes up findings; the analysis math is in "Storage."
- **Attribution rules:** directly attribute the marginal costs a client causes (their disk, their burst seconds, their invocations, their tokens). Allocate the shared/fixed costs (instance-hours, plan fees, IPv4) **usage-weighted by each client's share of nightly burst-seconds** — NOT an even split — so the heavy client bears the instance cost it actually drives and the tracker reveals who's the reason you'd need a bigger box. **Vercel Build CPU is dev overhead — never attribute it to a client.**
- **Rate card** lives as an effective-dated constant the cron applies (rates change; version it). Verified rates from the May 23–Jun 22 invoices: Supabase compute Small $0.0206/instance-hr (×2 for replica), disk $0.000171/GB-hr, IPv4 $0.0055/hr, egress $0.09/GB over 250GB, $10/mo compute credit, Pro base $25; Vercel Pro $20, Fluid memory ~$0.0037/GB-hr, Fluid CPU ~$0.048/hr, invocations ~$0.155/M, fast origin transfer ~$0.035/GB; Anthropic per-token, tagged per client.
- **Monthly reconciliation:** sum of per-client modeled cost should ≈ the real invoice total; drift means the rate card or allocation is stale.

### Billing page (UI)
- New **"Billing"** link in the client dashboard sidebar **under Support → Inbox** (mirror how the Inbox page is gated/built).
- **Phase 1 (this build): transparency view only** — journeys analyzed, events/journey, tier + utilization %, and the class breakdown. No costs, no vendor names.
- **Phase 2 (later):** invoices.
- **Class-breakdown layout (EOS reference):** a small table — Real customer journeys (human-likely) — counts toward plan; Low-signal sessions (suspect) — excluded; Filtered bot traffic — excluded; Total processed. Plus a line: "Your plan: Standard — up to 25,000 real customer journeys/mo. You're at 12,828 (51%). We processed 26,027 additional sessions this month and **excluded them from your plan**, so you're only assessed on verified customer activity."

---

## §5 — Measured baseline (June 29–30 session, for validation)

**Per-client nightly burst (avg Jun 15–29) + scale:**

| Client | Burst s/night | Raw journeys/30d | Cumulative journeys | Cumulative events | Events/journey |
|---|---|---|---|---|---|
| eos_fabrics | 437.8 | 38,855 | 947,932 | 5,936,595 | ~45.6 |
| adsforgood_prod | 4.3 | 164 | 860 | 8,658 | ~10 |
| not_so_cavalier | 0.6 | 367 | 731 | 7,985 | ~9 |
| projectagram_reels | 2.9 | 204 | 328 | 4,867 | ~15 |

**EOS bot classification (May 23–Jun 22):** human_likely 12,828 journeys (33.0%) / 858,267 events (96.4%) / 66.9 ev-per-jrny · suspect 25,744 (66.3%) / 31,272 (3.5%) / 1.2 · bot_likely 283 (0.7%) / 832 (0.1%) / 2.9.

**Chain growth (the cliff):** EOS chain regression — 117s per 1M cumulative events (r=0.71, slightly super-linear); EOS adds ~57K events/day; chain ~497s on Jun 29 (lifecycle 65 + v1 213 + v2 219), growing ~7–11s/day.

**Invoice decode (May 23–Jun 22):** Supabase $62.16 total — Pro $25, primary compute $5.33 (after $10 credit), replica compute $15.33, IPv4 $8.18, disk $3.71, egress $0. Vercel $51.53 total — Pro $20, **Build CPU $19.87 (the build tax, ~80–90% evaporates in steady state)**, Fluid memory $5.68, Fluid CPU $1.22, invocations $0.60, origin transfer $0.30. Anthropic $0.37/30d. Build tax is $0 on Supabase (instance-hours, not query-volume) and ~$19/mo on Vercel.

**Per-client all-in at 8-client production:** ~$27–41/client (~$40 if ecommerce-heavy, ~$26–30 mixed) — Storage ~$20–33, Visualization ~$6–7, Analysis <$1. This is a pre-warehouse-migration ceiling (the documented Supabase→BigQuery/Snowflake split triggers when compute add-ons exceed the warehouse alternative).

**Account hygiene:** Supabase bills to katoa@ads4good.com / "Ads for Good"; Vercel bills to katoa.ahau@gmail.com / "Katoa Price-Ahau's projects." Consolidate onto the business entity.

---

## Build order
1. **Fix 2** (incremental v1/v2) — regression-test against full rebuild on EOS — ship. *(Clears the cliff.)*
2. **Fix 1** (per-client `tier` + `retention_days` columns + rolling retention floor, chapter-aware) — ship.
3. Re-measure chain-per-human-journey; **validate the 25/75/150K ceilings** at ~60–70% of the new cliff.
4. Pin + version the classifier; investigate the April–June drift. *(Billing blocker.)*
5. Build `chapter_reporting.usage_snapshot` + nightly upsert (burst-weighted allocation, effective-dated rate card, monthly reconciliation).
6. Build the Billing page (Support → Inbox), Phase 1 transparency view.
7. Decide + implement the trailing-average billing-window rule.
8. Codify the fair-use clause + `human_likely` definition in contract templates.
9. Consolidate Vercel/Supabase billing onto one entity.
