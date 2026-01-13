"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultServices?: string[];
  serviceOptions?: string[];
  sourceLabel?: string; // optional: which button/page opened it
};

export default function InquiryModal({
  open,
  onClose,
  defaultServices = [],
  serviceOptions,
  sourceLabel,
}: Props) {
  const pathname = usePathname();

  const options = useMemo(
    () =>
      serviceOptions ?? [
        "DIY Marketing Guidebook",
        "Marketing Advice On Demand",
        "Digital Health Check",
        "Consulting",
        "Website Builds & Updates",
        "Digital Profile Management",
        "SEO Services",
        "Digital Ads",
        "Local Direct Mail",
        "Be My Marketing Team",
      ],
    [serviceOptions]
  );

  const [firstLast, setFirstLast] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [details, setDetails] = useState("");
  const [services, setServices] = useState<string[]>(defaultServices);

  // ✅ new
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Re-initialize each time it opens
  useEffect(() => {
    if (!open) return;
    setServices(defaultServices);

    // reset submit UX each open
    setMarketingConsent(true);
    setSubmitting(false);
    setSubmitted(false);
    setErrorMsg(null);
  }, [open, defaultServices]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Lock background scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const pageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${pathname}`
      : pathname;

  const toggleService = (s: string) => {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstLast,
          companyName,
          companyWebsite,
          services,
          details,
          sourceLabel,
          pageUrl, // ✅ capture page
          marketingConsent, // ✅ consent
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Submission failed.");
      }

      // ✅ show thank-you UI
      setSubmitted(true);

      // (optional) clear inputs after submit
      setFirstLast("");
      setCompanyName("");
      setCompanyWebsite("");
      setDetails("");
      setServices([]);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop (behind panel). Button allows click-to-close. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close inquiry form"
        className="absolute inset-0 bg-black/40"
      />

      {/* Viewport scroller (keeps modal centered + allows small screens) */}
      <div className="absolute inset-0 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto w-full max-w-3xl">
          {/* Panel (above backdrop) */}
          <div className="relative z-10 rounded-3xl border border-orange-200 bg-white shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-orange-100">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-neutral-900">
                  Contact / Get Started
                </h3>
                <p className="mt-1 text-sm text-neutral-700">
                  Share a few details and we’ll reply quickly.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-100"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {submitted ? (
                <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-6">
                  <h4 className="text-lg font-semibold text-neutral-900">
                    Thanks — inquiry received!
                  </h4>
                  <p className="mt-2 text-sm text-neutral-800 leading-relaxed">
                    We’ll reply soon. If it’s time-sensitive, email{" "}
                    <span className="font-medium">katoa@ads4good.com</span>.
                  </p>

                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    Close →
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-3">
                  {errorMsg && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-700">
                        First & Last Name
                      </span>
                      <input
                        value={firstLast}
                        onChange={(e) => setFirstLast(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Jane Doe"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-700">
                        Company Name
                      </span>
                      <input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Acme Co."
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-700">
                      Company Website
                    </span>
                    <input
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="https://example.com"
                    />
                  </label>

                  <fieldset className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                    <legend className="px-1 text-xs font-semibold text-neutral-700">
                      Interested Service(s)
                    </legend>

                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {options.map((opt) => {
                        const checked = services.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={[
                              "flex items-start gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer",
                              checked
                                ? "border-orange-300 bg-white"
                                : "border-orange-100 bg-white/70 hover:bg-white",
                            ].join(" ")}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(opt)}
                              className="mt-1"
                            />
                            <span className="text-neutral-800">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-700">
                      Other Details
                    </span>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Anything helpful: goals, timeline, budget range, links, etc."
                    />
                  </label>

                  {/* ✅ marketing consent */}
                  <label className="flex items-start gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-1"
                    />
                    <span>I agree to receive marketing emails.</span>
                  </label>

                  {/* Sticky submit bar */}
                  <div className="sticky bottom-0 -mx-4 sm:-mx-5 mt-2 px-4 sm:px-5 py-3 bg-white border-t border-orange-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full border border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-100"
                      disabled={submitting}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Submitting..." : "Submit →"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* (optional) tiny debug footer */}
            {!submitted && (
              <div className="px-4 sm:px-5 pb-4 text-[11px] text-neutral-400">
                Page: {pageUrl}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



