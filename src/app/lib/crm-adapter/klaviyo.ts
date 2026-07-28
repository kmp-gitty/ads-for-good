// Klaviyo CRM/ESP adapter stub (2026-07-27).
//
// Fill in when the first client asks. Shape (from Klaviyo Profile API v2):
//   POST https://a.klaviyo.com/api/profiles/
//   Authorization: Klaviyo-API-Key <api_key>
//   Body: { data: { type: "profile", attributes: { email, phone_number, first_name, ... } } }
// On existing profile: PATCH https://a.klaviyo.com/api/profiles/{id}/
// Credentials JSON shape: { api_key: "pk_..." }

import type { CrmAdapter, LeadInput, LeadResult } from "./types";

export const klaviyoAdapter: CrmAdapter = {
  provider: "klaviyo",
  async upsertLead(_input: LeadInput): Promise<LeadResult> {
    return {
      action: "not_implemented",
      provider: "klaviyo",
      reason: "Klaviyo adapter not yet wired — fill in with Profile API POST/PATCH when first client asks",
    };
  },
};
