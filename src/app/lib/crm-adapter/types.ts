// CRM adapter types (2026-07-27).
//
// Mirrors the ESP adapter pattern (src/app/lib/email-send/types.ts) — one
// adapter per CRM destination, selector routes by chapter_config.clients.crm_provider.
// Captured identity-prompt leads are forwarded to the client's chosen CRM
// destination WITHOUT persisting raw email/phone in Chapter's DB unless the
// destination IS Chapter's own crm.prospects table (chapter_internal).
//
// Privacy contract per provider:
//   - null              → no sync; matches Chapter's "we don't touch raw" default
//   - chapter_internal  → writes to our own crm.prospects (agency-internal only)
//   - klaviyo/mailchimp → raw email transits Chapter's server → 3rd party API,
//                         doesn't persist. Processor role, not storage role.
//   - hubspot/salesforce → same as above
//   - custom            → operator-supplied webhook; same processor role

export type CrmProvider =
  | "chapter_internal"
  | "klaviyo"
  | "mailchimp"
  | "hubspot"
  | "salesforce"
  | "custom";

// Input shape captured at prompt submission and passed to the adapter.
// email is required for MVP — the fastest path (raw email is server-side in
// /api/chapter/identity-prompt-email). Phone / contact_name / responses are
// optional and land based on what the specific prompt captured.
export type LeadInput = {
  client_key: string;
  prompt_slug: string;
  email: string;
  phone?: string | null;
  contact_name?: string | null;
  responses?: Record<string, unknown> | null; // extra Custom Form fields
  page_url?: string | null;
  ip_country?: string | null;
};

export type LeadResult =
  | { action: "created"; provider: CrmProvider; prospect_id?: string; external_id?: string }
  | { action: "updated"; provider: CrmProvider; prospect_id?: string; external_id?: string }
  | { action: "not_implemented"; provider: CrmProvider; reason: string }
  | { action: "skipped"; reason: string }
  | { action: "error"; provider: CrmProvider; error: string };

export interface CrmAdapter {
  provider: CrmProvider;
  upsertLead(input: LeadInput): Promise<LeadResult>;
}
