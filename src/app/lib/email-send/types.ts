// MI v2 Phase 3 — Auto-email send infrastructure.
//
// Type definitions for the email-send abstraction. The orchestrator picks an
// adapter based on the client's email_mechanism (+ optional per-prompt override)
// and routes the send through it. All sends write a row to
// chapter_engagement.email_sends for audit + status tracking.

export type EmailRecipient = {
  email: string;
  identity_key: string;  // email_sha256:<hex> or phone_sha256:<hex> — required for email_sends audit
  name?: string;
};

export type EmailMergeData = Record<string, string | number | boolean | null>;

export type EmailSourceType =
  | "identity_prompt"     // Phase 1.5 Email Exchange + Phase 2 Custom Form auto-email submit action
  | "offer_response"      // Phase 5 Make an Offer state transitions
  | "subscription_event"  // Phase 6 Remind Me notifications
  | "test_send";          // Operator test from template authoring UI

export type EmailSendInput = {
  client_key: string;
  template_type: string;     // 'welcome_offer' | 'offer_accepted' | 'back_in_stock' | etc.
  recipient: EmailRecipient;
  merge_data: EmailMergeData;
  source_type: EmailSourceType;
  source_id?: bigint | null;  // FK to source row (offers.id, subscriptions.id, etc.) when available
  mechanism_override?: EmailMechanism | null;  // Per-prompt override (identity_prompts.email_mechanism_override)
};

export type EmailMechanism = "direct" | "esp_klaviyo" | "esp_mailchimp";

export type EmailSendResult =
  | { ok: true; provider: string; message_id: string }
  | { ok: false; provider: string; error: string; retryable: boolean };

export type ClientEmailConfig = {
  client_key: string;
  email_mechanism: EmailMechanism;
  esp_provider: string | null;
  esp_credentials_jsonb: Record<string, unknown> | null;
  email_reply_to: string | null;
  email_sender_domain: string | null;
};

export type RenderedTemplate = {
  subject: string;
  html: string;
  text: string;
};

export type AdapterContext = {
  rendered: RenderedTemplate;
  client: ClientEmailConfig;
  recipient: EmailRecipient;
};

export type EmailAdapter = {
  name: string;
  send(ctx: AdapterContext): Promise<EmailSendResult>;
};
