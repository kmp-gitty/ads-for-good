// Self-serve Smart Links — Analytics tab. Overview across all links (Data,
// separate from the Links build/manage tab). Drills into the per-link detail.

import { getLinksOverview } from "../_actions";
import { getBrandedDomain } from "../domain/_actions";
import LinkAnalyticsClient from "./LinkAnalyticsClient";

export const metadata = { title: "Link Analytics" };
export const dynamic = "force-dynamic";

export default async function LinkAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();

  const [overview, domain] = await Promise.all([getLinksOverview(), getBrandedDomain()]);
  const brandedHost = domain?.status === "verified" ? domain.host : null;

  return <LinkAnalyticsClient clientKey={clientKey} overview={overview} brandedHost={brandedHost} />;
}
