"use client";

// MI v2 Phase 2C — Recovery flow composer.
//
// When the visitor tries to dismiss the primary prompt (currently: close-button
// click), the pixel optionally swaps the modal contents to a "recovery" form —
// often a stripped-down email-only capture with a different offer. Wraps
// CustomFormBuilder per-recovery (single page; multi-page recovery is overkill).
//
// Schema column: chapter_config.identity_prompts.recovery_jsonb.

import CustomFormBuilder, { type ContentBlock, type FormField } from "./CustomFormBuilder";

export type RecoveryConfig = {
  enabled: boolean;
  trigger: "close_button";  // exit_intent + scroll_back planned for later
  content_blocks: ContentBlock[];
  form_fields: FormField[];
  max_attempts: number;
};

export default function RecoveryBuilder({
  value,
  onChange,
}: {
  value: RecoveryConfig;
  onChange: (next: RecoveryConfig) => void;
}) {
  return (
    <div className="space-y-4 rounded-md border border-violet-300 bg-violet-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-800">
          Recovery flow
        </p>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={e => onChange({ ...value, enabled: e.target.checked })}
          />
          <span className="font-semibold text-neutral-800">Enable recovery</span>
        </label>
      </div>

      <p className="text-xs text-neutral-600">
        When a visitor closes the primary form, swap to this recovery offer instead of dismissing.
        Useful for stripped-down email capture when the primary form asks too much.
      </p>

      {value.enabled && (
        <>
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-700">
            <label className="flex items-center gap-2">
              <span>Trigger</span>
              <select
                value={value.trigger}
                onChange={e => onChange({ ...value, trigger: e.target.value as RecoveryConfig["trigger"] })}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs"
              >
                <option value="close_button">Close button click</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>Max attempts</span>
              <input
                type="number"
                min={1}
                max={3}
                value={value.max_attempts}
                onChange={e => onChange({ ...value, max_attempts: Math.max(1, Math.min(3, parseInt(e.target.value, 10) || 1)) })}
                className="w-16 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs font-mono"
              />
            </label>
          </div>

          <CustomFormBuilder
            contentBlocks={value.content_blocks}
            formFields={value.form_fields}
            onChange={next => onChange({ ...value, content_blocks: next.contentBlocks, form_fields: next.formFields })}
          />
        </>
      )}
    </div>
  );
}
