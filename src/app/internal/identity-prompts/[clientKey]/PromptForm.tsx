"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPrompt, updatePrompt, type PromptFormInput } from "../_actions";

type TriggerType = PromptFormInput["trigger_type"];
type Frequency = PromptFormInput["frequency"];

export type ExistingPrompt = {
  id: string;
  slug: string;
  trigger_jsonb: { type?: string; selector?: string; delay_ms?: number; percent?: number };
  headline: string;
  body: string | null;
  input_placeholder: string | null;
  button_label: string;
  success_message: string | null;
  offer_code: string | null;
  offer_description: string | null;
  frequency: string;
  frequency_days: number | null;
  enabled: boolean;
};

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

  const [slug, setSlug] = useState(prompt?.slug ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    (trig.type as TriggerType) || "click_element",
  );
  const [triggerSelector, setTriggerSelector] = useState(trig.selector ?? "");
  const [triggerDelayMs, setTriggerDelayMs] = useState(String(trig.delay_ms ?? 15000));
  const [triggerPercent, setTriggerPercent] = useState(String(trig.percent ?? 50));
  const [headline, setHeadline] = useState(prompt?.headline ?? "");
  const [body, setBody] = useState(prompt?.body ?? "");
  const [inputPlaceholder, setInputPlaceholder] = useState(prompt?.input_placeholder ?? "you@email.com");
  const [buttonLabel, setButtonLabel] = useState(prompt?.button_label ?? "Submit");
  const [successMessage, setSuccessMessage] = useState(prompt?.success_message ?? "Thanks!");
  const [offerCode, setOfferCode] = useState(prompt?.offer_code ?? "");
  const [offerDescription, setOfferDescription] = useState(prompt?.offer_description ?? "");
  const [frequency, setFrequency] = useState<Frequency>(
    (prompt?.frequency as Frequency) || "session",
  );
  const [frequencyDays, setFrequencyDays] = useState(String(prompt?.frequency_days ?? 90));
  const [enabled, setEnabled] = useState(prompt?.enabled ?? true);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: PromptFormInput = {
      client_key,
      slug: slug.trim().toLowerCase().replace(/\s+/g, "_"),
      trigger_type: triggerType,
      trigger_selector: triggerSelector,
      trigger_delay_ms: parseInt(triggerDelayMs, 10),
      trigger_percent: parseInt(triggerPercent, 10),
      headline,
      body,
      input_placeholder: inputPlaceholder,
      button_label: buttonLabel,
      success_message: successMessage,
      offer_code: offerCode,
      offer_description: offerDescription,
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
        // Reset to allow another quick create
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
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Slug</span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="winback_book_now"
            required
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Trigger type</span>
          <select
            value={triggerType}
            onChange={e => setTriggerType(e.target.value as TriggerType)}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
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
          <span className="block text-xs text-neutral-500">Any element matching this selector. Click is intercepted; prompt fires.</span>
          <input
            type="text"
            value={triggerSelector}
            onChange={e => setTriggerSelector(e.target.value)}
            placeholder="#book-now, .book-cta, a[href*='book']"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
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
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
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
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
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
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Body</span>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={2}
          placeholder="Drop your email and we'll text the code."
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="block font-semibold text-neutral-800">Email field placeholder</span>
        <span className="block text-xs text-neutral-500">Greyed-out text inside the email input. Defaults to <code>you@email.com</code>.</span>
        <input
          type="text"
          value={inputPlaceholder}
          onChange={e => setInputPlaceholder(e.target.value)}
          placeholder="you@email.com"
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Button label</span>
          <input
            type="text"
            value={buttonLabel}
            onChange={e => setButtonLabel(e.target.value)}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Success message</span>
          <input
            type="text"
            value={successMessage}
            onChange={e => setSuccessMessage(e.target.value)}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="rounded-md border border-orange-200 bg-orange-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
          Offer (shown AFTER the visitor submits)
        </p>
        <p className="mt-1 text-xs text-orange-900/80">
          The code and description below appear in the modal&apos;s success state after the visitor enters their email — they don&apos;t see this before submitting. The visitor copies the code from the modal; you also send it in any confirmation email you trigger.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Offer code (optional)</span>
            <input
              type="text"
              value={offerCode}
              onChange={e => setOfferCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-neutral-800">Offer description</span>
            <input
              type="text"
              value={offerDescription}
              onChange={e => setOfferDescription(e.target.value)}
              placeholder="Use at checkout for 10% off"
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Frequency</span>
          <select
            value={frequency}
            onChange={e => setFrequency(e.target.value as Frequency)}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
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
              className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
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
    </form>
  );
}
