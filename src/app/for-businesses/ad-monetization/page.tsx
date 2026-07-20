import Link from "next/link";
import InquiryLauncher from "@/components/InquiryLauncher";
import AdMonetizationGraphic from "@/components/AdMonetizationGraphic";

export const metadata = {
  title: "Ad Monetization | Ads for Good",
  description:
    "Earn extra revenue from the audience you already have — starting with email. Extra, afG's ad network, adds seamless ad delivery to the sends you're already doing.",
};

export default function AdMonetizationPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-8 pb-24">
      {/* HERO SECTION */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            Ad Monetization: Extra revenue from what you already send.
          </h1>

          <div className="mt-3 flex gap-2 text-xs font-medium">
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
              afG Service · Powered by Extra
            </span>
          </div>

          <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
            Turn the audience and properties you already have into a new revenue
            stream — starting with your email. Extra, our ad network, adds
            seamless ad delivery to the sends you&apos;re already doing, so you
            earn more without raising prices or adding products.
          </p>

          {/* CTA */}
          <section id="primary-cta" className="mt-8">
            <InquiryLauncher
              label="Talk To Us About Ad Monetization"
              defaultServices={["Ad Monetization"]}
              sourceLabel="Ad Monetization — Hero CTA"
              className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
            />
          </section>
        </div>

        {/* Right: Explainer card */}
        <div className="flex-1">
          <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
            <h2 className="text-sm font-semibold text-neutral-900">
              Earn from what you already have:
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>Earn from every email — get paid on the sends you already do</li>
              <li>
                Enable once — we handle the ads, reporting, and tech; you copy &amp;
                paste, then collect
              </li>
              <li>
                Keep control — you approve which advertisers appear; your content
                stays yours
              </li>
              <li>Simple, text-only ads — no images, nothing that detracts</li>
              <li>Privacy-safe — we never share or sell your customers&apos; data</li>
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
                What you can do with Ad Monetization.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                Monetize the audience and properties you already own — starting
                with email, then your site and app. Extra handles the ads; you
                keep the control and the revenue share.
              </p>
            </div>

            <AdMonetizationGraphic />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Pill 1 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Email first.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Programmatic text-only ads inserted just before send. Our tech
                avoids the usual blockers, so ads reliably reach the inbox.
              </p>
            </div>

            {/* Pill 2 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Site + app next.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Extend the same revenue stream to your other properties as they
                come online.
              </p>
            </div>

            {/* Pill 3 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                You stay in control.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Approve advertisers, keep your brand and content intact — and we
                never touch your customer data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Centered content below */}
      <div className="w-full max-w-6xl">
        {/* EXTRA BY afG — the network */}
        <section className="mt-8 sm:mt-10">
          <div className="rounded-[2rem] bg-[#24364D] p-6 sm:p-8 text-white shadow-[0_12px_36px_rgba(0,0,0,0.10)]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">
              The network
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Extra by afG — our ad network.
            </h2>
            <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-white/80">
              Extra is the ad network we built to connect trusted advertisers
              with the audiences businesses already reach. It matches high-intent
              messages to the moments your customers are already engaged —
              text-only, privacy-safe, and under your control. It&apos;s a
              sibling to Chapter, our attribution platform: two products, built
              by afG.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                Extra by afG · Ad network
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                Chapter by afG · Attribution
              </span>
            </div>
          </div>
        </section>

        {/* Who this is for / not for */}
        <section className="mt-8 sm:mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              Who this is for
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>
                Businesses that send email regularly — newsletters, receipts,
                updates, promos — and want extra revenue
              </li>
              <li>
                Anyone with an engaged audience who won&apos;t raise prices or
                add products
              </li>
              <li>Publishers, creators, and apps with inventory to monetize</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              Who this is not for
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Businesses with little or no email or audience volume</li>
              <li>Anyone unwilling to include any third-party ads</li>
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
                q: "How do I make money?",
                a: "You earn a share of the revenue from ads shown in the emails you already send.",
              },
              {
                q: "Will ads clutter my emails?",
                a: "No — they're text-only (no images), and you approve which advertisers appear.",
              },
              {
                q: "Is my customer data safe?",
                a: "Yes. Extra never shares or sells your customers' data.",
              },
              {
                q: "Won't the ads get blocked?",
                a: "Our tech inserts ads just before send, avoiding the usual blockers.",
              },
              {
                q: "How much work is it?",
                a: "Enable once — copy & paste code into your email provider. We handle the ads, reporting, and tech; you collect.",
              },
              {
                q: "What about my website and app?",
                a: "Email is the live channel now; site and app monetization are next.",
              },
              {
                q: "What is Extra?",
                a: "Extra is afG's ad network — the tech and advertiser demand that powers your monetization. It's a sibling to Chapter, our attribution platform.",
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

        {/* Built by afG / cross-links */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* LEFT COLUMN */}
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900">
                  Built by afG, like Chapter.
                </h2>

                <p className="mt-3 text-sm sm:text-base text-neutral-800">
                  Extra and Chapter are the two networks we&apos;ve built in-house
                  — ad monetization and attribution. Explore the other, or see all
                  our plans.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/for-businesses/lifecycle-attribution"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    Explore Chapter
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
                  Tell us how you reach your audience today.
                </p>

                <div className="mt-5">
                  <InquiryLauncher
                    label="Talk To Us About Ad Monetization"
                    defaultServices={["Ad Monetization"]}
                    sourceLabel="Ad Monetization — Bottom CTA"
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
