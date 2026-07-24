"use client";

// Self-serve prompt editor (Phase 3a). All 4 v1 presets:
//   - Email Exchange   → dedicated columns (headline/body/collect/offer/…)
//   - Custom Form       → reuses the operator CustomFormBuilder
//   - Custom Notification → reuses NotificationBuilder (bubble)
//   - Phone Call        → reuses PhoneCallBuilder (tel: CTAs)
// The composable builders are self-contained value/onChange components; we map
// their output onto the identity_prompts jsonb columns at submit time.

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPrompt, updatePrompt } from "./_actions";
import {
  PRESET_LABELS,
  IDENTITY_TYPES,
  type ContentBlock,
  type FormField,
  type ExistingPrompt,
  type SelfServePresetType,
  type SelfServePromptInput,
  type ConsentConfig,
} from "./types";
import SelfServeFormBuilder from "./SelfServeFormBuilder";
import NotificationBuilder, {
  type NotificationConfig,
} from "@/app/internal/identity-prompts/[clientKey]/NotificationBuilder";
import PhoneCallBuilder, {
  type PhoneCallConfig,
} from "@/app/internal/identity-prompts/[clientKey]/PhoneCallBuilder";
import PromptPreview from "./PromptPreview";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";

const ALL_PRESETS: SelfServePresetType[] = [
  "email_exchange",
  "custom_form",
  "custom_notification",
  "phone_call",
];

type TriggerType = SelfServePromptInput["trigger_type"];

function firstHeadline(blocks: Array<{ type: string; text?: string }>): string {
  return blocks.find((b) => b.type === "headline")?.text?.trim() || "";
}

export default function PromptEditor({
  clientKey,
  prompt,
  storefrontDomain,
}: {
  clientKey: string;
  prompt?: ExistingPrompt;
  storefrontDomain?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const editing = !!prompt;

  // Element picker (opens the client's site; the pixel there sends a selector
  // back via postMessage). pickerWin is the tab we opened; we only accept
  // messages from it.
  const pickerWin = useRef<Window | null>(null);
  const [pickMsg, setPickMsg] = useState<string | null>(null);
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (
        pickerWin.current &&
        e.source === pickerWin.current &&
        e.data && e.data.type === "chapter_pick_selector" &&
        typeof e.data.selector === "string"
      ) {
        setTriggerSelector(e.data.selector);
        setPickMsg(`Captured “${e.data.selector}” from your site ✓`);
        try { pickerWin.current.close(); } catch { /* ignore */ }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const startPick = () => {
    if (!storefrontDomain) {
      setPickMsg("Add your website first (Install tab), then you can pick elements.");
      return;
    }
    setPickMsg("Opening your site — hover and click the element you want, then press “Use this element”.");
    pickerWin.current = window.open(`https://${storefrontDomain}/#__chapter_pick`, "_blank");
  };

  const trig = (prompt?.trigger_jsonb || {}) as Record<string, unknown>;
  // preset_type is locked once created (it selects the renderer path).
  const [presetType, setPresetType] = useState<SelfServePresetType>(
    (prompt?.preset_type as SelfServePresetType) || "email_exchange",
  );
  const [slug, setSlug] = useState(prompt?.slug || "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    (trig.type as TriggerType) || "exit_intent",
  );
  const [triggerSelector, setTriggerSelector] = useState((trig.selector as string) || "");
  const [triggerDelayMs, setTriggerDelayMs] = useState(Number(trig.delay_ms) || 15000);
  const [triggerPercent, setTriggerPercent] = useState(Number(trig.percent) || 50);
  const [frequency, setFrequency] = useState<SelfServePromptInput["frequency"]>(
    (prompt?.frequency as SelfServePromptInput["frequency"]) || "session",
  );
  const [frequencyDays, setFrequencyDays] = useState(prompt?.frequency_days || 30);
  const [enabled, setEnabled] = useState(prompt?.enabled ?? true);

  // Email Exchange fields.
  const [headline, setHeadline] = useState(prompt?.headline || "");
  const [body, setBody] = useState(prompt?.body || "");
  const [inputMode, setInputMode] = useState<SelfServePromptInput["input_mode"]>(
    (prompt?.input_mode as SelfServePromptInput["input_mode"]) || "email",
  );
  const [emailPlaceholder, setEmailPlaceholder] = useState(prompt?.email_placeholder || "you@email.com");
  const [phonePlaceholder, setPhonePlaceholder] = useState(prompt?.phone_placeholder || "(555) 555-5555");
  const [buttonLabel, setButtonLabel] = useState(prompt?.button_label || "Get my offer");
  const [successMessage, setSuccessMessage] = useState(prompt?.success_message || "You’re in — thanks!");
  const [offerCode, setOfferCode] = useState(prompt?.offer_code || "");
  const [offerDescription, setOfferDescription] = useState(prompt?.offer_description || "");
  const [postSubmitAction, setPostSubmitAction] = useState<SelfServePromptInput["post_submit_action"]>(
    ["message", "button", "redirect"].includes(prompt?.post_submit_action || "")
      ? (prompt!.post_submit_action as SelfServePromptInput["post_submit_action"])
      : "message",
  );
  const [postSubmitUrl, setPostSubmitUrl] = useState(prompt?.post_submit_url || "");
  const [postSubmitButtonLabel, setPostSubmitButtonLabel] = useState(prompt?.post_submit_button_label || "Claim it");

  // Composable builder states.
  const [cfContent, setCfContent] = useState<ContentBlock[]>(
    (prompt?.preset_type === "custom_form" && prompt.content_blocks_jsonb) || [{ type: "headline", text: "" }],
  );
  const [cfFields, setCfFields] = useState<FormField[]>(
    (prompt?.preset_type === "custom_form" && prompt.form_fields_jsonb) || [
      { id: "email", type: "email", label: "Email", required: true, for_identity: true },
    ],
  );
  const [notif, setNotif] = useState<NotificationConfig>(
    prompt?.preset_type === "custom_notification"
      ? {
          container: (prompt.container_jsonb as NotificationConfig["container"]) || { type: "bubble", position: "bottom-right" },
          content_blocks: (prompt.content_blocks_jsonb as NotificationConfig["content_blocks"]) || [{ type: "headline", text: "" }],
          submit_actions: (prompt.submit_actions_jsonb as NotificationConfig["submit_actions"]) || { cta_type: "dismiss_only" },
        }
      : {
          container: { type: "bubble", position: "bottom-right" },
          content_blocks: [{ type: "headline", text: "" }],
          submit_actions: { cta_type: "dismiss_only" },
        },
  );
  const [notifAck, setNotifAck] = useState(
    prompt?.preset_type === "custom_notification"
      ? (prompt.submit_actions_jsonb as { ack_message?: string } | null)?.ack_message || ""
      : "",
  );
  const initConsent = (prompt?.consent_jsonb as ConsentConfig | null) || null;
  const [consentMode, setConsentMode] = useState<ConsentConfig["mode"]>(initConsent?.mode || "off");
  const [consentText, setConsentText] = useState(initConsent?.text || "");
  const [consentDefaultChecked, setConsentDefaultChecked] = useState(!!initConsent?.default_checked);
  const [consentRequired, setConsentRequired] = useState(initConsent?.required ?? true);
  const [phone, setPhone] = useState<PhoneCallConfig>(
    prompt?.preset_type === "phone_call"
      ? { content_blocks: (prompt.content_blocks_jsonb as PhoneCallConfig["content_blocks"]) || [] }
      : {
          content_blocks: [
            { type: "headline", text: "" },
            { type: "phone_cta", label: "Call us", phone_number: "" },
          ],
        },
  );

  const submit = () => {
    setError(null);
    // Common defaults for the fields a given preset doesn't use.
    const base: SelfServePromptInput = {
      preset_type: presetType,
      slug: slug.trim(),
      trigger_type: triggerType,
      trigger_selector: triggerSelector,
      trigger_delay_ms: triggerDelayMs,
      trigger_percent: triggerPercent,
      headline: "",
      body: "",
      input_mode: "email",
      email_placeholder: emailPlaceholder,
      phone_placeholder: phonePlaceholder,
      button_label: "Submit",
      success_message: "Thanks!",
      offer_code: "",
      offer_description: "",
      post_submit_action: "message",
      post_submit_url: "",
      post_submit_button_label: "Claim it",
      frequency,
      frequency_days: frequencyDays,
      enabled,
      content_blocks_jsonb: null,
      form_fields_jsonb: null,
      container_jsonb: null,
      submit_actions_jsonb: null,
      consent_jsonb:
        consentMode === "off"
          ? null
          : {
              mode: consentMode,
              text: consentText.trim() || (consentMode === "choice" ? "Do you agree?" : "I agree."),
              default_checked: consentMode === "checkbox" ? consentDefaultChecked : false,
              required: consentMode === "checkbox" ? consentRequired : true,
            },
    };

    let input: SelfServePromptInput = base;
    if (presetType === "email_exchange") {
      input = {
        ...base,
        headline,
        body,
        input_mode: inputMode,
        button_label: buttonLabel,
        success_message: successMessage,
        offer_code: offerCode,
        offer_description: offerDescription,
        post_submit_action: postSubmitAction,
        post_submit_url: postSubmitUrl,
        post_submit_button_label: postSubmitButtonLabel,
      };
    } else if (presetType === "custom_form") {
      input = {
        ...base,
        headline: firstHeadline(cfContent),
        // thank-you shown after the visitor submits the form.
        success_message: successMessage,
        content_blocks_jsonb: cfContent,
        // email/phone are always identity fields — set it automatically so the
        // pixel hashes + stitches them (no per-field checkbox).
        form_fields_jsonb: cfFields.map((f) => ({ ...f, for_identity: IDENTITY_TYPES.includes(f.type) })),
      };
    } else if (presetType === "custom_notification") {
      input = {
        ...base,
        headline: firstHeadline(notif.content_blocks),
        container_jsonb: notif.container,
        content_blocks_jsonb: notif.content_blocks,
        submit_actions_jsonb: { ...notif.submit_actions, ack_message: notifAck.trim() || undefined },
      };
    } else if (presetType === "phone_call") {
      input = {
        ...base,
        headline: firstHeadline(phone.content_blocks),
        content_blocks_jsonb: phone.content_blocks as unknown as ContentBlock[],
      };
    }

    startTransition(async () => {
      const res = editing ? await updatePrompt(prompt!.id, input) : await createPrompt(input);
      if (!res.ok) { setError(res.error); return; }
      router.push(`/chapter/${clientKey}/prompts`);
      router.refresh();
    });
  };

  return (
    <div style={{ padding: "24px 30px 60px" }}>
      <BackLink clientKey={clientKey} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "10px 0 18px" }}>
        {editing ? "Edit prompt" : "New prompt"}
      </h1>

      {/* No alignItems:flex-start — let the preview column stretch to the form's
          height so the sticky preview inside has room to follow the scroll. */}
      <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
        {/* Left — form */}
        <div style={{ flex: "1 1 480px", minWidth: 0, maxWidth: 600 }}>

      {/* Preset picker — locked once created */}
      <Section label="Type">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ALL_PRESETS.map((p) => {
            const on = p === presetType;
            const locked = editing && p !== presetType;
            return (
              <button
                key={p}
                type="button"
                disabled={editing}
                onClick={() => !editing && setPresetType(p)}
                style={{
                  border: `1.5px solid ${on ? ORANGE : LINE}`,
                  background: on ? "#FFF4EC" : "white",
                  color: locked ? FAINT : INK,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: editing ? "default" : "pointer",
                  opacity: locked ? 0.5 : 1,
                }}
              >
                {PRESET_LABELS[p]}
              </button>
            );
          })}
        </div>
        {editing && <div style={{ fontSize: 11.5, color: FAINT, marginTop: 6 }}>Type can’t be changed after creation.</div>}
      </Section>

      {/* Name */}
      <Section label="Name" hint="Lowercase letters, digits, underscores. Used internally (e.g. welcome_offer).">
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="welcome_offer" style={inp} />
      </Section>

      {/* Trigger — common to all presets */}
      <Section label="When it appears">
        <select value={triggerType} onChange={(e) => setTriggerType(e.target.value as TriggerType)} style={inp}>
          <option value="exit_intent">On exit intent (mouse leaves the page)</option>
          <option value="time_on_page">After time on page</option>
          <option value="scroll_depth">At a scroll depth</option>
          <option value="click_element">When an element is clicked</option>
        </select>
        {triggerType === "click_element" && (
          <div style={{ marginTop: 8 }}>
            <input value={triggerSelector} onChange={(e) => setTriggerSelector(e.target.value)} placeholder="CSS selector, e.g. .book-now-btn" style={inp} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={startPick} style={{ fontSize: 12.5, fontWeight: 600, color: ORANGE, background: "white", border: `1px solid ${ORANGE}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>
                Pick from my site →
              </button>
              <span style={{ fontSize: 11.5, color: FAINT, lineHeight: 1.3 }}>Opens your site so you can click the element — no CSS needed.</span>
            </div>
            {pickMsg && <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.4 }}>{pickMsg}</div>}
          </div>
        )}
        {triggerType === "time_on_page" && (
          <div style={{ marginTop: 8 }}><NumRow label="Seconds" value={Math.round(triggerDelayMs / 1000)} onChange={(v) => setTriggerDelayMs(v * 1000)} min={1} /></div>
        )}
        {triggerType === "scroll_depth" && (
          <div style={{ marginTop: 8 }}><NumRow label="Percent" value={triggerPercent} onChange={setTriggerPercent} min={1} max={100} /></div>
        )}
      </Section>

      {/* Preset-specific content */}
      {presetType === "email_exchange" && (
        <>
          <Section label="Headline"><input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Get 10% off your first order" style={inp} /></Section>
          <Section label="Body" hint="Optional supporting line."><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Enter your email and we’ll send your code." style={{ ...inp, resize: "vertical" }} /></Section>
          <Section label="Collect">
            <select value={inputMode} onChange={(e) => setInputMode(e.target.value as SelfServePromptInput["input_mode"])} style={inp}>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="either">Email and phone</option>
            </select>
            {inputMode !== "phone" && <input value={emailPlaceholder} onChange={(e) => setEmailPlaceholder(e.target.value)} placeholder="Email placeholder" style={{ ...inp, marginTop: 8 }} />}
            {inputMode !== "email" && <input value={phonePlaceholder} onChange={(e) => setPhonePlaceholder(e.target.value)} placeholder="Phone placeholder" style={{ ...inp, marginTop: 8 }} />}
          </Section>
          <Section label="Button label"><input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} style={inp} /></Section>
          <Section label="Offer code" hint="Optional. Shown in the success message after they submit.">
            <input value={offerCode} onChange={(e) => setOfferCode(e.target.value)} placeholder="WELCOME10" style={inp} />
            {offerCode.trim() && <input value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)} placeholder="What the code does" style={{ ...inp, marginTop: 8 }} />}
          </Section>
          <Section label="After they submit">
            <select value={postSubmitAction} onChange={(e) => setPostSubmitAction(e.target.value as SelfServePromptInput["post_submit_action"])} style={inp}>
              <option value="message">Show a thank-you message</option>
              <option value="button">Show a button to a URL</option>
              <option value="redirect">Redirect to a URL</option>
            </select>
            {postSubmitAction === "message" && <input value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} placeholder="Success message" style={{ ...inp, marginTop: 8 }} />}
            {(postSubmitAction === "button" || postSubmitAction === "redirect") && <input value={postSubmitUrl} onChange={(e) => setPostSubmitUrl(e.target.value)} placeholder="https://…" style={{ ...inp, marginTop: 8 }} />}
            {postSubmitAction === "button" && <input value={postSubmitButtonLabel} onChange={(e) => setPostSubmitButtonLabel(e.target.value)} placeholder="Button label" style={{ ...inp, marginTop: 8 }} />}
          </Section>
        </>
      )}

      {presetType === "custom_form" && (
        <>
          <Section label="Form">
            <SelfServeFormBuilder
              contentBlocks={cfContent}
              formFields={cfFields}
              onChange={(next) => { setCfContent(next.contentBlocks); setCfFields(next.formFields); }}
            />
          </Section>
          <Section label="Thank-you message" hint="Shown after a visitor submits. Preview it with the After toggle.">
            <input value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} placeholder="Thanks — we got it!" style={inp} />
          </Section>
        </>
      )}

      {presetType === "custom_notification" && (
        <>
          <Section label="Notification">
            <NotificationBuilder value={notif} onChange={setNotif} />
          </Section>
          {(notif.submit_actions.cta_type === "yes_no" || notif.submit_actions.cta_type === "button") && (
            <Section label="Acknowledgement message" hint="Shown after they click (when it doesn’t open a link). Preview it with the After toggle.">
              <input value={notifAck} onChange={(e) => setNotifAck(e.target.value)} placeholder="Thanks — check your inbox!" style={inp} />
            </Section>
          )}
        </>
      )}

      {presetType === "phone_call" && (
        <Section label="Phone call">
          <PhoneCallBuilder value={phone} onChange={setPhone} />
        </Section>
      )}

      {/* Consent — for presets that capture a contact */}
      {(presetType === "email_exchange" || presetType === "custom_form") && (
        <Section label="Consent" hint="Optional. Records an opt-in with each captured lead — recommended if you'll email or text them, or create an account.">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: consentMode === "off" ? 0 : 12 }}>
            {([
              ["off", "None"],
              ["checkbox", "Checkbox"],
              ["choice", "Ask Yes / No"],
            ] as [ConsentConfig["mode"], string][]).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setConsentMode(m)}
                style={{
                  fontSize: 13, fontWeight: 600, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${consentMode === m ? "#E36410" : "#E5E0D4"}`,
                  background: consentMode === m ? "#FFF4EC" : "white",
                  color: consentMode === m ? "#E36410" : "#1F2D43",
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
                placeholder={consentMode === "choice" ? "e.g. Can we email & text you occasional offers?" : "e.g. I agree to receive emails & texts."}
                style={{ ...inp, resize: "vertical" }}
              />
              {consentMode === "checkbox" && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#1F2D43", cursor: "pointer" }}>
                    <input type="checkbox" checked={consentRequired} onChange={(e) => setConsentRequired(e.target.checked)} />
                    Must be checked to submit
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#1F2D43", cursor: "pointer" }}>
                    <input type="checkbox" checked={consentDefaultChecked} onChange={(e) => setConsentDefaultChecked(e.target.checked)} />
                    Pre-checked by default
                  </label>
                  {consentDefaultChecked && (
                    <div style={{ fontSize: 12, color: "#B3261E", lineHeight: 1.45, background: "#FDECEA", border: "1px solid #E7C9C6", borderRadius: 8, padding: "8px 10px" }}>
                      Pre-checked consent isn&rsquo;t valid in the EU and is risky for SMS. For texts, prefer an unchecked box or the Yes/No option.
                    </div>
                  )}
                </div>
              )}
              {consentMode === "choice" && (
                <div style={{ fontSize: 12, color: "#8A98AD", marginTop: 8, lineHeight: 1.45 }}>
                  The visitor must pick Yes or No to submit — the strongest, most compliant consent. A “No” lead is still captured, just flagged as declined so you don&rsquo;t add them to marketing.
                </div>
              )}
            </>
          )}
        </Section>
      )}

      {/* Frequency — common */}
      <Section label="How often per visitor">
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as SelfServePromptInput["frequency"])} style={inp}>
          <option value="session">Once per session</option>
          <option value="visitor">Once every N days</option>
          <option value="every_visit">Every visit</option>
        </select>
        {frequency === "visitor" && <div style={{ marginTop: 8 }}><NumRow label="Days" value={frequencyDays} onChange={setFrequencyDays} min={1} /></div>}
      </Section>

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 14, color: INK, cursor: "pointer" }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Live (visitors can see this prompt)
      </label>

      {error && (
        <div style={{ marginTop: 16, background: "#FDECEA", border: "1px solid #E7C9C6", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button type="button" disabled={pending} onClick={submit} style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 10, padding: "11px 22px", cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create prompt"}
        </button>
        <button type="button" onClick={() => router.push(`/chapter/${clientKey}/prompts`)} style={{ background: "white", color: INK, fontSize: 14, fontWeight: 600, border: `1px solid ${LINE}`, borderRadius: 10, padding: "11px 22px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>

        </div>{/* left form column */}

        {/* Right — live preview */}
        <div style={{ flex: "1 1 320px", minWidth: 280, maxWidth: 420 }}>
          <PromptPreview
            data={{ presetType, headline, body, inputMode, emailPlaceholder, phonePlaceholder, buttonLabel, offerCode, successMessage, offerDescription, postSubmitAction, postSubmitUrl, postSubmitButtonLabel, cfContent, cfFields, notif, notifAck, phone }}
          />
        </div>
      </div>{/* two-column */}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontSize: 14,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: "9px 11px",
};

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: hint ? 2 : 6 }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: FAINT, marginBottom: 6, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </div>
  );
}

function NumRow({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: MUTED }}>
      <span style={{ width: 60 }}>{label}</span>
      <input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} style={{ ...inp, width: 110 }} />
    </label>
  );
}

function BackLink({ clientKey }: { clientKey: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.push(`/chapter/${clientKey}/prompts`)} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", padding: 0 }}>
      ← Back to prompts
    </button>
  );
}
