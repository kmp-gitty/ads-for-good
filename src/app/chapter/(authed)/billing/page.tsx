// Billing page Phase 1 — transparency view.
//
// Per chapter_billing_usage_handoff.md: "Phase 1 — transparency view only.
// Journeys analyzed, events/journey, tier + utilization %, class breakdown.
// No costs, no vendor names."
//
// Class-breakdown layout follows the spec's EOS reference verbatim — three
// labelled rows + a "we excluded these from your plan" caption that operators
// can show clients in good faith.

import { createClient } from "@supabase/supabase-js";
import BillingClient from "./BillingClient";
import { getClientEntitlement, isToolsOnly } from "@/app/lib/auth/chapter-user";
import SelfServeBilling from "./SelfServeBilling";
import { getTenantBilling } from "./_actions";
import { getToolPrices } from "@/app/lib/stripe/prices";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export type UsageSnapshot = {
  snapshot_date: string;
  client_key: string;
  tier: string | null;
  retention_days: number | null;
  classifier_version: string;
  human_likely_journeys: number;
  suspect_journeys: number;
  bot_likely_journeys: number;
  total_journeys: number;
  total_events: string;  // bigint comes back as string
  avg_events_per_human_journey: number | null;
  tier_journey_ceiling: number | null;
  utilization_pct: number | null;
  cumulative_events_to_date: string;
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; checkout?: string }>;
}) {
  const sp = await searchParams;
  const clientKey = sp.client;

  if (!clientKey) {
    return (
      <div className="p-8 text-sm text-neutral-500">
        No client selected. Use the client switcher in the sidebar.
      </div>
    );
  }

  // Self-serve tenants don't have usage-snapshot analytics — they get a
  // trial/plan view instead of the operator transparency dashboard.
  const ent = await getClientEntitlement(clientKey);
  if (ent && (ent.self_serve || isToolsOnly(ent))) {
    const [billing, prices] = await Promise.all([getTenantBilling(), getToolPrices()]);
    return (
      <SelfServeBilling
        businessName={ent.business_name}
        plan={ent.plan}
        billingStatus={ent.billing_status}
        trialEndsAt={ent.trial_ends_at}
        toolsEnabled={ent.tools_enabled}
        billing={billing}
        prices={prices}
        checkout={sp.checkout}
      />
    );
  }

  // Latest snapshot for this client (yesterday's is the most recent finalised one;
  // today's gets populated by tonight's cron).
  const { data: snapshot } = await supabase
    .schema("chapter_reporting")
    .from("usage_snapshot")
    .select(
      "snapshot_date, client_key, tier, retention_days, classifier_version, human_likely_journeys, suspect_journeys, bot_likely_journeys, total_journeys, total_events, avg_events_per_human_journey, tier_journey_ceiling, utilization_pct, cumulative_events_to_date",
    )
    .eq("client_key", clientKey)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return <BillingClient clientKey={clientKey} snapshot={snapshot as UsageSnapshot | null} />;
}
