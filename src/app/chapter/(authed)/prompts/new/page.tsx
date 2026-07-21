// New self-serve prompt (Phase 3a). /chapter/<key>/prompts/new → rewritten to
// /chapter/prompts/new?client=<key>.

import PromptEditor from "../PromptEditor";

export const metadata = { title: "New prompt" };
export const dynamic = "force-dynamic";

export default async function NewPromptPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  return <PromptEditor clientKey={(client || "").trim()} />;
}
