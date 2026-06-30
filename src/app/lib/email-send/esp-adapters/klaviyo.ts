// MI v2 Phase 3 — Klaviyo ESP adapter (shell).
//
// Klaviyo doesn't support arbitrary transactional sends via API in the way
// Resend does — instead, the integration pattern is "Trigger Flow with profile +
// event" where Klaviyo's flow templates handle the actual rendering and send.
// For MI v2, that means:
//   1. The composable form submit produces a Klaviyo metric event (custom event
//      type like "Chapter — Identity Captured" or "Chapter — Offer Made")
//   2. The operator pre-configures Klaviyo flows triggered by those events
//   3. Klaviyo sends the email using ITS templates, not Chapter's
//
// This is fundamentally different from the Resend direct-send model. Chapter
// passes profile + event payload; Klaviyo does the rest.
//
// IMPLEMENTATION NOT YET WIRED. This shell defines the interface so Phase 5/6
// can call sendEmail() without branching on provider; first Klaviyo client
// onboarding triggers the actual implementation.
//
// Expected client config:
//   client.esp_provider = 'klaviyo'
//   client.esp_credentials_jsonb = {
//     api_key: '<klaviyo private key, server-side>',
//     // optional per-template-type metric_name overrides:
//     metric_overrides: { offer_accepted: 'Chapter — Offer Accepted', ... }
//   }
//
// References:
//   - Klaviyo events API: https://developers.klaviyo.com/en/reference/create_event
//   - Profile upsert: https://developers.klaviyo.com/en/reference/create_profile

import type { EmailAdapter, EmailSendResult, AdapterContext } from "../types";

export const klaviyoAdapter: EmailAdapter = {
  name: "klaviyo",
  async send(_ctx: AdapterContext): Promise<EmailSendResult> {
    return {
      ok: false,
      provider: "klaviyo",
      error: "klaviyo_adapter_not_yet_implemented",
      retryable: false,
    };
  },
};
