// Edge-safe branded-host → workspace lookup for Phase 4b Smart Links.
//
// When a request arrives on a custom host (e.g. go.theirbrand.com), middleware
// asks this module which workspace owns it, then rewrites /<slug> to
// /r/<workspace>/<slug>. Reads chapter_config.branded_domains via PostgREST with
// the anon key — the branded_domains_public_read RLS policy only exposes
// verified rows, and host→client_key is public routing info anyway.
//
// Per-isolate cache keeps the common case (repeat hits on a live branded host)
// off the DB; misses cache briefly so an unknown host can't hammer PostgREST.

const CACHE = new Map<string, { clientKey: string | null; exp: number }>();
const HIT_TTL_MS = 60_000;
const MISS_TTL_MS = 30_000;

// Hosts served by the app itself — never treated as branded link domains.
export function isPrimaryHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  return (
    h === "ads4good.com" ||
    h === "www.ads4good.com" ||
    h.endsWith(".vercel.app") ||
    h === "localhost" ||
    h.startsWith("localhost.") ||
    h === "127.0.0.1" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(h)
  );
}

export async function brandedClientKey(host: string): Promise<string | null> {
  const now = Date.now();
  const cached = CACHE.get(host);
  if (cached && cached.exp > now) return cached.clientKey;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/branded_domains?host=eq.${encodeURIComponent(host)}&status=eq.verified&select=client_key&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Accept-Profile": "chapter_config",
        },
      },
    );
    if (!res.ok) {
      CACHE.set(host, { clientKey: null, exp: now + MISS_TTL_MS });
      return null;
    }
    const rows = (await res.json()) as Array<{ client_key: string }>;
    const clientKey = rows[0]?.client_key ?? null;
    CACHE.set(host, { clientKey, exp: now + (clientKey ? HIT_TTL_MS : MISS_TTL_MS) });
    return clientKey;
  } catch {
    CACHE.set(host, { clientKey: null, exp: now + MISS_TTL_MS });
    return null;
  }
}
