"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type ProspectOption = {
  id: string;
  prospect_key: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

export async function searchProspectsForOutreach(
  q: string,
): Promise<ActionResult<ProspectOption[]>> {
  const query = q.trim();
  if (!query) return { ok: true, data: [] };
  const safe = query.replace(/[(),%]/g, "");
  const { data, error } = await supabase
    .schema("crm")
    .from("prospects")
    .select("id, prospect_key, business_name, contact_name, email")
    .or(
      `business_name.ilike.%${safe}%,contact_name.ilike.%${safe}%,email.ilike.%${safe}%,prospect_key.ilike.%${safe}%`,
    )
    .not("prospect_key", "is", null)
    .limit(10);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data ?? []) as ProspectOption[] };
}
