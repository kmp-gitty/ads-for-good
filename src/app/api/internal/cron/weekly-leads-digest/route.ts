// Weekly cron — emails each self-serve tenant a CSV of their captured leads
// (with site-journey enrichment), then PURGES those leads from Chapter. That's
// the "short-term storage" contract: Chapter never holds a customer's raw
// contact more than ~a week; the weekly CSV is the client's archive.
//
// Delete only happens AFTER a successful send — if we can't deliver (no
// recipient / email not configured / send error), the leads are kept for next
// run so nothing is lost.
//
// Schedule: Mondays 08:00 UTC.

import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { Resend } from "resend";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";
import { postToGChat } from "@/app/lib/monitoring/gchat";
import { toCsv, LEAD_COLUMNS } from "@/app/lib/leads/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type LeadRow = {
  id: string;
  captured_at: string | null;
  email: string | null;
  phone: string | null;
  prompt_slug: string | null;
  consent_value: string | null;
  consent_declined: boolean | null;
  consent_text: string | null;
  responses_jsonb: Record<string, unknown> | null;
  page_url: string | null;
  ip_country: string | null;
  pages_viewed: number | null;
  first_seen: string | null;
  entry_channel: string | null;
};

export async function GET(req: NextRequest) {
  const unauth = unauthorizedIfNotCron(req);
  if (unauth) return unauth;

  const conn = process.env.DATABASE_DIRECT_URL;
  if (!conn) return NextResponse.json({ error: "DATABASE_DIRECT_URL not configured" }, { status: 500 });

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const from = process.env.FROM_EMAIL;

  const sql = postgres(conn, { ssl: "require", prepare: false, max: 1, keep_alive: 60, connect_timeout: 10, idle_timeout: 20 });
  const errors: string[] = [];
  let tenantsEmailed = 0;
  let leadsSent = 0;

  try {
    await sql`SET statement_timeout = '4min'`;

    const tenants = await sql<{ client_key: string }[]>`
      SELECT DISTINCT client_key FROM chapter_engagement.captured_leads
    `;

    for (const t of tenants) {
      const clientKey = t.client_key;
      try {
        const leads = await sql<LeadRow[]>`
          SELECT l.id::text AS id, l.captured_at, l.email, l.phone, l.prompt_slug,
                 l.consent_value, l.consent_declined, l.consent_text, l.responses_jsonb,
                 l.page_url, l.ip_country,
                 COALESCE(pv.pages_viewed, 0) AS pages_viewed, pv.first_seen,
                 j.entry_channel
          FROM chapter_engagement.captured_leads l
          LEFT JOIN LATERAL (
            SELECT COUNT(*) FILTER (WHERE pe.event_name = 'page_view') AS pages_viewed,
                   MIN(pe.ts) AS first_seen
            FROM chapter_ingest.pixel_events pe
            WHERE pe.journey_id = l.journey_id
          ) pv ON true
          LEFT JOIN LATERAL (
            SELECT COALESCE(jj.first_touch->>'utm_source', jj.first_touch->>'referrer', 'direct') AS entry_channel
            FROM chapter_journey.journeys jj
            WHERE jj.id = l.journey_id
            LIMIT 1
          ) j ON true
          WHERE l.client_key = ${clientKey}
          ORDER BY l.captured_at DESC
        `;
        if (leads.length === 0) continue;

        const owner = await sql<{ email: string }[]>`
          SELECT email FROM chapter_config.users
          WHERE client_key = ${clientKey} AND role = 'client_employee' AND revoked_at IS NULL
          ORDER BY created_at ASC LIMIT 1
        `;
        const to = owner[0]?.email;
        const bizRow = await sql<{ business_name: string | null }[]>`
          SELECT business_name FROM chapter_config.clients WHERE client_key = ${clientKey}
        `;
        const business = bizRow[0]?.business_name || clientKey;

        if (!resend || !from || !to) {
          errors.push(`${clientKey}: no recipient / email not configured — kept ${leads.length} lead(s)`);
          continue; // keep leads; don't delete what we couldn't deliver
        }

        const rows = leads.map((l) => ({
          captured_at: l.captured_at ? new Date(l.captured_at).toISOString() : "",
          email: l.email,
          phone: l.phone,
          prompt_slug: l.prompt_slug,
          consent_value: l.consent_value,
          consent_declined: l.consent_declined ? "yes" : "",
          consent_text: l.consent_text,
          responses: l.responses_jsonb && Object.keys(l.responses_jsonb).length ? l.responses_jsonb : "",
          page_url: l.page_url,
          ip_country: l.ip_country,
          pages_viewed: l.pages_viewed ?? 0,
          entry_channel: l.entry_channel,
          first_seen: l.first_seen ? new Date(l.first_seen).toISOString() : "",
        }));
        const csv = toCsv(LEAD_COLUMNS, rows);
        const filename = `chapter-leads-${new Date().toISOString().slice(0, 10)}.csv`;

        await resend.emails.send({
          to,
          from: `Chapter (via Ads for Good) <${from}>`,
          replyTo: "katoa@ads4good.com",
          subject: `Your Chapter leads — ${leads.length} this week`,
          html: leadsEmailHtml(business, leads.length),
          attachments: [{ filename, content: Buffer.from(csv).toString("base64") }],
        });

        // Delivered — purge exactly the leads we sent.
        const ids = leads.map((l) => l.id);
        await sql`DELETE FROM chapter_engagement.captured_leads WHERE id = ANY(${ids}::uuid[])`;
        tenantsEmailed++;
        leadsSent += leads.length;
      } catch (e) {
        errors.push(`${clientKey}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  if (errors.length > 0) {
    await postToGChat({ text: `⚠️ weekly-leads-digest: ${errors.length} issue(s)\n${errors.join("\n")}` }).catch(() => {});
  }
  return NextResponse.json({ ok: true, tenantsEmailed, leadsSent, errors });
}

function leadsEmailHtml(business: string, count: number): string {
  const b = business.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1F2D43;">
    <img src="https://www.ads4good.com/images/ads4Good_Logo_500x500.png" alt="Ads for Good" width="46" height="46" style="border-radius:8px;margin-bottom:16px;" />
    <h2 style="font-size:19px;margin:0 0 6px;">Your leads this week</h2>
    <p style="font-size:14px;line-height:1.55;color:#5C6B82;margin:0 0 14px;">
      Attached is a CSV of the <strong>${count}</strong> contact${count === 1 ? "" : "s"} ${b} captured through your Chapter prompts this week — with what they submitted, their consent, and how they got to your site.
    </p>
    <p style="font-size:13px;line-height:1.55;color:#5C6B82;margin:0 0 14px;">
      Heads-up on the <strong>Declined</strong> column: those visitors didn&rsquo;t opt in to marketing — please don&rsquo;t add them to email/SMS blasts. (A single &ldquo;you forgot your code&rdquo; style reminder is generally fine in the US; a marketing blast isn&rsquo;t.)
    </p>
    <p style="font-size:13px;line-height:1.55;color:#5C6B82;margin:0;">
      These leads are now removed from Chapter — this CSV is your record. You can also export anytime from the <strong>Leads</strong> tab.
    </p>
    <p style="font-size:12px;color:#8A98AD;margin:22px 0 0;">Sent via Chapter · Ads for Good</p>
  </div>`;
}
