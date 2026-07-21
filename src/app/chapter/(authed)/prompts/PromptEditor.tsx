"use client";

// Self-serve prompt editor (Phase 3a). This turn ships the Email Exchange
// preset fully (no builder dependencies). Custom Form / Notification / Phone
// reuse the operator builders and land next; their tiles show "Soon" for now.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPrompt, updatePrompt } from "./_actions";
import {
  PRESET_LABELS,
  type ExistingPrompt,
  type SelfServePresetType,
  type SelfServePromptInput,
} from "./types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

const SELECTABLE: SelfServePresetType[] = ["email_exchange"];
const ALL_PRESETS: SelfServePresetType[] = [
  "email_exchange",
  "custom_form",
  "custom_notification",
  "phone_call",
];

type TriggerType = SelfServePromptInput["trigger_type"];

export default function PromptEditor({
  clientKey,
  prompt,
}: {
  clientKey: string;
  prompt?: ExistingPrompt;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const editing = !!prompt;

  // Guard: v1 only edits Email Exchange (the only preset self-serve can create yet).
  const composableLocked = editing && prompt!.preset_type !== "email_exchange";

  const trig = (prompt?.trigger_jsonb || {}) as Record<string, unknown>;
  const [presetType] = useState<SelfServePresetType>(
    (prompt?.preset_type as SelfServePresetType) || "email_exchange",
  );
  const [slug, setSlug] = useState(prompt?.slug || "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    (trig.type as TriggerType) || "exit_intent",
  );
  const [triggerSelector, setTriggerSelector] = useState((trig.selector as string) || "");
  const [triggerDelayMs, setTriggerDelayMs] = useState(Number(trig.delay_ms) || 15000);
  const [triggerPercent, setTriggerPercent] = useState(Number(trig.percent) || 50);
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
    (["message", "button", "redirect"].includes(prompt?.post_submit_action || "")
      ? (prompt!.post_submit_action as SelfServePromptInput["post_submit_action"])
      : "message"),
  );
  const [postSubmitUrl, setPostSubmitUrl] = useState(prompt?.post_submit_url || "");
  const [postSubmitButtonLabel, setPostSubmitButtonLabel] = useState(prompt?.post_submit_button_label || "Claim it");
  const [frequency, setFrequency] = useState<SelfServePromptInput["frequency"]>(
    (prompt?.frequency as SelfServePromptInput["frequency"]) || "session",
  );
  const [frequencyDays, setFrequencyDays] = useState(prompt?.frequency_days || 30);
  const [enabled, setEnabled] = useState(prompt?.enabled ?? true);

  const submit = () => {
    setError(null);
    const input: SelfServePromptInput = {
      preset_type: presetType,
      slug: slug.trim(),
      trigger_type: triggerType,
      trigger_selector: triggerSelector,
      trigger_delay_ms: triggerDelayMs,
      trigger_percent: triggerPercent,
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
      frequency,
      frequency_days: frequencyDays,
      enabled,
    };
    startTransition(async () => {
      const res = editing ? await updatePrompt(prompt!.id, input) : await createPrompt(input);
      if (!res.ok) { setError(res.error); return; }
      router.push(`/chapter/${clientKey}/prompts`);
      router.refresh();
    });
  };

  if (composableLocked) {
    return (
      <div style={{ padding: "28px 30px", maxWidth: 620, margin: "0 auto" }}>
        <BackLink clientKey={clientKey} />
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: 24, background: PANEL, marginTop: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 6 }}>
            Editing “{PRESET_LABELS[prompt!.preset_type as SelfServePresetType] || prompt!.preset_type}” is coming soon
          </div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: 0, lineHeight: 1.5 }}>
            This prompt type’s editor lands in the next update. For now you can turn it on/off or delete it from the list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 30px 60px", maxWidth: 620, margin: "0 auto" }}>
      <BackLink clientKey={clientKey} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "10px 0 18px" }}>
        {editing ? "Edit prompt" : "New prompt"}
      </h1>

      {/* Preset picker */}
      <Section label="Type">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ALL_PRESETS.map((p) => {
            const on = p === presetType;
            const selectable = SELECTABLE.includes(p);
            return (
              <div
                key={p}
                aria-disabled={!selectable}
                style={{
                  border: `1.5px solid ${on ? ORANGE : LINE}`,
                  background: on ? "#FFF4EC" : selectable ? "white" : PANEL,
                  color: selectable ? INK : FAINT,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: selectable ? "default" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {PRESET_LABELS[p]}
                {!selectable && <span style={{ fontSize: 10, color: FAINT }}>Soon</span>}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Name */}
      <Section label="Name" hint="Lowercase letters, digits, underscores. Used internally (e.g. welcome_offer).">
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="welcome_offer" style={inp} />
      </Section>

      {/* Trigger */}
      <Section label="When it appears">
        <select value={triggerType} onChange={(e) => setTriggerType(e.target.value as TriggerType)} style={inp}>
          <option value="exit_intent">On exit intent (mouse leaves the page)</option>
          <option value="time_on_page">After time on page</option>
          <option value="scroll_depth">At a scroll depth</option>
          <option value="click_element">When an element is clicked</option>
        </select>
        {triggerType === "click_element" && (
          <input value={triggerSelector} onChange={(e) => setTriggerSelector(e.target.value)} placeholder="CSS selector, e.g. .book-now-btn" style={{ ...inp, marginTop: 8 }} />
        )}
        {triggerType === "time_on_page" && (
          <div style={{ marginTop: 8 }}>
            <NumRow label="Seconds" value={Math.round(triggerDelayMs / 1000)} onChange={(v) => setTriggerDelayMs(v * 1000)} min={1} />
          </div>
        )}
        {triggerType === "scroll_depth" && (
          <div style={{ marginTop: 8 }}>
            <NumRow label="Percent" value={triggerPercent} onChange={setTriggerPercent} min={1} max={100} />
          </div>
        )}
      </Section>

      {/* Content */}
      <Section label="Headline">
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Get 10% off your first order" style={inp} />
      </Section>
      <Section label="Body" hint="Optional supporting line.">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Enter your email and we’ll send your code." style={{ ...inp, resize: "vertical" }} />
      </Section>

      {/* Input */}
      <Section label="Collect">
        <select value={inputMode} onChange={(e) => setInputMode(e.target.value as SelfServePromptInput["input_mode"])} style={inp}>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="either">Email or phone</option>
        </select>
        {inputMode !== "phone" && (
          <input value={emailPlaceholder} onChange={(e) => setEmailPlaceholder(e.target.value)} placeholder="Email placeholder" style={{ ...inp, marginTop: 8 }} />
        )}
        {inputMode !== "email" && (
          <input value={phonePlaceholder} onChange={(e) => setPhonePlaceholder(e.target.value)} placeholder="Phone placeholder" style={{ ...inp, marginTop: 8 }} />
        )}
      </Section>

      <Section label="Button label">
        <input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} style={inp} />
      </Section>

      {/* Offer (display only) */}
      <Section label="Offer code" hint="Optional. Shown in the success message after they submit.">
        <input value={offerCode} onChange={(e) => setOfferCode(e.target.value)} placeholder="WELCOME10" style={inp} />
        {offerCode.trim() && (
          <input value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)} placeholder="What the code does (e.g. 10% off your first order)" style={{ ...inp, marginTop: 8 }} />
        )}
      </Section>

      {/* After submit */}
      <Section label="After they submit">
        <select value={postSubmitAction} onChange={(e) => setPostSubmitAction(e.target.value as SelfServePromptInput["post_submit_action"])} style={inp}>
          <option value="message">Show a thank-you message</option>
          <option value="button">Show a button to a URL</option>
          <option value="redirect">Redirect to a URL</option>
        </select>
        {postSubmitAction === "message" && (
          <input value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} placeholder="Success message" style={{ ...inp, marginTop: 8 }} />
        )}
        {(postSubmitAction === "button" || postSubmitAction === "redirect") && (
          <input value={postSubmitUrl} onChange={(e) => setPostSubmitUrl(e.target.value)} placeholder="https://…" style={{ ...inp, marginTop: 8 }} />
        )}
        {postSubmitAction === "button" && (
          <input value={postSubmitButtonLabel} onChange={(e) => setPostSubmitButtonLabel(e.target.value)} placeholder="Button label" style={{ ...inp, marginTop: 8 }} />
        )}
      </Section>

      {/* Frequency */}
      <Section label="How often per visitor">
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as SelfServePromptInput["frequency"])} style={inp}>
          <option value="session">Once per session</option>
          <option value="visitor">Once every N days</option>
          <option value="every_visit">Every visit</option>
        </select>
        {frequency === "visitor" && (
          <div style={{ marginTop: 8 }}>
            <NumRow label="Days" value={frequencyDays} onChange={setFrequencyDays} min={1} />
          </div>
        )}
      </Section>

      {/* Enabled */}
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 14, color: INK, cursor: "pointer" }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Live (visitors can see this prompt)
      </label>

      {error && (
        <div style={{ marginTop: 16, background: "#FDECEA", border: "1px solid #E7C9C6", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button type="button" disabled={pending} onClick={submit} style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 10, padding: "11px 22px", cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create prompt"}
        </button>
        <button type="button" onClick={() => router.push(`/chapter/${clientKey}/prompts`)} style={{ background: "white", color: INK, fontSize: 14, fontWeight: 600, border: `1px solid ${LINE}`, borderRadius: 10, padding: "11px 22px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
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
