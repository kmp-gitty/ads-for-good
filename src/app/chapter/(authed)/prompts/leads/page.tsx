// Self-serve Leads view — the RAW contacts captured by prompts (RLS-scoped read
// via listLeads). Short-term store: emailed weekly as a CSV, then purged.

import { listLeads } from "../_actions";
import LeadsClient from "./LeadsClient";

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await listLeads(500);
  return <LeadsClient leads={leads} />;
}
