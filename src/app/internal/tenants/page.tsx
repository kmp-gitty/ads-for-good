import { createClient } from "@supabase/supabase-js";
import TenantsBoard from "./TenantsBoard";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export type Agency = {
  agency_key: string;
  display_name: string;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
};

export type AllowedDomain = {
  id: string;
  domain: string;
  role: string;
  agency_key: string | null;
  client_key: string | null;
  notes: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type User = {
  id: string;
  email: string;
  role: string;
  agency_key: string | null;
  client_key: string | null;
  created_at: string;
  last_login_at: string | null;
  revoked_at: string | null;
};

export type Client = {
  client_key: string;
  agency_key: string | null;
  storefront_domain: string | null;
  display_tz: string;
};

export default async function TenantsPage() {
  const [agenciesRes, domainsRes, usersRes, clientsRes] = await Promise.all([
    supabase.schema("chapter_config").from("agencies").select("*").order("agency_key"),
    supabase.schema("chapter_config").from("allowed_email_domains").select("*").order("created_at", { ascending: false }),
    supabase.schema("chapter_config").from("users").select("*").order("email"),
    supabase.schema("chapter_config").from("clients").select("client_key, agency_key, storefront_domain, display_tz").order("client_key"),
  ]);

  const agencies = (agenciesRes.data as Agency[] | null) ?? [];
  const domains = (domainsRes.data as AllowedDomain[] | null) ?? [];
  const users = (usersRes.data as User[] | null) ?? [];
  const clients = (clientsRes.data as Client[] | null) ?? [];

  return (
    <TenantsBoard agencies={agencies} domains={domains} users={users} clients={clients} />
  );
}
