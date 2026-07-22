// New self-serve prompt (Phase 3a). /chapter/<key>/prompts/new → rewritten to
// /chapter/prompts/new?client=<key>.

import PromptEditor from "../PromptEditor";
import { getClientEntitlement } from "@/app/lib/auth/chapter-user";

export const metadata = { title: "New prompt" };
export const dynamic = "force-dynamic";

export default async function NewPromptPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();
  const ent = clientKey ? await getClientEntitlement(clientKey) : null;
  return <PromptEditor clientKey={clientKey} storefrontDomain={ent?.storefront_domain ?? null} />;
}
