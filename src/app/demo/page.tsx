// Legacy public URL for the MI v2 demo playground. The real page moved to
// /internal/demo on 2026-07-20 so it lives behind the CHAPTER_DASH_TOKEN gate
// (previously it was publicly accessible on ads4good.com/demo — anyone with the
// URL could visit).
//
// This shim server-redirects to /internal/demo. Middleware will then bounce
// unauthenticated visitors to /chapter/login as expected for internal surfaces.
// Sales workflow (screen-share with prospect while operator is authed in their
// own browser) is unchanged.
//
// The /demo/snapshot API route is untouched — it's the shared event-feed
// endpoint that both /internal/demo and /internal/prompt-playground reference.
// Kept at its original path so no downstream call sites need updating.

import { redirect } from "next/navigation";

export default function DemoRedirect() {
  redirect("/internal/demo");
}
