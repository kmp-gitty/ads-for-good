# DB connection & timeout runbook

Written after the Aug 28 2026 connection-exhaustion outage. Records what is set,
why, and the operational disciplines that a GUC can't enforce.

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
- **Recommended (not yet built):** a dedicated interactive login role with a
  tight `statement_timeout` (~60s), pointed at the replica, so "don't run heavy
  things on prod" becomes the default path instead of a rule to remember under
  pressure. `postgres` stays reserved for crons that actually need the headroom.
- Note: the Supabase MCP `execute_sql` connects to the **primary as `postgres`
  (30min)**. Treat it as read-only / catalog-only for production. Anything heavy
  goes to the replica by another path.

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
