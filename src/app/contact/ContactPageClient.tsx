"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import InquiryLauncher from "@/components/InquiryLauncher";

// URL contract:
//   /contact?open=inquiry&service=<ServiceName>&source=<Label>
//     open=inquiry → auto-open the inquiry modal on page load
//     service=...  → pre-select this service (single value)
//     source=...   → attribution label (used as sourceLabel on the modal)
//
// Params are captured once via useState lazy-init so subsequent URL strip
// (see effect below) doesn't re-render the modal with reset defaults. After
// the auto-open fires, router.replace() clears the params so refresh doesn't
// re-open and shared links stay clean.

function ContactPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Freeze the URL param values ONCE at mount. If we re-read searchParams on
  // each render, the router.replace strip would flip them to null on render 2
  // and the modal would reset to the default services / source. Freezing means
  // if the user closes and reopens the modal, they still get the intended
  // pre-selection from the inbound URL.
  const [initial] = useState(() => {
    const openParam = searchParams?.get("open");
    return {
      autoOpen: openParam === "inquiry",
      service: searchParams?.get("service") || null,
      source: searchParams?.get("source") || null,
    };
  });

  // After the auto-open takes effect, strip the params from the URL so a
  // refresh doesn't re-open the modal and shared/back-buttoned URLs stay
  // clean. Only fires when we actually auto-opened; a normal /contact visit
  // is untouched.
  useEffect(() => {
    if (initial.autoOpen) {
      router.replace(pathname, { scroll: false });
    }
  }, [initial.autoOpen, pathname, router]);

  // Resolve the modal props. URL params win when auto-opened; otherwise the
  // page's normal defaults apply so the hero button behaves unchanged.
  const defaultServices =
    initial.autoOpen && initial.service
      ? [initial.service]
      : ["General Contact"];
  const sourceLabel =
    initial.autoOpen && initial.source
      ? initial.source
      : "Contact Page — Hero CTA";

  return (
    <main className="bg-[#f7f4ee] text-neutral-900 px-4 pt-20 pb-28 flex justify-center">
      <div className="w-full max-w-6xl">

        {/* HERO (split layout) */}
        <section className="grid gap-10 md:grid-cols-2 items-start">

          {/* LEFT */}
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Contact Us
            </h1>

            <p className="mt-5 text-neutral-700 max-w-xl leading-relaxed">
              Whether you're a consumer looking for help or a business wanting to partner,
              we're here to listen - use the button to the right.
              <br /><br />
              Our physical location is in Manayunk, Philadelphia, PA. Never been? Great small town vibe next to a big city. But, we're a remote team that helps people and clients all over.
              <br /><br />
              Where we have roots & connections:
            </p>

            <ul className="mt-4 text-neutral-700 max-w-xl list-disc list-inside space-y-1">
              <li>Manayunk, Philadelphia, PA</li>
              <li>Wernersville & Reading, PA</li>
              <li>San Francisco, CA</li>
              <li>Las Vegas, NV</li>
              <li>Honolulu, HI</li>
            </ul>
          </div>

          {/* RIGHT (CTA ABOVE THE FOLD) */}
          <div className="flex items-center md:justify-end mt-6 md:mt-20">
            <div className="w-full max-w-sm rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-900">
                Get in touch
              </h2>
              <p className="mt-2 text-xs text-neutral-600">
                Quick form for any questions, partnership inquiry, or support.
              </p>

              <InquiryLauncher
                label="Fill Out Our Contact Form"
                defaultServices={defaultServices}
                sourceLabel={sourceLabel}
                autoOpen={initial.autoOpen}
                className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600"
              />
            </div>
          </div>

        </section>

        {/* BOTTOM CARDS */}
        <section className="mt-20 grid gap-6 md:grid-cols-2">

          {/* FOR PEOPLE */}
          <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-orange-500 uppercase tracking-wide">
              for People
            </h2>

            <p className="mt-4 text-sm text-neutral-700 leading-relaxed">
              Have a question about privacy tools, our education resources, or how our
              mission works? This area contains a simple form for consumer inquiries.
              <br /><br />
            </p>
          </div>

          {/* FOR BUSINESSES */}
          <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-orange-500 uppercase tracking-wide">
              for Businesses
            </h2>

            <p className="mt-4 text-sm text-neutral-700 leading-relaxed">
              Want help with marketing? Interested in partnering with our ad network?
              Curious about ethical advertising programs? This column contains our business inquiry form.
              <br /><br />
            </p>
          </div>

        </section>

      </div>
    </main>
  );
}

export default function ContactPageClient() {
  // useSearchParams() must be inside a Suspense boundary in the App Router.
  // Fallback is null (page is CSR-driven; brief flash is fine).
  return (
    <Suspense fallback={null}>
      <ContactPageContent />
    </Suspense>
  );
}
