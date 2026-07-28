// HubSpot CRM adapter stub (2026-07-27).
//
// Fill in when the first client asks. Shape (from HubSpot CRM API v3):
//   POST https://api.hubapi.com/crm/v3/objects/contacts
//   Authorization: Bearer <access_token>
//   Body: { properties: { email, phone, firstname, lastname, ... } }
// For dedupe: GET https://api.hubapi.com/crm/v3/objects/contacts/{email}?idProperty=email
// Credentials JSON shape: { access_token: "pat-..." }

import type { CrmAdapter, LeadInput, LeadResult } from "./types";

export const hubspotAdapter: CrmAdapter = {
  provider: "hubspot",
  async upsertLead(_input: LeadInput): Promise<LeadResult> {
    return {
      action: "not_implemented",
      provider: "hubspot",
      reason: "HubSpot adapter not yet wired — fill in with CRM Contacts API when first client asks",
    };
  },
};
