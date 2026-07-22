// Self-serve Smart Links — list (Phase 4a). RLS-scoped read via listLinks
// (client_key from session). Rendered inside (authed) chrome.

import { listLinks } from "./_actions";
import { getBrandedDomain } from "./domain/_actions";
import LinksClient from "./LinksClient";

export const metadata = { title: "Smart Links" };
export const dynamic = "force-dynamic";

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const [links, domain] = await Promise.all([listLinks(), getBrandedDomain()]);
  const brandedHost = domain?.status === "verified" ? domain.host : null;
  return <LinksClient clientKey={(client || "").trim()} links={links} brandedHost={brandedHost} />;
}
