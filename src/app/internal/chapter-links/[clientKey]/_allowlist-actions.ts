"use server";

// Approved ?to= destinations (open-redirect guard). See
// lib/redirect/destination-allowlist.ts for what approval means.
//
// Every action authorizes from the session (authorizeLinksClient): the
// workbench also renders in clients' own dashboards.

import { createClient } from "@supabase/supabase-js";
import { authorizeLinksClient } from "@/app/lib/auth/links-access";
import {
  approveDestinations,
  clearApprovedDestinationsCache,
  type ApprovalSource,
} from "@/app/lib/redirect/approved-destinations";
import { destinationKey } from "@/app/lib/redirect/destination-allowlist";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

/**
 * Called by the builders whenever links are generated, copied or downloaded,
 * with or without a link id, so every destination handed out from the
 * workbench works. Fire-and-forget from the client: never blocks a copy.
 */
export async function approveLinkDestinations(
  clientKey: string,
  destinations: string[],
  source: Extract<ApprovalSource, "generate" | "matrix" | "import">,
): Promise<{ added: number; error?: string }> {
  const auth = await authorizeLinksClient(clientKey);
  if (!auth.ok) return { added: 0, error: auth.error };
  return approveDestinations(clientKey, destinations.slice(0, 5000), source, auth.email);
}

export type ApprovedRow = {
  id: string;
  kind: "host" | "url";
  value: string;
  source: string;
  added_by: string | null;
  added_at: string;
  example_url: string | null;
};

export type BlockedRow = { key: string; clicks: number; last_at: string };

export async function listApprovedDestinations(clientKey: string): Promise<{
  mode: string;
  approved: ApprovedRow[];
  blocked: BlockedRow[];
  error?: string;
}> {
  const auth = await authorizeLinksClient(clientKey);
  if (!auth.ok) return { mode: "off", approved: [], blocked: [], error: auth.error };

  const [{ data: client }, blockedRes] = await Promise.all([
    supabase.schema("chapter_config").from("clients")
      .select("destination_allowlist_mode").eq("client_key", clientKey).maybeSingle(),
    supabase.schema("chapter_reporting").rpc("unapproved_destination_clicks", {
      p_client_key: clientKey, p_days: 30,
    }),
  ]);

  const approved: ApprovedRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .schema("chapter_config").from("approved_destinations")
      .select("id, kind, value, source, added_by, added_at, example_url")
      .eq("client_key", clientKey).is("revoked_at", null)
      .order("value").range(from, from + 999);
    if (error) return { mode: "off", approved, blocked: [], error: error.message };
    approved.push(...((data ?? []) as ApprovedRow[]));
    if (!data || data.length < 1000) break;
  }

  return {
    mode: (client as { destination_allowlist_mode?: string } | null)?.destination_allowlist_mode ?? "off",
    approved,
    blocked: ((blockedRes.data ?? []) as BlockedRow[]),
  };
}

/** Approve one site or page by hand (for links written outside the workbench). */
export async function addApprovedDestination(
  clientKey: string,
  raw: string,
): Promise<{ ok: boolean; message: string }> {
  const auth = await authorizeLinksClient(clientKey);
  if (!auth.ok) return { ok: false, message: auth.error };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  const k = destinationKey(withScheme);
  if (!k) return { ok: false, message: "Not a web address." };
  const res = await approveDestinations(clientKey, [withScheme], "manual", auth.email);
  if (res.error) return { ok: false, message: res.error };
  return {
    ok: true,
    message: k.kind === "host"
      ? `Approved every page on ${k.value}.`
      : `${k.host} is a site where anyone can publish, so only this page is approved: ${k.value}`,
  };
}

export async function revokeApprovedDestination(
  clientKey: string,
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const auth = await authorizeLinksClient(clientKey);
  if (!auth.ok) return { ok: false, message: auth.error };
  const { error } = await supabase
    .schema("chapter_config").from("approved_destinations")
    .update({ revoked_at: new Date().toISOString(), revoked_by: auth.email })
    .eq("client_key", clientKey).eq("id", id).is("revoked_at", null);
  if (error) return { ok: false, message: error.message };
  clearApprovedDestinationsCache(clientKey);
  return { ok: true };
}
