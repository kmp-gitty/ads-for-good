export const metadata = {
    title: "Marketing Consulting - Business Consulting | Ads for Good",
    description:
      "Talk through your marketing or general business problems with our team. Take the time to review ideas, mock strategies, and answer any business questions you have.",
  };
  
  export default function ConsultancyPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 overflow-x-hidden">
        {/* HERO (centered) */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-16">
          <section className="w-full flex flex-col gap-10 md:flex-row md:items-start">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
                Marketing &amp; Business Consulting - Start with a Conversation
              </h1>
  
              <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
                There’s value in talking things through before taking action. If you want to discuss
                strategy, challenges, or ideas before committing to execution, this is the right place.
                <br />
                <br />
                We’ll pressure-test plans, answer questions, and help you decide what actually makes
                sense — without jumping too quickly.
                <br />
                <br />
                <a
                  href="mailto:katoa@ads4good.com?subject=Consulting&body=Hi%20Katoa%2C%0D%0A%0D%0ALooking%20to%20learn%20more%20about%20consulting%20with%20you%20for%20either%20advertising%2C%20marketing%20or%20my%20business.%20Can%20you%20help%3F"
                  className="text-orange-500 underline hover:text-orange-600"
                >
                  Ready to get started? Send us this email.
                </a>
              </p>
  
              {/* Form dropdown */}
              <div className="mt-6 border-t border-orange-200 pt-4">
                <details>
                  <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-900 hover:text-orange-500">
                    If the email link above didn&apos;t do anything when you clicked it, your settings
                    blocks email links — use this form instead.
                  </summary>
  
                  <div className="mt-4 rounded-2xl bg-white border border-orange-100 p-4 overflow-hidden">
                    <iframe
                      src="https://docs.google.com/forms/d/e/1FAIpQLScLX4QyPNb-rTViF3Q3klF-Wj2vJI30s6Om7UO0HkVb3LdplA/viewform?embedded=true"
                      width="100%"
                      height="900"
                      frameBorder="0"
                      marginHeight={0}
                      marginWidth={0}
                      className="w-full max-w-full"
                    >
                      Loading…
                    </iframe>
                  </div>
                </details>
              </div>
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
  
                <h2 className="text-sm font-semibold text-neutral-900">Let&apos;s Talk Shop.</h2>
  
                <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                  $500 gets you 8 meeting hours. A meeting hour is whenever we&apos;re actually talking
                  about advertising or your business — not travel or niceties.
                  <br />
                  <br />
                  These usually start as a “how do Google Ads work?” discussion, then lead to a
                  relationship where I help manage your ads. If this happens, the $500 is credited
                  toward the initial project we do together.
                </p>
              </div>
            </div>
          </section>
        </div>
  
        {/* FULL-WIDTH ORANGE BAND */}
        <section className="w-full bg-orange-100">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
              What can we help with?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-4xl">
              Use us as your business consultants, ad agency, mini-marketing team, data source, or idea
              vetters. We can discuss anything business and marketing related; here are a few common
              starting points that have led to ongoing projects:
            </p>
  
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  I have a website, but don&apos;t like it — what can be done?
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We talk through the “ins & outs” of websites — design, no-code tools, developers, and
                  what makes a site feel trustworthy.
                  <br />
                  <br />
                  Leading to:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Website design and planning (UX & UI)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Custom website builds
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    SEO & other technical implementation
                  </li>
                </ul>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  I should focus on digital, but don&apos;t know where to start.
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We explain the digital tools businesses use (free & paid) to promote, manage, and grow.
                  <br />
                  <br />
                  Turning into:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Business profile creation & management (Google, Yelp, Angi, Houzz, etc)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Choosing ad channels that fit the business & budget
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Updating website contact paths to make outreach easier
                  </li>
                </ul>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Here&apos;s what an agency told us to do — is it working?
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We review past performance, pressure-test assumptions, and discuss better options.
                  <br />
                  <br />
                  Resulting in:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Ad data evaluation and improvement consulting
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Spend planning, buying, and management
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Performance tracking and ROI tracking development
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    Testing new advertising channels
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
                <li>Business owners looking for help, but want a conversation first</li>
                <li>Entrepreneurs wanting an outside perspective on their ideas</li>
                <li>Owners wanting to explore what can be done before doing</li>
              </ul>
            </div>
  
            <div className="rounded-3xl border border-black bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Businesses looking for a DIY solution</li>
                <li>Teams not open to differing opinions</li>
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
              This service is designed to be hands-on for both of us. We&apos;ll email back and forth,
              set up meetings, discuss, plan, iterate — and ideally find a longer-term path that makes
              sense for you.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Where we start</h3>
                <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed">
                  Like any other service, we handle sign-up and payment first.
                  <br />
                  <br />
                  We won’t add another app or login. Instead, you’ll get a simple tracker where we keep
                  hours, notes, recordings, plans, and deliverables.
                  <br />
                  <br />
                  In meeting one, we’ll align on goals and what you want to accomplish.
                </p>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What we spend time on</h3>
                <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed">
                  Talking, planning, doing, evaluating.
                  <br />
                  <br />
                  This is a custom solution — we spend time on what you prioritize.
                  <br />
                  <br />
                  Some clients want to explore options. Others want to decide fast and execute. Most are
                  somewhere in-between.
                </p>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What happens when we&apos;re done</h3>
                <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed">
                  Best case: we solve something valuable and it naturally turns into ongoing help.
                  <br />
                  <br />
                  If not, we part ways (all good) — or we point you to another service that fits better.
                  <br />
                  <br />
                  Either way, you keep your tracker and all materials produced — they’re yours.
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
                  q: "What can't we talk about?",
                  a: "You paid for our time, so we can talk about anything — but it’s best spent on marketing, advertising, and general business topics. (We’re not therapists if things get meta.)",
                },
                {
                  q: "What happens when our hours run out?",
                  a: "Ideally you’ve got clarity, answers, and a next-step plan. If we continue working together, we’ll agree what that looks like. If we stop after the hours, that’s fine too.",
                },
                { q: "Do hours expire?", a: "No — never. Use them on your timeline." },
                {
                  q: "What if I already know where I need help?",
                  a: (
                    <>
                      This service is meant to be exploratory. If you already know what you need, you may be better served by one of our{" "}
                      <a
                        href="https://www.ads4good.com/for-businesses"
                        className="text-orange-500 underline hover:text-orange-600"
                      >
                        Business Services
                      </a>
                      .
                    </>
                  ),
                },
                {
                  q: "Do you meet in-person?",
                  a: "We’re based in the Philadelphia area — if you’re local, yes. Otherwise, sessions are virtual (phone or video).",
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
              <h2 className="text-2xl font-semibold text-neutral-900">Looking for other services?</h2>
  
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
  
  
  
  