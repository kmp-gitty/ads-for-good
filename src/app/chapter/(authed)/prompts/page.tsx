// Self-serve Smart Prompts — list (Phase 3a). Reads the tenant's prompts via
// the RLS-scoped listPrompts() action (client_key from session) and renders
// them with the client-side manager. Rendered inside (authed) chrome; the clean
// URL /chapter/<key>/prompts is rewritten to /chapter/prompts?client=<key>.

import { listPrompts } from "./_actions";
import PromptsClient from "./PromptsClient";

export const metadata = { title: "Smart Prompts" };
export const dynamic = "force-dynamic";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();
  const prompts = await listPrompts();
  return <PromptsClient clientKey={clientKey} prompts={prompts} />;
}
