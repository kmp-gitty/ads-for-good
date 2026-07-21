// Chapter-user lookup helpers — wrap chapter_config.users queries with
// strong types + per-request caching. Used by middleware, server components,
// and the auth callback to resolve a Supabase user into a Chapter role.
//
// "Chapter user" = a row in chapter_config.users. The Supabase auth.users row
// only proves identity (this email controls this inbox); the chapter_config
// row is the actual allowlist + role + (client_key | agency_key).
//
// Three roles after Sprint 7:
//   - chapter_staff    — Ads for Good / Chapter team. Global access.
//   - agency_operator  — Agency partner. Scoped to their agency_key.
//   - client_employee  — Direct Chapter client employee. Scoped to client_key.
//
// The DB-level users_role_scope_check enforces:
//   chapter_staff    → agency_key IS NULL AND client_key IS NULL
//   agency_operator  → agency_key IS NOT NULL AND client_key IS NULL
//   client_employee  → client_key IS NOT NULL (agency_key NULL)

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "./supabase-server";
import { randomBytes } from "crypto";

export type ChapterUserRole = "chapter_staff" | "agency_operator" | "client_employee";

export type ChapterUser = {
  id: string;
  user_id: string | null;
  email: string;
  role: ChapterUserRole;
  client_key: string | null;
  agency_key: string | null;
  revoked_at: string | null;
};

const USER_SELECT = "id, user_id, email, role, client_key, agency_key, revoked_at";

// Lookup by email. Used at login time, BEFORE the user has a Supabase session.
// Lowercased server-side; the unique index on lower(email) handles equality.
export async function findChapterUserByEmail(email: string): Promise<ChapterUser | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("users")
    .select(USER_SELECT)
    .ilike("email", email.trim())
    .is("revoked_at", null)
    .maybeSingle();
  if (error) {
    console.warn("[chapter-user] findByEmail failed:", error.message);
    return null;
  }
  return (data as ChapterUser) ?? null;
}

// Lookup by Supabase auth.users.id. Used by middleware on every authenticated
// request to resolve the current session into a Chapter role.
export async function findChapterUserByAuthId(authUserId: string): Promise<ChapterUser | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("users")
    .select(USER_SELECT)
    .eq("user_id", authUserId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) {
    console.warn("[chapter-user] findByAuthId failed:", error.message);
    return null;
  }
  return (data as ChapterUser) ?? null;
}

// Called from the auth callback the first time a user clicks a magic link.
// Sets chapter_config.users.user_id to the Supabase auth.users.id so future
// lookups can resolve by session.user.id without a per-request email lookup.
export async function linkChapterUserToAuthId(
  chapterUserId: string,
  authUserId: string,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .schema("chapter_config")
    .from("users")
    .update({ user_id: authUserId, last_login_at: new Date().toISOString() })
    .eq("id", chapterUserId);
  if (error) {
    console.warn("[chapter-user] linkToAuthId failed:", error.message);
  }
}

// Touched on each successful auth callback so we can show "last seen" in
// future admin UI without per-request writes.
export async function touchLastLogin(chapterUserId: string): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  await supabase
    .schema("chapter_config")
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", chapterUserId);
}

// ─── Client → agency_key resolver (cached) ──────────────────────────────────
//
// canAccessClient needs to know a client's agency_key to scope agency_operator
// access. We cache the (client_key → agency_key) map for 5 min so the
// middleware doesn't fire a DB query per authenticated request. The cache is
// per-lambda; agency_key changes propagate within 5 min, which is acceptable
// for an admin-frequency operation.

type ClientAgencyEntry = { agency_key: string | null; fetched_at: number };
const CLIENT_AGENCY_TTL_MS = 5 * 60 * 1000;
const clientAgencyCache = new Map<string, ClientAgencyEntry>();

export async function getClientAgencyKey(client_key: string): Promise<string | null> {
  const cached = clientAgencyCache.get(client_key);
  const now = Date.now();
  if (cached && now - cached.fetched_at < CLIENT_AGENCY_TTL_MS) {
    return cached.agency_key;
  }
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("agency_key")
    .eq("client_key", client_key)
    .maybeSingle();
  if (error) {
    console.warn("[chapter-user] getClientAgencyKey failed:", error.message);
    return null;
  }
  const agency_key = (data?.agency_key as string | null) ?? null;
  clientAgencyCache.set(client_key, { agency_key, fetched_at: now });
  return agency_key;
}

// ─── Access predicates ──────────────────────────────────────────────────────

// Returns true if a Chapter user is allowed to access a route group scoped
// to the given client_key.
//   chapter_staff    → always (global access)
//   client_employee  → only their own client_key
//   agency_operator  → only clients whose agency_key matches theirs
// Async because the agency_operator branch may need a DB lookup for the
// client's agency_key (cached).
export async function canAccessClient(user: ChapterUser, clientKey: string): Promise<boolean> {
  if (user.revoked_at) return false;
  if (user.role === "chapter_staff") return true;
  if (user.role === "client_employee") return user.client_key === clientKey;
  if (user.role === "agency_operator") {
    if (!user.agency_key) return false; // DB CHECK prevents this, but belt-and-suspenders
    const clientAgencyKey = await getClientAgencyKey(clientKey);
    return clientAgencyKey !== null && clientAgencyKey === user.agency_key;
  }
  return false;
}

// Returns true if the user can access the global /chapter/* surface (no
// specific client_key in path). Chapter staff only — agency operators are
// scoped to their agency's clients, not the global dashboard.
export function canAccessGlobal(user: ChapterUser): boolean {
  return !user.revoked_at && user.role === "chapter_staff";
}

// ─── Accessible-clients list (for sidebar scoping) ──────────────────────────
//
// Returns the list of client_keys this user can access. Used by the sidebar
// client switcher to filter the dropdown for agency_operator.
export async function listAccessibleClientKeys(user: ChapterUser): Promise<string[]> {
  if (user.revoked_at) return [];
  if (user.role === "chapter_staff") {
    // Returns ALL client_keys. Cached at this layer would be premature; the
    // (authed) layout fetches once per request which is fine.
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .schema("chapter_config")
      .from("clients")
      .select("client_key");
    if (error) {
      console.warn("[chapter-user] listAccessibleClientKeys (staff) failed:", error.message);
      return [];
    }
    return (data ?? []).map((r: { client_key: string }) => r.client_key);
  }
  if (user.role === "client_employee") {
    return user.client_key ? [user.client_key] : [];
  }
  if (user.role === "agency_operator") {
    if (!user.agency_key) return [];
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .schema("chapter_config")
      .from("clients")
      .select("client_key")
      .eq("agency_key", user.agency_key);
    if (error) {
      console.warn("[chapter-user] listAccessibleClientKeys (agency) failed:", error.message);
      return [];
    }
    return (data ?? []).map((r: { client_key: string }) => r.client_key);
  }
  return [];
}

// ─── Domain allowlist (auto-provisioning) ──────────────────────────────────
//
// findAllowedDomainForEmail looks up an active row in
// chapter_config.allowed_email_domains for the email's domain. Returns the
// "first" matching row (lowest priority wins ties; ORDER BY created_at ASC).
// In practice one domain rarely has more than one rule.

export type AllowedDomainRule = {
  id: string;
  domain: string;
  role: "agency_operator" | "client_employee";
  agency_key: string | null;
  client_key: string | null;
};

export async function findAllowedDomainForEmail(
  email: string,
): Promise<AllowedDomainRule | null> {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("allowed_email_domains")
    .select("id, domain, role, agency_key, client_key")
    .eq("domain", domain)
    .is("revoked_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[chapter-user] findAllowedDomainForEmail failed:", error.message);
    return null;
  }
  return (data as AllowedDomainRule) ?? null;
}

// Provisions a chapter_config.users row from a matching domain rule. Called
// from the magic-link callback when an authenticated email has no exact-match
// users row but its domain is allowlisted.
//
// Returns the newly-created ChapterUser, or null if no domain rule matched
// (caller should sign the user out + redirect with not_allowlisted).
export async function provisionFromDomainIfAllowed(
  email: string,
  authUserId: string,
): Promise<ChapterUser | null> {
  const rule = await findAllowedDomainForEmail(email);
  if (!rule) return null;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("users")
    .insert({
      email: email.trim(),
      user_id: authUserId,
      role: rule.role,
      agency_key: rule.agency_key,
      client_key: rule.client_key,
      last_login_at: new Date().toISOString(),
    })
    .select(USER_SELECT)
    .single();

  if (error) {
    console.error("[chapter-user] provisionFromDomain failed:", error.message);
    return null;
  }
  return data as ChapterUser;
}

// ─── Self-serve tenant provisioning (Phase 1) ───────────────────────────────
//
// Called from the auth callback when a verified email arrived via the self-serve
// signup flow (?signup=1) and has no existing users row / domain rule. Reads the
// staged form data from chapter_config.pending_signups, mints an HMAC secret, and
// calls the atomic chapter_config.provision_self_serve_tenant() function, which
// creates the clients + client_secrets + client_employee users rows and returns
// the generated client_key. The staged row is then cleaned up.
//
// No per-client Postgres role or CLIENT_ROLE_MAP entry is needed — self-serve
// tenants share the chapter_selfserve role (Phase 0B), isolated by RLS.
export async function provisionSelfServeTenant(
  email: string,
  authUserId: string,
): Promise<{ client_key: string } | null> {
  const supabase = createSupabaseServiceRoleClient();
  const em = email.trim().toLowerCase();

  // Staged signup data (best-effort — fall back to an email-derived company).
  const { data: pending } = await supabase
    .schema("chapter_config")
    .from("pending_signups")
    .select("full_name, phone, company")
    .eq("email", em)
    .maybeSingle();

  const company =
    (pending?.company as string | undefined)?.trim() || em.split("@")[0] || "workspace";
  const fullName = (pending?.full_name as string | null) ?? null;
  const phone = (pending?.phone as string | null) ?? null;

  const secret = randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .schema("chapter_config")
    .rpc("provision_self_serve_tenant", {
      p_email: em,
      p_auth_user_id: authUserId,
      p_full_name: fullName,
      p_phone: phone,
      p_company: company,
      p_secret: secret,
      p_tools: ["smart_prompts", "smart_links"],
      p_trial_days: 30,
    });

  if (error) {
    console.error("[chapter-user] provisionSelfServeTenant failed:", error.message);
    return null;
  }
  const clientKey = typeof data === "string" ? data : null;
  if (!clientKey) {
    console.error("[chapter-user] provisionSelfServeTenant returned no client_key");
    return null;
  }

  // Best-effort cleanup of the staged row (non-fatal if it fails).
  await supabase.schema("chapter_config").from("pending_signups").delete().eq("email", em);

  return { client_key: clientKey };
}

// Server-side current-user resolver. Returns the active ChapterUser when the
// request has a valid Supabase session AND an allowlist row, otherwise null.
// Layouts + pages use this to drive role-aware UI. Returns null silently
// (no throw) when used on legacy-token sessions so the existing rendering
// path stays intact during the Sprint 5a → 5d transition.
export async function getCurrentChapterUser(): Promise<ChapterUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return await findChapterUserByAuthId(data.user.id);
  } catch {
    return null;
  }
}

// Variant of getCurrentChapterUser that ALSO accepts the legacy
// CHAPTER_DASH_TOKEN cookie path. Used by server actions that mutate data
// (inquiries, future feature flags, etc.) where rejecting legacy-cookie
// callers would break the UX for any operator still using the
// `@ads4good.com` bypass.
//
// The legacy cookie is a shared agency-staff token — it doesn't carry an
// identity. We resolve to a canonical agency-staff user row (configurable
// via CHAPTER_LEGACY_STAFF_EMAIL, defaulting to katoa@ads4good.com today)
// so any DB write that needs a real `created_by_email` value gets one.
//
// This helper is removed in Sprint 5d alongside the cookie path itself.
export async function getCurrentChapterUserOrLegacy(): Promise<ChapterUser | null> {
  const user = await getCurrentChapterUser();
  if (user) return user;

  const expectedToken = process.env.CHAPTER_DASH_TOKEN;
  if (!expectedToken) return null;

  try {
    // Dynamic import so this doesn't get bundled into non-server code paths
    // that also import from chapter-user.ts.
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("chapter_auth")?.value;
    if (cookieToken !== expectedToken) return null;
  } catch {
    return null;
  }

  const legacyEmail = process.env.CHAPTER_LEGACY_STAFF_EMAIL || "katoa@ads4good.com";
  return await findChapterUserByEmail(legacyEmail);
}
