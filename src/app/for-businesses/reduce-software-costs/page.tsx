import Link from "next/link";
import InquiryLauncher from "@/components/InquiryLauncher";
import SubscriptionFreedomGraphic from "@/components/SubscriptionFreedomGraphic";

export const metadata = {
  title: "Subscription Freedom — Own Your Tools & Cut Software Costs | Ads for Good",
  description:
    "Stop renting software you could own. We build custom replacements for the subscriptions and widgets you pay for monthly — built for your business, so you cancel the fee and own the tool.",
};

export default function SubscriptionFreedomPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-8 pb-24">
      {/* HERO SECTION */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            Subscription Freedom: Own your tools, don&apos;t rent them.
          </h1>

          <div className="mt-3 flex gap-2 text-xs font-medium">
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
              afG Service · Own it, don&apos;t rent it
            </span>
          </div>

          <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
            You&apos;re paying every month for tools you could own. We build you a
            custom replacement — one that fits your business and lives on your
            site — so you cancel the subscription and stop paying rent on
            software you&apos;ll never own.
          </p>

          {/* CTA */}
          <section id="primary-cta" className="mt-8">
            <InquiryLauncher
              label="Talk To Us About Subscription Freedom"
              defaultServices={["Subscription Freedom"]}
              sourceLabel="Subscription Freedom — Hero CTA"
              className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
            />
          </section>
        </div>

        {/* Right: Explainer card */}
        <div className="flex-1">
          <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
            <h2 className="text-sm font-semibold text-neutral-900">
              Over your business lifetime — how much digital rent will you have
              paid?
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>Audit what you&apos;re paying for monthly — find the tools worth owning</li>
              <li>
                We build you a custom replacement that fits your business, on
                your site
              </li>
              <li>Cancel the subscription — stop paying monthly rent on software</li>
              <li>Built for your needs, not a one-size-fits-all widget</li>
              <li>Ongoing support from us if you want it — at a discounted rate</li>
            </ul>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN DO SECTION */}
      <section className="w-full bg-orange-100 mt-12">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                What you can do with Subscription Freedom.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                Almost any rented tool can become one you own — and it usually
                fits better. A few we&apos;ve built:
              </p>
            </div>

            <SubscriptionFreedomGraphic />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Pill 1 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Social feed, owned.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Instead of paying monthly for a rented Instagram feed (like
                Behold), we build a feed and admin page directly on your site.
              </p>
            </div>

            {/* Pill 2 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                A tool built for you.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                A client&apos;s rigid Shopify fulfillment app didn&apos;t fit her
                workflow. We built her own — and mistakes dropped 95%.
              </p>
            </div>

            {/* Pill 3 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Your own review feed.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Instead of upgrading a limited free review widget, we build a
                review feed that pulls from the sources you actually use.
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
                Businesses stacking up monthly fees for widgets, apps, and tools
                they could own
              </li>
              <li>Anyone whose rented tool is too rigid or missing what they need</li>
              <li>
                Website and Shopify owners paying for apps that don&apos;t quite
                fit
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              Who this is not for
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>
                Businesses that want a big vendor&apos;s automatic updates and
                roadmap, fully hands-off
              </li>
              <li>
                Simple needs where an off-the-shelf subscription is genuinely
                cheaper than owning
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
                q: "How does this save me money?",
                a: "You replace a recurring subscription with a build you own, so you stop paying monthly.",
              },
              {
                q: "What kinds of tools can you replace?",
                a: "Social feeds, review widgets, Shopify and app add-ons, embeds, forms, and more — most rented widgets or apps.",
              },
              {
                q: "What if I need support or updates later?",
                a: "We offer ongoing support and updates at a discounted rate to your previous subscription, so you're never on your own.",
              },
              {
                q: "Will my version have the features I need?",
                a: "We build for your actual workflow — it often fits better than the rented tool, without the parts you don't use.",
              },
              {
                q: "Isn't a subscription easier?",
                a: "Sometimes. If a tool is cheap and does exactly what you need, keep it. We only replace the ones worth owning.",
              },
              {
                q: "Do I own it outright?",
                a: "Yes — the build lives on your site or in your store, and it's yours.",
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

        {/* Move your margin / cross-links */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* LEFT COLUMN */}
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900">
                  Two ways to move your margin.
                </h2>

                <p className="mt-3 text-sm sm:text-base text-neutral-800">
                  This is the spend-less side. See the earn-more side — extra
                  revenue from the audience you already have.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/for-businesses/ad-monetization"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    Ad Monetization
                  </Link>

                  <Link
                    href="/for-businesses/smart-prompts"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    Smart Prompts
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
                  Tell us what you&apos;re paying for monthly.
                </p>

                <div className="mt-5">
                  <InquiryLauncher
                    label="Talk To Us About Subscription Freedom"
                    defaultServices={["Subscription Freedom"]}
                    sourceLabel="Subscription Freedom — Bottom CTA"
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
