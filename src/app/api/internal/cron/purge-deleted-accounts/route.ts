// Daily cron — permanently erases self-serve accounts whose 30-day deletion
// grace has elapsed. For each tenant with deletion_requested_at older than 30
// days:
//   1. Capture external references BEFORE the DB purge (branded domain host,
//      Stripe customer id, Supabase auth user ids).
//   2. Remove the branded domain from the Vercel project.
//   3. Delete the Stripe customer (cancels any remaining subscription).
//   4. chapter_config.purge_tenant() — atomic full erasure of every client_key
//      row across all schemas (returns per-table counts).
//   5. Delete the Supabase auth login identity(ies).
// External steps are best-effort (logged, never block the DB purge). A GChat
// summary is posted when anything is purged or errors.
//
// Schedule: daily 09:00 UTC.

import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { removeDomain } from "@/app/lib/vercel/domains";
import { getStripe, stripeConfigured } from "@/app/lib/stripe/client";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const unauth = unauthorizedIfNotCron(req);
  if (unauth) return unauth;

  const conn = process.env.DATABASE_DIRECT_URL;
  if (!conn) return NextResponse.json({ error: "DATABASE_DIRECT_URL not configured" }, { status: 500 });

  const sql = postgres(conn, { ssl: "require", prepare: false, max: 1, keep_alive: 60, connect_timeout: 10, idle_timeout: 20 });
  const purged: string[] = [];
  const errors: string[] = [];

  try {
    await sql`SET statement_timeout = '4min'`;

    const due = await sql<{ client_key: string; stripe_customer_id: string | null; business_name: string | null }[]>`
      SELECT client_key, stripe_customer_id, business_name
      FROM chapter_config.clients
      WHERE deletion_requested_at IS NOT NULL
        AND deletion_requested_at < now() - interval '30 days'
    `;

    for (const c of due) {
      const clientKey = c.client_key;
      try {
        // 1) Capture external refs before we delete their rows.
        const domains = await sql<{ host: string }[]>`
          SELECT host FROM chapter_config.branded_domains WHERE client_key = ${clientKey}
        `;
        const users = await sql<{ user_id: string | null }[]>`
          SELECT user_id FROM chapter_config.users WHERE client_key = ${clientKey} AND user_id IS NOT NULL
        `;

        // 2) Vercel — release the branded domain(s).
        for (const d of domains) {
          const r = await removeDomain(d.host);
          if (!r.ok) errors.push(`${clientKey}: domain ${d.host} — ${r.error}`);
        }

        // 3) Stripe — delete the customer (cancels any remaining subscription).
        if (c.stripe_customer_id && stripeConfigured()) {
          try {
            await getStripe().customers.del(c.stripe_customer_id);
          } catch (e) {
            errors.push(`${clientKey}: stripe customer — ${e instanceof Error ? e.message : "error"}`);
          }
        }

        // 4) Atomic DB erasure of everything keyed to this client_key.
        const [{ counts }] = await sql<{ counts: Record<string, number> }[]>`
          SELECT chapter_config.purge_tenant(${clientKey}) AS counts
        `;
        const total = Object.values(counts || {}).reduce((a, b) => a + Number(b), 0);

        // 5) Supabase auth — remove the login identity(ies).
        const supabase = createSupabaseServiceRoleClient();
        for (const u of users) {
          if (!u.user_id) continue;
          const { error } = await supabase.auth.admin.deleteUser(u.user_id);
          if (error) errors.push(`${clientKey}: auth user ${u.user_id} — ${error.message}`);
        }

        purged.push(`${c.business_name || clientKey} (${clientKey}) — ${total} rows`);
      } catch (e) {
        errors.push(`${clientKey}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  } catch (e) {
    errors.push(`fatal: ${e instanceof Error ? e.message : "error"}`);
  } finally {
    await sql.end({ timeout: 5 });
  }

  if ((purged.length || errors.length) && process.env.CHAPTER_GCHAT_WEBHOOK_URL) {
    const lines = ["🧹 *Account purge (30-day grace elapsed)*"];
    if (purged.length) lines.push(`*Purged:*\n${purged.map((p) => `• ${p}`).join("\n")}`);
    if (errors.length) lines.push(`*Errors:*\n${errors.map((e) => `• ${e}`).join("\n")}`);
    try { await postToGChat({ text: lines.join("\n\n") }); } catch { /* non-fatal */ }
  }

  return NextResponse.json({ purged: purged.length, errors });
}
