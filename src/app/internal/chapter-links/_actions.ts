"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { clearRulesCache } from "@/app/lib/redirect/rules";
import { authorizeLinksClient } from "@/app/lib/auth/links-access";

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

// Every action authorizes from the SESSION via authorizeLinksClient — these
// are also rendered in clients' own dashboards now, so an argument-supplied
// client_key is never trusted on its own. Actions that address a rule by id
// read the row first and authorize ITS client_key, then scope the write to it.

// Both surfaces the workbench renders on — the operator route and the
// client's own dashboard (whose internal path is /chapter/links after the
// clean-URL rewrite).
function revalidateWorkbench(clientKey: string) {
  revalidatePath(`/internal/chapter-links/${clientKey}`);
  revalidatePath(`/chapter/${clientKey}/links`);
  revalidatePath("/chapter/links");
}

async function loadRule(id: string): Promise<{ client_key: string; slug: string } | null> {
  const { data } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .select("client_key, slug")
    .eq("id", id)
    .maybeSingle();
  return (data as { client_key: string; slug: string } | null) ?? null;
}

export async function createRule(input: RuleFormInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  const cond = parseConditions(input.condition_jsonb);
  if (!cond.ok) return { ok: false, error: cond.error };
  if (!input.client_key || !input.slug || !input.destination_template) {
    return { ok: false, error: "client_key, slug, and destination_template are required" };
  }
  const auth = await authorizeLinksClient(input.client_key);
  if (!auth.ok) return { ok: false, error: auth.error };

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
  revalidateWorkbench(input.client_key);
  return { ok: true, id: data?.id };
}

export async function updateRule(id: string, input: RuleFormInput): Promise<{ ok: boolean; error?: string }> {
  const cond = parseConditions(input.condition_jsonb);
  if (!cond.ok) return { ok: false, error: cond.error };
  const row = await loadRule(id);
  if (!row) return { ok: false, error: "Rule not found." };
  const auth = await authorizeLinksClient(row.client_key);
  if (!auth.ok) return { ok: false, error: auth.error };

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
    .eq("id", id)
    .eq("client_key", row.client_key);

  if (error) return { ok: false, error: error.message };

  // Clear both the old and new slug: a renamed rule must stop serving under
  // the old one immediately, not after the cache expires.
  clearRulesCache(row.client_key, row.slug);
  clearRulesCache(row.client_key, input.slug);
  revalidateWorkbench(row.client_key);
  return { ok: true };
}

export async function deleteRule(id: string, _client_key: string, _slug: string): Promise<{ ok: boolean; error?: string }> {
  const row = await loadRule(id);
  if (!row) return { ok: false, error: "Rule not found." };
  const auth = await authorizeLinksClient(row.client_key);
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .delete()
    .eq("id", id)
    .eq("client_key", row.client_key);

  if (error) return { ok: false, error: error.message };

  clearRulesCache(row.client_key, row.slug);
  revalidateWorkbench(row.client_key);
  return { ok: true };
}

export async function toggleRule(id: string, enabled: boolean, _client_key: string, _slug: string): Promise<{ ok: boolean; error?: string }> {
  const row = await loadRule(id);
  if (!row) return { ok: false, error: "Rule not found." };
  const auth = await authorizeLinksClient(row.client_key);
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_key", row.client_key);

  if (error) return { ok: false, error: error.message };

  clearRulesCache(row.client_key, row.slug);
  revalidateWorkbench(row.client_key);
  return { ok: true };
}
