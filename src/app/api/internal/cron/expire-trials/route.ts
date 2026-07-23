// Daily cron — enforce the app-managed 21-day trial cutoff for self-serve
// tenants. The trial is card-free (no Stripe object), so nothing downgrades a
// non-subscriber automatically; this closes that gap.
//
// For each self-serve tenant still marked `trialing` whose trial_ends_at has
// passed, recomputeEntitlement re-derives tools_enabled + billing_status from
// their actual subscriptions: no active sub → tools removed + billing_status
// 'canceled'; a subscribed tool stays. Idempotent + safe to re-run.
//
// Schedule: 07:00 UTC daily (trial expiry is date-granular; once a day is fine).

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { recomputeEntitlement } from "@/app/lib/stripe/entitlements";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";
import { postToGChat } from "@/app/lib/monitoring/gchat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauth = unauthorizedIfNotCron(req);
  if (unauth) return unauth;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("client_key")
    .eq("self_serve", true)
    .eq("billing_status", "trialing")
    .not("trial_ends_at", "is", null)
    .lt("trial_ends_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const clients = data ?? [];
  let downgraded = 0;
  const errors: string[] = [];
  for (const c of clients) {
    const clientKey = c.client_key as string;
    try {
      await recomputeEntitlement(clientKey);
      downgraded++;
    } catch (e) {
      errors.push(`${clientKey}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  if (errors.length > 0) {
    await postToGChat({ text: `⚠️ expire-trials cron: ${errors.length} error(s)\n${errors.join("\n")}` }).catch(() => {});
  }

  return NextResponse.json({ ok: true, processed: clients.length, downgraded, errors });
}
