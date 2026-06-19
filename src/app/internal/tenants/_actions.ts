"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type Result = { ok: true } | { ok: false; error: string };

function bump() {
  revalidatePath("/internal/tenants");
}

// ─── Agencies ───────────────────────────────────────────────────────────────

export async function createAgency(input: {
  agency_key: string;
  display_name: string;
  contact_email: string;
  notes: string;
}): Promise<Result> {
  const k = input.agency_key.trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(k)) return { ok: false, error: "agency_key must be lowercase letters/digits/underscore" };
  if (!input.display_name.trim()) return { ok: false, error: "display_name required" };

  const { error } = await supabase
    .schema("chapter_config")
    .from("agencies")
    .insert({
      agency_key: k,
      display_name: input.display_name.trim(),
      contact_email: input.contact_email.trim() || null,
      notes: input.notes.trim() || null,
    });
  if (error) return { ok: false, error: error.message };
  bump();
  return { ok: true };
}

// ─── Allowed email domains ──────────────────────────────────────────────────

export async function createAllowedDomain(input: {
  domain: string;
  role: "chapter_staff" | "agency_operator" | "client_employee";
  agency_key: string;
  client_key: string;
  notes: string;
}): Promise<Result> {
  const d = input.domain.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return { ok: false, error: "domain must be a valid hostname (e.g. example.com)" };

  // Role-scope validation mirrors the chapter_config.users CHECK constraint.
  if (input.role === "chapter_staff") {
    if (input.agency_key || input.client_key) {
      return { ok: false, error: "chapter_staff role: leave agency_key and client_key empty" };
    }
  } else if (input.role === "agency_operator") {
    if (!input.agency_key) return { ok: false, error: "agency_operator role requires agency_key" };
    if (input.client_key) return { ok: false, error: "agency_operator role: leave client_key empty" };
  } else if (input.role === "client_employee") {
    if (!input.client_key) return { ok: false, error: "client_employee role requires client_key" };
    if (input.agency_key) return { ok: false, error: "client_employee role: leave agency_key empty" };
  }

  const { error } = await supabase
    .schema("chapter_config")
    .from("allowed_email_domains")
    .insert({
      domain: d,
      role: input.role,
      agency_key: input.agency_key.trim() || null,
      client_key: input.client_key.trim() || null,
      notes: input.notes.trim() || null,
    });
  if (error) return { ok: false, error: error.message };
  bump();
  return { ok: true };
}

export async function revokeAllowedDomain(id: string): Promise<Result> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("allowed_email_domains")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  bump();
  return { ok: true };
}

// ─── Users (allowlist) ──────────────────────────────────────────────────────

export async function revokeUser(id: string): Promise<Result> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("users")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  bump();
  return { ok: true };
}

export async function unrevokeUser(id: string): Promise<Result> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("users")
    .update({ revoked_at: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  bump();
  return { ok: true };
}

// ─── Client → agency assignment ─────────────────────────────────────────────

export async function assignClientToAgency(client_key: string, agency_key: string | null): Promise<Result> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .update({ agency_key: agency_key || null, updated_at: new Date().toISOString() })
    .eq("client_key", client_key);
  if (error) return { ok: false, error: error.message };
  bump();
  return { ok: true };
}
