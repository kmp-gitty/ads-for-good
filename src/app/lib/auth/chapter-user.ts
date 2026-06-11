// Chapter-user lookup helpers — wrap chapter_config.users queries with
// strong types + per-request caching. Used by middleware, server components,
// and the auth callback to resolve a Supabase user into a Chapter role.
//
// "Chapter user" = a row in chapter_config.users. The Supabase auth.users row
// only proves identity (this email controls this inbox); the chapter_config
// row is the actual allowlist + role + client_key.

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "./supabase-server";

export type ChapterUser = {
  id: string;
  user_id: string | null;
  email: string;
  role: "agency_operator" | "client_employee";
  client_key: string | null;
  revoked_at: string | null;
};

// Lookup by email. Used at login time, BEFORE the user has a Supabase session.
// Lowercased server-side; the unique index on lower(email) handles equality.
export async function findChapterUserByEmail(email: string): Promise<ChapterUser | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("users")
    .select("id, user_id, email, role, client_key, revoked_at")
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
    .select("id, user_id, email, role, client_key, revoked_at")
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

// Returns true if a Chapter user is allowed to access a route group scoped to
// the given client_key. Agency operators get global access. Client employees
// are scoped to their own client_key only.
export function canAccessClient(user: ChapterUser, clientKey: string): boolean {
  if (user.revoked_at) return false;
  if (user.role === "agency_operator") return true;
  if (user.role === "client_employee") return user.client_key === clientKey;
  return false;
}

// Returns true if the user can access the global /chapter/* surface (no
// specific client_key in path). Agency operators only.
export function canAccessGlobal(user: ChapterUser): boolean {
  return !user.revoked_at && user.role === "agency_operator";
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
