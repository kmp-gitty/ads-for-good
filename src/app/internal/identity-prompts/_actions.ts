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
  preset_type: "email_exchange" | "custom_form" | "custom_notification" | "make_an_offer" | "phone_call" | "remind_me" | "custom";
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
  post_submit_action: "message" | "button" | "redirect" | "email" | "email_message";
  post_submit_url: string;
  post_submit_button_label: string;
  email_subject: string;
  email_body: string;
  frequency: "session" | "visitor" | "every_visit";
  frequency_days: number;
  enabled: boolean;
  // MI v2 Phase 2A — composable shape (used when preset_type !== 'email_exchange')
  content_blocks_jsonb?: Array<{ type: string; text: string }>;
  form_fields_jsonb?: Array<{ id: string; type: string; label: string; required: boolean; placeholder?: string; options?: string[]; for_identity?: boolean }>;
  // MI v2 Phase 2B — multi-page (used when Custom Form has multi-page toggled on)
  pages_jsonb?: {
    pages: Array<{
      id: string;
      content_blocks: Array<{ type: string; text: string }>;
      form_fields: Array<{ id: string; type: string; label: string; required: boolean; placeholder?: string; options?: string[]; for_identity?: boolean }>;
    }>;
    progress_indicator: boolean;
    back_button: boolean;
    // MI v2 Phase 2B.1 — conditional branching rules
    branching?: Array<{
      from_page_id: string;
      field_id: string;
      operator: "equals";
      value: string;
      to_page_id: string;
    }>;
  } | null;
  // MI v2 Phase 2C — recovery flow (close-button recapture)
  recovery_jsonb?: {
    enabled: boolean;
    trigger: "close_button";
    content_blocks: Array<{ type: string; text: string }>;
    form_fields: Array<{ id: string; type: string; label: string; required: boolean; placeholder?: string; options?: string[]; for_identity?: boolean }>;
    max_attempts: number;
  } | null;
  // MI v2 Phase 4 — bubble container + CTA actions (Custom Notification + future presets)
  // MI v2 Phase 5 — `target` is the offer's target resource (product / collection / storewide)
  //                 for make_an_offer preset. Read by the pixel renderer.
  container_jsonb?: {
    type: "modal" | "bubble";
    position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    target?:
      | { type: "product"; product_id: string; product_name?: string; list_price?: number }
      | { type: "collection"; collection_id: string; collection_name?: string }
      | { type: "storewide" };
  } | null;
  submit_actions_jsonb?: {
    cta_type?: "dismiss_only" | "button" | "yes_no";
    cta_label?: string;
    cta_url?: string;
    yes_label?: string;
    yes_url?: string;
    no_label?: string;
  } | null;
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
  // Email Exchange stores its headline in the dedicated `headline` column.
  // Composable presets (custom_form / custom_notification / phone_call /
  // make_an_offer / remind_me) put their headline inside content_blocks_jsonb.
  // For those, top-level `headline` is optional.
  if (input.preset_type === "email_exchange" && !input.headline.trim()) {
    return "headline required";
  }
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
  if ((input.post_submit_action === "email" || input.post_submit_action === "email_message") && input.input_mode === "phone") {
    return "email post-submit actions require the prompt to collect email (input mode must be Email or Either)";
  }
  if (input.post_submit_action === "email" && !input.offer_code.trim()) {
    return "'Send email with offer' requires an offer code. Use 'Send email message' if you don't want an offer.";
  }
  if (input.post_submit_action === "email_message" && !input.email_body.trim()) {
    return "'Send email message' requires an email body";
  }
  return null;
}

function shapePayload(input: PromptFormInput) {
  // Composable jsonb columns are populated only for non-Email-Exchange presets.
  // Email Exchange continues writing the v1.5 dedicated columns; the composable
  // columns stay null. preset_type discriminates which renderer path runs.
  const isComposable = input.preset_type !== "email_exchange";
  return {
    preset_type: input.preset_type,
    slug: input.slug,
    trigger_jsonb: buildTriggerJsonb(input),
    content_blocks_jsonb: isComposable ? (input.content_blocks_jsonb ?? null) : null,
    form_fields_jsonb: isComposable ? (input.form_fields_jsonb ?? null) : null,
    pages_jsonb: isComposable ? (input.pages_jsonb ?? null) : null,
    recovery_jsonb: isComposable ? (input.recovery_jsonb ?? null) : null,
    container_jsonb: isComposable ? (input.container_jsonb ?? null) : null,
    submit_actions_jsonb: isComposable ? (input.submit_actions_jsonb ?? null) : null,
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
