// Chapter Links workbench — operator surface. The body lives in Workbench.tsx
// so the same tool can render in a client's own dashboard (/chapter/<key>/links).
//
// Merges what used to be two separate tools:
//   /internal/redirect-rules/[clientKey]  (build the rule)
//   /internal/outreach-builder            (generate the URL)
//
// Rule create/edit stay as sub-routes ([clientKey]/new and [clientKey]/[ruleId]).

import ChapterLinksWorkbench from "./Workbench";

export const dynamic = "force-dynamic";

export default async function ChapterLinksClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clientKey } = await params;
  const sp = await searchParams;
  return (
    <ChapterLinksWorkbench
      clientKey={clientKey}
      basePath={`/internal/chapter-links/${clientKey}`}
      sp={sp}
      audience="operator"
    />
  );
}
