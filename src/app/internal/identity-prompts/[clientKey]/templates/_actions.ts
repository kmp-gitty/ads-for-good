"use server";

// MI v2 Phase 3 — server actions for template authoring.
// Reads/writes chapter_config.email_templates. PK is (client_key, template_type).

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getCurrentChapterUserOrLegacy } from "@/app/lib/auth/chapter-user";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type TemplateFormInput = {
  client_key: string;
  template_type: string;  // 'welcome_offer' | 'offer_accepted' | etc. — operator-chosen
  subject: string;
  body: string;
};

type Result = { ok: true } | { ok: false; error: string };

const TEMPLATE_TYPE_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

function validate(input: TemplateFormInput): string | null {
  if (!input.client_key) return "client_key required";
  if (!TEMPLATE_TYPE_PATTERN.test(input.template_type)) {
    return "template_type must be lowercase letters/digits/underscore (2-64 chars, starting with a letter)";
  }
  if (!input.subject.trim()) return "subject required";
  if (!input.body.trim()) return "body required";
  return null;
}

export async function upsertTemplate(input: TemplateFormInput): Promise<Result> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const user = await getCurrentChapterUserOrLegacy();
  const updatedBy = user?.email || "system";

  const { error } = await supabase
    .schema("chapter_config")
    .from("email_templates")
    .upsert(
      {
        client_key: input.client_key,
        template_type: input.template_type,
        subject: input.subject.trim(),
        body: input.body.trim(),
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_key,template_type" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/internal/identity-prompts/${input.client_key}/templates`);
  return { ok: true };
}

export async function deleteTemplate(
  client_key: string,
  template_type: string,
): Promise<Result> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("email_templates")
    .delete()
    .eq("client_key", client_key)
    .eq("template_type", template_type);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/internal/identity-prompts/${client_key}/templates`);
  return { ok: true };
}
