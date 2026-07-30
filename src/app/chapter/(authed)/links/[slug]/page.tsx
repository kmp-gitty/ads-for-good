// Self-serve Smart Link — per-link analytics detail. Click intelligence
// (Tier 1+2) + link→prompt fulfillment (Tier 3), with a locked revenue teaser
// for the Chapter Analytics upgrade. Stats read via service_role RPC gated on
// the session-owned client_key.

import { getLinkStats } from "../_actions";
import { getBrandedDomain } from "../domain/_actions";
import { getClientEntitlement } from "@/app/lib/auth/chapter-user";
import LinkStatsClient from "./LinkStatsClient";

export const metadata = { title: "Link analytics" };
export const dynamic = "force-dynamic";

export default async function LinkStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { slug } = await params;
  const { client } = await searchParams;
  const clientKey = (client || "").trim();

  const [stats, domain, ent] = await Promise.all([
    getLinkStats(slug),
    getBrandedDomain(),
    clientKey ? getClientEntitlement(clientKey) : Promise.resolve(null),
  ]);

  const brandedHost = domain?.status === "verified" ? domain.host : null;
  const hasPrompts = !!ent?.tools_enabled.includes("smart_prompts");

  return (
    <LinkStatsClient
      clientKey={clientKey}
      slug={slug}
      stats={stats}
      brandedHost={brandedHost}
      hasPrompts={hasPrompts}
    />
  );
}
