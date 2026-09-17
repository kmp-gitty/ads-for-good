import { createClient } from "@supabase/supabase-js";
import UrlBuilder, { type ClientOption } from "./UrlBuilder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type Rule = { client_key: string; slug: string; description: string | null };

async function fetchAllSlugs(): Promise<Map<string, Rule[]>> {
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .select("client_key, slug, description")
    .eq("enabled", true)
    .order("slug");
  if (error) {
    console.error("[outreach-builder] fetchAllSlugs failed:", error);
    return new Map();
  }
  // Group by client_key + dedup slugs per client (rules can share a slug at
  // different priority levels)
  const byClient = new Map<string, Rule[]>();
  for (const r of (data ?? []) as Rule[]) {
    const list = byClient.get(r.client_key) ?? [];
    if (!list.some(x => x.slug === r.slug)) list.push(r);
    byClient.set(r.client_key, list);
  }
  return byClient;
}

async function fetchClients(): Promise<ClientOption[]> {
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("client_key, storefront_domain, redirect_host, links_host")
    .order("client_key");
  if (error) {
    console.error("[outreach-builder] fetchClients failed:", error);
    return [];
  }
  return (data ?? []) as ClientOption[];
}

export default async function OutreachBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; slug?: string }>;
}) {
  const sp = await searchParams;
  const [clients, slugsByClient] = await Promise.all([fetchClients(), fetchAllSlugs()]);
  // Convert the slugs map to a plain object so it can serialize cleanly across
  // the server/client boundary.
  const slugsByClientObj: Record<string, { slug: string; description: string | null }[]> = {};
  for (const [k, v] of slugsByClient) {
    slugsByClientObj[k] = v.map(r => ({ slug: r.slug, description: r.description }));
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://ads4good.com";
  // ?client= / ?slug= let the rules list deep-link straight into a prefilled
  // build for one link, so the destination is never re-entered.
  const linked = sp.client && clients.some(c => c.client_key === sp.client) ? sp.client : null;
  const defaultClientKey =
    linked ??
    (clients.some(c => c.client_key === "adsforgood_prod")
      ? "adsforgood_prod"
      : clients[0]?.client_key || "adsforgood_prod");
  const defaultSlug =
    linked && sp.slug && (slugsByClientObj[linked] ?? []).some(s => s.slug === sp.slug)
      ? sp.slug
      : undefined;
  return (
    <UrlBuilder
      clients={clients}
      slugsByClient={slugsByClientObj}
      defaultClientKey={defaultClientKey}
      defaultSlug={defaultSlug}
      redirectOrigin={origin}
    />
  );
}
