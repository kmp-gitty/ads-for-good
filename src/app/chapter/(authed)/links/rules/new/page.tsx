import { notFound } from "next/navigation";
import NewRuleView from "@/app/internal/chapter-links/[clientKey]/NewRuleView";
import { workbenchClientKey } from "../../_workbench";

export const metadata = { title: "New link rule" };
export const dynamic = "force-dynamic";

export default async function ClientNewRulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const key = await workbenchClientKey(typeof sp.client === "string" ? sp.client : "");
  if (!key) notFound();
  const base = `/chapter/${key}/links`;
  return (
    <div style={{ padding: "28px 30px 60px" }}>
      <NewRuleView clientKey={key} sp={sp} basePath={base} newRulePath={`${base}/rules/new`} />
    </div>
  );
}
