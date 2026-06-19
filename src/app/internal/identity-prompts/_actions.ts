"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type PromptFormInput = {
  client_key: string;
  slug: string;
  trigger_type: "click_element" | "exit_intent" | "time_on_page" | "scroll_depth";
  trigger_selector?: string;
  trigger_delay_ms?: number;
  trigger_percent?: number;
  headline: string;
  body: string;
  input_mode: "email" | "phone" | "either";
  email_placeholder: string;
  phone_placeholder: string;
  button_label: string;
  success_message: string;
  offer_code: string;
  offer_description: string;
  post_submit_action: "message" | "button" | "redirect" | "email";
  post_submit_url: string;
  post_submit_button_label: string;
  email_subject: string;
  email_body: string;
  frequency: "session" | "visitor" | "every_visit";
  frequency_days: number;
  enabled: boolean;
};

type Result = { ok: true } | { ok: false; error: string };

function buildTriggerJsonb(input: PromptFormInput): Record<string, unknown> {
  switch (input.trigger_type) {
    case "click_element":
      return { type: "click_element", selector: input.trigger_selector?.trim() || "" };
    case "exit_intent":
      return { type: "exit_intent" };
    case "time_on_page":
      return { type: "time_on_page", delay_ms: input.trigger_delay_ms || 15000 };
    case "scroll_depth":
      return { type: "scroll_depth", percent: input.trigger_percent || 50 };
  }
}

function validate(input: PromptFormInput): string | null {
  if (!input.client_key) return "client_key required";
  if (!/^[a-z0-9_]+$/.test(input.slug)) return "slug must be lowercase letters/digits/underscore";
  if (!input.headline.trim()) return "headline required";
  if (input.trigger_type === "click_element" && !input.trigger_selector?.trim()) {
    return "click_element trigger requires a CSS selector";
  }
  if (input.post_submit_action === "button" || input.post_submit_action === "redirect") {
    if (!input.post_submit_url.trim()) {
      return `${input.post_submit_action} post-submit action requires a URL`;
    }
    if (!/^https?:\/\//i.test(input.post_submit_url.trim())) {
      return "post-submit URL must start with http:// or https://";
    }
  }
  if (input.post_submit_action === "email" && input.input_mode === "phone") {
    return "email post-submit action requires the prompt to collect email (input mode must be Email or Either)";
  }
  if (input.post_submit_action === "email" && !input.offer_code.trim()) {
    return "email post-submit action requires an offer code (it's what the email contains)";
  }
  return null;
}

function shapePayload(input: PromptFormInput) {
  return {
    slug: input.slug,
    trigger_jsonb: buildTriggerJsonb(input),
    headline: input.headline.trim(),
    body: input.body.trim() || null,
    input_mode: input.input_mode,
    email_placeholder: input.email_placeholder.trim() || "you@email.com",
    phone_placeholder: input.phone_placeholder.trim() || "(555) 555-5555",
    button_label: input.button_label.trim() || "Submit",
    success_message: input.success_message.trim() || "Thanks!",
    offer_code: input.offer_code.trim() || null,
    offer_description: input.offer_description.trim() || null,
    post_submit_action: input.post_submit_action,
    post_submit_url: input.post_submit_url.trim() || null,
    post_submit_button_label: input.post_submit_button_label.trim() || "Claim it",
    email_subject: input.email_subject.trim() || null,
    email_body: input.email_body.trim() || null,
    frequency: input.frequency,
    frequency_days: input.frequency === "visitor" ? input.frequency_days : null,
    enabled: input.enabled,
  };
}

export async function createPrompt(input: PromptFormInput): Promise<Result> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const { error } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .insert({ client_key: input.client_key, ...shapePayload(input) });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/internal/identity-prompts/${input.client_key}`);
  revalidatePath("/internal/identity-prompts");
  return { ok: true };
}

export async function updatePrompt(id: string, input: PromptFormInput): Promise<Result> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const { error } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .update({ ...shapePayload(input), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/internal/identity-prompts/${input.client_key}`);
  revalidatePath("/internal/identity-prompts");
  return { ok: true };
}

export async function togglePrompt(
  id: string,
  enabled: boolean,
  client_key: string,
): Promise<Result> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/internal/identity-prompts/${client_key}`);
  return { ok: true };
}

export async function deletePrompt(id: string, client_key: string): Promise<Result> {
  const { error } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/internal/identity-prompts/${client_key}`);
  return { ok: true };
}
