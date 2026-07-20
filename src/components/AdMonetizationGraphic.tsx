// "Earn from every send" visual for the Ad Monetization page. An email you're
// already sending carries an approved text-only ad slot, which returns a share
// of the ad revenue — no price increase, no new products.

export default function AdMonetizationGraphic({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-orange-100 bg-white px-4 py-4 shadow-sm ${className}`}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        Earn from every send
      </p>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {/* Email card */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-medium text-slate-400">
            Your email · to your list
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-4/5 rounded bg-slate-200" />
            <div className="h-2 w-full rounded bg-slate-200" />
            <div className="h-2 w-2/3 rounded bg-slate-200" />
          </div>
          {/* Ad slot */}
          <div className="mt-2.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-500">
              Sponsored · text only
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-700">
              An ad you approve — no images.
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-[10px] font-medium text-orange-500">every send</span>
          <span className="rotate-90 text-lg leading-none text-neutral-400 sm:rotate-0">
            →
          </span>
        </div>

        {/* Revenue outcomes */}
        <div className="flex flex-1 flex-col gap-2">
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            ✓ Revenue share
          </span>
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            ✓ No price increase
          </span>
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            ✓ No new products
          </span>
        </div>
      </div>
    </div>
  );
}
