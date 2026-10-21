import NewRuleView from "../NewRuleView";

export const dynamic = "force-dynamic";

export default async function NewRulePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clientKey } = await params;
  const sp = await searchParams;
  const base = `/internal/chapter-links/${clientKey}`;
  return <NewRuleView clientKey={clientKey} sp={sp} basePath={base} newRulePath={`${base}/new`} />;
}
