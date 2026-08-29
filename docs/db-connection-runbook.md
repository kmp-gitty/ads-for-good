# DB connection & timeout runbook

Written after the Aug 28 2026 connection-exhaustion outage. Records what is set,
why, and the operational disciplines that a GUC can't enforce.

## ⚠️ What is proven vs inferred (read this before trusting the rest)

The root cause was **never definitively proven.** Do not read the sections below
as established fact — the mitigations are weighted by how much evidence each has:

- **PROVEN (hard data):** connection-slot exhaustion was the failure *mechanism*
  (DB/PostgREST/Auth down, Realtime/Edge up; the query itself was always <0.1ms;
  requests waited for connections). And a **retry storm** happened — REST traffic
  climbed 762→8,850 req/hr, all failing, each holding a connection ~20s. The
  **circuit breaker is the fix for this observed behaviour.**
- **SUSPECTED (circumstantial):** the *trigger* was most plausibly heavy ad-hoc
  analytical queries run as `postgres` against the primary (a cluster of
  single-call 3–8 min queries in `pg_stat_statements` right at the 17:00
  boundary — including this author's own profiling). Not proven. Mitigated by the
  **routing discipline**, not a GUC.
- **INFERRED (insurance, not an observed fix):** the `idle_in_transaction=30s`
  timeouts. We never actually caught a leaked idle transaction — post-restart
  there were two, at 0.04s and 0.22s. They close the mechanism that best explains
  an 8-hour *duration* (a held connection with no reaper), but they address an
  inferred cause. Correct to ship; do not lean on them as "the fix."

The outage went **undetected for 8 hours** — nothing alerted; it was noticed only
because some n8n workflows failed. See the Alerting section — detection is the
only fix that generalises to the *next* outage, which will have a different cause.

## Current role timeout config (primary)

| Role | statement_timeout | idle_in_transaction | Set by / why |
|---|---|---|---|
| `anon` | 3s | (inherits) | Supabase default |
| `authenticated` | 8s | (inherits) | Supabase default |
| `authenticator` | 8s (+lock 8s) | **30s** | PostgREST login role — covers ALL API/dashboard/CRM reads (they SET ROLE from here). idle reaper added post-outage. |
| `service_role` | 60s | (via authenticator) | analytics RPCs legitimately run up to ~60s |
| `chapter_app` | **10s** | **30s** | ingest login role (pixel/collect + `/r`). Both added post-outage. |
| `postgres` | 30min | (none) | crons + snapshot builds legitimately run long. Left alone. |
| `supabase_admin` | (DB default 30min) | (none) | RESERVED / superuser-only — **cannot be modified by the customer.** |
| DB-level default | 30min | 0 (disabled) | `ALTER DATABASE postgres SET statement_timeout='30min'` |

We deliberately did **not** lower the DB-level `statement_timeout` default. Once
`chapter_app` has its own 10s, the 30min default only governs Supabase internal
roles (`supabase_admin`, storage, auth) that need the headroom for backups /
maintenance and that we cannot exempt (see reserved-role note). Lowering it is
pure downside — it would risk killing a long backup `COPY` with no benefit.

### ⚠️ New-role caveat
A role created **without** an explicit `statement_timeout` inherits the DB-level
**30min** silently. When adding any new ingest/app/tenant login role, set its
timeouts explicitly (mirror `chapter_app`: `statement_timeout=10s`,
`idle_in_transaction_session_timeout=30s`) — don't let it inherit 30min.

## The routing rule (the actual outage-trigger mitigation)

The most plausible **trigger** of the Aug 28 outage was heavy ad-hoc analytical
queries run **as `postgres` against the production primary**, which carries a
30-minute ceiling (cluster of single-call 3–8 min queries in pg_stat_statements
right at the 17:00 boundary). This is NOT fixable with a GUC — tightening
`postgres` would break the crons/snapshot builds that legitimately need 30 min.
It is a **routing** problem:

- **Ad-hoc, exploratory, EXPLAIN, incrementality reviews, MCP exploration →
  the READ REPLICA, never the primary.** The replica exists, is healthy (0 lag),
  and dashboard reads already route to it via `SUPABASE_REPLICA_URL` /
  `DATABASE_REPLICA_DIRECT_URL`. A runaway query there degrades reporting, not
  ingest.
- The primary is for **writes + crons only.**
- **Use the `chapter_explore` role for all interactive/ad-hoc work.** Created
  post-outage: `LOGIN`, member of `pg_read_all_data`, `default_transaction_read_only=on`,
  `statement_timeout=60s`, `idle_in_transaction=30s`, `lock_timeout=5s`, conn
  limit 5. It **cannot write and cannot run >60s** — so even if someone points it
  at the primary by mistake, the blast radius is one capped read. Pointed at the
  replica it's fully isolated from ingest. `postgres` stays reserved for crons
  that genuinely need the 30min headroom.
  - **Last mile (operator, one-time):** set a password —
    `ALTER ROLE chapter_explore PASSWORD '<strong-secret>';` (do this yourself;
    store it in your password manager, not in a repo) — then point psql / TablePlus
    / etc. at the **replica** direct host with this role:
    `postgresql://chapter_explore:<pw>@<replica-direct-host>:5432/postgres`
    (replica host is in `DATABASE_REPLICA_DIRECT_URL`). Make this your default
    saved connection so the safe path is the one already open.
- Note: the Supabase MCP `execute_sql` connects to the **primary as `postgres`
  (30min)**. Treat it as read-only / catalog-only for production. Anything heavy
  goes to the replica via `chapter_explore`.

## Honest weighting of the fixes (don't over-credit the inferred one)

- **Circuit breaker (pixel, shipped `ea473ac`) = the fix for what actually
  happened.** Hard data: the retry storm — 762 req/hr climbing to 8,850, all
  failing, each holding a connection ~20s. This is the observed mechanism.
- **`idle_in_transaction=30s` on `chapter_app` + `authenticator` = correct but
  INFERRED insurance.** We never observed a leaked idle transaction; post-restart
  there were two, at 0.04s and 0.22s. It closes the mechanism that best explains
  an 8-hour *duration* (a held connection with no reaper), but it addresses an
  inferred cause. Ship it, don't lean on it.
- **The trigger itself** (heavy ad-hoc queries on primary) is mitigated by the
  routing rule above, not by any timeout.

## Alerting (the only fix that generalises)

Every timeout/circuit-breaker fix addresses *this* outage. Detection is the only
thing that shortens the *next* one, which will have a different cause. The Aug 28
outage climbed for ~90 min and ran for 8h with **zero alerts**.

- **Connection utilization — built + live.** Cron
  `/api/internal/monitoring/connection-health` (every 5 min) calls the
  `public.chapter_connection_health()` function against the **primary** and posts
  to GChat (`postToGChat`) when any of: utilization ≥70% of the 90 slots; an
  idle-in-transaction ≥60s (the leak signature); a single active query ≥120s
  (runaway on primary). If the health call itself fails, that alerts too — a
  saturated primary is exactly when PostgREST can't get a connection. Saturation
  was the *mechanism* and it climbs before it breaks, so this is the leading
  indicator. Thresholds are consts at the top of the route.
- **5xx / 522 rate — enable Supabase's built-in alert (operator).** The HTTP error
  rate is not visible from SQL; the Aug 28 rate went 0 → hundreds/min in ~90 min,
  so any threshold catches it. Turn on Supabase project alerts for REST 5xx rate
  (Dashboard → Reports/Alerts). This complements the connection cron: one watches
  the DB, the other watches the edge.

## If it happens again — first checks (read-only)
```sql
-- connection pressure + the leak signature
select state, count(*),
  round(extract(epoch from max(now()-xact_start) filter (where state like 'idle in transaction%'))) as oldest_idle_txn_s,
  round(extract(epoch from max(now()-query_start) filter (where state='active'))) as longest_active_s
from pg_stat_activity where backend_type='client backend' group by state;

-- what's monopolising (heavy single-call queries)
select substring(query,1,80), calls, round(mean_exec_time) as mean_ms, round(max_exec_time) as max_ms
from pg_stat_statements order by max_exec_time desc limit 20;
```
