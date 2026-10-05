// The registry moved onto the workbench as a tab, beside Generate URLs and
// Matrix — the two surfaces that write to it. This shim keeps the old URL
// (and any bookmark of it) working. 307, not 308: delete it in a few weeks
// rather than leaving a permanent redirect in browser caches.
//
// DELETE ME once nobody is reaching /registry directly.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegistryRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ clientKey: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { clientKey } = await params;
  const { days } = await searchParams;
  const q = days ? `&days=${encodeURIComponent(days)}` : "";
  redirect(`/internal/chapter-links/${clientKey}?tab=registry${q}`);
}
