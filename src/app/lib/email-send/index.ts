// MI v2 Phase 3 — Email send orchestrator.
//
// Entry point for all auto-emails: identity prompt submissions, Make an Offer
// state transitions, Remind Me notifications. Picks the adapter based on
// client.email_mechanism + optional per-prompt override, renders the template,
// sends, writes audit log.
//
// All callers go through sendEmail(). Direct Resend calls in /api/inquiry,
// /api/chapter/identity-prompt-email, etc. predate this and are left as-is for
// now (migration is mechanical when needed).

import { createClient } from "@supabase/supabase-js";
import type {
  EmailAdapter,
  EmailSendInput,
  EmailSendResult,
  ClientEmailConfig,
  EmailMechanism,
} from "./types";
import { renderTemplate } from "./templates/render";
import { resendAdapter } from "./direct-adapters/resend";
import { klaviyoAdapter } from "./esp-adapters/klaviyo";
import { mailchimpAdapter } from "./esp-adapters/mailchimp";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Adapter registry keyed by the effective provider name.
const ADAPTERS: Record<string, EmailAdapter> = {
  resend: resendAdapter,
  klaviyo: klaviyoAdapter,
  mailchimp: mailchimpAdapter,
};

// Resolve which adapter to use based on the effective mechanism + client config.
function pickAdapter(
  effectiveMechanism: EmailMechanism,
  client: ClientEmailConfig,
): { adapter: EmailAdapter | null; provider: string } {
  if (effectiveMechanism === "direct") return { adapter: ADAPTERS.resend, provider: "resend" };
  if (effectiveMechanism === "esp_klaviyo") return { adapter: ADAPTERS.klaviyo, provider: "klaviyo" };
  if (effectiveMechanism === "esp_mailchimp") return { adapter: ADAPTERS.mailchimp, provider: "mailchimp" };
  // Fallback: if mechanism is ambiguous, default to direct.
  return { adapter: ADAPTERS.resend, provider: "resend" };
}

export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  // 1. Client config lookup
  const { data: client, error: clientErr } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("client_key, email_mechanism, esp_provider, esp_credentials_jsonb, email_reply_to, email_sender_domain")
    .eq("client_key", input.client_key)
    .maybeSingle();

  if (clientErr || !client) {
    return await auditAndReturn(input, "unknown", {
      ok: false,
      provider: "unknown",
      error: clientErr?.message || "client_not_found",
      retryable: false,
    });
  }

  // 2. Template lookup
  const { data: template, error: templateErr } = await supabase
    .schema("chapter_config")
    .from("email_templates")
    .select("template_type, subject, body")
    .eq("client_key", input.client_key)
    .eq("template_type", input.template_type)
    .maybeSingle();

  if (templateErr || !template) {
    return await auditAndReturn(input, "unknown", {
      ok: false,
      provider: "unknown",
      error: templateErr?.message || `template_not_found: ${input.template_type}`,
      retryable: false,
    });
  }

  // 3. Pick adapter (per-prompt override beats per-client default)
  const clientConfig: ClientEmailConfig = client as ClientEmailConfig;
  const effective = input.mechanism_override || clientConfig.email_mechanism || "direct";
  const { adapter, provider } = pickAdapter(effective, clientConfig);

  if (!adapter) {
    return await auditAndReturn(input, provider, {
      ok: false,
      provider,
      error: `no adapter for mechanism: ${effective}`,
      retryable: false,
    });
  }

  // 4. Render
  const rendered = renderTemplate({
    subject: template.subject,
    body: template.body,
    merge_data: input.merge_data,
    client: clientConfig,
  });

  // 5. Send
  const result = await adapter.send({
    rendered,
    client: clientConfig,
    recipient: input.recipient,
  });

  // 6. Audit
  return await auditAndReturn(input, provider, result);
}

// Write a row to chapter_engagement.email_sends and return the result unchanged.
// Audit failure is logged but doesn't propagate — never block on the audit log.
async function auditAndReturn(
  input: EmailSendInput,
  provider: string,
  result: EmailSendResult,
): Promise<EmailSendResult> {
  try {
    await supabase.schema("chapter_engagement").from("email_sends").insert({
      client_key: input.client_key,
      identity_key: input.recipient.identity_key,
      source_type: input.source_type,
      source_id: input.source_id ? Number(input.source_id) : null,
      mechanism: provider,
      template_id: input.template_type,
      esp_message_id: result.ok ? result.message_id : null,
      status: result.ok ? "sent" : "failed",
      status_detail: result.ok ? null : result.error,
      sent_at: result.ok ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.warn("[email-send] audit log insert failed:", e instanceof Error ? e.message : String(e));
  }
  return result;
}

// Re-export types for callers
export type { EmailSendInput, EmailSendResult, EmailRecipient, EmailMergeData, EmailSourceType, EmailMechanism } from "./types";
