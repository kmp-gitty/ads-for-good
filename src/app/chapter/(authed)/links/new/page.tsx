import { redirect } from "next/navigation";
import LinkEditor from "../LinkEditor";
import { getBrandedDomain } from "../domain/_actions";

export const metadata = { title: "New link" };
export const dynamic = "force-dynamic";

export default async function NewLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();
  const domain = await getBrandedDomain();
  // Hard gate: a verified branded domain is required before creating links.
  if (domain?.status !== "verified") {
    redirect(`/chapter/${clientKey}/links/domain`);
  }
  return <LinkEditor clientKey={clientKey} brandedHost={domain.host} />;
}
