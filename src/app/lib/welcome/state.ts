// Per-tenant activation state for the welcome sequence. Used by both the
// instant email-0 (from the auth callback) and the daily cron. Service-role
// reads across schemas; the caller supplies a trusted client_key.

import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { ACTIVE_SUB_STATUSES } from "@/app/lib/stripe/config";

export type WelcomeState = {
  clientKey: string;
  email: string;
  name: string | null;
  business: string;
  tools: string[];
  createdAt: string | null;
  trialEndsAt: string | null;
  subscribed: boolean;
  deletionRequested: boolean;
  hasPrompt: boolean;
  pixelInstalled: boolean;
  domainConnected: boolean;
  hasLink: boolean;
  leads: number;
  clicks: number;
  alreadyHandled: number[]; // welcome steps already sent or skipped
};

export async function getWelcomeState(clientKey: string): Promise<WelcomeState | null> {
  const supabase = createSupabaseServiceRoleClient();
  const cfg = supabase.schema("chapter_config");
  const eng = supabase.schema("chapter_engagement");
  const ing = supabase.schema("chapter_ingest");

  const [client, owner, subs, prompt, pageview, domain, link, leads, clicks, handled] = await Promise.all([
    cfg.from("clients").select("business_name, tools_enabled, created_at, trial_ends_at, deletion_requested_at").eq("client_key", clientKey).maybeSingle(),
    cfg.from("users").select("email, full_name").eq("client_key", clientKey).eq("role", "client_employee").is("revoked_at", null).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    cfg.from("tenant_subscriptions").select("status").eq("client_key", clientKey),
    cfg.from("identity_prompts").select("id").eq("client_key", clientKey).limit(1).maybeSingle(),
    ing.from("pixel_events").select("id").eq("client_key", clientKey).eq("event_name", "page_view").limit(1).maybeSingle(),
    cfg.from("branded_domains").select("host").eq("client_key", clientKey).eq("status", "verified").limit(1).maybeSingle(),
    cfg.from("redirect_rules").select("id").eq("client_key", clientKey).limit(1).maybeSingle(),
    eng.from("captured_leads").select("id", { count: "exact", head: true }).eq("client_key", clientKey),
    ing.from("pixel_events").select("id", { count: "exact", head: true }).eq("client_key", clientKey).eq("event_name", "redirect_click"),
    cfg.from("welcome_sequence_sent").select("step").eq("client_key", clientKey),
  ]);

  if (!client.data) return null;

  const subscribed = (subs.data ?? []).some((s) => ACTIVE_SUB_STATUSES.has(s.status as string));

  return {
    clientKey,
    email: (owner.data?.email as string) ?? "",
    name: (owner.data?.full_name as string) ?? null,
    business: (client.data.business_name as string) || clientKey,
    tools: (client.data.tools_enabled as string[]) ?? [],
    createdAt: (client.data.created_at as string) ?? null,
    trialEndsAt: (client.data.trial_ends_at as string) ?? null,
    subscribed,
    deletionRequested: !!client.data.deletion_requested_at,
    hasPrompt: !!prompt.data,
    pixelInstalled: !!pageview.data,
    domainConnected: !!domain.data,
    hasLink: !!link.data,
    leads: leads.count ?? 0,
    clicks: clicks.count ?? 0,
    alreadyHandled: (handled.data ?? []).map((r) => r.step as number),
  };
}
