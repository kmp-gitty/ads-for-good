// Edit a self-serve prompt (Phase 3a). /chapter/<key>/prompts/<id>/edit →
// rewritten to /chapter/prompts/<id>/edit?client=<key>. getPrompt is RLS-scoped
// to the session's tenant, so a tenant can only load its own prompt.

import { notFound } from "next/navigation";
import PromptEditor from "../../PromptEditor";
import { getPrompt } from "../../_actions";
import { getClientEntitlement } from "@/app/lib/auth/chapter-user";

export const metadata = { title: "Edit prompt" };
export const dynamic = "force-dynamic";

export default async function EditPromptPage({
  params,
  searchParams,
}: {
  params: Promise<{ promptId: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const [{ promptId }, { client }] = await Promise.all([params, searchParams]);
  const clientKey = (client || "").trim();
  const [prompt, ent] = await Promise.all([
    getPrompt(promptId),
    clientKey ? getClientEntitlement(clientKey) : Promise.resolve(null),
  ]);
  if (!prompt) notFound();
  return <PromptEditor clientKey={clientKey} prompt={prompt} storefrontDomain={ent?.storefront_domain ?? null} />;
}
