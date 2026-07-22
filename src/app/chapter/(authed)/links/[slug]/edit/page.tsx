import { notFound } from "next/navigation";
import LinkEditor from "../../LinkEditor";
import { getLink } from "../../_actions";

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
  const link = await getLink(slug);
  if (!link) notFound();
  return <LinkEditor clientKey={(client || "").trim()} link={link} />;
}
