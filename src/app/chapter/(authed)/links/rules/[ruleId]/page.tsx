import { notFound } from "next/navigation";
import EditRuleView from "@/app/internal/chapter-links/[clientKey]/EditRuleView";
import { workbenchClientKey } from "../../_workbench";

export const metadata = { title: "Edit link rule" };
export const dynamic = "force-dynamic";

export default async function ClientEditRulePage({
  params,
  searchParams,
}: {
  params: Promise<{ ruleId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ ruleId }, sp] = await Promise.all([params, searchParams]);
  const key = await workbenchClientKey(typeof sp.client === "string" ? sp.client : "");
  if (!key) notFound();
  const base = `/chapter/${key}/links`;
  return (
    <div style={{ padding: "28px 30px 60px" }}>
      <EditRuleView clientKey={key} ruleId={ruleId} basePath={base} newRulePath={`${base}/rules/new`} />
    </div>
  );
}
