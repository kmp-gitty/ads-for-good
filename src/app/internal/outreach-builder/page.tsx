import { createClient } from "@supabase/supabase-js";
import UrlBuilder from "./UrlBuilder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const CLIENT_KEY = "adsforgood_prod";

type Rule = { slug: string; description: string | null };

async function fetchSlugs(): Promise<Rule[]> {
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .select("slug, description")
    .eq("client_key", CLIENT_KEY)
    .eq("enabled", true)
    .order("slug");
  if (error) {
    console.error("[outreach-builder] fetchSlugs failed:", error);
    return [];
  }
  // Dedup slugs (multiple rules can share a slug if they're priority-stacked)
  const seen = new Set<string>();
  const out: Rule[] = [];
  for (const r of data ?? []) {
    const slug = r.slug as string;
    if (!seen.has(slug)) {
      seen.add(slug);
      out.push({ slug, description: r.description as string | null });
    }
  }
  return out;
}

export default async function OutreachBuilderPage() {
  const slugs = await fetchSlugs();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://ads4good.com";
  return <UrlBuilder slugs={slugs} clientKey={CLIENT_KEY} redirectOrigin={origin} />;
}
