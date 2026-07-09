"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPrompt, updatePrompt, type PromptFormInput } from "../_actions";
import CustomFormBuilder, { type ContentBlock, type FormField } from "./CustomFormBuilder";
import MultiPageBuilder, { type PagesConfig } from "./MultiPageBuilder";
import RecoveryBuilder, { type RecoveryConfig } from "./RecoveryBuilder";
import NotificationBuilder, { type NotificationConfig } from "./NotificationBuilder";
import PhoneCallBuilder, { type PhoneCallConfig, type PhoneCta } from "./PhoneCallBuilder";
import MakeAnOfferBuilder, { type MakeAnOfferConfig } from "./MakeAnOfferBuilder";

type TriggerType = PromptFormInput["trigger_type"];
type Frequency = PromptFormInput["frequency"];
type InputMode = PromptFormInput["input_mode"];
type PostSubmitAction = PromptFormInput["post_submit_action"];
type PresetType = PromptFormInput["preset_type"];

export type ExistingPrompt = {
  id: string;
  slug: string;
  preset_type: string;
  trigger_jsonb: { type?: string; selector?: string; delay_ms?: number; percent?: number };
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
  email_subject: string | null;
  email_body: string | null;
  frequency: string;
  frequency_days: number | null;
  enabled: boolean;
  content_blocks_jsonb: ContentBlock[] | null;
  form_fields_jsonb: FormField[] | null;
  pages_jsonb: PagesConfig | null;
  recovery_jsonb: RecoveryConfig | null;
  container_jsonb: {
    type: string;
    position?: string;
    target?:
      | { type: "product"; product_id: string; product_name?: string; list_price?: number }
      | { type: "collection"; collection_id: string; collection_name?: string }
      | { type: "storewide" };
  } | null;
  submit_actions_jsonb: {
    cta_type?: "dismiss_only" | "button" | "yes_no";
    cta_label?: string;
    cta_url?: string;
    yes_label?: string;
    yes_url?: string;
    no_label?: string;
  } | null;
};

// Phase 1C — Preset roadmap. Email Exchange is the current v1.5 path.
// Other presets render through chapterRenderPromptComposable (pixel widget
// Phase 1B stub) and need their composable form builders to come online
// before they're useful here.
const PRESET_OPTIONS: {
  value: PresetType;
  label: string;
  description: string;
  phase: number;
}[] = [
  { value: "email_exchange",      label: "Email Exchange",      description: "Email field + button + offer reveal on submit. The existing v1 prompt type.",                       phase: 1 },
  { value: "custom_form",         label: "Custom Form",         description: "Multi-field capture. Lead enrichment + qualification.",                                              phase: 2 },
  { value: "custom_notification", label: "Custom Notification", description: "Lightweight corner-bubble (Intercom-style). Yes/no, single CTA, soft offers.",                     phase: 4 },
  { value: "make_an_offer",       label: "Make an Offer",       description: "Cart-recovery bidding with operator-defined thresholds + counter-offer state machine.",            phase: 5 },
  { value: "phone_call",          label: "Phone Call",          description: "CTA-style click-to-call options. No identity capture — analytics-only.",                            phase: 4 },
  { value: "remind_me",           label: "Remind Me",           description: "Persistent monitoring (price drops, restocks). Hourly evaluation + notification on trigger.",      phase: 6 },
];

const inputCls =
  "mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400";

export default function PromptForm({
  client_key,
  prompt,
}: {
  client_key: string;
  prompt?: ExistingPrompt;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!prompt;

  const trig = prompt?.trigger_jsonb ?? {};

  const [presetType, setPresetType] = useState<PresetType>(
    (prompt?.preset_type as PresetType) || "email_exchange",
  );
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(
    prompt?.content_blocks_jsonb ?? [],
  );
  const [formFields, setFormFields] = useState<FormField[]>(
    prompt?.form_fields_jsonb ?? [],
  );
  const [multiPageEnabled, setMultiPageEnabled] = useState<boolean>(
    !!(prompt?.pages_jsonb && prompt.pages_jsonb.pages && prompt.pages_jsonb.pages.length > 0),
  );
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>(
    prompt?.pages_jsonb ?? {
      pages: [{ id: "page_1", content_blocks: [], form_fields: [] }],
      progress_indicator: true,
      back_button: true,
    },
  );
  const [recoveryConfig, setRecoveryConfig] = useState<RecoveryConfig>(
    prompt?.recovery_jsonb ?? {
      enabled: false,
      trigger: "close_button",
      content_blocks: [],
      form_fields: [],
      max_attempts: 1,
    },
  );
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(() => {
    const c = prompt?.container_jsonb;
    const a = prompt?.submit_actions_jsonb;
    return {
      container: {
        type: "bubble",
        position: (c?.position as NotificationConfig["container"]["position"]) || "bottom-right",
      },
      content_blocks: prompt?.content_blocks_jsonb ?? [],
      submit_actions: {
        cta_type: a?.cta_type || "dismiss_only",
        cta_label: a?.cta_label,
        cta_url: a?.cta_url,
        yes_label: a?.yes_label,
        yes_url: a?.yes_url,
        no_label: a?.no_label,
      },
    };
  });
  const [phoneCallConfig, setPhoneCallConfig] = useState<PhoneCallConfig>(() => ({
    content_blocks: (prompt?.content_blocks_jsonb as PhoneCallConfig["content_blocks"]) ?? [],
  }));
  const [makeAnOfferConfig, setMakeAnOfferConfig] = useState<MakeAnOfferConfig>(() => {
    const t = prompt?.container_jsonb && (prompt.container_jsonb as { target?: MakeAnOfferConfig["target"] }).target;
    return {
      content_blocks: prompt?.content_blocks_jsonb ?? [],
      target: t ?? { type: "storewide" },
    };
  });
  const [slug, setSlug] = useState(prompt?.slug ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    (trig.type as TriggerType) || "click_element",
  );
  const [triggerSelector, setTriggerSelector] = useState(trig.selector ?? "");
  const [triggerDelayMs, setTriggerDelayMs] = useState(String(trig.delay_ms ?? 15000));
  const [triggerPercent, setTriggerPercent] = useState(String(trig.percent ?? 50));
  const [headline, setHeadline] = useState(prompt?.headline ?? "");
  const [body, setBody] = useState(prompt?.body ?? "");
  const [inputMode, setInputMode] = useState<InputMode>(
    (prompt?.input_mode as InputMode) || "email",
  );
  const [emailPlaceholder, setEmailPlaceholder] = useState(prompt?.email_placeholder ?? "you@email.com");
  const [phonePlaceholder, setPhonePlaceholder] = useState(prompt?.phone_placeholder ?? "(555) 555-5555");
  const [buttonLabel, setButtonLabel] = useState(prompt?.button_label ?? "Submit");
  const [successMessage, setSuccessMessage] = useState(prompt?.success_message ?? "Thanks!");
  const [offerCode, setOfferCode] = useState(prompt?.offer_code ?? "");
  const [offerDescription, setOfferDescription] = useState(prompt?.offer_description ?? "");
  const [postSubmitAction, setPostSubmitAction] = useState<PostSubmitAction>(
    (prompt?.post_submit_action as PostSubmitAction) || "message",
  );
  const [postSubmitUrl, setPostSubmitUrl] = useState(prompt?.post_submit_url ?? "");
  const [postSubmitButtonLabel, setPostSubmitButtonLabel] = useState(
    prompt?.post_submit_button_label ?? "Claim it",
  );
  const [emailSubject, setEmailSubject] = useState(prompt?.email_subject ?? "");
  const [emailBody, setEmailBody] = useState(prompt?.email_body ?? "");
  const [frequency, setFrequency] = useState<Frequency>(
    (prompt?.frequency as Frequency) || "session",
  );
  const [frequencyDays, setFrequencyDays] = useState(String(prompt?.frequency_days ?? 90));
  const [enabled, setEnabled] = useState(prompt?.enabled ?? true);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Phase 4: when notification or phone_call selected, content_blocks comes
    // from the respective builder (not the form-fields builder).
    let effectiveContentBlocks = multiPageEnabled ? [] : contentBlocks;
    let effectiveContainer: PromptFormInput["container_jsonb"] = null;
    let effectiveSubmitActions: PromptFormInput["submit_actions_jsonb"] = null;
    if (presetType === "custom_notification") {
      effectiveContentBlocks = notificationConfig.content_blocks;
      effectiveContainer = notificationConfig.container;
      effectiveSubmitActions = notificationConfig.submit_actions;
    } else if (presetType === "phone_call") {
      effectiveContentBlocks = phoneCallConfig.content_blocks as ContentBlock[];
      effectiveContainer = { type: "modal" };
    } else if (presetType === "make_an_offer") {
      effectiveContentBlocks = makeAnOfferConfig.content_blocks;
      effectiveContainer = { type: "modal", target: makeAnOfferConfig.target };
    }

    const input: PromptFormInput = {
      client_key,
      preset_type: presetType,
      content_blocks_jsonb: effectiveContentBlocks,
      form_fields_jsonb:
        presetType === "custom_notification" ||
        presetType === "phone_call" ||
        presetType === "make_an_offer"
          ? []
          : multiPageEnabled
            ? []
            : formFields,
      pages_jsonb: multiPageEnabled && presetType === "custom_form" ? pagesConfig : null,
      recovery_jsonb: recoveryConfig.enabled && presetType === "custom_form" ? recoveryConfig : null,
      container_jsonb: effectiveContainer,
      submit_actions_jsonb: effectiveSubmitActions,
      slug: slug.trim().toLowerCase().replace(/\s+/g, "_"),
      trigger_type: triggerType,
      trigger_selector: triggerSelector,
      trigger_delay_ms: parseInt(triggerDelayMs, 10),
      trigger_percent: parseInt(triggerPercent, 10),
      headline,
      body,
      input_mode: inputMode,
      email_placeholder: emailPlaceholder,
      phone_placeholder: phonePlaceholder,
      button_label: buttonLabel,
      success_message: successMessage,
      offer_code: offerCode,
      offer_description: offerDescription,
      post_submit_action: postSubmitAction,
      post_submit_url: postSubmitUrl,
      post_submit_button_label: postSubmitButtonLabel,
      email_subject: emailSubject,
      email_body: emailBody,
      frequency,
      frequency_days: parseInt(frequencyDays, 10),
      enabled,
    };

    startTransition(async () => {
      const res = isEdit
        ? await updatePrompt(prompt!.id, input)
        : await createPrompt(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isEdit) {
        router.push(`/internal/identity-prompts/${client_key}`);
      } else {
        router.refresh();
        setSlug("");
        setTriggerSelector("");
        setHeadline("");
        setBody("");
        setOfferCode("");
        setOfferDescription("");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* MI v2 Phase 1C — preset picker. Email Exchange is the only fully-
       *  built path today; other presets are visible-but-disabled with phase
       *  badges so operators see the roadmap without authoring half-configured
       *  prompts. Each phase unlocks its tile. */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
          Preset
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Email Exchange is the v1 prompt type. New preset types unlock as they ship.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_OPTIONS.map((opt) => {
            const isCurrent = presetType === opt.value;
            const isAvailable =
              opt.value === "email_exchange" ||
              opt.value === "custom_form" ||
              opt.value === "custom_notification" ||
              opt.value === "phone_call" ||
              opt.value === "make_an_offer";
            const disabled = !isAvailable || (isEdit && opt.value !== presetType);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setPresetType(opt.value)}
                className={
                  "rounded-md border p-3 text-left transition " +
                  (isCurrent
                    ? "border-orange-500 bg-orange-50"
                    : isAvailable
                    ? "border-neutral-300 bg-white hover:bg-neutral-50"
                    : "border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{opt.label}</span>
                  {!isAvailable && (
                    <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-mono text-neutral-600">
                      Phase {opt.phase}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-snug text-neutral-600">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
        {isEdit && presetType !== "email_exchange" && (
          <p className="mt-2 text-xs text-orange-700">
            Preset is locked while editing — change requires creating a new prompt.
          </p>
        )}
      </div>

      {presetType === "custom_form" ? (
        <>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Slug</span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="lead_capture"
              required
              className={inputCls + " font-mono"}
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Trigger type</span>
            <select
              value={triggerType}
              onChange={e => setTriggerType(e.target.value as TriggerType)}
              className={inputCls}
            >
              <option value="click_element">Click element (CSS selector)</option>
              <option value="exit_intent">Exit intent (mouse leaves viewport)</option>
              <option value="time_on_page">Time on page</option>
              <option value="scroll_depth">Scroll depth</option>
            </select>
          </label>
        </div>
        {triggerType === "click_element" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">CSS selector</span>
            <input
              type="text"
              value={triggerSelector}
              onChange={e => setTriggerSelector(e.target.value)}
              placeholder=".cta-button, #book-now"
              className={inputCls + " font-mono"}
            />
          </label>
        )}
        {triggerType === "time_on_page" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Delay (ms)</span>
            <input
              type="number"
              value={triggerDelayMs}
              onChange={e => setTriggerDelayMs(e.target.value)}
              min={0}
              className={inputCls + " font-mono"}
            />
          </label>
        )}
        {triggerType === "scroll_depth" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Scroll percent</span>
            <input
              type="number"
              value={triggerPercent}
              onChange={e => setTriggerPercent(e.target.value)}
              min={1} max={100}
              className={inputCls + " font-mono"}
            />
          </label>
        )}

        <div className="rounded-md border border-neutral-300 bg-white p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={multiPageEnabled}
              onChange={e => setMultiPageEnabled(e.target.checked)}
            />
            <span className="font-semibold text-neutral-800">Multi-page form</span>
            <span className="text-xs text-neutral-500">
              Break the form into ordered pages with Next / Back navigation
            </span>
          </label>
        </div>

        {multiPageEnabled ? (
          <MultiPageBuilder value={pagesConfig} onChange={setPagesConfig} />
        ) : (
          <CustomFormBuilder
            contentBlocks={contentBlocks}
            formFields={formFields}
            onChange={(next) => {
              setContentBlocks(next.contentBlocks);
              setFormFields(next.formFields);
            }}
          />
        )}

        <RecoveryBuilder value={recoveryConfig} onChange={setRecoveryConfig} />

        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Frequency</span>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as Frequency)}
              className={inputCls}
            >
              <option value="session">Once per session</option>
              <option value="visitor">Once per visitor</option>
              <option value="every_visit">Every visit (no throttle)</option>
            </select>
          </label>
          {frequency === "visitor" && (
            <label className="text-sm">
              <span className="block font-semibold text-neutral-800">Days</span>
              <input
                type="number"
                value={frequencyDays}
                onChange={e => setFrequencyDays(e.target.value)}
                min={1}
                className={inputCls + " font-mono"}
              />
            </label>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
          <span className="font-semibold text-neutral-800">Enabled</span>
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create prompt")}
        </button>
        </>
      ) : presetType === "custom_notification" || presetType === "phone_call" ? (
        <>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Slug</span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder={presetType === "phone_call" ? "talk_to_sales" : "got_a_question"}
              required
              className={inputCls + " font-mono"}
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Trigger type</span>
            <select
              value={triggerType}
              onChange={e => setTriggerType(e.target.value as TriggerType)}
              className={inputCls}
            >
              <option value="click_element">Click element (CSS selector)</option>
              <option value="exit_intent">Exit intent (mouse leaves viewport)</option>
              <option value="time_on_page">Time on page</option>
              <option value="scroll_depth">Scroll depth</option>
            </select>
          </label>
        </div>
        {triggerType === "click_element" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">CSS selector</span>
            <input
              type="text"
              value={triggerSelector}
              onChange={e => setTriggerSelector(e.target.value)}
              placeholder=".help-bubble"
              className={inputCls + " font-mono"}
            />
          </label>
        )}
        {triggerType === "time_on_page" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Delay (ms)</span>
            <input
              type="number"
              value={triggerDelayMs}
              onChange={e => setTriggerDelayMs(e.target.value)}
              min={0}
              className={inputCls + " font-mono"}
            />
          </label>
        )}
        {triggerType === "scroll_depth" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Scroll percent</span>
            <input
              type="number"
              value={triggerPercent}
              onChange={e => setTriggerPercent(e.target.value)}
              min={1} max={100}
              className={inputCls + " font-mono"}
            />
          </label>
        )}

        {presetType === "custom_notification" ? (
          <NotificationBuilder value={notificationConfig} onChange={setNotificationConfig} />
        ) : (
          <PhoneCallBuilder value={phoneCallConfig} onChange={setPhoneCallConfig} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Frequency</span>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as Frequency)}
              className={inputCls}
            >
              <option value="session">Once per session</option>
              <option value="visitor">Once per visitor</option>
              <option value="every_visit">Every visit (no throttle)</option>
            </select>
          </label>
          {frequency === "visitor" && (
            <label className="text-sm">
              <span className="block font-semibold text-neutral-800">Days</span>
              <input
                type="number"
                value={frequencyDays}
                onChange={e => setFrequencyDays(e.target.value)}
                min={1}
                className={inputCls + " font-mono"}
              />
            </label>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
          <span className="font-semibold text-neutral-800">Enabled</span>
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create prompt")}
        </button>
        </>
      ) : presetType === "make_an_offer" ? (
        <>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Slug</span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="make_offer_hoodie"
              required
              className={inputCls + " font-mono"}
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Trigger type</span>
            <select
              value={triggerType}
              onChange={e => setTriggerType(e.target.value as TriggerType)}
              className={inputCls}
            >
              <option value="click_element">Click element (CSS selector)</option>
              <option value="exit_intent">Exit intent (mouse leaves viewport)</option>
              <option value="time_on_page">Time on page</option>
              <option value="scroll_depth">Scroll depth</option>
            </select>
          </label>
        </div>
        {triggerType === "click_element" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">CSS selector</span>
            <input
              type="text"
              value={triggerSelector}
              onChange={e => setTriggerSelector(e.target.value)}
              placeholder=".make-offer-btn"
              className={inputCls + " font-mono"}
            />
          </label>
        )}
        {triggerType === "time_on_page" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Delay (ms)</span>
            <input
              type="number"
              value={triggerDelayMs}
              onChange={e => setTriggerDelayMs(e.target.value)}
              min={0}
              className={inputCls + " font-mono"}
            />
          </label>
        )}
        {triggerType === "scroll_depth" && (
          <label className="block text-sm">
            <span className="block font-semibold text-neutral-800">Scroll percent</span>
            <input
              type="number"
              value={triggerPercent}
              onChange={e => setTriggerPercent(e.target.value)}
              min={1} max={100}
              className={inputCls + " font-mono"}
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Submit button label</span>
          <input
            type="text"
            value={buttonLabel}
            onChange={e => setButtonLabel(e.target.value)}
            placeholder="Send offer"
            className={inputCls}
          />
        </label>

        <MakeAnOfferBuilder value={makeAnOfferConfig} onChange={setMakeAnOfferConfig} />

        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Frequency</span>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as Frequency)}
              className={inputCls}
            >
              <option value="session">Once per session</option>
              <option value="visitor">Once per visitor</option>
              <option value="every_visit">Every visit (no throttle)</option>
            </select>
          </label>
          {frequency === "visitor" && (
            <label className="text-sm">
              <span className="block font-semibold text-neutral-800">Days</span>
              <input
                type="number"
                value={frequencyDays}
                onChange={e => setFrequencyDays(e.target.value)}
                min={1}
                className={inputCls + " font-mono"}
              />
            </label>
          )}
        </div>

        <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          Auto-accept + counter-offer decisions read from{" "}
          <em>Offer thresholds</em> (product / collection / global scope). Set
          them at the client&apos;s{" "}
          <span className="font-mono">Offer thresholds →</span> page — without a
          threshold row and no list price the bid is routed to manual review.
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
          <span className="font-semibold text-neutral-800">Enabled</span>
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create prompt")}
        </button>
        </>
      ) : presetType !== "email_exchange" ? (
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
          <p className="text-sm font-semibold text-neutral-700">
            {PRESET_OPTIONS.find(p => p.value === presetType)?.label}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Configuration UI ships in Phase {PRESET_OPTIONS.find(p => p.value === presetType)?.phase}.
            Schema is already live — you&apos;ll be able to author this preset as soon as the
            composable form builder lands.
          </p>
          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      ) : (
      <>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Slug</span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="winback_book_now"
            required
            className={inputCls + " font-mono"}
          />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Trigger type</span>
          <select
            value={triggerType}
            onChange={e => setTriggerType(e.target.value as TriggerType)}
            className={inputCls}
          >
            <option value="click_element">Click element (CSS selector)</option>
            <option value="exit_intent">Exit intent (mouse leaves viewport)</option>
            <option value="time_on_page">Time on page</option>
            <option value="scroll_depth">Scroll depth</option>
          </select>
        </label>
      </div>

      {triggerType === "click_element" && (
        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">CSS selector</span>
          <span className="block text-xs text-neutral-500">
            Any element matching this selector. Click is intercepted; prompt fires. Don&apos;t know the selector? Use the <a href="/internal/identity-prompts" className="text-orange-700 underline">Chapter picker bookmarklet</a> to capture one from any storefront.
          </span>
          <input
            type="text"
            value={triggerSelector}
            onChange={e => setTriggerSelector(e.target.value)}
            placeholder="#book-now, .book-cta, a[href*='book']"
            className={inputCls + " font-mono"}
          />
        </label>
      )}
      {triggerType === "exit_intent" && (
        <p className="text-xs text-neutral-500">
          Fires when the visitor moves their cursor toward the top of the viewport (toward tabs/address bar) — the standard &ldquo;leaving the page&rdquo; signal. Sideways and downward exits are ignored.
        </p>
      )}
      {triggerType === "time_on_page" && (
        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Delay (ms)</span>
          <input
            type="number"
            value={triggerDelayMs}
            onChange={e => setTriggerDelayMs(e.target.value)}
            min={0}
            className={inputCls + " font-mono"}
          />
        </label>
      )}
      {triggerType === "scroll_depth" && (
        <label className="block text-sm">
          <span className="block font-semibold text-neutral-800">Scroll percent threshold</span>
          <input
            type="number"
            value={triggerPercent}
            onChange={e => setTriggerPercent(e.target.value)}
            min={1} max={100}
            className={inputCls + " font-mono"}
          />
        </label>
      )}

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Headline</span>
        <input
          type="text"
          value={headline}
          onChange={e => setHeadline(e.target.value)}
          required
          placeholder="Want 10% off your first cut?"
          className={inputCls}
        />
      </label>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Body</span>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={2}
          placeholder="Drop your email and we'll text the code."
          className={inputCls}
        />
      </label>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
          What to collect
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          Pick what the modal asks for. Either-or shows two fields and accepts either.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["email","phone","either"] as InputMode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setInputMode(m)}
              className={`rounded-md border px-3 py-2 text-xs font-medium ${
                inputMode === m
                  ? "border-orange-500 bg-orange-50 text-orange-800"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {m === "email" && "Email only"}
              {m === "phone" && "Phone only"}
              {m === "either" && "Email or phone"}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {(inputMode === "email" || inputMode === "either") && (
            <label className="text-sm">
              <span className="block font-semibold text-neutral-800">Email placeholder</span>
              <input
                type="text"
                value={emailPlaceholder}
                onChange={e => setEmailPlaceholder(e.target.value)}
                placeholder="you@email.com"
                className={inputCls}
              />
            </label>
          )}
          {(inputMode === "phone" || inputMode === "either") && (
            <label className="text-sm">
              <span className="block font-semibold text-neutral-800">Phone placeholder</span>
              <input
                type="text"
                value={phonePlaceholder}
                onChange={e => setPhonePlaceholder(e.target.value)}
                placeholder="(555) 555-5555"
                className={inputCls}
              />
            </label>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Button label</span>
          <input
            type="text"
            value={buttonLabel}
            onChange={e => setButtonLabel(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Success message</span>
          <input
            type="text"
            value={successMessage}
            onChange={e => setSuccessMessage(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <div className="rounded-md border border-orange-200 bg-orange-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
          Offer (shown post-submit, depending on action below)
        </p>
        <p className="mt-1 text-xs text-orange-900/80">
          For <strong>display message</strong>: offer appears in the modal&apos;s success state.
          For <strong>send email</strong>: offer is what the email contains.
          For <strong>button</strong> / <strong>redirect</strong>: include the code in the URL if your landing page needs it (e.g. <code className="rounded bg-white px-1">?promo=WELCOME10</code>).
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Offer code (optional)</span>
            <input
              type="text"
              value={offerCode}
              onChange={e => setOfferCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className={inputCls + " font-mono"}
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Offer description</span>
            <input
              type="text"
              value={offerDescription}
              onChange={e => setOfferDescription(e.target.value)}
              placeholder="Use at checkout for 10% off"
              className={inputCls}
            />
          </label>
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
          What happens after the visitor submits
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {([
            { v: "message", label: "Display message + offer" },
            { v: "email", label: "Send email with offer" },
            { v: "email_message", label: "Send email message" },
            { v: "button", label: "Show a button" },
            { v: "redirect", label: "Redirect immediately" },
          ] as { v: PostSubmitAction; label: string }[]).map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setPostSubmitAction(opt.v)}
              className={`rounded-md border px-3 py-2 text-xs font-medium text-left ${
                postSubmitAction === opt.v
                  ? "border-orange-500 bg-orange-50 text-orange-800"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {(postSubmitAction === "button" || postSubmitAction === "redirect") && (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="block font-semibold text-neutral-800">Destination URL</span>
              <input
                type="url"
                value={postSubmitUrl}
                onChange={e => setPostSubmitUrl(e.target.value)}
                placeholder="https://ads4good.com/welcome?promo=WELCOME10"
                className={inputCls}
              />
            </label>
            {postSubmitAction === "button" && (
              <label className="block text-sm">
                <span className="block font-semibold text-neutral-800">Button label</span>
                <input
                  type="text"
                  value={postSubmitButtonLabel}
                  onChange={e => setPostSubmitButtonLabel(e.target.value)}
                  placeholder="Claim it"
                  className={inputCls}
                />
              </label>
            )}
          </div>
        )}

        {(postSubmitAction === "email" || postSubmitAction === "email_message") && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-neutral-600">
              Sent via Resend. From <strong>ads for Good</strong>, reply-to <code className="rounded bg-white px-1">katoa@ads4good.com</code>.
              {postSubmitAction === "email" && " The offer code (above) renders in a styled box below your body text."}
              {postSubmitAction === "email_message" && " No offer code required — just send your subject + body. (Any offer code set above is ignored for this action.)"}
            </p>
            <label className="block text-sm">
              <span className="block font-semibold text-neutral-800">Email subject{postSubmitAction === "email_message" ? <span className="ml-1 text-orange-500">*</span> : null}</span>
              <span className="block text-xs text-neutral-500">
                {postSubmitAction === "email"
                  ? <>Use <code className="rounded bg-white px-1">{`{offer_code}`}</code> to insert the code. Default: <code className="rounded bg-white px-1">{`Your code: {offer_code}`}</code>.</>
                  : <>Plain text subject line.</>}
              </span>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder={postSubmitAction === "email" ? "Your code: {offer_code}" : "Thanks for reaching out"}
                className={inputCls}
              />
            </label>
            <label className="block text-sm">
              <span className="block font-semibold text-neutral-800">Email body{postSubmitAction === "email_message" ? <span className="ml-1 text-orange-500">*</span> : null}</span>
              <span className="block text-xs text-neutral-500">
                {postSubmitAction === "email"
                  ? "Plain text. Newlines become paragraph breaks. The offer code + description render in a styled box below your body."
                  : "Plain text. Newlines become paragraph breaks. Required for this action."}
              </span>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                rows={6}
                placeholder={"Thanks for signing up — here's your code:"}
                className={inputCls}
              />
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Frequency</span>
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as Frequency)}
            className={inputCls}
          >
            <option value="session">Once per session</option>
            <option value="visitor">Once per visitor</option>
            <option value="every_visit">Every visit (no throttle)</option>
          </select>
        </label>
        {frequency === "visitor" && (
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Visitor frequency window (days)</span>
            <input
              type="number"
              value={frequencyDays}
              onChange={e => setFrequencyDays(e.target.value)}
              min={1}
              className={inputCls + " font-mono"}
            />
          </label>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
        />
        <span className="font-semibold text-neutral-800">Enabled</span>
      </label>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {pending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create prompt")}
      </button>
      </>
      )}
    </form>
  );
}
