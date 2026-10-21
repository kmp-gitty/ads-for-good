// Authorization for the Chapter Links workbench server actions.
//
// ⚠️ THESE ACTIONS USED TO HAVE NO CHECK AT ALL. They lived only under
//    /internal/*, so the middleware gate (chapter_staff or the legacy
//    CHAPTER_DASH_TOKEN cookie) was the only protection, and every action took
//    the client_key from its arguments. Rendering the same workbench in a
//    client's own dashboard (acj_today, 2026-10-21) puts these actions in a
//    page any signed-in client user can load — and a server action can be
//    called with any arguments. So every action now decides for itself, from
//    the SESSION, whether the caller may touch that client.
//
// Who may act on a client's links:
//   - chapter_staff (Supabase session or the legacy operator cookie)
//   - a client_employee / agency_operator who can access that client AND whose
//     client has the "chapter_links" tool switched on
//
// Never trust a client_key from the caller without passing it through here.

import {
  getCurrentChapterUserOrLegacy,
  canAccessClient,
  getClientEntitlement,
} from "@/app/lib/auth/chapter-user";

export type LinksAccess =
  | { ok: true; staff: boolean; email: string | null }
  | { ok: false; error: string };

const DENIED = "You don’t have access to this client’s links.";

export async function authorizeLinksClient(clientKey: string): Promise<LinksAccess> {
  const key = (clientKey || "").trim();
  if (!key) return { ok: false, error: DENIED };

  const user = await getCurrentChapterUserOrLegacy();
  if (!user || user.revoked_at) return { ok: false, error: DENIED };

  if (user.role === "chapter_staff") return { ok: true, staff: true, email: user.email ?? null };

  if (!(await canAccessClient(user, key))) return { ok: false, error: DENIED };
  const ent = await getClientEntitlement(key);
  if (!ent || !ent.tools_enabled.includes("chapter_links")) return { ok: false, error: DENIED };

  return { ok: true, staff: false, email: user.email ?? null };
}

/** For actions that must never be reachable by a client (e.g. agency CRM search). */
export async function authorizeStaffOnly(): Promise<LinksAccess> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user || user.revoked_at || user.role !== "chapter_staff") return { ok: false, error: DENIED };
  return { ok: true, staff: true, email: user.email ?? null };
}
