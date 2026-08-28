// /chapter → redirect to the default landing.
//
// Observations was retired (Aug 5, 2026), so the root no longer routes through
// /chapter/observations. Recommendations is the top-of-nav "Actions" surface and
// the natural home.

import { redirect } from "next/navigation";

// force-dynamic: analytics pages read searchParams + navigate via router.replace;
// without this Next 16 caches the RSC and soft nav (row click / sort) shows stale
// until a hard refresh. Dynamic classification -> Router Cache staleTime 0 -> refetch.
export const dynamic = "force-dynamic";

export default function ChapterIndex() {
  redirect("/chapter/recommendations");
}
