// "Rent it → own it" before/after visual for the Subscription Freedom page. A
// rented widget with a forever monthly fee becomes a custom build you own —
// no monthly fee, built for you, living on your site.

export default function SubscriptionFreedomGraphic({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-orange-100 bg-white px-4 py-4 shadow-sm ${className}`}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        Rent it → own it
      </p>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {/* Renting */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Renting
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              Rented widget
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
              $/mo forever
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
              one-size-fits-all
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-[10px] font-medium text-orange-500">we build it</span>
          <span className="rotate-90 text-lg leading-none text-neutral-400 sm:rotate-0">
            →
          </span>
        </div>

        {/* Owning */}
        <div className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
            Owning
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-neutral-900">
              Your build
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] text-emerald-700">
              ✓ No monthly fee
            </span>
            <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] text-emerald-700">
              ✓ Built for you
            </span>
            <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] text-emerald-700">
              ✓ On your site
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
