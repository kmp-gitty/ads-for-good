// Per-client RLS-enforced DB access.
//
// Used by ingest routes (/api/purchase, /api/conversion, /api/identify, /api/alias,
// /api/consent, /api/offline, /api/chapter/collect) to open Postgres connections
// scoped to a single client_key via Row Level Security.
//
// Architecture (Fix #26 Part 2):
//   - Pool connects as `chapter_app` LOGIN role over the Supabase transaction-mode
//     pooler (port 6543).
//   - `chapter_app` has NOBYPASSRLS, NOINHERIT, and no direct table grants. It is
//     a member of every `client_*` role, but must `SET ROLE` to access tables.
//   - Per request, `withClient(clientKey, fn)` opens a transaction, runs:
//       SET LOCAL ROLE client_<key>;
//       SET LOCAL app.client_key = '<key>';
//     ...then `fn(tx)` runs with RLS filtering all queries to that client's rows.
//   - If a route forgets to call this helper and uses raw chapter_app queries,
//     permission is DENIED (loud failure) — not silent cross-tenant leak.
//
// Why a transaction pooler:
//   - SET LOCAL is bound to the transaction; pooler resets session state after COMMIT
//     so a stale SET ROLE can't leak to the next request that reuses the connection.
//   - Serverless-friendly: no long-lived session-pool baggage.

import postgres from "postgres";

const CONN = process.env.CHAPTER_APP_DATABASE_URL;
if (!CONN && process.env.NODE_ENV !== "test") {
  console.warn(
    "[per-client] CHAPTER_APP_DATABASE_URL not set — per-client DB calls will fail. " +
    "Set it in Vercel + .env.local (postgresql://chapter_app.<project>:<pw>@<pooler-host>:6543/postgres).",
  );
}

// Module-scope pool. Survives across lambda invocations as long as the function
// instance is warm.
//   - `prepare: false` because the transaction pooler doesn't persist prepared statements.
//   - `max: 1` because each Vercel function instance handles one request at a time;
//     more concurrency comes from spinning up more function instances, not more pool
//     connections per instance.
//   - `idle_timeout: 20` to release the connection back to the pooler when idle, so
//     a cold instance doesn't hold a pooler slot indefinitely.
let _pool: postgres.Sql | null = null;

export function getChapterAppPool(): postgres.Sql {
  if (_pool) return _pool;
  if (!CONN) {
    throw new Error(
      "CHAPTER_APP_DATABASE_URL is not set. Cannot open per-client connection.",
    );
  }
  _pool = postgres(CONN, {
    ssl: "require",
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return _pool;
}

// Whitelist of known client_keys. Defense in depth: if a client_key arrives via
// HMAC and somehow bypasses upstream validation, we still reject it here before
// constructing a `SET ROLE` SQL fragment.
//
// Maintain this set when onboarding new clients (must align with chapter_config.client_secrets
// + the per-client Postgres role created in DB).
//
// Pattern: each entry maps client_key -> role_name. Role name is always
// `client_<client_key>` by convention.
const CLIENT_ROLE_MAP: Record<string, string> = {
  eos_fabrics: "client_eos_fabrics",
  projectagram_reels: "client_projectagram_reels",
  adsforgood_prod: "client_adsforgood_prod",
};

export function isKnownClient(clientKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLIENT_ROLE_MAP, clientKey);
}

export function getClientRoleName(clientKey: string): string {
  const role = CLIENT_ROLE_MAP[clientKey];
  if (!role) {
    throw new Error(
      `Unknown client_key "${clientKey}" — no per-client Postgres role mapped. ` +
      `Add it to CLIENT_ROLE_MAP after creating the role in DB.`,
    );
  }
  return role;
}

// Strict client_key validator. SET LOCAL ROLE accepts only identifiers — we
// already constrain to known keys via CLIENT_ROLE_MAP, but enforce the format
// as well so a malicious key can't smuggle SQL via the role name.
const SAFE_CLIENT_KEY = /^[a-z][a-z0-9_]{0,63}$/;
function assertSafeClientKey(clientKey: string): void {
  if (!SAFE_CLIENT_KEY.test(clientKey)) {
    throw new Error(`Refusing unsafe client_key "${clientKey}"`);
  }
}

/**
 * Open a per-client transaction with RLS enforced.
 *
 * Inside `fn`, every query is filtered to the given client_key by Postgres RLS.
 * Reads return only that client's rows; INSERTs that don't have client_key set
 * to the expected value will fail the policy.
 *
 * Usage:
 *   await withClient("eos_fabrics", async (tx) => {
 *     await tx`INSERT INTO chapter_ingest.purchase_events (client_key, ...) VALUES (${clientKey}, ...)`;
 *   });
 *
 * Throws if client_key is unknown or unsafe.
 */
export async function withClient<T>(
  clientKey: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  assertSafeClientKey(clientKey);
  const roleName = getClientRoleName(clientKey);
  assertSafeClientKey(roleName.replace(/^client_/, "")); // belt + suspenders
  const sql = getChapterAppPool();
  // postgres-js types sql.begin's return as UnwrapPromiseArray<T> which TS can't
  // narrow to our generic T; cast through unknown to apply our caller's annotation.
  return sql.begin(async (tx) => {
    // SET LOCAL is bound to this transaction; the pooler clears it at COMMIT.
    // `roleName` is whitelisted (CLIENT_ROLE_MAP) and matches SAFE_CLIENT_KEY,
    // so .unsafe() is safe here.
    await tx.unsafe(`SET LOCAL ROLE ${roleName}`);
    await tx`SELECT set_config('app.client_key', ${clientKey}, true)`;
    return fn(tx);
  }) as unknown as Promise<T>;
}
