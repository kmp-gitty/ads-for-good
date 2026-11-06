// Per-client config for the slide impression script: which papers it is live
// on (chapter_config.clients.impression_hosts) and the client's papers
// (storefront_domains), used for the cross-paper identity handoff.
// Cached per Lambda for 60 s so a switch takes effect within a minute.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type ImpressionConfig = {
  /** Hosts where impressions are collected (bare, lowercase). */
  liveHosts: string[];
  /** All of the client's papers (bare, lowercase). */
  papers: string[];
};

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; cfg: ImpressionConfig }>();

export function bareHost(h: string): string {
  return h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/:].*$/, "").replace(/^www\./, "");
}

export async function getImpressionConfig(clientKey: string): Promise<ImpressionConfig> {
  const hit = cache.get(clientKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.cfg;
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("impression_hosts, storefront_domains, storefront_domain")
    .eq("client_key", clientKey)
    .maybeSingle();
  if (error) {
    console.error("[impressions] config lookup failed:", error.message);
    // Fail closed: nothing collected while config is unreadable.
    return hit?.cfg ?? { liveHosts: [], papers: [] };
  }
  const row = data as {
    impression_hosts: string[] | null;
    storefront_domains: string[] | null;
    storefront_domain: string | null;
  } | null;
  const papers = [
    ...(row?.storefront_domains ?? []),
    ...(row?.storefront_domain ? [row.storefront_domain] : []),
  ].map(bareHost);
  const cfg: ImpressionConfig = {
    liveHosts: (row?.impression_hosts ?? []).map(bareHost),
    papers: [...new Set(papers)],
  };
  cache.set(clientKey, { at: Date.now(), cfg });
  return cfg;
}

/** The paper a Chapter host serves: s.delco.today -> delco.today. */
export function paperForHost(hostname: string): string {
  return bareHost(hostname).replace(/^(s|go)\./, "");
}
