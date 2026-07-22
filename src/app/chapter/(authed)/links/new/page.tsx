import LinkEditor from "../LinkEditor";

export const metadata = { title: "New link" };
export const dynamic = "force-dynamic";

export default async function NewLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  return <LinkEditor clientKey={(client || "").trim()} />;
}
