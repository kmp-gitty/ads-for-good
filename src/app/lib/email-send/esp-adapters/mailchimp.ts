// MI v2 Phase 3 — Mailchimp ESP adapter (shell).
//
// Mailchimp's pattern is similar to Klaviyo's: trigger a journey/automation by
// adding a tag or merge field on the subscriber, then Mailchimp's journey sends.
// Alternative: Mandrill (Mailchimp transactional) is API-equivalent to Resend.
// Most operators using Mailchimp prefer the Journey-based pattern for
// brand-consistent automation; Mandrill costs extra.
//
// Two integration sub-modes (decide per client at onboarding):
//   A) tag-trigger    : add a tag like "chapter_offer_accepted" → Mailchimp
//                       Journey sends. Operator pre-configures journeys.
//   B) mandrill_send  : direct transactional send via Mandrill API. Adapter
//                       does its own template render.
//
// IMPLEMENTATION NOT YET WIRED. Shell defined so sendEmail() doesn't branch on
// provider. First Mailchimp client onboarding triggers the actual implementation.
//
// Expected client config:
//   client.esp_provider = 'mailchimp'
//   client.esp_credentials_jsonb = {
//     api_key: '<mailchimp/mandrill key>',
//     audience_id: '<mailchimp audience for tag-mode>',
//     mode: 'tag_trigger' | 'mandrill_send',
//   }

import type { EmailAdapter, EmailSendResult, AdapterContext } from "../types";

export const mailchimpAdapter: EmailAdapter = {
  name: "mailchimp",
  async send(_ctx: AdapterContext): Promise<EmailSendResult> {
    return {
      ok: false,
      provider: "mailchimp",
      error: "mailchimp_adapter_not_yet_implemented",
      retryable: false,
    };
  },
};
