# Fix #26 — Multi-tenant isolation hardening

> **Status:** Parts 1 + 4 implemented (May 12, 2026). Parts 2 + 3 designed below — pending implementation.
> **Authored:** 2026-05-12
> **Audience:** Internal — Chapter team & future employees.
> **Why:** Required before signing the dentist or school accounts (compliance + data isolation).

---

## Summary of all four parts

| Part | Description | Status |
|---|---|---|
| 1 | Leading `client_key` indexes on per-client tables | ✓ done (May 12) |
| 2 | Row Level Security policies on per-client tables | ⏳ designed below |
| 3 | Per-client API keys (independent rotation/revocation) | ⏳ designed below |
| 4 | Audit logging on auth attempts | ✓ done (May 12) |

Parts 2 + 3 are interdependent — part 2 (RLS) is meaningful only when app-tier connections use scoped roles (part 3 implications). Order matters.

---

## Part 1 — Indexes (done)

**Audit found 6 tables in `chapter_reporting` with NO indexes** (all post-Fix-#10 reporting snapshot caches):

- `eos_purchase_base_snapshot_v1`
- `eos_purchase_touch_summary_snapshot_v1`
- `eos_purchase_fallback_snapshot_v1`
- `eos_purchase_channel_final_snapshot_v1`
- `eos_filtered_purchases_v1`
- `eos_filtered_purchase_channels_v1`

For single-client (~450 rows each), seq scans are sub-millisecond — no impact yet. For multi-tenant, every query without an index would scan ALL clients' rows.

**Applied:** single-column `(client_key)` leading indexes via `snapshots/2026-05-12-fix-26-part1-client-key-indexes.sql`.

All other 13 per-client tables (`chapter_ingest.*`, `chapter_identity.*`, `chapter_journey.*`, `chapter_model.*`, `chapter_attribution.*`) already have leading `client_key` indexes — coverage was good.

Future tuning: add multi-column variants like `(client_key, purchase_ts)` or `(client_key, canonical_identity_key, chapter_id)` when actual multi-tenant query patterns emerge.

---

## Part 4 — Audit logging (done)

**New schema `chapter_audit`** for operational/security audit logs (separate from `chapter_reporting`'s dashboard focus). Table `chapter_audit.api_auth_attempts` captures every HMAC auth attempt with:
- `endpoint` — `/api/purchase`, etc.
- `client_key` — claimed key (may be invalid)
- `success` — boolean
- `failure_reason` — `missing_client_key` / `unknown_client` / `missing_signature` / `invalid_signature` / `missing_shopify_secret` / `missing_shopify_hmac` / `invalid_shopify_hmac`
- `ip_hash` — SHA-256 of source IP (no raw IP per GDPR)
- `user_agent_snippet` — first 200 chars of UA
- `request_id` — optional correlation

Indexes: by-time, by-client-then-time, partial-index-for-failures-only (security-interesting subset).

**Wired into 4 endpoints (all HMAC-protected):**
- `/api/purchase`
- `/api/conversion`
- `/api/shopify/webhooks/orders-create`
- `/api/shopify/webhooks/orders-cancelled`

**Not wired:** pixel `/api/chapter/collect` — would generate one audit row per pixel event (50k+/day), too noisy. Pixel endpoint has different security model anyway (CORS-only, can't HMAC from browser).

Helper at `src/app/lib/audit/auth.ts`. Errors in logging never block requests (caught + console.error'd).

---

## Part 3 — Per-client API keys (designed, not implemented)

### Current state

`AFG_CLIENT_SECRETS_JSON` env var holds one JSON dict mapping `client_key → HMAC_secret`. To rotate ONE client's secret: re-deploy with updated dict. To revoke: same. Both clients-share-one-redeploy: not independent.

### Target state

Move secrets to a database table with metadata for independent lifecycle.

```sql
CREATE TABLE chapter_config.client_secrets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key      text NOT NULL,
  secret_hash     text NOT NULL,            -- SHA-256 of secret (constant-time compare later)
  key_version     int  NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  rotated_at      timestamptz,              -- when this key was deprecated for new use
  revoked_at      timestamptz,              -- when this key was hard-revoked
  notes           text                      -- "rotation reason", etc.
);

CREATE INDEX client_secrets_client_active_idx
  ON chapter_config.client_secrets (client_key)
  WHERE revoked_at IS NULL;
```

### Lookup logic (replaces `getClientSecret`):

```typescript
async function getActiveClientSecrets(client_key: string): Promise<string[]> {
  // Returns ALL non-revoked secrets for a client, ordered newest first.
  // Allows overlap window during rotation: new + old both work until old is revoked.
  // Caller (auth check) tries each in turn with timingSafeEqual.
}
```

### Rotation flow

1. **Add new secret:** INSERT new row with same `client_key`, fresh secret, `key_version = max + 1`. Both old and new now valid.
2. **Inform client:** they update their integration to use new secret.
3. **Mark old as rotated:** SET `rotated_at = now()`. Both still work; old is "deprecated."
4. **Hard revoke old:** SET `revoked_at = now()`. Only new works.

### Migration plan

1. Create table.
2. Backfill from `AFG_CLIENT_SECRETS_JSON` (one row per client_key).
3. Update auth helpers in `/api/purchase`, `/api/conversion`, Shopify webhooks to read from the table instead of env var. Cache lookups for perf (5-min TTL).
4. Once all routes migrated and verified, drop `AFG_CLIENT_SECRETS_JSON` from Vercel env.

### Security considerations

- Store SHA-256 hashes, not plaintext secrets. App computes HMAC with the *plaintext* secret which must be retrievable somehow.
- **OR:** store plaintext secrets but encrypt with a KMS key. Trade-off: more infra, but plaintext access for HMAC computation.
- For first iteration: store plaintext (simpler), restrict table access to `service_role` only (already standard). Revisit with KMS when compliance review demands it.

---

## Part 2 — Row Level Security (designed, not implemented)

### Current state

All routes use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS by default. Adding RLS policies today wouldn't help — service role still scans everything.

### Target state

Two-tier connection model:
1. **Service role** — used by trusted server-side jobs (snapshot loaders, `run-snapshot.js`, monitoring routes). Bypasses RLS. Same as today.
2. **Per-client app role** — a Postgres role per client (`client_eos_fabrics`, `client_dentist_acme`, etc.) used by request-handling code. RLS policies restrict each role to its own `client_key`.

### RLS policy shape

```sql
ALTER TABLE chapter_ingest.pixel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY pixel_events_per_client
  ON chapter_ingest.pixel_events
  USING (client_key = current_setting('app.client_key', true));

-- Service role bypass (default RLS behavior — service_role has BYPASSRLS)
```

### Connection routing

Routes that handle inbound client requests (pixel collect, purchase, conversion, webhooks):
1. Resolve `client_key` from request (HMAC verification, etc.).
2. Open a Postgres connection AS the per-client role:
   ```sql
   SET ROLE client_eos_fabrics;
   SET app.client_key = 'eos_fabrics';
   ```
3. All subsequent queries are RLS-restricted to that client.

This means an attacker who somehow bypasses the HMAC check still can't access another client's data — RLS enforces isolation at the DB level.

### Practical concerns

- **Connection pooling:** PgBouncer needs `SET ROLE` per session. Direct connections handle this naturally.
- **Performance:** RLS adds a WHERE clause to every query. At our indexes (post-part-1), negligible.
- **Migration risk:** if a route forgets to `SET ROLE` or sets wrong client_key, it either scans nothing (if RLS is set up correctly) or scans wrong client. Need careful testing.

### Rollout plan

1. Create per-client Postgres roles (one per active client).
2. Add RLS policies (initially permissive — allow all, log everything via part 4 audit).
3. Enable RLS on tables one at a time, starting with `chapter_ingest.*` (most exposed).
4. Migrate routes to use per-client role connections, one route at a time, validating with audit logs.
5. Tighten policies once stable.

---

## Open questions

1. **Per-client Postgres roles** — should they be created manually per client onboarding, or auto-provisioned via a function? Auto is nicer at scale, manual is safer for first iteration.
2. **Secret caching** — how long to cache `client_secrets` lookups in the app? 5 min default; too long means slow rotations.
3. **Audit table retention** — `chapter_audit.api_auth_attempts` will grow forever. Add `pg_cron` job to archive >90d rows to S3? Or just truncate >180d?
4. **Pixel endpoint hardening** — origin-check + rate-limit is OK for now. Future: per-client public key + nonce + timestamp validation. Out of scope for this fix.

---

## Why this matters (one paragraph)

Today's setup works because Chapter has one client. The moment a second client lands, every query that *should* filter by `client_key` but doesn't (or has a bug, or is exploited) becomes a data leak. Parts 1 + 4 fix the cheapest layer (indexes + observability). Parts 2 + 3 fix the architectural layer (defense in depth, independent rotation). All four together are the minimum bar for signing the dentist or school — both will ask "show me your tenant isolation story."
