"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

// ─── Add Prospect ────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function deriveDomain(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

function firstName(contactName: string | null): string {
  if (!contactName) return "";
  return contactName.trim().split(/\s+/)[0] || "";
}

async function uniqueProspectKey(base: string): Promise<string> {
  // Try base, then base-2, base-3, ... until we find one that doesn't exist.
  const baseSlug = slugify(base) || `prospect-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 1;
  // Cap at 50 attempts to avoid an unbounded loop; collisions are rare.
  for (let i = 0; i < 50; i++) {
    const { data } = await supabase
      .schema("crm")
      .from("prospects")
      .select("id")
      .eq("prospect_key", candidate)
      .limit(1)
      .maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
  // Pathological fallback — append a timestamp.
  return `${baseSlug}-${Date.now()}`;
}

export type AddProspectInput = {
  business_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  stage?: string | null;
  source?: string | null;
  notes?: string | null;
};

export async function addProspect(
  input: AddProspectInput,
): Promise<ActionResult<{ id: string }>> {
  const business_name = input.business_name?.trim();
  if (!business_name) return { ok: false, message: "Business name is required" };

  const contact_name = input.contact_name?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;
  const phone_number = input.phone_number?.trim() || null;
  const stage = (input.stage?.trim() || "new").toLowerCase();
  const source = input.source?.trim() || "internal_page";
  const notes = input.notes?.trim() || null;
  const domain = deriveDomain(email);

  // Dedup by lowercased email if present.
  if (email) {
    const { data: existing, error: dupErr } = await supabase
      .schema("crm")
      .from("prospects")
      .select("id, business_name")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (dupErr) return { ok: false, message: dupErr.message };
    if (existing?.id) {
      return {
        ok: false,
        message: `Prospect with email ${email} already exists (${existing.business_name ?? "no business name"}).`,
      };
    }
  }

  const prospect_key = await uniqueProspectKey(
    `${business_name}-${firstName(contact_name)}`,
  );

  const { data, error } = await supabase
    .schema("crm")
    .from("prospects")
    .insert({
      business_name,
      contact_name,
      email,
      phone_number,
      domain,
      prospect_key,
      stage,
      source,
      notes,
      consent_mode: "opt_in",
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/internal/crm");
  return { ok: true, data: { id: data!.id as string } };
}

// ─── Search Prospects (typeahead) ────────────────────────────────────────────

export type ProspectSearchResult = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
};

export async function searchProspects(
  q: string,
): Promise<ActionResult<ProspectSearchResult[]>> {
  const query = q.trim();
  if (!query) return { ok: true, data: [] };
  // Escape PostgREST `or` syntax — backticks, commas, parens can break it.
  const safe = query.replace(/[(),%]/g, "");
  const { data, error } = await supabase
    .schema("crm")
    .from("prospects")
    .select("id, business_name, contact_name, email")
    .or(
      `business_name.ilike.%${safe}%,contact_name.ilike.%${safe}%,email.ilike.%${safe}%`,
    )
    .limit(10);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data ?? []) as ProspectSearchResult[] };
}

// ─── Log Touchpoint ──────────────────────────────────────────────────────────

const TOUCHPOINT_CHANNELS = new Set([
  "phone",
  "text",
  "linkedin",
  "in_person",
  "other",
  "note",
]);

export type LogTouchpointInput = {
  prospect_id: string;
  channel: string;
  direction?: string | null;
  occurred_at?: string | null; // ISO string; null = now
  subject?: string | null;
  body?: string | null;
};

export async function logTouchpoint(
  input: LogTouchpointInput,
): Promise<ActionResult> {
  const prospect_id = input.prospect_id?.trim();
  if (!prospect_id) return { ok: false, message: "Prospect is required" };

  const channel = (input.channel || "").trim().toLowerCase();
  if (!TOUCHPOINT_CHANNELS.has(channel)) {
    return { ok: false, message: `Invalid channel: ${channel}` };
  }

  const direction = (input.direction || "outbound").trim().toLowerCase();
  if (direction !== "outbound" && direction !== "inbound") {
    return { ok: false, message: `Invalid direction: ${direction}` };
  }

  const occurred_at = input.occurred_at
    ? new Date(input.occurred_at).toISOString()
    : new Date().toISOString();

  const subject = input.subject?.trim() || null;
  const body = input.body?.trim() || null;

  const { error } = await supabase
    .schema("crm")
    .from("communications")
    .insert({
      prospect_id,
      channel,
      direction,
      occurred_at,
      subject,
      body,
      provider: "manual",
      status: "logged",
    });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/internal/crm");
  return { ok: true };
}

// ─── Confirm Meeting ─────────────────────────────────────────────────────────

const MEETING_STATUSES = new Set(["completed", "no_show", "canceled"]);

export async function confirmMeeting(
  meetingId: string,
  status: "completed" | "no_show" | "canceled",
): Promise<ActionResult> {
  if (!meetingId) return { ok: false, message: "Meeting id is required" };
  if (!MEETING_STATUSES.has(status)) {
    return { ok: false, message: `Invalid status: ${status}` };
  }

  // Read existing metadata so we can MERGE (the spec calls this out
  // explicitly — n8n's meeting capture writes event_id / attendee / etc. into
  // metadata, so a clobber here would destroy that audit trail).
  const { data: row, error: readErr } = await supabase
    .schema("crm")
    .from("communications")
    .select("metadata")
    .eq("id", meetingId)
    .limit(1)
    .maybeSingle();
  if (readErr) return { ok: false, message: readErr.message };
  if (!row) return { ok: false, message: "Meeting not found" };

  const existingMeta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const mergedMeta = {
    ...existingMeta,
    confirmed_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supabase
    .schema("crm")
    .from("communications")
    .update({ status, metadata: mergedMeta })
    .eq("id", meetingId);

  if (updateErr) return { ok: false, message: updateErr.message };
  revalidatePath("/internal/crm");
  return { ok: true };
}
