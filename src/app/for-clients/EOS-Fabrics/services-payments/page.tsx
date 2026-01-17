"use client";

import { useMemo, useState } from "react";

type ScopeStatusKey = "accepted" | "proposed" | "removed";

type ScopeStatus = {
  key: ScopeStatusKey;
  label: string;
  date: string; // keep as string for now, easy to swap later
};

export default function ServicesPaymentsPage() {
  const statuses: ScopeStatus[] = useMemo(
    () => [
      { key: "accepted", label: "Accepted", date: "1/16/26" },
      { key: "proposed", label: "Proposed", date: "--" },
      { key: "removed", label: "Removed", date: "--" },
    ],
    []
  );

  const [enabled, setEnabled] = useState<Record<ScopeStatusKey, boolean>>({
    accepted: true,
    proposed: false,
    removed: false,
  });

  function toggle(key: ScopeStatusKey) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function chipClasses(key: ScopeStatusKey, isOn: boolean) {
    const base =
      "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition select-none";
    const off = "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50";

    const onMap: Record<ScopeStatusKey, string> = {
      accepted: "border-green-300 bg-green-50 text-neutral-900",
      proposed: "border-yellow-300 bg-yellow-50 text-neutral-900",
      removed: "border-red-300 bg-red-50 text-neutral-900",
    };

    return [base, isOn ? onMap[key] : off].join(" ");
  }

  function dotClasses(key: ScopeStatusKey) {
    const map: Record<ScopeStatusKey, string> = {
      accepted: "bg-green-500",
      proposed: "bg-yellow-500",
      removed: "bg-red-500",
    };
    return `h-2 w-2 rounded-full ${map[key]}`;
  }

  return (
    <div className="space-y-6">
      {/* Current Services Scope */}
      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Current Services Scope
            </h2>
            <p className="mt-1 text-sm text-neutral-700">
              Click a status button to see elements.
            </p>
          </div>

          {/* Toggle chips */}
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => {
              const isOn = enabled[s.key];
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggle(s.key)}
                  className={chipClasses(s.key, isOn)}
                  aria-pressed={isOn}
                >
                  <span className={dotClasses(s.key)} aria-hidden="true" />
                  <span>
                    {s.label}: <span className="font-semibold">{s.date}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional: content that appears based on toggles (placeholder) */}
        <div className="mt-4 space-y-3">
          {enabled.accepted && (
            <div className="rounded-md border border-neutral-200 p-3 text-sm text-neutral-700">
              <div className="font-semibold text-neutral-900">Accepted scope</div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
      {/* Card 1 */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <div className="text-sm font-semibold text-neutral-900">
          Analysis & Planning
        </div>
        <ul className="mt-2 space-y-1 text-sm text-neutral-800">
          <li>• Email marketing: segmentation & improvements</li>
          <li>• Previous Reddit & Adwords activity</li>
          <li>• Past & Current SEO activity</li>
          <li>• Website UX / UI</li>
        </ul>
      </div>

      {/* Card 2 */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <div className="text-sm font-semibold text-neutral-900">Operational Management</div>
        <ul className="mt-2 space-y-1 text-sm text-neutral-800">
          <li>• Email marketing: Mailchimp to Shopify & sends</li>
          <li>• Reddit Ads testing</li>
          <li>• SEO ranking increases</li>
          <li>• Web updates (as needed)</li>
          <li>• Sked Social</li>
        </ul>
      </div>

      {/* Card 3 */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <div className="text-sm font-semibold text-neutral-900">Digital Profiles</div>
        <ul className="mt-2 space-y-1 text-sm text-neutral-800">
          <li>• Assessment & monitoring</li>
          <li>• Google profile, FB, IG, etc</li>
          <li>• All profiles included</li>
        </ul>
      </div>

    {/* Card 4 */}
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <div className="text-sm font-semibold text-neutral-900">Other Inclusions</div>
        <ul className="mt-2 space-y-1 text-sm text-neutral-800">
          <li>• Reporting across all initiatives</li>
          <li>• Unlimited email access</li>
          <li>• 4 monthly (virtual or in-person) meeting hours</li>
        </ul>
      </div>

    </div>
            </div>
          )}

          {enabled.proposed && (
            <div className="rounded-md border border-neutral-200 p-3 text-sm text-neutral-700">
              <div className="font-semibold text-neutral-900">Proposed scope</div>
              <div className="mt-1">Nothing currently proposed - all services either accepted or removed.</div>
            </div>
          )}

          {enabled.removed && (
            <div className="rounded-md border border-neutral-200 p-3 text-sm text-neutral-700">
              <div className="font-semibold text-neutral-900">Removed scope</div>
              <div className="mt-1">Nothing currently removed - all services either accepted or proposed.</div>
            </div>
          )}
        </div>
      </section>

      {/* Payment status */}
<section className="rounded-lg border border-neutral-200 p-5">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h2 className="text-base font-semibold text-neutral-900">
        Pricing & Payment Status
      </h2>
      <p className="mt-1 text-sm text-neutral-700">
        Current services scope cost and status.
      </p>
    </div>

    {/* Static status chips (not clickable) */}
    <div className="flex flex-wrap gap-2">
      {/* Accepted */}
      <div className="inline-flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-neutral-900">
        <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
        <span>
          Received: <span className="font-semibold">--</span>
        </span>
      </div>

      {/* Proposed */}
      <div className="inline-flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-neutral-900">
        <span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />
        <span>
          Sent: <span className="font-semibold">To Be Sent</span>
        </span>
      </div>

      {/* Removed */}
      <div className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-neutral-900">
        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
        <span>
          Late: <span className="font-semibold">No</span>
        </span>
      </div>
    </div>
  </div>

  {/* Single content block (one section within the rectangle) */}
  <div className="mt-4 rounded-md border border-neutral-200 p-4">
    <div className="text-sm font-semibold text-neutral-900">Services Cost</div>

    {/* 3-up card grid */}
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-orange-200 bg-white p-4">
        <div className="text-sm font-semibold text-neutral-900">
          Analysis & Planning
        </div>
        <p className="mt-1 text-sm text-neutral-800">$250 One-Time</p>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-white p-4">
        <div className="text-sm font-semibold text-neutral-900">
          Operational Management & Digital Profiles
        </div>
        <p className="mt-1 text-sm text-neutral-800">$500 Monthly</p>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-white p-4">
        <div className="text-sm font-semibold text-neutral-900">
          Other Inclusions
        </div>
        <p className="mt-1 text-sm text-neutral-800">No Cost</p>
      </div>
    </div>
  </div>
</section>

      
    </div>
  );
}

  