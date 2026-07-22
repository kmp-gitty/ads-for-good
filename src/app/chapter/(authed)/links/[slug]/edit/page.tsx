import { notFound } from "next/navigation";
import LinkEditor from "../../LinkEditor";
import { getLink } from "../../_actions";
import { getBrandedDomain } from "../../domain/_actions";

export const metadata = { title: "Edit link" };
export const dynamic = "force-dynamic";

export default async function EditLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const [{ slug }, { client }] = await Promise.all([params, searchParams]);
  const [link, domain] = await Promise.all([getLink(slug), getBrandedDomain()]);
  if (!link) notFound();
  const brandedHost = domain?.status === "verified" ? domain.host : null;
  return <LinkEditor clientKey={(client || "").trim()} link={link} brandedHost={brandedHost} />;
}
