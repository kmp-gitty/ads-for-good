"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPrompt, type PromptFormInput } from "../_actions";

type TriggerType = PromptFormInput["trigger_type"];
type Frequency = PromptFormInput["frequency"];

export default function PromptForm({ client_key }: { client_key: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("click_element");
  const [triggerSelector, setTriggerSelector] = useState("");
  const [triggerDelayMs, setTriggerDelayMs] = useState("15000");
  const [triggerPercent, setTriggerPercent] = useState("50");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Submit");
  const [successMessage, setSuccessMessage] = useState("Thanks!");
  const [offerCode, setOfferCode] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("session");
  const [frequencyDays, setFrequencyDays] = useState("90");
  const [enabled, setEnabled] = useState(true);

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
      button_label: buttonLabel,
      success_message: successMessage,
      offer_code: offerCode,
      offer_description: offerDescription,
      frequency,
      frequency_days: parseInt(frequencyDays, 10),
      enabled,
    };

    startTransition(async () => {
      const res = await createPrompt(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      // Reset to allow another quick create
      setSlug("");
      setTriggerSelector("");
      setHeadline("");
      setBody("");
      setOfferCode("");
      setOfferDescription("");
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

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Offer code (optional)</span>
          <input
            type="text"
            value={offerCode}
            onChange={e => setOfferCode(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-neutral-800">Offer description</span>
          <input
            type="text"
            value={offerDescription}
            onChange={e => setOfferDescription(e.target.value)}
            placeholder="Use at checkout for 10% off"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
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
        {pending ? "Creating…" : "Create prompt"}
      </button>
    </form>
  );
}
