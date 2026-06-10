"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { clearRulesCache } from "@/app/lib/redirect/rules";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type RuleFormInput = {
  client_key: string;
  slug: string;
  rule_priority: number;
  condition_jsonb: string;     // raw JSON string from textarea
  destination_template: string;
  description: string;
  enabled: boolean;
};

function parseConditions(raw: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "condition_jsonb must be a JSON object" };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function createRule(input: RuleFormInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  const cond = parseConditions(input.condition_jsonb);
  if (!cond.ok) return { ok: false, error: cond.error };
  if (!input.client_key || !input.slug || !input.destination_template) {
    return { ok: false, error: "client_key, slug, and destination_template are required" };
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .insert({
      client_key: input.client_key,
      slug: input.slug,
      rule_priority: input.rule_priority,
      condition_jsonb: cond.value,
      destination_template: input.destination_template,
      description: input.description || null,
      enabled: input.enabled,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  clearRulesCache(input.client_key, input.slug);
  revalidatePath(`/internal/redirect-rules/${input.client_key}`);
  return { ok: true, id: data?.id };
}

export async function updateRule(id: string, input: RuleFormInput): Promise<{ ok: boolean; error?: string }> {
  const cond = parseConditions(input.condition_jsonb);
  if (!cond.ok) return { ok: false, error: cond.error };

  const { error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .update({
      slug: input.slug,
      rule_priority: input.rule_priority,
      condition_jsonb: cond.value,
      destination_template: input.destination_template,
      description: input.description || null,
      enabled: input.enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  clearRulesCache(input.client_key, input.slug);
  revalidatePath(`/internal/redirect-rules/${input.client_key}`);
  return { ok: true };
}

export async function deleteRule(id: string, client_key: string, slug: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  clearRulesCache(client_key, slug);
  revalidatePath(`/internal/redirect-rules/${client_key}`);
  return { ok: true };
}

export async function toggleRule(id: string, enabled: boolean, client_key: string, slug: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  clearRulesCache(client_key, slug);
  revalidatePath(`/internal/redirect-rules/${client_key}`);
  return { ok: true };
}
