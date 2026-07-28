// chapter_internal CRM adapter (2026-07-27).
//
// Writes captured leads to our own crm.prospects Supabase table. Only used by
// agency-internal tenants (adsforgood_prod today). External clients would use
// klaviyo/mailchimp/hubspot/salesforce adapters (shells today; fill in when a
// client asks).
//
// Upsert semantic: SELECT by lower(email) first, UPDATE if found (append
// tags + last_touch_at + append this submission to metadata.submissions[]),
// INSERT if not. `crm.prospects` has no unique constraint on lower(email) so
// we can't use ON CONFLICT (email) — the SELECT-then-write pattern is what we
// need. Volume today is low (single-digit prospects/day on ads4good.com); the
// race window between SELECT and INSERT is negligible.

import { createClient } from "@supabase/supabase-js";
import type { CrmAdapter, LeadInput, LeadResult } from "./types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// crm.prospects.source has no CHECK constraint on the values we've seen so
// far, but existing rows use a specific 9-value vocabulary
// (contact_tool/inbound/referral/linkedin/event/podcast/webinar/cold_email/
// cold_call). 'inbound' fits best for an unprompted form submission.
const PROSPECT_SOURCE_FOR_IDENTITY_PROMPT = "inbound";

// business_name is NOT NULL on crm.prospects. Synthesize from email domain
// when we don't otherwise know the company.
function synthesizeBusinessName(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return "Unknown";
  const domain = email.slice(at + 1).toLowerCase();
  // "example.com" → "example.com" (leave as-is, gives operator a stable label)
  return domain;
}

// Generate a stable-ish prospect_key from email. Used only for new rows.
function generateProspectKey(email: string): string {
  const local = email.split("@")[0]?.toLowerCase() || "lead";
  const slug = local.replace(/[^a-z0-9]/g, "").slice(0, 20) || "lead";
  const uniq = Math.random().toString(16).slice(2, 8);
  return `${slug}-${uniq}`;
}

export const internalAdapter: CrmAdapter = {
  provider: "chapter_internal",

  async upsertLead(input: LeadInput): Promise<LeadResult> {
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { action: "skipped", reason: "invalid_email" };
    }

    const submissionRecord = {
      submitted_at: new Date().toISOString(),
      prompt_slug: input.prompt_slug,
      page_url: input.page_url ?? null,
      ip_country: input.ip_country ?? null,
      responses: input.responses ?? null,
      source_client_key: input.client_key,
    };

    try {
      // Lookup by lower(email) via the existing prospects_email_idx.
      const { data: existing, error: lookupErr } = await supabase
        .schema("crm")
        .from("prospects")
        .select("id, tags, metadata")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (lookupErr) {
        return { action: "error", provider: "chapter_internal", error: lookupErr.message };
      }

      if (existing) {
        // UPDATE — merge tags (append if not present), append submission to
        // metadata.submissions[], bump last_touch_at, update phone/name if we
        // now have them and prior row didn't.
        const currentTags = (existing.tags as string[] | null) ?? [];
        const nextTags = Array.from(
          new Set([...currentTags, "identity_prompt", `prompt:${input.prompt_slug}`]),
        );
        const currentMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
        const currentSubmissions = Array.isArray(currentMeta.submissions)
          ? (currentMeta.submissions as unknown[])
          : [];
        const nextMeta = {
          ...currentMeta,
          submissions: [...currentSubmissions, submissionRecord].slice(-50), // cap history
        };

        const patch: Record<string, unknown> = {
          tags: nextTags,
          metadata: nextMeta,
          last_touch_at: new Date().toISOString(),
        };
        if (input.phone) patch.phone_number = input.phone; // upgrade if we now have phone
        if (input.contact_name) patch.contact_name = input.contact_name;

        const { error: updErr } = await supabase
          .schema("crm")
          .from("prospects")
          .update(patch)
          .eq("id", existing.id);
        if (updErr) {
          return { action: "error", provider: "chapter_internal", error: updErr.message };
        }
        return { action: "updated", provider: "chapter_internal", prospect_id: existing.id };
      }

      // INSERT — new prospect.
      const domain = email.split("@")[1] ?? null;
      const businessName = synthesizeBusinessName(email);
      const prospectKey = generateProspectKey(email);

      const { data: inserted, error: insErr } = await supabase
        .schema("crm")
        .from("prospects")
        .insert({
          business_name: businessName,
          contact_name: input.contact_name ?? null,
          email,
          phone_number: input.phone ?? null,
          domain,
          prospect_key: prospectKey,
          stage: "new",
          source: PROSPECT_SOURCE_FOR_IDENTITY_PROMPT,
          tags: ["identity_prompt", `prompt:${input.prompt_slug}`],
          consent_mode: "opt_in", // default; the specific prompt's consent
                                   // config lives in the submission record
          metadata: {
            origin: "identity_prompt",
            first_captured_via: input.prompt_slug,
            first_captured_page_url: input.page_url ?? null,
            first_captured_client_key: input.client_key,
            submissions: [submissionRecord],
          },
          last_touch_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insErr) {
        return { action: "error", provider: "chapter_internal", error: insErr.message };
      }
      return {
        action: "created",
        provider: "chapter_internal",
        prospect_id: (inserted as { id: string }).id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { action: "error", provider: "chapter_internal", error: message };
    }
  },
};
