// Server side of the ?to= allowlist (see destination-allowlist.ts for the rules).
//
// chapter_config.clients.destination_allowlist_mode:
//   off      every ?to= is forwarded (default, every client but ACJ)
//   log      forwarded, but an unapproved destination is tagged on the click
//   enforce  an unapproved destination is replaced with the paper's homepage
//
// Approvals live in chapter_config.approved_destinations. Links generated in
// the Chapter Links workbench approve their own destinations automatically
// (approveDestinations below), so operators never manage this list by hand
// except for links written outside the workbench.

import { createClient } from "@supabase/supabase-js";
import { destinationKey } from "./destination-allowlist";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type AllowlistMode = "off" | "log" | "enforce";

type Approved = { mode: AllowlistMode; hosts: Set<string>; urls: Set<string>; at: number };

const TTL_MS = 5 * 60 * 1000;
// A miss is re-checked against the database (a link generated a minute ago is
// not in this lambda's cache yet); the answer is then remembered briefly so a
// flood of junk ?to= values cannot turn into a flood of queries.
const MISS_TTL_MS = 60 * 1000;
const cache = new Map<string, Approved>();
const misses = new Map<string, number>();

async function load(clientKey: string): Promise<Approved> {
  const hit = cache.get(clientKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;

  const { data: client, error: cErr } = await supabase
    .schema("chapter_config").from("clients")
    .select("destination_allowlist_mode").eq("client_key", clientKey).maybeSingle();
  // Fails open: a config read error (or the column not existing yet) must never
  // stop links from working.
  if (cErr) console.error("[allowlist] mode read failed:", cErr.message);
  const mode = ((client as { destination_allowlist_mode?: string } | null)
    ?.destination_allowlist_mode ?? "off") as AllowlistMode;

  const hosts = new Set<string>();
  const urls = new Set<string>();
  if (mode !== "off") {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .schema("chapter_config").from("approved_destinations")
        .select("kind, value").eq("client_key", clientKey).is("revoked_at", null)
        .order("value").range(from, from + 999);
      if (error) {
        console.error("[allowlist] list read failed:", error.message);
        const failOpen: Approved = { mode: "off", hosts, urls, at: Date.now() };
        cache.set(clientKey, failOpen);
        return failOpen;
      }
      for (const r of (data ?? []) as { kind: string; value: string }[]) {
        (r.kind === "url" ? urls : hosts).add(r.value);
      }
      if (!data || data.length < 1000) break;
    }
  }
  const out: Approved = { mode, hosts, urls, at: Date.now() };
  cache.set(clientKey, out);
  return out;
}

export type DestinationVerdict =
  | { mode: "off" }
  | { mode: "log" | "enforce"; approved: true }
  | { mode: "log" | "enforce"; approved: false; key: string };

/**
 * Is this ?to= destination approved for the client? `trustedUrls` are the
 * client's own configured defaults (its papers), which are always approved.
 */
export async function checkDestination(
  clientKey: string,
  destination: string,
  trustedUrls: (string | null | undefined)[] = [],
): Promise<DestinationVerdict> {
  const a = await load(clientKey);
  if (a.mode === "off") return { mode: "off" };

  const k = destinationKey(destination);
  if (!k) return { mode: a.mode, approved: false, key: String(destination).slice(0, 200) };

  for (const t of trustedUrls) {
    const tk = destinationKey(t);
    if (tk && tk.host === k.host) return { mode: a.mode, approved: true };
  }
  if (k.kind === "host" ? a.hosts.has(k.value) : a.urls.has(k.value)) {
    return { mode: a.mode, approved: true };
  }

  const missKey = `${clientKey}|${k.kind}|${k.value}`;
  const missAt = misses.get(missKey);
  if (missAt && Date.now() - missAt < MISS_TTL_MS) {
    return { mode: a.mode, approved: false, key: k.value };
  }
  const { data } = await supabase
    .schema("chapter_config").from("approved_destinations")
    .select("value").eq("client_key", clientKey).eq("kind", k.kind).eq("value", k.value)
    .is("revoked_at", null).limit(1);
  if (data && data.length > 0) {
    (k.kind === "url" ? a.urls : a.hosts).add(k.value);
    return { mode: a.mode, approved: true };
  }
  if (misses.size > 5000) misses.clear();
  misses.set(missKey, Date.now());
  return { mode: a.mode, approved: false, key: k.value };
}

export type ApprovalSource = "generate" | "matrix" | "import" | "registry" | "manual" | "seed";

/**
 * Approve the destinations of links being generated. Idempotent: already
 * approved destinations are left as they are. Unusable addresses are skipped.
 * Callers must authorize the client first.
 */
export async function approveDestinations(
  clientKey: string,
  destinations: (string | null | undefined)[],
  source: ApprovalSource,
  addedBy: string | null,
): Promise<{ added: number; error?: string }> {
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const d of destinations) {
    const k = destinationKey(d);
    if (!k) continue;
    const id = `${k.kind}|${k.value}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({
      client_key: clientKey, kind: k.kind, value: k.value,
      source, added_by: addedBy, example_url: String(d).slice(0, 2000),
    });
  }
  if (rows.length === 0) return { added: 0 };

  let added = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await supabase
      .schema("chapter_config").rpc("approve_destinations", {
        p_client_key: clientKey, p_rows: rows.slice(i, i + 500),
      });
    if (error) return { added, error: error.message };
    added += Number(data ?? 0);
  }
  // This lambda sees its own additions immediately; others within 5 minutes,
  // and a miss is re-checked against the database anyway.
  const a = cache.get(clientKey);
  if (a) for (const r of rows) ((r.kind === "url") ? a.urls : a.hosts).add(String(r.value));
  for (const r of rows) misses.delete(`${clientKey}|${r.kind}|${r.value}`);
  return { added };
}

export function clearApprovedDestinationsCache(clientKey?: string): void {
  if (clientKey) cache.delete(clientKey); else cache.clear();
  misses.clear();
}
