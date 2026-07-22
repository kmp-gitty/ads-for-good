// Branded-domain connect for Smart Links (Phase 4b). Reads the tenant's current
// branded_domains row (client_key from session) and renders the connect/verify
// flow. Rendered inside the (authed) chrome.

import { getBrandedDomain } from "./_actions";
import DomainClient from "./DomainClient";

export const metadata = { title: "Domain" };
export const dynamic = "force-dynamic";

export default async function DomainPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const info = await getBrandedDomain();
  return <DomainClient clientKey={(client || "").trim()} initial={info} />;
}
