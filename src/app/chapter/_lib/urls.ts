// Canonical URL builder for the Chapter dashboard. Shipped June 14, 2026 as
// the "step 4" half of Sprint 5b real: every URL emitter goes through this
// helper so the clean `/chapter/<client_key>/<slug>` form is the only shape
// the app ever produces.
//
// Why a helper rather than ad-hoc template literals:
//   - Audit: greppable. `grep -n "['\"]/chapter/" src/` should match only
//     server-side intent (auth flow / root default landing) — every render-
//     time URL flows through this function. Reviewers spot violations.
//   - Future drift: prevents the slow regression where someone adds a new
//     card with `<Link href="/chapter/raw">` and the inconsistency creeps
//     back in. The pattern is the API, not a convention to remember.
//
// Middleware contract:
//   Middleware (root middleware.ts → rewriteIfClientScoped) translates
//   `/chapter/<client_key>/<slug>?...` to `/chapter/<slug>?client=<key>&...`
//   internally. Browser URL stays clean; the legacy page tree renders.
//
// Server vs client usage:
//   - Server (rule evaluators, observation runners, anything writing
//     payloads to DB): pass `client_key` explicitly. Findings carry their
//     own client; deeplinks bake the client in at write time.
//   - Client components: read `client.id` via `useChapter()` and pass that.

export function chapterUrl(
  clientKey: string,
  slug: string,
  query?: Record<string, string | number | undefined>,
): string {
  const safeSlug = slug.replace(/^\//, "");
  let qs = "";
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      params.set(k, String(v));
    }
    const s = params.toString();
    if (s) qs = `?${s}`;
  }
  return `/chapter/${clientKey}/${safeSlug}${qs}`;
}
