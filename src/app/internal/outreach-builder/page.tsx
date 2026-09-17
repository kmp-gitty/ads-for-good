// Shim: /internal/outreach-builder → /internal/chapter-links
//
// URL generation merged into the Chapter Links workbench, where it lives as the
// "Generate URLs" tab on the client page. Generation now starts FROM a
// configured link, so the destination is never re-entered by hand.
//
// Old deep links carried ?client= and ?slug= — both are preserved: ?client=
// selects the client route segment, ?slug= preselects the link in the builder.
//
// redirect() issues a 307 (temporary) on purpose — see the sibling shim at
// /internal/redirect-rules for why. DELETE ME alongside it.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OutreachBuilderShim({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; slug?: string }>;
}) {
  const sp = await searchParams;

  if (!sp.client) redirect("/internal/chapter-links");

  const qs = new URLSearchParams({ tab: "generate" });
  if (sp.slug) qs.set("slug", sp.slug);
  redirect(`/internal/chapter-links/${encodeURIComponent(sp.client)}?${qs.toString()}`);
}
