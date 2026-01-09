export const metadata = {
    title: "Ask a Marketing Expert – Business Advice On Demand | Ads for Good",
    description:
      "Have business questions, but want something flexible? Get guidance and information from marketing and entrepreneurial pros that have done it before.",
  };
  
  export default function AskUsAnythingPage() {
    return (
      <main className="bg-white text-neutral-900">
        {/* Page wrapper */}
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-12 sm:pt-16 pb-20 sm:pb-24">
          {/* Hero / Intro */}
          <section className="text-left">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
              Ask Us Anything: On-Demand Marketing Advice For Your Business
            </h1>
  
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-neutral-700 leading-relaxed max-w-3xl">
              A simple way for small and medium businesses to get honest, practical answers about
              marketing, growth, and whatever else you want to talk through for your business. Get
              advice from former marketing leaders, agency experts, and entrepreneurs that have done
              what you're doing before.
            </p>
          </section>
  
          {/* Two-column content */}
          <section className="mt-12 sm:mt-16 grid gap-6 md:gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-orange-500">How it works</h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-prose">
                A low, flat monthly fee gets you unlimited questions over email.
                <br />
                <br />
                You send us questions — as many as you want. Big (“How do I get more local
                customers?”) or small (“Should I boost this post?”).
                <br />
                <br />
                We respond with clear guidance, options, and any relevant data or links — no jargon,
                no fluff, just conversations about your business. It's like having a marketing team on
                call.
              </p>
            </div>
  
            <div>
              <h2 className="text-xl font-semibold text-orange-500">What you can ask about</h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-prose">
                Ads, websites, social media, email, branding, analytics, offers, promotions, customer
                journeys — if it touches advertising or your business, it&apos;s fair game.
                <br />
                <br />
                If something&apos;s outside our lane, we&apos;ll say so. But most of the time,
                there&apos;s a way for us to apply our expertise and knowledge.
              </p>
            </div>
          </section>
  
          {/* Highlight band */}
          <section className="mt-12 sm:mt-16 grid gap-6 md:gap-10 md:grid-cols-2">
            {/* Left card */}
            <div className="rounded-3xl border border-orange-200 bg-orange-50 px-5 sm:px-6 py-6 sm:py-8">
              <h2 className="text-lg font-semibold text-orange-500">
                Simple pricing, fast answers.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-prose">
                $100 a month gets you this access, no accounts or new apps to download.
                <br />
                <br />
                We can usually respond same-day, but an answer will never take more than 2 business
                days to get back to you.
              </p>
            </div>
  
            {/* Right card */}
            <div className="rounded-3xl border border-orange-200 bg-orange-50 px-5 sm:px-6 py-6 sm:py-8">
              <h2 className="text-lg font-semibold text-orange-500">
                Get clarity before you waste time or money going in the wrong direction
              </h2>
  
              <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-prose">
                Getting started is easy:{" "}
                <a
                  href="mailto:katoa@ads4good.com?subject=Ask%20us%20Anything&body=Hi%20Katoa%2C%0D%0A%0D%0AInterested%20in%20learning%20about%20your%20%22Ask%20Us%20Anything%22%20offering.%20Can%20you%20tell%20me%20more%3F"
                  className="text-orange-500 underline hover:text-orange-600"
                >
                  Just send us this email.
                </a>
                <br />
                <br />
                If the email link above didn&apos;t do anything when you clicked it, your settings
                blocks email links — use the form dropdown instead.
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
          <section className="mt-14 sm:mt-20">
            <div className="rounded-3xl border border-neutral-200 bg-white px-5 sm:px-6 py-8 sm:py-10">
              <h2 className="text-2xl font-semibold text-neutral-900">
                Example questions we can help with
              </h2>
  
              <p className="mt-4 text-sm sm:text-base text-neutral-700 leading-relaxed max-w-3xl">
                These are real types of questions business owners ask us every day. If it&apos;s
                related to marketing, growth, or running a business — chances are we&apos;ve done it
                or helped someone through it before.
              </p>
  
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <ul className="space-y-3 text-sm sm:text-base text-neutral-800">
                  <li>• How do I get more local customers without wasting money on ads?</li>
                  <li>• Should I be running Google Ads, Meta Ads, or neither?</li>
                  <li>• What marketing channels make sense for my type of business?</li>
                  <li>• How much should I realistically be spending on marketing?</li>
                  <li>• Why did my ads stop performing, and how do I fix it?</li>
                  <li>• What should I track to know if marketing is working?</li>
                  <li>• Should I focus on SEO, paid ads, email, or social media first?</li>
                </ul>
  
                <ul className="space-y-3 text-sm sm:text-base text-neutral-800">
                  <li>• How do I compete with bigger brands in my area?</li>
                  <li>• How do I turn more one-time customers into repeat customers?</li>
                  <li>• Do I even need to spend money on ads?</li>
                  <li>• Is my website actually converting visitors into customers?</li>
                  <li>• How can I expand my business offerings?</li>
                  <li>• When is it time to pivot or close a business?</li>
                  <li>• How do I start a business?</li>
                </ul>
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
                <li>Small teams validating ideas before spending</li>
                <li>Owners in-between “DIY” and “agency”</li>
              </ul>
            </div>
  
            <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Businesses looking for a long-term engagement</li>
                <li>Teams looking for execution instead of advice</li>
                <li>Anyone wanting one-size-fits-all playbooks</li>
              </ul>
            </div>
          </section>
  
          {/* Credentials / Experience */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight text-orange-500">
              Experience behind the advice
            </h2>
            <p className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
              We broke off on our own because we’re confident in what we know — and because we’ve done
              great things in our corporate jobs. But we’re tired of keeping marketing to the big
              brands. No buzzwords — just clear thinking from people who’ve been in the seat.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
                <h3 className="text-sm font-semibold text-neutral-900">Where we’ve worked</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>In-house marketing teams</li>
                  <li>Agencies &amp; consulting firms</li>
                  <li>Growth roles across different industries</li>
                  <li>Some of the largest brands in the world</li>
                </ul>
                <p className="mt-3 text-xs text-neutral-700">
                  (To name a few: Adobe, Chevron, Yelp, Wavemaker Global)
                </p>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
                <h3 className="text-sm font-semibold text-neutral-900">What we’ve done</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Improved lead and client acquisition</li>
                  <li>Diagnosed conversion + UX issues</li>
                  <li>Built campaigns, departments, products, and brands</li>
                  <li>Helped teams prioritize what matters</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
                <h3 className="text-sm font-semibold text-neutral-900">How we apply this to you</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Direct answers + clear next steps</li>
                  <li>We’ll say “do nothing” when that’s the best move</li>
                  <li>We’ll flag risks before you waste money</li>
                  <li>Simple and actionable guidance</li>
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
                  q: "What's the process for this?",
                  a: "First: send us this email or fill out this form. Second: we'll send you the agreement and get you set up. Third: we'll send you the private guidance email to send questions to — then we’re rolling.",
                },
                {
                  q: "How fast do you respond?",
                  a: "Usually same-day, but no longer than 2 business days.",
                },
                {
                  q: "Can you review my website, ads, or analytics?",
                  a: (
                    <>
                      For this service, we can answer questions and guide you. If you want an in-depth
                      review, see our{" "}
                      <a
                        href="https://www.ads4good.com/for-businesses/digital-property-audit"
                        className="text-orange-500 underline hover:text-orange-600"
                      >
                        Digital Property Audit
                      </a>
                      .
                    </>
                  ),
                },
                {
                  q: "Is this only for local businesses?",
                  a: "No — this is for any business looking for on-demand guidance.",
                },
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
                  href="https://www.ads4good.com/for-businesses/digital-property-audit"
                  className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                >
                  In-Depth Digital Property Audit
                </a>
  
                <a
                  href="https://www.ads4good.com/for-businesses/local-marketing"
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
  
  
  