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
  const domain = await getBrandedDomain();
  const brandedHost = domain?.status === "verified" ? domain.host : null;
  return <LinkEditor clientKey={(client || "").trim()} brandedHost={brandedHost} />;
}
