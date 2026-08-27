import { createClient } from "@supabase/supabase-js";

// Per-client collection kill switch. `chapter_config.clients.collection_enabled`
// (boolean, default true) is checked in the collect gate (/api/pixel) and the
// /r redirect. When false, the client behaves like a hard opt_out — no event
// writes, no identity writes, no new-identifier cookies — while the redirect
// still routes the visitor (routing is not collection). Flipping it back to
// true resumes collection within the cache TTL.

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const cache = new Map<string, { at: number; enabled: boolean }>();
const TTL_MS = 5 * 60 * 1000;

// Default TRUE (collect) when the row/column is missing or the read fails — a
// transient config-read error must never silently halt a client's collection.
// Only an explicit `collection_enabled = false` stops collection.
export async function isCollectionEnabled(clientKey: string): Promise<boolean> {
  const hit = cache.get(clientKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.enabled;
  let enabled = true;
  try {
    const { data } = await supabase
      .schema("chapter_config")
      .from("clients")
      .select("collection_enabled")
      .eq("client_key", clientKey)
      .maybeSingle();
    if (data && (data as { collection_enabled: boolean | null }).collection_enabled === false) {
      enabled = false;
    }
  } catch {
    enabled = true; // fail-open
  }
  cache.set(clientKey, { at: Date.now(), enabled });
  return enabled;
}
