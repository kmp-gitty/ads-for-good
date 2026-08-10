// Client-facing Services & Payments loader. Reads the structured fields the
// operator edits at /internal/tasks (on crm.clients) and shapes them for the
// portal's Services & Payments tab. Registered under CLIENT_SERVICES_TAG.

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { CLIENT_SERVICES_TAG } from "@/app/internal/tasks/_constants";

const supabaseUrl = process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const REVALIDATE_SEC = 60;

export type ClientServicesData = {
  businessName: string;
  planLevel: string | null;
  monthlyPayment: number | null;
  inclusions: string[];
};

async function loadServices(clientKey: string): Promise<ClientServicesData | null> {
  const { data, error } = await supabase
    .schema("crm")
    .from("clients")
    .select("business_name, plan_level, monthly_payment, service_inclusions")
    .eq("client_key", clientKey)
    .maybeSingle();
  if (error || !data) return null;
  return {
    businessName: (data.business_name as string) ?? clientKey,
    planLevel: (data.plan_level as string | null) ?? null,
    monthlyPayment: (data.monthly_payment as number | null) ?? null,
    inclusions: ((data.service_inclusions as string[] | null) ?? []).filter((s) => s && s.trim()),
  };
}

const cached = unstable_cache(loadServices, ["client-services"], {
  revalidate: REVALIDATE_SEC,
  tags: [CLIENT_SERVICES_TAG],
});

export function getClientServices(clientKey: string): Promise<ClientServicesData | null> {
  return cached(clientKey);
}
