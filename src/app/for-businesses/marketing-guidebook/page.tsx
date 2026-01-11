import GuidebookOutlineCompact from "./GuidebookOutlineCompact";

export const metadata = {
  title: "Small Business Marketing Guide - DIY Strategy & Playbooks | Ads for Good",
  description:
    "Prefer to do things on your own, but just need a little help? Use our downloadable digital guidebook to learn how marketing is done by fortune 500 companies to make their strategies your own.",
};

export default function MarketingGuidebookPage() {
  return (
    <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
      {/* HERO SECTION */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
        <div className="flex-1">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            A marketing guidebook you can actually use.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
            Some people like to DIY. Sometimes you just want a clear,
            step-by-step playbook you can follow on your own time — without digging through
            a hundred blogs and YouTube videos.
            <br /><br />
            The marketing guidebook is built for small and medium businesses who want to
            understand the &quot;why&quot; and the &quot;how&quot; of modern marketing, in
            plain language, with examples you can copy and adapt.
            <br /><br />
            <a
              href="https://forms.gle/mSm6dfmz8AhVzjkw9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 underline hover:text-orange-600"
            >
              Buy the guidebook here.
            </a>
            {" "}$25 gets you the 16 page marketing guidebook to better your business at your own pace.
          </p>
        </div>

        {/* Right: Card / explainer */}
        <div className="flex-1">
          <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
            {/* Image */}
            <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
              <img
                src="/images/MarketingGuidebook.png"
                alt="Marketing Guidebook Cover"
                className="object-contain w-full h-full"
              />
            </div>

            <h2 className="text-sm font-semibold text-neutral-900">
              What This Guidebook Covers:
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>Information about Free & Paid tools for your business</li>
              <li>How to get the most out of the mainstream digital channels</li>
              <li>Paid Search, Paid Social, & Ecommerce advice</li>
              <li>Big business ad facts</li>
              <li>Practical instructions to make simple, yet effective, changes</li>
            </ul>

            <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
              You'll learn what the thing is, why the thing is important, and how to implement
              the thing (if you choose).
            </p>
          </div>
        </div>
      </section>

      {/* SNEAK PEEK SECTION */}
      <section className="w-full bg-orange-100 mt-32">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
              A sneak peek of what's inside.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
              Disclaimer: I believe in "if it ain't broke, don't fix it". If you're running a successful business, and for the past 30 years you've found that word of mouth and a simple website works - I don't want you buying this, it won't be helpful.<br /><br />
              However, if you think there's more on the table and you've been thinking of taking marketing and digital tools more seriously - this guidebook is the perfect place to start.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Tool 1 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Free Tools: aka "Owned & Operated"
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                What can you do with the free tools you already have (or can easily setup)?
              </p>

              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Website & other digital properties (Facebook page, IG page, etc)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Profiles: Google, Yelp, etc
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Other things: Content, email, software, etc
                </li>
              </ul>
            </div>

            {/* Tool 2 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Paid Tools: Search, Social, Ecommerce, & More
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                What can you do with paid tools to grow your business?
              </p>

              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  The big ad platforms: Paid Search & Paid Social
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Ecommerce: Selling on Amazon
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Other things: SEO, Programmatic Ads, TV, OOH (Out of Home)
                </li>
              </ul>
            </div>

            {/* Tool 3 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                General Tips Across Sections
              </h3>

              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  What is a marketing guidebook and how do I use it?
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  How should I interpret marketing topics for my business?
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  How can I apply these marketing tactics to my business?
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  What are some examples across marketing topics I can implement?
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The sections below should stay inside your centered page width */}
      <div className="w-full max-w-6xl">
        {/* Who this is for / not for */}
        <section className="mt-8 sm:mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">Who this is for</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Business owners doing marketing theselves</li>
              <li>Anyone curious about simple improvements</li>
              <li>Owners in-between “I think there's more” and “I don't know how”</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Businesses looking for a long-term engagement</li>
              <li>Teams looking for execution instead of advice</li>
              <li>Anyone wanting a custom solution</li>
            </ul>
          </div>
        </section>

        {/* Guidebook Outline (compact + selectable) */}
        <section className="mt-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            Guidebook Outline
          </h2>

          <p className="mt-3 text-base sm:text-lg text-neutral-700 leading-relaxed max-w-4xl">
            Each section is designed to be simple and practical. Use the page numbers below to
            jump through an overview of each page.
          </p>

          <GuidebookOutlineCompact />
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">FAQ</h2>
          <p className="mt-2 text-sm sm:text-base text-neutral-800 max-w-3xl">
            Quick answers to the most common questions.
          </p>

          <div className="mt-6 space-y-3 max-w-4xl">
            {[
              {
                q: "What's the process for this?",
                a: "First: fill out the Guidebook Order Form. Second: we'll send you the payment link. Third: we'll send you the guidebook in your preferred file type.",
              },
              {
                q: "What file type is the guidebook in?",
                a: "There are 2 options: PDF or personalized link - both offer access forever.",
              },
              {
                q: "Is this better than hiring someone?",
                a: (
                  <>
                    Loaded question, so answer is: it depends. If you just want to try some simple steps to see what happens, then yes this is "better". But, if you're already thinking you need live or operational help, then this isn't for you. We'd suggest checking out our{" "}
                    <a
                      href="https://www.ads4good.com/for-businesses/consulting"
                      className="text-orange-500 underline hover:text-orange-600"
                    >
                      Consulting Services
                    </a>
                    .
                  </>
                ),
              },
              {
                q: "Is this good for beginners?",
                a: "Absolutely. This is meant to be easy to understand and simple to follow for those wanting to try something new for their business.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm"
              >
                <summary className="cursor-pointer select-none font-medium text-neutral-900 text-sm sm:text-base">
                  {item.q}
                </summary>

                <div className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl max-h-44 overflow-auto pr-2">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Other services */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
            <h2 className="text-2xl font-semibold text-neutral-900">
              Looking for other services?
            </h2>

            <p className="mt-3 text-sm sm:text-base text-neutral-800">
              Look no further — just click one of the options below.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-3">
              <a
                href="https://www.ads4good.com/for-businesses/consulting"
                className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
              >
                Consulting &amp; Operational Guidance
              </a>

              <a
                href="https://www.ads4good.com/for-businesses/marketing-guidebook"
                className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
              >
                DIY Marketing Guidebook
              </a>

              <a
                href="https://www.ads4good.com/for-businesses/digital-health-check"
                className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
              >
                In-Depth Digital Health Check
              </a>

              <a
                href="https://www.ads4good.com/for-businesses/direct-mail"
                className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
              >
                Direct Mail Campaigns
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

  
  
  