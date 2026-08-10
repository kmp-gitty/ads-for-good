// Read-only Services & Payments panel for the client portal. Renders the plan
// level, monthly payment, and inclusions the operator sets at /internal/tasks.

import { getClientServices } from "../_lib/services-data";

function fmtMoney(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default async function ClientServices({ clientKey }: { clientKey: string }) {
  const data = await getClientServices(clientKey);

  const hasAnything =
    data && (data.planLevel || data.monthlyPayment != null || data.inclusions.length > 0);

  if (!hasAnything) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
        <p className="text-sm text-neutral-500">Services &amp; payment details will appear here soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-neutral-900">Services &amp; Payments</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Plan level
          </div>
          <div className="mt-1 text-lg font-semibold text-neutral-900">
            {data!.planLevel || "—"}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Monthly payment
          </div>
          <div className="mt-1 text-lg font-semibold text-neutral-900">
            {data!.monthlyPayment != null ? (
              <>
                {fmtMoney(data!.monthlyPayment)}
                <span className="ml-1 text-sm font-normal text-neutral-500">/ month</span>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Inclusions
        </div>
        {data!.inclusions.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {data!.inclusions.map((inc, i) => (
              <li key={i} className="flex gap-2 text-sm text-neutral-800">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-400">No inclusions listed.</p>
        )}
      </div>
    </div>
  );
}
