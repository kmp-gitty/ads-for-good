// Sprint 5b clean URL surface: /chapter/<client_key>/<slug>
//
// Today's dashboard pages all live at /chapter/<slug>?client=<client_key>.
// This route is a catch-all redirect that lets operators type the clean form
// (e.g. /chapter/eos_fabrics/observations) and lands them on the existing
// render path with client baked into search params. Preserves any additional
// query string (range, compare, model, anchor, etc.) so bookmarks survive.
//
// Why redirect rather than re-render: avoids duplicating every page's data
// fetching + client component into a parallel tree. The render path is the
// single source of truth; this layer just translates the URL shape.
//
// Route matches: /chapter/<client_key>/<any-sub-path>
//   - <client_key> must contain an underscore per the project convention
//     (eos_fabrics, projectagram_reels, not_so_cavalier, etc.). Static slugs
//     never have underscores (observations, overview, channels, paths, lift,
//     attribution, journeys, raw, connections), so Next.js precedence sends
//     them to their literal route, not this catch-all.
//   - <sub-path> is the optional [[...slug]] segment. Empty = default to
//     observations (matches the original "first-paint default" intent).
//
// Middleware (root middleware.ts -> gateChapter) runs BEFORE this page and
// already enforces canAccessClient(user, client_key). Client employees
// trying to access another client's URL never reach this redirect.

import { redirect } from "next/navigation";

type ClientScopedParams = {
  client_key: string;
  slug?: string[];
};

type ClientScopedSearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_SLUG = "observations";

export default async function ClientScopedRedirect({
  params,
  searchParams,
}: {
  params: Promise<ClientScopedParams>;
  searchParams: Promise<ClientScopedSearchParams>;
}) {
  const { client_key, slug } = await params;
  const sp = await searchParams;

  // Defensive: only act on segments matching the underscore convention. If
  // Next.js routing ever sends a no-underscore literal here (shouldn't happen
  // since literal pages take precedence), redirect to home rather than
  // building a confused URL.
  if (!client_key.includes("_")) {
    redirect("/chapter/observations");
  }

  // Build path: /chapter/<sub-path-or-default>
  const slugPath = slug && slug.length > 0 ? slug.join("/") : DEFAULT_SLUG;
  const targetPath = `/chapter/${slugPath}`;

  // Carry forward every incoming search param except `client` (we override
  // with the path-derived value). Arrays flatten to comma-joined strings —
  // existing pages parse single-value form.
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "client" || v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length > 0) query.set(k, v[0]);
    } else {
      query.set(k, v);
    }
  }
  query.set("client", client_key);

  redirect(`${targetPath}?${query.toString()}`);
}
