// Daily cron — drives the self-serve welcome sequence (steps 1–6). For each
// active self-serve tenant in its first ~60 days, gathers activation state and
// sends the next due email (or closes out lapsed steps as skipped). Step 0 is
// sent instantly from the auth callback, not here. Stops for tenants who've
// subscribed or scheduled deletion. GChat summary when anything sends.
//
// Schedule: daily 15:00 UTC.

import { NextRequest, NextResponse } from "next/server";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { getWelcomeState } from "@/app/lib/welcome/state";
import { runWelcomeForTenant } from "@/app/lib/welcome/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const unauth = unauthorizedIfNotCron(req);
  if (unauth) return unauth;

  const supabase = createSupabaseServiceRoleClient();
  const cutoff = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const { data: clients, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("client_key")
    .eq("self_serve", true)
    .is("deletion_requested_at", null)
    .gte("created_at", cutoff);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const sent: string[] = [];
  const errors: string[] = [];

  for (const c of clients ?? []) {
    const clientKey = c.client_key as string;
    try {
      const state = await getWelcomeState(clientKey);
      if (!state) continue;
      const step = await runWelcomeForTenant(state, now);
      if (step !== null) sent.push(`${state.business} (${clientKey}) → step ${step}`);
    } catch (e) {
      errors.push(`${clientKey}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  if ((sent.length || errors.length) && process.env.CHAPTER_GCHAT_WEBHOOK_URL) {
    const lines = ["✉️ *Welcome sequence*"];
    if (sent.length) lines.push(`*Sent:*\n${sent.map((s) => `• ${s}`).join("\n")}`);
    if (errors.length) lines.push(`*Errors:*\n${errors.map((e) => `• ${e}`).join("\n")}`);
    try { await postToGChat({ text: lines.join("\n\n") }); } catch { /* non-fatal */ }
  }

  return NextResponse.json({ sent: sent.length, errors });
}
