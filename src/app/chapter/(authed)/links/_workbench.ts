// Which client (if any) may see the Chapter Links workbench on this request.
//
// The workbench is the operator tool from /internal/chapter-links, rendered in
// a client's own dashboard when their account has the "chapter_links" tool
// (acj_today, 2026-10-21). This only decides whether to RENDER it; every
// action inside re-authorizes from the session (lib/auth/links-access.ts).

import { getCurrentChapterUserOrLegacy, canAccessClient, getClientEntitlement, clearClientEntitlementCache } from "@/app/lib/auth/chapter-user";

export async function workbenchClientKey(clientParam?: string): Promise<string | null> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user || user.revoked_at) return null;
  // A client user is always scoped to their own client, whatever the URL says.
  const key = (user.role === "client_employee" ? user.client_key : clientParam)?.trim() || "";
  if (!key) return null;
  if (!(await canAccessClient(user, key))) return null;
  // Fresh read, not the 5-minute per-instance cache. Instances whose cache
  // predated the chapter_links flag rendered the plain Smart Links list while
  // fresh ones rendered the workbench — the page flipped between the two on
  // the same visit (2026-10-21). One small indexed read per page load.
  clearClientEntitlementCache(key);
  const ent = await getClientEntitlement(key);
  if (!ent || !ent.tools_enabled.includes("chapter_links")) return null;
  return key;
}
