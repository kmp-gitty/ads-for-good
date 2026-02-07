import InquiryLauncher from "@/components/InquiryLauncher";
import StickyCTA from "@/components/StickyCTA";

export const metadata = {
    title: "SEO Services for Small Businesses | Ads for Good",
    description:
      "Practical SEO services for small businesses and local search. Improve Google and other search rankings with clean setup, technical fixes, and sustainable organic growth.",
  };
  
  export default function SeoServicesPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 overflow-x-hidden">
        {/* HERO (centered) */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-16">
          <section className="w-full flex flex-col gap-10 md:flex-row md:items-start">
           {/* Left */}
<div className="flex-1 min-w-0 flex flex-col">
  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
    Small Business SEO Services: Organic & Local Search
  </h1>

  <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
    There’s roughly 8.5 billion searches that happen on Google every day — not including other search engines
    like Bing or DuckDuckGo.
    <br />
    <br />
    These searches can be powerful for your business to get new customers. Let’s make sure you’re at the top
    of the page.
  </p>

  {/* CTA */}
  <section id="primary-cta" className="mt-8">
  <InquiryLauncher
    label="Make My Business More Visible"
    defaultServices={["SEO Services"]}
    sourceLabel="SEO Services — Hero CTA"
    className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
  />
  </section>
</div>

  
            {/* Right */}
            <div className="flex-1 min-w-0">
              <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
                <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                  <img
                    src="/images/Consulting.png"
                    alt="Consulting Session Illustration"
                    width={500}
                    height={500}
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <h2 className="text-sm font-semibold text-neutral-900">Let&apos;s Make You More Findable.</h2>
  
                <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                  $250 for initial analysis and planning then $50 a month for local seo monitoring. National SEO efforts are priced based on need.
                  <br />
                  <br />
                  To get it right, we need to spend the time learning where you are, researching where you can go, and setting up tracking to make sure we get there.
                  <br />
                  <br />
                  SEO is slow, so we require a 2 month minimum engagement to start.
                </p>
              </div>
            </div>
          </section>
        </div>
  
        {/* FULL-WIDTH ORANGE BAND */}
        <section className="w-full bg-orange-100">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
              What's our approach to SEO?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-4xl">
              Organic searches and results are powerful. Besides search engines, people use search on social media and other platforms to find their needs every day. We believe focusing on your business's easy to reach terms and building toward the most valuable ones. Always focusing on nearby and ready to buy.
            </p>
  
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Starts with you
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  What are your services and where is your current search strength?
                  <br />
                  <br />
                  Leading to:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Business or service keywords we should focus on
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    What terms get users to your site currently
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    What terms do we want to capture and rank for
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Map out your business's plan for organic growth
                  </li>
                </ul>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Next are customers
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  After understanding your business, then we need to understand what are people actually searching.
                  <br />
                  <br />
                  Turning into:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Terms people use that sync with your services
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    What locations or areas search for your services most
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Do local versus regional or national searches differ
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    What actions are people taking after a search
                  </li>
                </ul>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Last is combining the two
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  This is why initial analysis & planning is important and mandatory. 
                  <br />
                  <br />
                  We combine You & Customer data:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Find the terms that are most relevant
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Go after searches that are both: impactful & in-reach
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Benchmark and set your standard for organic search
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Create a plan to get your business to the top of search
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
  
        {/* EVERYTHING BELOW (centered) */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-24">
          {/* Who this is for / not for */}
          <section className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-black bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Business owners looking for help growing organically</li>
                <li>Entrepreneurs wanting the top spot on the 1st page of results</li>
                <li>Owners exploring what can be done without paying for ads</li>
              </ul>
            </div>
  
            <div className="rounded-3xl border border-black bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Businesses looking for a DIY solution</li>
                <li>Teams looking to spend on paid ads</li>
                <li>Anyone wanting a cookie-cutter plan</li>
              </ul>
            </div>
          </section>
  
          {/* Process */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight text-orange-500">
              What&apos;s the process?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
              This service is designed to be 3 things: 1) Hands-off for you. 2) Narrowed to the most important things you can do for organic search. 3) Easy to understand, track, and monitor.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Where we start</h3>
                <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed">
                  The details & technical setup.
                  <br />
                  <br />
                  We'll use free-to-you tools to understand your current SEO position. This means placing a bit of code on your website to help us get this data.
                  <br />
                  <br />
                  <br />
                  We'll also have a discussion on all of your key services and related terms.
                </p>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What we spend time on</h3>
                <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed">
                  Planning, planning, doing.
                  <br />
                  <br />
                  Since SEO is slower moving, the planning phase is most important. We'll spend time researching, but focus on crossing what you offer and what people are searching.
                  <br />
                  <br />
                  The doing looks different for every business. A mixture of technical updates, new site content, updating profiles, etc.
                </p>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What happens when we&apos;re done</h3>
                <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed">
                  SEO is never "done".
                  <br />
                  <br />
                  Staying relevant requires consistent monitoring and updates. The silver lining, since SEO is slower moving, constant changes aren't needed.
                  <br />
                  <br />
                  Monthly monitoring ensures you're growing, we're not missing anything, and let's us know if change is needed.
                </p>
              </div>
            </div>
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
                  q: "What does SEO even mean?",
                  a: "Literally: Search Engine Optimization. In-Practice: it means making your business show up more in organic search results.",
                },
                {
                  q: "Why do you require an initial 2 month period?",
                  a: "We require an intial 2 month engagement because SEO is a slower moving process - this gives us enough time to plan, do, and analyze. It's not like paid ads where a flip of a switch and a couple weeks can give us an idea of where we're heading.",
                },
                { q: "What happens after the initial 2 month period?", 
                  a: "Hopefully your rankings are growing, you're satisfied, and we continue month to month monitoring. But, if not, we stop.",
                },
                {
                    q: "How does the initial payment work?",
                    a: "The $250 analysis and planning fee begins the process, then we start your monthly service fee the next calendar month after our planning phase.",
                  },
                {
                  q: "What if I want help with ads instead?",
                  a: (
                    <>
                      This service is meant to manage your organic search presence, for ads check-out our{" "}
                      <a
                        href="https://www.ads4good.com/for-businesses/digital-ads"
                        className="text-orange-500 underline hover:text-orange-600"
                      >
                        Digital Ads Services
                      </a>
                      .
                    </>
                  ),
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
  
          {/* Other services */}
<section className="mt-14 sm:mt-16">
  <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      
      {/* LEFT COLUMN */}
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900">
          Looking for other services?
        </h2>

        <p className="mt-3 text-sm sm:text-base text-neutral-800">
          Look no further — just click one of our other options.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://www.ads4good.com/for-businesses#ideas-guidance"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For Ideas & Guidance
          </a>

          <a
            href="https://www.ads4good.com/for-businesses#ops-execution"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For Operation & Execution
          </a>

          <a
            href="https://www.ads4good.com/for-businesses/marketing-team"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            Be My Marketing Team
          </a>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div>
        <h3 className="mt-4 md:mt-4 text-lg font-semibold text-neutral-900">
          Need help beyond your organic ranking?
        </h3>

        <p className="mt-2 text-sm text-neutral-700">
          Paid Ads marketing services:
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="https://www.ads4good.com/for-businesses/consulting"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For Consulting Hours
          </a>

          <a
            href="https://www.ads4good.com/for-businesses/digital-ads"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For Digital Ads Assistance
          </a>

          <a
            href="https://www.ads4good.com/for-businesses/direct-mail"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For Local Direct Mail Campaigns
          </a>
        </div>
      </div>

    </div>
  </div>
</section>
        </div>

        <StickyCTA
  targetId="primary-cta"
  label="Make My Business More Visible"
  defaultServices={["SEO Services"]}
  sourceLabel="SEO Services Page — Sticky CTA"
/>
      </main>
    );
  }