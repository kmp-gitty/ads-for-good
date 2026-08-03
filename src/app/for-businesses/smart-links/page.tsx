import Link from "next/link";
import InquiryLauncher from "@/components/InquiryLauncher";
import SmartLinkRoutingGraphic from "@/components/SmartLinkRoutingGraphic";

export const metadata = {
  alternates: { canonical: "https://www.ads4good.com/for-businesses/smart-links" },
  title: "Link Management Software | Smart Links by afG",
  description:
    "First-party link management software: wrap links on your own domain, route by device or location, filter out bots, and keep every click yours.",
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is link management software?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A tool that sits between the links you share and where they go — so you can shorten them on your own domain, change the destination later, route different people to different pages, and see who actually clicked.",
      },
    },
    {
      "@type": "Question",
      name: "How is this different from a URL shortener?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A shortener makes a link shorter and counts clicks on someone else's domain. Link management runs on yours, so the click data is yours to keep, and it adds routing, consent handling, and bot filtering on top.",
      },
    },
    {
      "@type": "Question",
      name: "Do I have to use all of Chapter?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Smart Links works on its own; it's also part of the full Chapter platform.",
      },
    },
    {
      "@type": "Question",
      name: "Does it work with my email or ad platform?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — it wraps links behind Mailchimp, Klaviyo, Meta, Google Ads, Shopify Email, and more.",
      },
    },
    {
      "@type": "Question",
      name: "Can one link send people to different places?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — by device, location, cart status, audience, A/B split, or time. And you can change a link's destination retroactively: after you've sent an email, document, or post.",
      },
    },
    {
      "@type": "Question",
      name: "Is it privacy-safe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Consent-aware, respects opt-outs, and no invasive personally identifiable information.",
      },
    },
    {
      "@type": "Question",
      name: "What makes a link “first-party”?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It runs on your own domain, so the click and cookie belong to you, not a third party — and they last longer in modern browsers.",
      },
    },
  ],
};

export default function ChapterLinksPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-12 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }}
      />
      {/* HERO SECTION */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            Link management software that keeps every click yours.
          </h1>

          <div className="mt-3 flex gap-2 text-xs font-medium">
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
              Chapter Feature · Available Standalone · Available Self-Serve
            </span>
          </div>

          <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
            Smart Links is link management software built on your own domain.
            Wrap the links you already share in emails, texts, ads, and posts,
            then route each click to the right destination based on device,
            location, cart status, or audience. Because the link runs
            first-party, the click and the cookie belong to you rather than a
            third-party platform, and they survive longer in modern browsers.
            Bots and email security scanners get filtered out, so what&apos;s
            left is real people. It&apos;s not a vanity shortener with a
            dashboard bolted on.
          </p>

        </div>

        {/* Right: Explainer card + sub-line + CTA (fills the column, no right-side gap) */}
        <div className="flex-1">
          <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
            <h2 className="text-sm font-semibold text-neutral-900">
              What link management software should do
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>Wrap any link behind your own first-party domain</li>
              <li>
                Send to different destinations — by device, location, cart, or
                audience
              </li>
              <li>Respect consent and opt-outs on every click</li>
              <li>
                Filter out bots and email security scanners so your numbers stay
                clean
              </li>
              <li>Feed every click into your Chapter attribution</li>
            </ul>
          </div>

          <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
            Smart Links wraps the links you already share — in emails, texts,
            ads, posts, and profiles — so you own the click: protecting consent
            and sending the right person to the right place.
          </p>

          {/* CTA */}
          <section id="primary-cta" className="mt-8">
            <Link
              href="/chapter/signup"
              className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
            >
              Start your 21 Day Free trial
            </Link>
          </section>
        </div>
      </section>

      {/* WHAT YOU CAN DO SECTION */}
      <section className="w-full bg-orange-100 mt-12">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                How businesses use Smart Links
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                The links you already share become smart, first-party, and fully
                yours. A few of the ways businesses use them:
              </p>
            </div>

            <SmartLinkRoutingGraphic />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Pill 1 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Recover carts automatically.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Send a returning shopper with an open cart straight to checkout —
                not the homepage.
              </p>
            </div>

            {/* Pill 2 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Route by device and place.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                iOS vs. Android deep links, local landing pages, or language —
                all from a single link.
              </p>
            </div>

            {/* Pill 3 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Fix links after they&apos;re out.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Change a link&apos;s destination retroactively — even after the
                email, post, or document has shipped.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Centered content below */}
      <div className="w-full max-w-6xl">
        {/* Who this is for / not for */}
        <section className="mt-8 sm:mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              Who this is for
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>
                Businesses running email, SMS, ad, or social campaigns who want
                to own their click data
              </li>
              <li>Ecommerce stores wanting cart-recovery or device-smart links</li>
              <li>Anyone tired of platform lock-in on tracking</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              Who this is not for
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Businesses that never share links or run campaigns</li>
              <li>
                Anyone who just wants a plain vanity short link with no
                measurement
              </li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            FAQ
          </h2>
          <p className="mt-2 text-sm sm:text-base text-neutral-800 max-w-3xl">
            Quick answers to the most common questions.
          </p>

          <div className="mt-6 space-y-3 max-w-4xl">
            {[
              {
                q: "What is link management software?",
                a: "A tool that sits between the links you share and where they go — so you can shorten them on your own domain, change the destination later, route different people to different pages, and see who actually clicked.",
              },
              {
                q: "How is this different from a URL shortener?",
                a: "A shortener makes a link shorter and counts clicks on someone else's domain. Link management runs on yours, so the click data is yours to keep, and it adds routing, consent handling, and bot filtering on top.",
              },
              {
                q: "Do I have to use all of Chapter?",
                a: "No. Smart Links works on its own; it's also part of the full Chapter platform.",
              },
              {
                q: "Does it work with my email or ad platform?",
                a: "Yes — it wraps links behind Mailchimp, Klaviyo, Meta, Google Ads, Shopify Email, and more.",
              },
              {
                q: "Can one link send people to different places?",
                a: "Yes — by device, location, cart status, audience, A/B split, or time. And you can change a link's destination retroactively: after you've sent an email, document, or post.",
              },
              {
                q: "Is it privacy-safe?",
                a: "Consent-aware, respects opt-outs, and no invasive personally identifiable information.",
              },
              {
                q: "What makes a link “first-party”?",
                a: "It runs on your own domain, so the click and cookie belong to you, not a third party — and they last longer in modern browsers.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm"
              >
                <summary className="cursor-pointer select-none font-medium text-neutral-900 text-sm sm:text-base">
                  {item.q}
                </summary>

                <div className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Related reading — link-management cluster spokes */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            Related reading
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link
              href="/for-people/education/link-management-tools"
              className="rounded-3xl border border-orange-100 bg-white px-5 py-4 shadow-sm hover:bg-orange-50"
            >
              <p className="text-sm font-semibold text-neutral-900">
                Link management tools, honestly compared
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                What each link tool is actually best at, who it suits, and where
                it falls short.
              </p>
            </Link>
            <Link
              href="/for-people/education/first-party-click-tracking"
              className="rounded-3xl border border-orange-100 bg-white px-5 py-4 shadow-sm hover:bg-orange-50"
            >
              <p className="text-sm font-semibold text-neutral-900">
                Why your click data disappears
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                What changed with cookies and ITP, and what first-party tracking
                actually fixes.
              </p>
            </Link>
          </div>
        </section>

        {/* Part of Chapter / cross-links */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* LEFT COLUMN */}
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900">
                  Smart Links is one piece of Chapter.
                </h2>

                <p className="mt-3 text-sm sm:text-base text-neutral-800">
                  See how the full platform connects every click, visit, and
                  conversion into one lifecycle view.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/for-businesses/lifecycle-attribution"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    Chapter, lifecycle attribution
                  </Link>

                  <Link
                    href="/for-businesses/smart-prompts"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    exit intent popup software
                  </Link>

                  <Link
                    href="/for-businesses"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    View All Plans
                  </Link>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div>
                <h3 className="mt-4 md:mt-4 text-lg font-semibold text-neutral-900">
                  Prefer to talk it through?
                </h3>

                <p className="mt-2 text-sm text-neutral-700">
                  Tell us what you&apos;re trying to route, protect, or measure.
                </p>

                <div className="mt-5">
                  <InquiryLauncher
                    label="Talk To Us About Smart Links"
                    defaultServices={["Smart Links"]}
                    sourceLabel="Smart Links — Bottom CTA"
                    className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
