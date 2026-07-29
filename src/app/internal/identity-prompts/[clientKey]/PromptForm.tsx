"use client";

// Operator-facing identity-prompt builder (all 6 MI v2 presets).
//
// Visual language ported from the self-serve editor
// (src/app/chapter/(authed)/prompts/PromptEditor.tsx). Shared primitives come
// from `@/app/lib/ui/builder-primitives`. All business logic — server-action
// contract (PromptFormInput), 5 post-submit actions, Email Exchange fields,
// multi-page + recovery + notification + phone-call + make-an-offer builders,
// edit-in-place, preset-locked-once-created — is preserved from the previous
// Tailwind-styled version.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPrompt, updatePrompt, type PromptFormInput } from "../_actions";
import CustomFormBuilder, { type ContentBlock, type FormField } from "./CustomFormBuilder";
import MultiPageBuilder, { type PagesConfig } from "./MultiPageBuilder";
import RecoveryBuilder, { type RecoveryConfig } from "./RecoveryBuilder";
import NotificationBuilder, { type NotificationConfig } from "./NotificationBuilder";
import PhoneCallBuilder, { type PhoneCallConfig } from "./PhoneCallBuilder";
import MakeAnOfferBuilder, { type MakeAnOfferConfig } from "./MakeAnOfferBuilder";
import RemindMeBuilder, { type RemindMeConfig } from "./RemindMeBuilder";
import PromptPreview, {
  type PreviewData,
} from "@/app/chapter/(authed)/prompts/PromptPreview";
import type { SelfServePresetType } from "@/app/chapter/(authed)/prompts/types";
import {
  INK,
  MUTED,
  FAINT,
  ORANGE,
  LINE,
  SUBTLE,
  PANEL,
  inp,
  inpMono,
  Section,
  NumRow,
  PillButton,
  PrimaryButton,
  SecondaryButton,
  ErrorBanner,
} from "@/app/lib/ui/builder-primitives";

type TriggerType = PromptFormInput["trigger_type"];
type Frequency = PromptFormInput["frequency"];
type InputMode = PromptFormInput["input_mode"];
type PostSubmitAction = PromptFormInput["post_submit_action"];
type PresetType = PromptFormInput["preset_type"];

export type ExistingPrompt = {
  id: string;
  slug: string;
  preset_type: string;
  trigger_jsonb: { type?: string; selector?: string; delay_ms?: number; percent?: number; pages?: number };
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
    remind_me?: {
      target: RemindMeConfig["target"];
      trigger: RemindMeConfig["trigger"];
      max_notifications?: number;
    };
  } | null;
  submit_actions_jsonb: {
    cta_type?: "dismiss_only" | "button" | "yes_no";
    cta_label?: string;
    cta_url?: string;
    yes_label?: string;
    yes_url?: string;
    no_label?: string;
    ack_message?: string;
  } | null;
  consent_jsonb: {
    mode: "off" | "checkbox" | "choice";
    text: string;
    default_checked: boolean;
    required: boolean;
  } | null;
  targeting_jsonb: {
    page_match?: {
      mode: "starts_with" | "contains" | "ends_with" | "exact" | "not_contains";
      value: string;
    };
  } | null;
};

type PageMatchMode = NonNullable<NonNullable<ExistingPrompt["targeting_jsonb"]>["page_match"]>["mode"];

type ConsentMode = "off" | "checkbox" | "choice";

// Preset roadmap. Email Exchange / Custom Form / Custom Notification / Phone
// Call / Make an Offer / Remind Me all built end-to-end.
const PRESET_OPTIONS: {
  value: PresetType;
  label: string;
  description: string;
  phase: number;
  available: boolean;
}[] = [
  { value: "email_exchange",      label: "Email Exchange",      description: "Email field + button + offer reveal on submit. The v1 prompt type.",                      phase: 1, available: true  },
  { value: "custom_form",         label: "Custom Form",         description: "Multi-field capture. Lead enrichment + qualification.",                                    phase: 2, available: true  },
  { value: "custom_notification", label: "Custom Notification", description: "Lightweight corner-bubble (Intercom-style). Yes/no, single CTA, soft offers.",           phase: 4, available: true  },
  { value: "phone_call",          label: "Phone Call",          description: "CTA-style click-to-call options. No identity capture — analytics-only.",                  phase: 4, available: true  },
  { value: "make_an_offer",       label: "Make an Offer",       description: "Cart-recovery bidding with operator-defined thresholds + counter-offer state machine.", phase: 5, available: true  },
  { value: "remind_me",           label: "Remind Me",           description: "Persistent monitoring (price drops, restocks). Hourly evaluation + email notification via /api/internal/cron/evaluate-subscriptions.", phase: 6, available: true  },
];

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
  // Remind Me stashes its target + trigger + max_notifications inside
  // container_jsonb (repurposing the existing composable slot). Runtime pixel
  // path reads container_jsonb.remind_me on submit to construct the
  // subscription-create payload.
  const [remindMeConfig, setRemindMeConfig] = useState<RemindMeConfig>(() => {
    if (prompt?.preset_type === "remind_me") {
      const c = prompt.container_jsonb as {
        remind_me?: {
          target?: RemindMeConfig["target"];
          trigger?: RemindMeConfig["trigger"];
          max_notifications?: number;
        };
      } | null;
      return {
        content_blocks: prompt.content_blocks_jsonb ?? [],
        target: c?.remind_me?.target ?? { type: "product", product_id: "" },
        trigger: c?.remind_me?.trigger ?? { type: "back_in_stock" },
        max_notifications: c?.remind_me?.max_notifications,
      };
    }
    return {
      content_blocks: [],
      target: { type: "product", product_id: "" },
      trigger: { type: "back_in_stock" },
      max_notifications: undefined,
    };
  });
  const [slug, setSlug] = useState(prompt?.slug ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    (trig.type as TriggerType) || "click_element",
  );
  const [triggerSelector, setTriggerSelector] = useState(trig.selector ?? "");
  const [triggerDelayMs, setTriggerDelayMs] = useState(Number(trig.delay_ms ?? 15000));
  const [triggerPercent, setTriggerPercent] = useState(Number(trig.percent ?? 50));
  const [triggerPages, setTriggerPages] = useState(Number(trig.pages ?? 3));
  // Page-URL gating (targeting_jsonb.page_match). Empty value = fire everywhere.
  const initPageMatch = prompt?.targeting_jsonb?.page_match;
  const [pageMatchMode, setPageMatchMode] = useState<PageMatchMode>(
    initPageMatch?.mode ?? "starts_with",
  );
  const [pageMatchValue, setPageMatchValue] = useState(initPageMatch?.value ?? "");
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
  const [frequencyDays, setFrequencyDays] = useState(Number(prompt?.frequency_days ?? 90));
  const [enabled, setEnabled] = useState(prompt?.enabled ?? true);

  // Consent (self-serve parity). Applies to email_exchange + custom_form.
  // Off / Checkbox / Yes-No mirror the self-serve pattern exactly.
  const initConsent = prompt?.consent_jsonb;
  const [consentMode, setConsentMode] = useState<ConsentMode>(initConsent?.mode ?? "off");
  const [consentText, setConsentText] = useState(initConsent?.text ?? "");
  const [consentDefaultChecked, setConsentDefaultChecked] = useState(
    !!initConsent?.default_checked,
  );
  const [consentRequired, setConsentRequired] = useState(initConsent?.required ?? true);

  // Ack message for Custom Notification (shown after yes/button click when the
  // CTA doesn't open a link). Read from submit_actions_jsonb.ack_message.
  const [notifAck, setNotifAck] = useState(
    prompt?.submit_actions_jsonb?.ack_message ?? "",
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let effectiveContentBlocks = multiPageEnabled ? [] : contentBlocks;
    let effectiveContainer: PromptFormInput["container_jsonb"] = null;
    let effectiveSubmitActions: PromptFormInput["submit_actions_jsonb"] = null;
    if (presetType === "custom_notification") {
      effectiveContentBlocks = notificationConfig.content_blocks;
      effectiveContainer = notificationConfig.container;
      // Merge ack_message into submit_actions when the CTA type warrants it
      // (yes_no or button — dismiss_only never shows an ack).
      const cta = notificationConfig.submit_actions?.cta_type;
      effectiveSubmitActions = {
        ...notificationConfig.submit_actions,
        ack_message:
          (cta === "yes_no" || cta === "button") && notifAck.trim()
            ? notifAck.trim()
            : undefined,
      };
    } else if (presetType === "phone_call") {
      effectiveContentBlocks = phoneCallConfig.content_blocks as ContentBlock[];
      effectiveContainer = { type: "modal" };
    } else if (presetType === "make_an_offer") {
      effectiveContentBlocks = makeAnOfferConfig.content_blocks;
      effectiveContainer = { type: "modal", target: makeAnOfferConfig.target };
    } else if (presetType === "remind_me") {
      // Remind Me stashes target + trigger + max_notifications inside
      // container_jsonb.remind_me. Pixel reads this on prompt fetch to know
      // which product to subscribe to + what trigger to send with the submit.
      effectiveContentBlocks = remindMeConfig.content_blocks;
      effectiveContainer = {
        type: "modal",
        remind_me: {
          target: remindMeConfig.target,
          trigger: remindMeConfig.trigger,
          max_notifications: remindMeConfig.max_notifications,
        },
      } as PromptFormInput["container_jsonb"];
    }

    const input: PromptFormInput = {
      client_key,
      preset_type: presetType,
      content_blocks_jsonb: effectiveContentBlocks,
      form_fields_jsonb:
        presetType === "custom_notification" ||
        presetType === "phone_call" ||
        presetType === "make_an_offer" ||
        presetType === "remind_me"
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
      trigger_delay_ms: triggerDelayMs,
      trigger_percent: triggerPercent,
      trigger_pages: triggerPages,
      page_match_mode: pageMatchMode,
      page_match_value: pageMatchValue,
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
      frequency_days: frequencyDays,
      enabled,
      // Consent: only meaningful for contact-capturing presets. The server
      // action's shapePayload also gates on preset_type, but we send null for
      // Off here so the DB row is explicit either way.
      consent_jsonb:
        (presetType === "email_exchange" || presetType === "custom_form") &&
        consentMode !== "off"
          ? {
              mode: consentMode,
              text:
                consentText.trim() ||
                (consentMode === "choice" ? "Do you agree?" : "I agree."),
              default_checked:
                consentMode === "checkbox" ? consentDefaultChecked : false,
              required: consentMode === "checkbox" ? consentRequired : true,
            }
          : null,
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

  const isAvailable = (v: PresetType) =>
    !!PRESET_OPTIONS.find((o) => o.value === v)?.available;

  // Which sub-builder should render for the current preset.
  const showsEmailExchange = presetType === "email_exchange";
  const showsCustomForm = presetType === "custom_form";
  const showsNotification = presetType === "custom_notification";
  const showsPhoneCall = presetType === "phone_call";
  const showsMakeAnOffer = presetType === "make_an_offer";
  const showsRemindMe = presetType === "remind_me";

  return (
    <form onSubmit={onSubmit} style={{ padding: 0 }}>
      <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
        {/* Left — form */}
        <div style={{ flex: "1 1 480px", minWidth: 0, maxWidth: 640 }}>
          {/* Preset picker — 3-col grid, locked once created */}
          <Section
            label="Preset"
            hint="Email Exchange is the v1 path. New presets unlock as they ship."
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {PRESET_OPTIONS.map((opt) => {
                const on = presetType === opt.value;
                const disabled = !opt.available || (isEdit && opt.value !== presetType);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setPresetType(opt.value)}
                    style={{
                      border: `1.5px solid ${on ? ORANGE : LINE}`,
                      background: on ? SUBTLE : opt.available ? "white" : PANEL,
                      color: disabled && !on ? FAINT : INK,
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "left",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled && !on ? 0.65 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span>{opt.label}</span>
                      {!opt.available && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: FAINT, background: LINE, padding: "1px 6px", borderRadius: 999, letterSpacing: ".04em" }}>
                          Phase {opt.phase}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11.5, fontWeight: 400, color: MUTED, lineHeight: 1.35 }}>
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
            {isEdit && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: FAINT }}>
                Preset is locked once created — change requires creating a new prompt.
              </div>
            )}
          </Section>

          {/* Slug */}
          <Section label="Slug" hint="Lowercase letters, digits, underscores. Used internally (e.g. welcome_offer).">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={
                showsPhoneCall ? "talk_to_sales" :
                showsNotification ? "got_a_question" :
                showsCustomForm ? "lead_capture" :
                showsMakeAnOffer ? "make_offer_hoodie" :
                "winback_book_now"
              }
              required
              style={inpMono}
            />
          </Section>

          {/* Trigger — common to all presets */}
          <Section label="When it appears">
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              style={inp}
            >
              <option value="click_element">When an element is clicked</option>
              <option value="exit_intent">On exit intent (mouse leaves the page)</option>
              <option value="time_on_page">After time on page</option>
              <option value="scroll_depth">At a scroll depth</option>
              <option value="page_depth">After N pages this session</option>
            </select>

            {triggerType === "click_element" && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  value={triggerSelector}
                  onChange={(e) => setTriggerSelector(e.target.value)}
                  placeholder="#book-now, .book-cta, a[href*='book']"
                  style={inpMono}
                />
                <div style={{ marginTop: 6, fontSize: 11.5, color: FAINT, lineHeight: 1.4 }}>
                  Any element matching this selector. Click is intercepted; prompt fires. Don&apos;t know the selector? Use the{" "}
                  <a href="/internal/identity-prompts" style={{ color: ORANGE, textDecoration: "underline" }}>
                    picker bookmarklet
                  </a>{" "}
                  to capture one from any storefront.
                </div>
              </div>
            )}
            {triggerType === "exit_intent" && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: FAINT, lineHeight: 1.4 }}>
                Fires when the visitor moves their cursor toward the top of the viewport (toward tabs/address bar) — the standard &ldquo;leaving the page&rdquo; signal. Sideways and downward exits are ignored.
              </div>
            )}
            {triggerType === "time_on_page" && (
              <div style={{ marginTop: 8 }}>
                <NumRow label="Delay (ms)" value={triggerDelayMs} onChange={setTriggerDelayMs} min={0} width={140} />
              </div>
            )}
            {triggerType === "scroll_depth" && (
              <div style={{ marginTop: 8 }}>
                <NumRow label="Percent" value={triggerPercent} onChange={setTriggerPercent} min={1} max={100} />
              </div>
            )}
            {triggerType === "page_depth" && (
              <div style={{ marginTop: 8 }}>
                <NumRow label="Pages" value={triggerPages} onChange={setTriggerPages} min={1} max={50} width={140} />
                <div style={{ marginTop: 6, fontSize: 11.5, color: FAINT, lineHeight: 1.4 }}>
                  Fires when the visitor has viewed this many pages or more in the current session. Counter resets when the browser tab closes.
                </div>
              </div>
            )}
          </Section>

          {/* Page-URL gating — applies to all trigger types + all presets */}
          <Section label="Where it appears (optional)">
            <div style={{ fontSize: 11.5, color: FAINT, lineHeight: 1.4, marginBottom: 8 }}>
              Restrict this prompt to specific pages. Empty value = fires on all pages. Matches against the URL pathname (the part after the domain, e.g. <code style={{ background: "#F5F1E8", padding: "0 3px", borderRadius: 3 }}>/cart</code>).
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8 }}>
              <select
                value={pageMatchMode}
                onChange={(e) => setPageMatchMode(e.target.value as PageMatchMode)}
                style={inp}
              >
                <option value="starts_with">URL starts with</option>
                <option value="contains">URL contains</option>
                <option value="ends_with">URL ends with</option>
                <option value="exact">URL is exactly</option>
                <option value="not_contains">URL does NOT contain</option>
              </select>
              <input
                type="text"
                value={pageMatchValue}
                onChange={(e) => setPageMatchValue(e.target.value)}
                placeholder="/cart"
                style={inpMono}
              />
            </div>
            {pageMatchValue.trim() && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>
                Fires when the URL pathname{" "}
                {pageMatchMode === "starts_with" && <>begins with <code style={{ background: "#F5F1E8", padding: "0 3px", borderRadius: 3 }}>{pageMatchValue}</code></>}
                {pageMatchMode === "contains" && <>contains <code style={{ background: "#F5F1E8", padding: "0 3px", borderRadius: 3 }}>{pageMatchValue}</code></>}
                {pageMatchMode === "ends_with" && <>ends with <code style={{ background: "#F5F1E8", padding: "0 3px", borderRadius: 3 }}>{pageMatchValue}</code></>}
                {pageMatchMode === "exact" && <>is exactly <code style={{ background: "#F5F1E8", padding: "0 3px", borderRadius: 3 }}>{pageMatchValue}</code></>}
                {pageMatchMode === "not_contains" && <>does NOT contain <code style={{ background: "#F5F1E8", padding: "0 3px", borderRadius: 3 }}>{pageMatchValue}</code></>}
                .
              </div>
            )}
          </Section>

          {/* Preset-specific bodies */}
          {showsEmailExchange && (
            <>
              <Section label="Headline">
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  required
                  placeholder="Want 10% off your first cut?"
                  style={inp}
                />
              </Section>

              <Section label="Body" hint="Optional supporting line.">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={2}
                  placeholder="Drop your email and we'll text the code."
                  style={{ ...inp, resize: "vertical" }}
                />
              </Section>

              <Section label="What to collect" hint="Pick what the modal asks for. Either-or shows two fields and accepts either.">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {(["email", "phone", "either"] as InputMode[]).map((m) => (
                    <PillButton key={m} on={inputMode === m} onClick={() => setInputMode(m)}>
                      {m === "email" && "Email only"}
                      {m === "phone" && "Phone only"}
                      {m === "either" && "Email or phone"}
                    </PillButton>
                  ))}
                </div>
                {(inputMode === "email" || inputMode === "either") && (
                  <input
                    type="text"
                    value={emailPlaceholder}
                    onChange={(e) => setEmailPlaceholder(e.target.value)}
                    placeholder="Email placeholder"
                    style={{ ...inp, marginTop: 6 }}
                  />
                )}
                {(inputMode === "phone" || inputMode === "either") && (
                  <input
                    type="text"
                    value={phonePlaceholder}
                    onChange={(e) => setPhonePlaceholder(e.target.value)}
                    placeholder="Phone placeholder"
                    style={{ ...inp, marginTop: 8 }}
                  />
                )}
              </Section>

              <Section label="Button label">
                <input
                  type="text"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  style={inp}
                />
              </Section>

              <Section label="Success message" hint="Shown in the modal for the display-message post-submit action.">
                <input
                  type="text"
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  style={inp}
                />
              </Section>

              <Section
                label="Offer"
                hint="Optional. Shown post-submit, depending on action below. For send-email: this is the code the email contains. For button/redirect: include the code in the URL if your landing page needs it."
              >
                <input
                  type="text"
                  value={offerCode}
                  onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                  style={inpMono}
                />
                {offerCode.trim() && (
                  <input
                    type="text"
                    value={offerDescription}
                    onChange={(e) => setOfferDescription(e.target.value)}
                    placeholder="Use at checkout for 10% off"
                    style={{ ...inp, marginTop: 8 }}
                  />
                )}
              </Section>

              <Section label="After they submit">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {([
                    { v: "message", label: "Display message + offer" },
                    { v: "email", label: "Send email with offer" },
                    { v: "email_message", label: "Send email message" },
                    { v: "button", label: "Show a button" },
                    { v: "redirect", label: "Redirect immediately" },
                  ] as { v: PostSubmitAction; label: string }[]).map((opt) => (
                    <PillButton
                      key={opt.v}
                      on={postSubmitAction === opt.v}
                      onClick={() => setPostSubmitAction(opt.v)}
                      block
                    >
                      {opt.label}
                    </PillButton>
                  ))}
                </div>

                {(postSubmitAction === "button" || postSubmitAction === "redirect") && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="url"
                      value={postSubmitUrl}
                      onChange={(e) => setPostSubmitUrl(e.target.value)}
                      placeholder="https://ads4good.com/welcome?promo=WELCOME10"
                      style={inp}
                    />
                    {postSubmitAction === "button" && (
                      <input
                        type="text"
                        value={postSubmitButtonLabel}
                        onChange={(e) => setPostSubmitButtonLabel(e.target.value)}
                        placeholder="Button label"
                        style={{ ...inp, marginTop: 8 }}
                      />
                    )}
                  </div>
                )}

                {(postSubmitAction === "email" || postSubmitAction === "email_message") && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11.5, color: FAINT, marginBottom: 8, lineHeight: 1.4 }}>
                      Sent via Resend. From <strong>ads for Good</strong>, reply-to{" "}
                      <code style={{ background: PANEL, padding: "1px 4px", borderRadius: 4 }}>katoa@ads4good.com</code>.
                      {postSubmitAction === "email" && " The offer code (above) renders in a styled box below your body text."}
                      {postSubmitAction === "email_message" && " No offer code required — just send your subject + body. (Any offer code set above is ignored for this action.)"}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Email subject{postSubmitAction === "email_message" ? <span style={{ color: ORANGE, marginLeft: 4 }}>*</span> : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: FAINT, marginBottom: 6 }}>
                      {postSubmitAction === "email" ? (
                        <>Use <code style={{ background: PANEL, padding: "1px 4px", borderRadius: 4 }}>{`{offer_code}`}</code> to insert the code. Default: <code style={{ background: PANEL, padding: "1px 4px", borderRadius: 4 }}>{`Your code: {offer_code}`}</code>.</>
                      ) : (
                        <>Plain text subject line.</>
                      )}
                    </div>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={postSubmitAction === "email" ? "Your code: {offer_code}" : "Thanks for reaching out"}
                      style={inp}
                    />
                    <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginTop: 10, marginBottom: 4 }}>
                      Email body{postSubmitAction === "email_message" ? <span style={{ color: ORANGE, marginLeft: 4 }}>*</span> : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: FAINT, marginBottom: 6 }}>
                      {postSubmitAction === "email"
                        ? "Plain text. Newlines become paragraph breaks. The offer code + description render in a styled box below your body."
                        : "Plain text. Newlines become paragraph breaks. Required for this action."}
                    </div>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={6}
                      placeholder="Thanks for signing up — here's your code:"
                      style={{ ...inp, resize: "vertical" }}
                    />
                  </div>
                )}
              </Section>
            </>
          )}

          {showsCustomForm && (
            <>
              <Section label="Form">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: INK, cursor: "pointer", marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={multiPageEnabled}
                    onChange={(e) => setMultiPageEnabled(e.target.checked)}
                  />
                  <span style={{ fontWeight: 600 }}>Multi-page form</span>
                  <span style={{ color: FAINT, fontWeight: 400 }}>— Break the form into ordered pages with Next / Back navigation</span>
                </label>

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
              </Section>

              <Section label="Recovery flow" hint="Show a second-chance capture form when the visitor tries to close without submitting.">
                <RecoveryBuilder value={recoveryConfig} onChange={setRecoveryConfig} />
              </Section>
            </>
          )}

          {showsNotification && (
            <>
              <Section label="Notification">
                <NotificationBuilder value={notificationConfig} onChange={setNotificationConfig} />
              </Section>
              {(notificationConfig.submit_actions?.cta_type === "yes_no" ||
                notificationConfig.submit_actions?.cta_type === "button") && (
                <Section
                  label="Acknowledgement message"
                  hint="Shown in the bubble after they click, when the CTA doesn't open a link. Optional."
                >
                  <input
                    type="text"
                    value={notifAck}
                    onChange={(e) => setNotifAck(e.target.value)}
                    placeholder="Thanks — check your inbox!"
                    style={inp}
                  />
                </Section>
              )}
            </>
          )}

          {showsPhoneCall && (
            <Section label="Phone call">
              <PhoneCallBuilder value={phoneCallConfig} onChange={setPhoneCallConfig} />
            </Section>
          )}

          {showsMakeAnOffer && (
            <>
              <Section label="Submit button label">
                <input
                  type="text"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  placeholder="Send offer"
                  style={inp}
                />
              </Section>

              <Section label="Offer">
                <MakeAnOfferBuilder value={makeAnOfferConfig} onChange={setMakeAnOfferConfig} />
              </Section>

              <div style={{ border: `1px dashed ${LINE}`, background: PANEL, borderRadius: 10, padding: "10px 12px", fontSize: 11.5, color: MUTED, lineHeight: 1.5, marginBottom: 16 }}>
                Auto-accept + counter-offer decisions read from <em>Offer thresholds</em> (product / collection / global scope). Set them at the client&apos;s{" "}
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>Offer thresholds →</span> page — without a threshold row and no list price the bid is routed to manual review.
              </div>
            </>
          )}

          {showsRemindMe && (
            <>
              <Section label="Submit button label">
                <input
                  type="text"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  placeholder="Notify me"
                  style={inp}
                />
              </Section>

              <Section label="Success message">
                <input
                  type="text"
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="You're subscribed — we'll email you the moment it's back."
                  style={inp}
                />
              </Section>

              <Section label="Reminder">
                <RemindMeBuilder value={remindMeConfig} onChange={setRemindMeConfig} />
              </Section>

              <div style={{ border: `1px dashed ${LINE}`, background: PANEL, borderRadius: 10, padding: "10px 12px", fontSize: 11.5, color: MUTED, lineHeight: 1.5, marginBottom: 16 }}>
                Subscriptions are evaluated hourly via <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>/api/internal/cron/evaluate-subscriptions</span>. Notification email content is authored per client at{" "}
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>Email templates →</span> (template_types <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>back_in_stock</span> and <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>price_drop</span>). Auto-cancel on purchase happens via <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>/api/purchase</span> hook — subscribers who buy the target product get their subscription flipped to <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>canceled_at</span> automatically.
              </div>
            </>
          )}

          {/* Consent — for presets that capture a contact. Self-serve parity. */}
          {(showsEmailExchange || showsCustomForm) && (
            <Section
              label="Consent"
              hint="Optional. Records an opt-in with each captured lead — recommended if you'll email or text them, or create an account."
            >
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: consentMode === "off" ? 0 : 12,
                }}
              >
                {([
                  ["off", "None"],
                  ["checkbox", "Checkbox"],
                  ["choice", "Ask Yes / No"],
                ] as [ConsentMode, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConsentMode(m)}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "7px 14px",
                      borderRadius: 8,
                      cursor: "pointer",
                      border: `1px solid ${consentMode === m ? ORANGE : LINE}`,
                      background: consentMode === m ? "#FFF4EC" : "white",
                      color: consentMode === m ? ORANGE : INK,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {consentMode !== "off" && (
                <>
                  <textarea
                    value={consentText}
                    onChange={(e) => setConsentText(e.target.value)}
                    rows={2}
                    placeholder={
                      consentMode === "choice"
                        ? "e.g. Can we email & text you occasional offers?"
                        : "e.g. I agree to receive emails & texts."
                    }
                    style={{ ...inp, resize: "vertical" }}
                  />
                  {consentMode === "checkbox" && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13.5,
                          color: INK,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={consentRequired}
                          onChange={(e) => setConsentRequired(e.target.checked)}
                        />
                        Must be checked to submit
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13.5,
                          color: INK,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={consentDefaultChecked}
                          onChange={(e) => setConsentDefaultChecked(e.target.checked)}
                        />
                        Pre-checked by default
                      </label>
                      {consentDefaultChecked && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#B3261E",
                            lineHeight: 1.45,
                            background: "#FDECEA",
                            border: "1px solid #E7C9C6",
                            borderRadius: 8,
                            padding: "8px 10px",
                          }}
                        >
                          Pre-checked consent isn&rsquo;t valid in the EU and is risky for SMS. For texts, prefer an unchecked box or the Yes/No option.
                        </div>
                      )}
                    </div>
                  )}
                  {consentMode === "choice" && (
                    <div
                      style={{
                        fontSize: 12,
                        color: FAINT,
                        marginTop: 8,
                        lineHeight: 1.45,
                      }}
                    >
                      The visitor must pick Yes or No to submit — the strongest, most compliant consent. A &ldquo;No&rdquo; lead is still captured, just flagged as declined so you don&rsquo;t add them to marketing.
                    </div>
                  )}
                </>
              )}
            </Section>
          )}

          {/* Frequency — common to all presets */}
          <Section label="How often per visitor">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              style={inp}
            >
              <option value="session">Once per session</option>
              <option value="visitor">Once every N days</option>
              <option value="every_visit">Every visit (no throttle)</option>
            </select>
            {frequency === "visitor" && (
              <div style={{ marginTop: 8 }}>
                <NumRow label="Days" value={frequencyDays} onChange={setFrequencyDays} min={1} />
              </div>
            )}
          </Section>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 14, color: INK, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Live (visitors can see this prompt)
          </label>

          <ErrorBanner message={error} />

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <PrimaryButton type="submit" disabled={pending || !isAvailable(presetType)}>
              {pending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create prompt")}
            </PrimaryButton>
            {isEdit && (
              <SecondaryButton onClick={() => router.push(`/internal/identity-prompts/${client_key}`)}>
                Cancel
              </SecondaryButton>
            )}
          </div>
        </div>{/* left form column */}

        {/* Right — live preview. Uses self-serve PromptPreview for the 4
            presets it supports (email_exchange / custom_form single-page /
            custom_notification / phone_call). For multi-page Custom Form,
            Make an Offer, and Remind Me we render a preset-specific
            placeholder card — those presets' runtime pixel shape isn't
            covered by the self-serve preview. Operators still get real-time
            confirmation of what they're building via the "Currently building"
            summary on the placeholder cards. */}
        <div style={{ flex: "1 1 320px", minWidth: 280, maxWidth: 420 }}>
          {(() => {
            // Self-serve PromptPreview handles single-page custom_form only —
            // multi-page has its own state shape (pages_jsonb) with per-page
            // fields that PromptPreview doesn't render.
            const previewable =
              presetType === "email_exchange" ||
              presetType === "custom_notification" ||
              presetType === "phone_call" ||
              (presetType === "custom_form" && !multiPageEnabled);

            if (!previewable) {
              return (
                <PreviewPlaceholder
                  presetLabel={PRESET_OPTIONS.find((o) => o.value === presetType)?.label ?? presetType}
                  slug={slug}
                  headline={headline}
                  note={
                    presetType === "custom_form" && multiPageEnabled
                      ? "Multi-page forms don't preview inline — the pixel runtime paints each page as the visitor navigates."
                      : presetType === "make_an_offer"
                        ? "Make an Offer's modal shape depends on runtime product + threshold lookups. Test with a real product on your storefront."
                        : "Remind Me preview needs live product state to render honestly — subscribe → cron-detects-transition → notification is a server-side flow. Test end-to-end via the SQL toggle in chapter_config.mock_products."
                  }
                />
              );
            }

            const previewData: PreviewData = {
              presetType: presetType as SelfServePresetType,
              headline,
              body,
              inputMode,
              emailPlaceholder,
              phonePlaceholder,
              buttonLabel,
              offerCode,
              successMessage,
              offerDescription,
              // PreviewData only supports message | button | redirect. Email
              // actions render as "message" post-submit so the preview shows
              // the success-with-code card the visitor sees BEFORE the email
              // arrives — accurate for the modal view.
              postSubmitAction:
                postSubmitAction === "email" || postSubmitAction === "email_message"
                  ? "message"
                  : (postSubmitAction as "message" | "button" | "redirect"),
              postSubmitUrl,
              postSubmitButtonLabel,
              cfContent: contentBlocks,
              cfFields: formFields,
              notif: notificationConfig,
              notifAck,
              phone: phoneCallConfig,
              consentMode,
              consentText,
              consentDefaultChecked,
            };
            return <PromptPreview data={previewData} />;
          })()}
        </div>
      </div>
    </form>
  );
}

// Small preset-summary card shown in the preview column when the self-serve
// PromptPreview doesn't cover this preset's runtime shape (multi-page form,
// Make an Offer, Remind Me). Sticky so it stays visible as the operator
// scrolls the form.
function PreviewPlaceholder({
  presetLabel,
  slug,
  headline,
  note,
}: {
  presetLabel: string;
  slug: string;
  headline: string;
  note: string;
}) {
  return (
    <div style={{ position: "sticky", top: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: FAINT,
          textTransform: "uppercase",
          letterSpacing: ".1em",
          marginBottom: 8,
        }}
      >
        Preview
      </div>
      <div
        style={{
          border: `1px solid ${LINE}`,
          borderRadius: 12,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 1px 3px rgba(31,45,67,.06)",
          padding: "18px 20px",
          minHeight: 180,
        }}
      >
        <div style={{ fontSize: 12, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
          Currently building
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{presetLabel}</div>
        {slug && (
          <div style={{ marginTop: 4, fontSize: 12, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {slug}
          </div>
        )}
        {headline && (
          <div style={{ marginTop: 10, fontSize: 13, color: INK, lineHeight: 1.4 }}>
            <em>&ldquo;{headline}&rdquo;</em>
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{note}</div>
      </div>
      <div style={{ fontSize: 11.5, color: FAINT, marginTop: 8, lineHeight: 1.4 }}>
        Test end-to-end by opening the client&apos;s storefront with the pixel installed.
      </div>
    </div>
  );
}
