// /chapter/observations — RETIRED.
//
// The Observations engine (nightly cron) was removed Aug 5, 2026 and the page is
// dropped from the nav for everyone (incl. chapter_staff). This route now
// unconditionally redirects to Recommendations so old bookmarks/links don't 404.
// ObservationsClient + the chapter_observations schema still exist (frozen) and
// get removed in a future cleanup.

import { redirect } from "next/navigation";

export default async function ObservationsPage() {
  redirect("/chapter/recommendations");
}
