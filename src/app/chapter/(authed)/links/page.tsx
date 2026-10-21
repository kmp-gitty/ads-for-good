// Smart Links. Two shapes, chosen by the client's tools:
//   chapter_links  → the full Chapter Links workbench (links & rules, generate
//                    URLs, matrix, import, registry), same tool operators use
//   otherwise      → the self-serve Smart Links list (Phase 4a)

import { listLinks } from "./_actions";
import { getBrandedDomain } from "./domain/_actions";
import LinksClient from "./LinksClient";
import ChapterLinksWorkbench from "@/app/internal/chapter-links/[clientKey]/Workbench";
import { workbenchClientKey } from "./_workbench";

export const metadata = { title: "Smart Links" };
export const dynamic = "force-dynamic";

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const client = typeof sp.client === "string" ? sp.client : "";

  const wbKey = await workbenchClientKey(client);
  if (wbKey) {
    return (
      <div style={{ padding: "28px 30px 60px" }}>
        <ChapterLinksWorkbench clientKey={wbKey} basePath={`/chapter/${wbKey}/links`} sp={sp} audience="client" />
      </div>
    );
  }

  const [links, domain] = await Promise.all([listLinks(), getBrandedDomain()]);
  const brandedHost = domain?.status === "verified" ? domain.host : null;
  return <LinksClient clientKey={client.trim()} links={links} brandedHost={brandedHost} />;
}
