import { createClient } from "@supabase/supabase-js";

// Per-client pixel batching rollout flag (W1 step 2).
//
// `chapter_config.clients.pixel_batching_enabled` (boolean, default FALSE)
// decides whether the pixel buffers events and flushes them as one batched
// request, or keeps today's one-request-per-event behaviour.
//
// WHY A FLAG AT ALL: pixel.js is served `no-store` and client sites hold only
// a loader tag, so a pixel change goes live for EVERY tenant on their next page
// load, simultaneously. There is no gradual pixel rollout without a
// server-side switch — this column is it.
//
// The value is handed to the browser on the existing
// /api/chapter/identity-prompts fetch (already per-request + no-store), so it
// costs no extra round trip.

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const cache = new Map<string, { at: number; enabled: boolean }>();
const TTL_MS = 5 * 60 * 1000;

/**
 * Default FALSE when the row/column is missing or the read fails.
 *
 * NOTE the deliberate asymmetry with isCollectionEnabled(), which fails OPEN:
 * there, a transient config-read error must never silently halt a client's
 * collection, so the safe direction is "keep collecting". Here the safe
 * direction is the opposite — a read error must leave the newer, less-exercised
 * code path OFF rather than switch it on for every tenant at once. Only an
 * explicit `pixel_batching_enabled = true` turns batching on.
 */
export async function isPixelBatchingEnabled(clientKey: string): Promise<boolean> {
  const hit = cache.get(clientKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.enabled;
  let enabled = false;
  try {
    const { data } = await supabase
      .schema("chapter_config")
      .from("clients")
      .select("pixel_batching_enabled")
      .eq("client_key", clientKey)
      .maybeSingle();
    if (data && (data as { pixel_batching_enabled: boolean | null }).pixel_batching_enabled === true) {
      enabled = true;
    }
  } catch {
    enabled = false; // fail-safe: leave batching off
  }
  cache.set(clientKey, { at: Date.now(), enabled });
  return enabled;
}
