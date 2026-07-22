// Responses + analytics (Phase 3c). Summary on the left, a by-prompt picker on
// the right showing that prompt's stats + individual submissions. Reads are
// RLS-scoped to the session's tenant (listResponses / listPrompts both go
// through withSelfServeClient).

import { listResponses, listPrompts } from "../_actions";
import ResponsesClient from "./ResponsesClient";

export const metadata = { title: "Responses" };
export const dynamic = "force-dynamic";

export default async function ResponsesPage() {
  const [responses, prompts] = await Promise.all([listResponses(500), listPrompts()]);
  return <ResponsesClient prompts={prompts} responses={responses} />;
}
