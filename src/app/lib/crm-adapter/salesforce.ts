// Salesforce CRM adapter stub (2026-07-27).
//
// Fill in when the first client asks. Shape (from Salesforce REST API):
//   POST /services/data/v58.0/sobjects/Lead
//   Authorization: Bearer <oauth_access_token>
//   Body: { Email, Phone, FirstName, LastName, Company, ... }
// Salesforce Lead entity requires Company + LastName as NOT NULL — use email
// domain + email-local-part as fallbacks like the chapter_internal adapter.
// Dedupe by Lead.Email via SOQL: SELECT Id FROM Lead WHERE Email = '...' LIMIT 1
// Credentials JSON shape: { access_token, instance_url, refresh_token, client_id, client_secret }
// (OAuth refresh flow — access tokens expire in ~2h; refresh + retry on 401)

import type { CrmAdapter, LeadInput, LeadResult } from "./types";

export const salesforceAdapter: CrmAdapter = {
  provider: "salesforce",
  async upsertLead(_input: LeadInput): Promise<LeadResult> {
    return {
      action: "not_implemented",
      provider: "salesforce",
      reason: "Salesforce adapter not yet wired — fill in with sobjects/Lead POST + Email SOQL dedupe when first client asks",
    };
  },
};
