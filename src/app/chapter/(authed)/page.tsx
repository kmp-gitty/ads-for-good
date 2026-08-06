// /chapter → redirect to the default landing.
//
// Observations was retired (Aug 5, 2026), so the root no longer routes through
// /chapter/observations. Recommendations is the top-of-nav "Actions" surface and
// the natural home.

import { redirect } from "next/navigation";

export default function ChapterIndex() {
  redirect("/chapter/recommendations");
}
