// Mailchimp CRM/ESP adapter stub (2026-07-27).
//
// Fill in when the first client asks. Shape (from Mailchimp Marketing API):
//   PUT https://<dc>.api.mailchimp.com/3.0/lists/<list_id>/members/<subscriber_hash>
//   Authorization: apikey <api_key>
//   Body: { email_address, status, merge_fields: { FNAME, LNAME, PHONE, ... } }
//   subscriber_hash = MD5(lowercase(email))
// Credentials JSON shape: { api_key: "abc-us1", list_id: "..." }

import type { CrmAdapter, LeadInput, LeadResult } from "./types";

export const mailchimpAdapter: CrmAdapter = {
  provider: "mailchimp",
  async upsertLead(_input: LeadInput): Promise<LeadResult> {
    return {
      action: "not_implemented",
      provider: "mailchimp",
      reason: "Mailchimp adapter not yet wired — fill in with Members PUT when first client asks",
    };
  },
};
