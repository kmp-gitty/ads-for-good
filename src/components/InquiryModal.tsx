"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  defaultServices?: string[];
  serviceOptions?: string[];
  sourceLabel?: string;
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
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [details, setDetails] = useState("");
  const [services, setServices] = useState<string[]>(defaultServices);

  const [marketingConsent, setMarketingConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const startedRef = useRef(false);


  // Re-initialize each time it opens
  useEffect(() => {
    if (!open) return;

 // GA: form opened
 if (typeof window !== "undefined" && typeof window.gtag === "function") {
  window.gtag("event", "form_open", {
    form_name: "inquiry_modal",
    form_type: "service", // or "general" if you consider this your general contact form
    form_location: sourceLabel ?? "unknown",
    prefill_services: defaultServices.join("|") || "none",
  });
}

    setServices(defaultServices);
    setMarketingConsent(true);
    setSubmitting(false);
    setSubmitted(false);
    setErrorMsg(null);
    setHasStarted(false);
    startedRef.current = false;

    // reset email so you don’t reuse by accident
    setEmail("");
  }, [open, defaultServices, sourceLabel]);

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

  const trackFormStart = () => {
    if (startedRef.current) return;
  
    startedRef.current = true;
    setHasStarted(true);
  
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "form_start", {
        form_name: "inquiry_modal",
        form_type: "service",
        form_location: sourceLabel ?? "unknown",
        prefill_services: defaultServices.join("|") || "none",
      });
    }
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
          email,
          companyName,
          companyWebsite,
          services,
          details,
          sourceLabel,
          pageUrl,
          marketingConsent,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error || "Submission failed.");

      setSubmitted(true);
      
      // GA: form submitted successfully
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "form_submit", {
          form_name: "inquiry_modal",
          form_type: "service",
          form_location: sourceLabel ?? "unknown",
          prefill_services: services.join("|") || "none",
        });
      }
      

      // clear inputs after submit
      setFirstLast("");
      setEmail("");
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
      {/* Backdrop (click to close) */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close inquiry form"
        className="absolute inset-0 bg-black/40"
      />

      {/* Centered viewport */}
      <div className="absolute inset-0 overflow-y-auto p-3 sm:p-6 sm:flex sm:items-center sm:justify-center">
        {/* Scale down slightly on shorter viewports (helps avoid scroll) */}
        <div className="w-full max-w-6xl origin-center sm:[@media(max-height:740px)]:scale-[0.95] sm:[@media(max-height:680px)]:scale-[0.92]">
          {/* Panel */}
          <div className="relative z-10 w-full rounded-3xl border border-orange-200 bg-white shadow-xl max-h-[92vh] sm:max-h-none overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-orange-100 p-4 sm:p-5 bg-white">
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
                className="shrink-0 rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-semibold text-orange-600 hover:bg-orange-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(92vh-140px)] sm:overflow-visible sm:max-h-none">
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
                <form onSubmit={onSubmit} className="space-y-2">
                  {errorMsg && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  )}

                  {/* Row 1: Name + Email */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-700">
                        First & Last Name
                      </span>
                      <input
                        value={firstLast}
                        onFocus={trackFormStart}
                        onChange={(e) => setFirstLast(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Jane Doe"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-700">
                        Email
                      </span>
                      <input
                        type="email"
                        value={email}
                        onFocus={trackFormStart}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="you@company.com"
                      />
                    </label>
                  </div>

                  {/* Row 2: Company Name + Website (side-by-side) */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-700">
                        Company Name
                      </span>
                      <input
                        value={companyName}
                        onFocus={trackFormStart}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Acme Co."
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-700">
                        Company Website
                      </span>
                      <input
                        value={companyWebsite}
                        onFocus={trackFormStart}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="https://example.com"
                      />
                    </label>
                  </div>

                  {/* Services */}
                  <fieldset className="rounded-2xl border border-orange-100 bg-orange-50/60 p-2.5">
                    <legend className="px-1 text-xs font-semibold text-neutral-700">
                      Interested Service(s)
                    </legend>

                    {/* IMPORTANT: force 2 columns only (no lg:grid-cols-3) */}
                    <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2">
                      {options.map((opt) => {
                        const checked = services.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={[
                              "flex items-start gap-2 rounded-xl border px-3 py-1 text-sm cursor-pointer",
                              checked
                                ? "border-orange-300 bg-white"
                                : "border-orange-100 bg-white/70 hover:bg-white",
                            ].join(" ")}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                trackFormStart();
                                toggleService(opt)}}
                              className="mt-1"
                            />
                            <span className="text-neutral-800 leading-snug">
                              {opt}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {/* Details + Consent */}
                  <div className="grid gap-2 sm:grid-cols-2 sm:items-start">
                    <label className="block">
                      <span className="text-xs font-semibold text-neutral-700">
                        Other Details
                      </span>
                      <textarea
                        value={details}
                        onFocus={trackFormStart}
                        onChange={(e) => setDetails(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Anything helpful: goals, timeline, budget range, links, etc."
                      />
                    </label>

                    <label className="mt-5 flex items-start gap-2 text-sm text-neutral-700 sm:mt-6">
                      <input
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={(e) => {
                          trackFormStart();
                          setMarketingConsent(e.target.checked)}}
                        className="mt-1"
                      />
                      <span className="leading-snug">
                        I agree to receive marketing emails.
                      </span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="sticky bottom-0 z-20 mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end border-t border-orange-100 bg-white pt-3 pb-3">
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
          </div>
        </div>
      </div>
    </div>
  );
}






