// "One prompt, more conversions" visual for the Smart Prompts page. A prompt
// fires at the right moment and captures an extra sale, signup, or lead.

export default function SmartPromptsGraphic({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-orange-100 bg-white px-4 py-4 shadow-sm ${className}`}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        One prompt, more conversions
      </p>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {/* Prompt card */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] text-slate-400">Before you go —</p>
          <p className="mt-0.5 text-sm font-semibold text-neutral-900">
            Get 10% off your first order
          </p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-400">
            you@email.com
          </div>
          <div className="mt-2 rounded-lg bg-orange-500 px-2 py-1 text-center text-[11px] font-semibold text-white">
            Unlock my code
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center px-1">
          <span className="rotate-90 text-lg leading-none text-neutral-400 sm:rotate-0">
            →
          </span>
        </div>

        {/* Outcomes */}
        <div className="flex flex-1 flex-col gap-2">
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            ✓ Extra sale
          </span>
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            ✓ Email signup
          </span>
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            ✓ Lead captured
          </span>
        </div>
      </div>
    </div>
  );
}
