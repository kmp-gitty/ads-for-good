// Server-side loader for a client's partner catalog (see partner-check.ts).
//
// Source: chapter_config.partner_catalog + partner_legacy_keys, refreshed daily
// by the n8n workflow "ACJ – WordPress partners → Chapter (daily)" from the five
// ACJ WordPress sites. Chapter never calls WordPress itself: the sites sit
// behind a Cloudflare challenge that blocks server requests.

import { createClient } from "@supabase/supabase-js";
import {
  checkPartner,
  emptyCatalog,
  normalizePartnerKey,
  partnerAllowed,
  partnerCheckValue,
  describeVerdict,
  type LegacyPartner,
  type PartnerCatalog,
  type PartnerCatalogMode,
  type PartnerCheck,
  type PartnerOption,
} from "./partner-check";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Keys that are not partners but are valid on any link of an enforcing client.
const RESERVED_BY_CLIENT: Record<string, string[]> = {
  acj_today: ["acj_internal"],
};

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; catalog: PartnerCatalog }>();

async function readAll<T>(table: string, cols: string, clientKey: string, activeOnly = false): Promise<T[]> {
  // PostgREST caps a response at 1,000 rows, so page explicitly.
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.schema("chapter_config").from(table).select(cols)
      .eq("client_key", clientKey).order(cols.split(",")[0].trim()).range(from, from + 999);
    if (activeOnly) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function loadPartnerCatalog(clientKey: string, fresh = false): Promise<PartnerCatalog> {
  const hit = cache.get(clientKey);
  if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.catalog;

  const { data: client } = await supabase
    .schema("chapter_config").from("clients")
    .select("partner_catalog_mode").eq("client_key", clientKey).maybeSingle();
  const mode = ((client as { partner_catalog_mode?: string } | null)?.partner_catalog_mode ?? "off") as PartnerCatalogMode;
  if (mode !== "enforce") {
    const c = emptyCatalog("off");
    cache.set(clientKey, { at: Date.now(), catalog: c });
    return c;
  }

  const [rows, legacyRows, registry] = await Promise.all([
    readAll<{ partner_key: string; wp_slug: string; name: string; sites: string[] }>(
      "partner_catalog", "partner_key, wp_slug, name, sites", clientKey, true),
    readAll<{ legacy_key: string; wp_slug: string | null; status: LegacyPartner["status"] }>(
      "partner_legacy_keys", "legacy_key, wp_slug, status", clientKey),
    supabase.schema("chapter_reporting").rpc("link_registry_partners", { p_client_key: clientKey }),
  ]);

  const partners: PartnerOption[] = rows
    .map(r => ({ key: r.partner_key, name: r.name, slug: r.wp_slug, sites: r.sites ?? [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const wpKeys = new Set(partners.map(p => p.key));

  const legacy: LegacyPartner[] = legacyRows.map(r => ({
    key: r.legacy_key,
    suggested: r.wp_slug ? normalizePartnerKey(r.wp_slug) : null,
    status: r.status,
  }));
  // Keys existing links already use but that are missing from the map (the map
  // is a draft that lags new links): still legacy, never blocked.
  const legacyKeys = new Set(legacy.map(l => l.key));
  for (const row of ((registry.data ?? []) as Array<{ partner: string | null }>)) {
    const k = row.partner?.trim();
    if (k && !wpKeys.has(k) && !legacyKeys.has(k)) {
      legacy.push({ key: k, suggested: null, status: "in_use" });
      legacyKeys.add(k);
    }
  }

  const catalog: PartnerCatalog = {
    mode: "enforce",
    partners,
    legacy,
    reserved: RESERVED_BY_CLIENT[clientKey] ?? [],
  };
  cache.set(clientKey, { at: Date.now(), catalog });
  return catalog;
}

export type PartnerGate =
  | { ok: true; partner_check: PartnerCheck | null }
  | { ok: false; error: string };

/**
 * Server-side gate for a NEW link. Updates to existing links are never gated:
 * their keys predate the WordPress rule and must not be forced to change.
 */
export function gateNewLinkPartner(
  catalog: PartnerCatalog,
  partner: string | null | undefined,
  override: boolean,
): PartnerGate {
  if (catalog.mode !== "enforce") return { ok: true, partner_check: null };
  const raw = String(partner ?? "").trim();
  if (!raw) return { ok: true, partner_check: null };
  const verdict = checkPartner(raw, catalog);
  if (!partnerAllowed(verdict, override)) return { ok: false, error: describeVerdict(raw, verdict) };
  return { ok: true, partner_check: partnerCheckValue(verdict, override) };
}
