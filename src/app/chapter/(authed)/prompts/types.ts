// Shared types for the self-serve Smart Prompts surface (Phase 3). Kept out of
// the "use server" _actions.ts (which can only export async functions) so both
// the client editor and the server actions import from here.
//
// This is a deliberately TRIMMED mirror of the operator PromptFormInput
// (src/app/internal/identity-prompts/_actions.ts): v1 self-serve scope is the
// 4 presets Email Exchange / Custom Form / Custom Notification / Phone Call,
// with NO email-sending post-submit actions (those need per-tenant ESP setup)
// and NO Make an Offer / Remind Me. `client_key` is intentionally absent — it
// is always derived from the authenticated session, never from the form.

export type SelfServePresetType =
  | "email_exchange"
  | "custom_form"
  | "custom_notification"
  | "phone_call";

export type ContentBlock = { type: string; text: string };

// Self-serve form field types. email/phone are always identity fields
// (for_identity is set automatically at save); number/email/phone carry
// validation the pixel enforces on submit.
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "single_choice"
  | "multi_choice";

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "single_choice", label: "Single-select (choose one)" },
  { value: "multi_choice", label: "Multi-select (choose several)" },
];

export const CHOICE_TYPES: FieldType[] = ["single_choice", "multi_choice"];
export const IDENTITY_TYPES: FieldType[] = ["email", "phone"];

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  for_identity?: boolean;
};

export type NotificationContainer = {
  type: "bubble";
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
};

// Optional consent element captured with a lead (off / checkbox / Yes-No).
export type ConsentConfig = {
  mode: "off" | "checkbox" | "choice";
  text: string;
  default_checked: boolean;
  required: boolean;
};

export type SubmitActions = {
  cta_type?: "dismiss_only" | "button" | "yes_no";
  cta_label?: string;
  cta_url?: string;
  yes_label?: string;
  yes_url?: string;
  no_label?: string;
  // Shown in the bubble after a yes/button click (when it doesn't open a link).
  ack_message?: string;
};

export type SelfServePromptInput = {
  preset_type: SelfServePresetType;
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
  // Optional discount/offer shown in the success state (display-only; no email).
  offer_code: string;
  offer_description: string;
  // v1 self-serve: message | button | redirect only (no email-sending actions).
  post_submit_action: "message" | "button" | "redirect";
  post_submit_url: string;
  post_submit_button_label: string;
  frequency: "session" | "visitor" | "every_visit";
  frequency_days: number;
  enabled: boolean;
  // Composable jsonb (populated for non-email_exchange presets by the builders).
  content_blocks_jsonb?: ContentBlock[] | null;
  form_fields_jsonb?: FormField[] | null;
  container_jsonb?: NotificationContainer | null;
  submit_actions_jsonb?: SubmitActions | null;
  consent_jsonb?: ConsentConfig | null;
};

// Row shape read back for the list + edit surfaces.
export type ExistingPrompt = {
  id: string;
  slug: string;
  preset_type: string;
  trigger_jsonb: Record<string, unknown> | null;
  headline: string;
  body: string | null;
  input_mode: string;
  email_placeholder: string | null;
  phone_placeholder: string | null;
  button_label: string;
  success_message: string | null;
  offer_code: string | null;
  offer_description: string | null;
  post_submit_action: string;
  post_submit_url: string | null;
  post_submit_button_label: string | null;
  frequency: string;
  frequency_days: number | null;
  enabled: boolean;
  hit_count: number;
  submit_count: number;
  last_hit_at: string | null;
  content_blocks_jsonb: ContentBlock[] | null;
  form_fields_jsonb: FormField[] | null;
  container_jsonb: NotificationContainer | null;
  submit_actions_jsonb: SubmitActions | null;
  consent_jsonb: ConsentConfig | null;
};

// A captured lead — the RAW contact (email/phone) a visitor submitted, plus the
// consent record + capture context. Short-term store (weekly CSV → purge).
export type Lead = {
  id: string;
  captured_at: string;
  prompt_slug: string | null;
  email: string | null;
  phone: string | null;
  identity_key: string | null;
  responses_jsonb: Record<string, unknown> | null;
  consent_mode: string | null;
  consent_value: string | null;
  consent_declined: boolean;
  consent_text: string | null;
  page_url: string | null;
  ip_country: string | null;
};

export type PromptResponse = {
  id: string;
  prompt_slug: string;
  identity_key: string | null;
  anonymous_id: string | null;
  responses_jsonb: Record<string, unknown> | null;
  submitted_at: string;
  page_url: string | null;
  ip_country: string | null;
};

export const PRESET_LABELS: Record<SelfServePresetType, string> = {
  email_exchange: "Email Exchange",
  custom_form: "Custom Form",
  custom_notification: "Custom Notification",
  phone_call: "Phone Call",
};
