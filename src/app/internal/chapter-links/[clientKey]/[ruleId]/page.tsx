import EditRuleView from "../EditRuleView";

export const dynamic = "force-dynamic";

export default async function EditRulePage({
  params,
}: {
  params: Promise<{ clientKey: string; ruleId: string }>;
}) {
  const { clientKey, ruleId } = await params;
  const base = `/internal/chapter-links/${clientKey}`;
  return <EditRuleView clientKey={clientKey} ruleId={ruleId} basePath={base} newRulePath={`${base}/new`} />;
}
