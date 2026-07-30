// Account data export — the bundle a tenant is emailed when they request
// deletion. Four CSVs (Leads, Submissions, Smart Links, Smart Prompts) attached
// to a single Resend email. Reused by the delete-request action; the state flip
// only proceeds once this returns ok, so the owner always leaves with their data.
//
// Reads via service_role — the caller has already verified the session owns this
// client_key, and we're bundling that one tenant's own rows.

import { Resend } from "resend";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { toCsv } from "@/app/lib/leads/csv";

type Col = { key: string; label: string };

const LEAD_COLS: Col[] = [
  { key: "captured_at", label: "Captured at" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "prompt_slug", label: "Prompt" },
  { key: "consent_value", label: "Consent" },
  { key: "consent_declined", label: "Declined" },
  { key: "consent_text", label: "Consent text" },
  { key: "responses", label: "Form responses" },
  { key: "page_url", label: "Captured on page" },
  { key: "ip_country", label: "Country" },
];

const SUBMISSION_COLS: Col[] = [
  { key: "submitted_at", label: "Submitted at" },
  { key: "prompt_slug", label: "Prompt" },
  { key: "responses", label: "Responses" },
  { key: "page_url", label: "Page" },
  { key: "ip_country", label: "Country" },
];

const LINK_COLS: Col[] = [
  { key: "slug", label: "Link slug" },
  { key: "rule_priority", label: "Priority" },
  { key: "condition", label: "Conditions" },
  { key: "destination_template", label: "Destination" },
  { key: "description", label: "Description" },
  { key: "enabled", label: "Enabled" },
  { key: "hit_count", label: "Clicks" },
  { key: "created_at", label: "Created" },
];

const PROMPT_COLS: Col[] = [
  { key: "slug", label: "Prompt slug" },
  { key: "preset_type", label: "Type" },
  { key: "headline", label: "Headline" },
  { key: "trigger", label: "Trigger" },
  { key: "enabled", label: "Enabled" },
  { key: "hit_count", label: "Shown" },
  { key: "submit_count", label: "Submitted" },
  { key: "created_at", label: "Created" },
];

function b64(csv: string): string {
  return Buffer.from(csv).toString("base64");
}

export type ExportResult = { ok: true } | { ok: false; error: string };

export async function emailAccountExport(opts: {
  clientKey: string;
  toEmail: string;
  businessName: string;
}): Promise<ExportResult> {
  const { clientKey, toEmail, businessName } = opts;
  const from = process.env.FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from) return { ok: false, error: "Email isn’t configured." };
  if (!toEmail) return { ok: false, error: "No email address on file to send your export to." };

  const supabase = createSupabaseServiceRoleClient();
  const eng = supabase.schema("chapter_engagement");
  const cfg = supabase.schema("chapter_config");

  const [leadsRes, subsRes, linksRes, promptsRes] = await Promise.all([
    eng.from("captured_leads")
      .select("captured_at, email, phone, prompt_slug, consent_value, consent_declined, consent_text, responses_jsonb, page_url, ip_country")
      .eq("client_key", clientKey).order("captured_at", { ascending: false }),
    eng.from("prompt_responses")
      .select("submitted_at, prompt_slug, responses_jsonb, page_url, ip_country")
      .eq("client_key", clientKey).order("submitted_at", { ascending: false }),
    cfg.from("redirect_rules")
      .select("slug, rule_priority, condition_jsonb, destination_template, description, enabled, hit_count, created_at")
      .eq("client_key", clientKey).order("slug"),
    cfg.from("identity_prompts")
      .select("slug, preset_type, headline, trigger_jsonb, enabled, hit_count, submit_count, created_at")
      .eq("client_key", clientKey).order("slug"),
  ]);

  const leadRows = (leadsRes.data ?? []).map((r) => ({
    captured_at: r.captured_at ? new Date(r.captured_at as string).toISOString() : "",
    email: r.email, phone: r.phone, prompt_slug: r.prompt_slug,
    consent_value: r.consent_value, consent_declined: r.consent_declined ? "yes" : "",
    consent_text: r.consent_text,
    responses: r.responses_jsonb && Object.keys(r.responses_jsonb as object).length ? r.responses_jsonb : "",
    page_url: r.page_url, ip_country: r.ip_country,
  }));
  const subRows = (subsRes.data ?? []).map((r) => ({
    submitted_at: r.submitted_at ? new Date(r.submitted_at as string).toISOString() : "",
    prompt_slug: r.prompt_slug,
    responses: r.responses_jsonb && Object.keys(r.responses_jsonb as object).length ? r.responses_jsonb : "",
    page_url: r.page_url, ip_country: r.ip_country,
  }));
  const linkRows = (linksRes.data ?? []).map((r) => ({
    slug: r.slug, rule_priority: r.rule_priority,
    condition: r.condition_jsonb && Object.keys(r.condition_jsonb as object).length ? r.condition_jsonb : "(any)",
    destination_template: r.destination_template, description: r.description,
    enabled: r.enabled ? "yes" : "no", hit_count: r.hit_count ?? 0,
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : "",
  }));
  const promptRows = (promptsRes.data ?? []).map((r) => ({
    slug: r.slug, preset_type: r.preset_type, headline: r.headline,
    trigger: r.trigger_jsonb ?? "", enabled: r.enabled ? "yes" : "no",
    hit_count: r.hit_count ?? 0, submit_count: r.submit_count ?? 0,
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : "",
  }));

  const stamp = new Date().toISOString().slice(0, 10);
  const attachments = [
    { filename: `leads-${stamp}.csv`, content: b64(toCsv(LEAD_COLS, leadRows)) },
    { filename: `submissions-${stamp}.csv`, content: b64(toCsv(SUBMISSION_COLS, subRows)) },
    { filename: `smart-links-${stamp}.csv`, content: b64(toCsv(LINK_COLS, linkRows)) },
    { filename: `smart-prompts-${stamp}.csv`, content: b64(toCsv(PROMPT_COLS, promptRows)) },
  ];

  const counts = { leads: leadRows.length, submissions: subRows.length, links: linkRows.length, prompts: promptRows.length };

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      to: toEmail,
      from: `Chapter by Ads for Good <${from}>`,
      replyTo: "katoa@ads4good.com",
      subject: `Your Chapter data export — ${businessName}`,
      html: exportEmailHtml(businessName, counts),
      attachments,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn’t send your export email." };
  }
}

function exportEmailHtml(business: string, c: { leads: number; submissions: number; links: number; prompts: number }): string {
  return `
  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1F2D43;max-width:560px;margin:0 auto;">
    <p style="font-size:15px;">Here's a full copy of your Chapter data for <strong>${business}</strong>, attached as CSV files:</p>
    <ul style="font-size:14px;color:#5C6B82;line-height:1.7;">
      <li><strong>${c.leads}</strong> lead${c.leads === 1 ? "" : "s"} (leads-*.csv)</li>
      <li><strong>${c.submissions}</strong> form submission${c.submissions === 1 ? "" : "s"} (submissions-*.csv)</li>
      <li><strong>${c.links}</strong> Smart Link${c.links === 1 ? "" : "s"} (smart-links-*.csv)</li>
      <li><strong>${c.prompts}</strong> Smart Prompt${c.prompts === 1 ? "" : "s"} (smart-prompts-*.csv)</li>
    </ul>
    <p style="font-size:13px;color:#5C6B82;line-height:1.6;">Your account is scheduled for deletion in 30 days. If you change your mind, sign in and choose <strong>Reactivate</strong> before then — nothing is removed until the 30 days are up. After that, all of the above is permanently erased.</p>
    <p style="font-size:12px;color:#8A98AD;margin-top:24px;">Chapter · by Ads for Good — <a href="https://www.ads4good.com" style="color:#E36410;">ads4good.com</a></p>
  </div>`;
}
