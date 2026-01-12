export const metadata = {
    title: "Digital Advertising Services - Search, Social & Paid Media | Ads for Good",
    description:
      "Paid digital ads management for small and medium businesses. Plan, buy, report, and manage paid ads campaigns for your business.",
  };
  
  export default function DigitalAdsPage() {
    return (
      <main className="bg-white text-neutral-900">
        {/* Page wrapper */}
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-12 sm:pt-16 pb-20 sm:pb-24">
          {/* Hero / Intro */}
          <section className="text-left">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
              Digital Advertising Services for Small & Medium Businesses
            </h1>
  
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-neutral-700 leading-relaxed max-w-3xl">
              An easy way for small and medium businesses to get professional guidance on their paid ads spend.
              <br />
              <br />
              What are paid ads? Anywhere you can pay to place sponsored content at the top of search, within someone's feed, when they scroll, etc. (We can talk about the almost-infinite types of ads out there)
            </p>
          </section>
  
          {/* Two-column content */}
          <section className="mt-12 sm:mt-16 grid gap-6 md:gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-orange-500">When Ads Make Sense</h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-prose">
                No amount of marketing can fix a product problem. Having a product or service that works is step one.
                <br />
                <br />
                Your business may be ready for paid ads if: you have budget to make ads meaningful, you have a need for more views / leads / customers, and you have a digital foundation.
                <br />
                <br />
                What's a digital foundation? Do you have a professional looking website? Google profile? Facebook page? Do you have a digital presence that signals: I'm a real business, and I'm serious about serving you with whatever I'm claiming to do / provide?
              </p>
            </div>
  
            <div>
              <h2 className="text-xl font-semibold text-orange-500">When Ads Don't Make Sense</h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-prose">
                If your business isn't ready for growth, doesn't have a plan, or isn't ready to spend an amount to make an attempt at advertising meaningul - budget is better spent elsewhere.
                <br />
                <br />
                If you're inflexible about making website updates or learning new tools to measure performance - budget is better spend elsewhere.
                <br />
                <br />
                If you're going to ask for assistance, but rather just do things your way - budget is better spent elsewhere.
              </p>
            </div>
          </section>
  
          {/* Highlight band */}
          <section className="mt-12 sm:mt-16 grid gap-6 md:gap-10 md:grid-cols-2">
            {/* Left card */}
            <div className="rounded-3xl border border-orange-200 bg-orange-50 px-5 sm:px-6 py-6 sm:py-8">
              <h2 className="text-lg font-semibold text-orange-500">
                What does ads management mean?
              </h2>
              <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-prose">
                We analyze what you've done in the past, research best practices for your category, then plan & execute ads on your behalf.
                <br />
                <br />
                We can do this for any channel: Search Ads, Social Ads, Ecommerce, Marketplace Ads, Programmatic, and Others.
              </p>
            </div>
  
            {/* Right card */}
            <div className="rounded-3xl border border-orange-200 bg-orange-50 px-5 sm:px-6 py-6 sm:py-8">
              <h2 className="text-lg font-semibold text-orange-500">
                Simple Pricing, Maximum Impact.
              </h2>
  
              <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-prose">
                $250 for initial analysis & planning.
                <br />
                <br />
                $100/mo/channel after that.
                <br />
                <br />
                2 month minimum to get started.
              </p>
  
              {/* Dropdown to embed your Google Form */}
              <div className="mt-6 border-t border-orange-200 pt-4">
                <details className="rounded-2xl">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-900 hover:text-orange-500">
                    Open the Ask Us Anything form
                  </summary>
  
                  <div className="mt-4 rounded-2xl bg-white border border-orange-100 p-3 sm:p-4 overflow-hidden">
                    <iframe
                      src="https://docs.google.com/forms/d/e/1FAIpQLSdiqveFfe-lLC-84BwMVX8EbY06_a5TgxRPdDRvJp9BrmSXew/viewform?embedded=true"
                      width="100%"
                      height="900"
                      frameBorder="0"
                      marginHeight={0}
                      marginWidth={0}
                      className="w-full"
                    >
                      Loading…
                    </iframe>
                  </div>
                </details>
              </div>
            </div>
          </section>
  
          {/* Example questions */}
         {/* Example campaigns */}
<section className="mt-14 sm:mt-20">
  <div className="rounded-3xl border border-neutral-200 bg-white px-5 sm:px-6 py-8 sm:py-10">
    <h2 className="text-2xl font-semibold text-neutral-900">
      Example Paid Ads Campaigns We Can Help With
    </h2>

    <p className="mt-4 text-sm sm:text-base text-neutral-700 leading-relaxed max-w-3xl">
      There are so many ad avenues out there, but these are the main ones businesses
      like yours would use to get new customers.
      <br />
      <br />
      Which channels are right for your business? Honestly, it depends — and that’s
      what the initial analysis &amp; planning phase is for.
    </p>

    {/* 2x2 grid */}
    <div className="mt-10 grid gap-8 sm:grid-cols-2">
      {/* Block 1 */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">
          Paid Search Campaigns
        </h3>
        <ul className="mt-3 space-y-2 text-sm sm:text-base text-neutral-800">
          <li>• Google Ads, Bing Ads, Yelp Ads, Angi Ads, etc</li>
          <li>• Pay-per-click and pay-per-lead models</li>
        </ul>
      </div>

      {/* Block 2 */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">
          Paid Social Campaigns
        </h3>
        <ul className="mt-3 space-y-2 text-sm sm:text-base text-neutral-800">
          <li>• Facebook Ads, Instagram Ads, Tiktok Ads, etc</li>
          <li>• Cost Per Thousand (CPM), Form fills, Cost Per View</li>
        </ul>
      </div>

      {/* Block 3 */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">
          Ecommerce or Marketplace Ads
        </h3>
        <ul className="mt-3 space-y-2 text-sm sm:text-base text-neutral-800">
          <li>• Amazon Ads, Instacart Ads, GoPuff Ads, etc</li>
          <li>• Retail Media, Point of Purchase, Offers & Incentives</li>
        </ul>
      </div>

      {/* Block 4 */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">
          Other Paid Media Channels
        </h3>
        <ul className="mt-3 space-y-2 text-sm sm:text-base text-neutral-800">
          <li>• Programmatic Ads, Digital Out of Home, Audio Ads, etc</li>
          <li>• For the more advanced advertiser, we can discuss any paid media channel</li>
        </ul>
      </div>
    </div>
  </div>
</section>

  
          {/* Who this is for / not for */}
          <section className="mt-8 sm:mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Entrepreneurs, founders, lean teams, and teams that just need a little help</li>
                <li>Businesses without a full-time marketing team</li>
                <li>Small teams looking for expert help</li>
                <li>Owners in-between “DIY” and “agency”</li>
              </ul>
            </div>
  
            <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Businesses looking for a short-term engagement or evaluation services only</li>
                <li>Teams looking for advice only</li>
                <li>Anyone wanting one-size-fits-all playbooks</li>
                <li>Owners looking for organic or profile maintenance</li>
              </ul>
            </div>
          </section>
  
          {/* Credentials / Experience */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight text-orange-500">
              Experience behind the management
            </h2>
            <p className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
              We broke off on our own because we’re confident in what we know — and because we’ve done
              great things in our corporate jobs. We're tired of all the marketing secrets kept to "the big guys", so want to share with you. Here's some outcomes from previous campaigns we've managed.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
                <h3 className="text-sm font-semibold text-neutral-900">Driven Awareness</h3>
                <p className="mt-3 text-sm text-neutral-700">
                  Some teams just want more eyeballs and website clicks.
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Captured 2x more impressions</li>
                  <li>Grew site visitation by 3x</li>
                  <li>Made client brand more memorable</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
                <h3 className="text-sm font-semibold text-neutral-900">Driven Leads</h3>
                <p className="mt-3 text-sm text-neutral-700">
                  Some brands want more form submissions for their team.
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Tested multiple lead generating channels</li>
                  <li>Reduced cost per lead by 2x</li>
                  <li>Increased form fills by 4x</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
                <h3 className="text-sm font-semibold text-neutral-900">Driven Sales</h3>
                <p className="mt-3 text-sm text-neutral-700">
                  Some clients need more sales, and needed them yesterday.
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Narrowed to most efficient ad mix</li>
                  <li>Increased average order value by 1.5x</li>
                  <li>Generated 5.2x return on spend</li>
                </ul>
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
                  q: "What does Paid Media mean?",
                  a: "In the ad world, it means any paid avenue. As opposed to Organic (non-paid) or Earned (user generated content) media. ",
                },
                {
                  q: "Why do you require an initial 2 month period?",
                  a: "We require an initial 2 month period because it takes time to learn what you've done in the past, set up ads, implement tracking, see what's working, and give time for optimizations.",
                },
                {
                  q: "What happens after the initial 2 month period?",
                  a: "Hopefully your ads are performing better, you're satisfied, and we continue month to month. But, if not, we stop."
                },
                {
                  q: "How does the initial payment work?",
                  a: "$250 for initial analysis & planning then $100 a month per channel. Say you want us to manage Google & FB ads - Your initial 2 month period will cost you $450, then $200 month to month after that if you continue.",
                },
                {
                    q: "What if I want help with organic (non-paid) activity instead?",
                    a: (
                      <>
                        This service is meant to manage your ad spend, for organic services check-out our{" "}
                        <a
                          href="https://www.ads4good.com/for-businesses/seo-services"
                          className="text-orange-500 underline hover:text-orange-600"
                        >
                          SEO Services
                        </a>
                        .
                      </>
                    ),
                }    
              ].map((item) => (
                <details
                  key={item.q}
                  className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm"
                >
                  <summary className="cursor-pointer select-none font-medium text-neutral-900 text-sm sm:text-base">
                    {item.q}
                  </summary>
  
                  {/* Keeps long answers from making the page feel insanely tall.
                      If you prefer no scroll, remove max-h/overflow. */}
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
                  href="https://www.ads4good.com/for-businesses//digital-health-check"
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