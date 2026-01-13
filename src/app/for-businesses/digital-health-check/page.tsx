export const metadata = {
    title: "Digital Health Check for Digital Properties | Ads for Good",
    description:
      "A full review of your website and digital business profiles to understand what exists, what’s broken, and what to improve or add.",
  };
  
  export default function DigitalPropertyAuditPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 overflow-x-hidden">
        {/* Top container */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-16">
          <section className="w-full flex flex-col gap-10 md:flex-row md:items-start">
            {/* Left: Hero copy */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
                Audit Your Business&apos;s Digital Presence: From a Consumer&apos;s View
              </h1>
  
              <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
                If you suspect your website or business profiles could do more — you&apos;re probably right.
                We&apos;ll review your site, pages, links, key profiles, and any other digital presence to
                uncover issues, improve conversions, and recommend the best next moves.
                <br />
                <br />
                <a
                  href="mailto:katoa@ads4good.com?subject=Digital%20Property%20Audit&body=Hi%20Katoa%2C%0D%0A%0D%0AI%E2%80%99m%20interested%20in%20a%20Digital%20Property%20Audit.%20Can%20you%20share%20next%20steps%20and%20what%20you%E2%80%99d%20need%20from%20me%3F"
                  className="text-orange-500 underline hover:text-orange-600"
                >
                  Ready to get started? Send us this email.
                </a>
              </p>
  
              {/* Dropdown Form */}
              <div className="mt-6 border-t border-orange-200 pt-4">
                <details>
                  <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-900 hover:text-orange-500">
                    If the email link above didn&apos;t do anything when you clicked it, your settings block
                    email links — use this form instead.
                  </summary>
  
                  <div className="mt-4 rounded-2xl bg-white border border-orange-100 p-4 overflow-hidden">
                    <iframe
                      src="https://docs.google.com/forms/d/e/1FAIpQLSfffYUKSRf30SZ2CBi792g2JO9k1-31Jv78RcTVw2uZI2If8g/viewform?embedded=true"
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
  
            {/* Right: Card / explainer */}
            <div className="flex-1 min-w-0">
              <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
                <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                  <img
                    src="/images/DigitalAudit.png"
                    alt="Digital Property Audit Illustration"
                    width={500}
                    height={500}
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <h2 className="text-sm font-semibold text-neutral-900">What you get.</h2>
  
                <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                  $500 gets you a full digital health check — including assessment, prioritized fixes,
                  clear recommendations, and I can make the changes for you.
                  <br />
                  <br />
                  We&apos;ll ask what&apos;s concerning you most and start there, but will do some sleuthing
                  and find ANY digital property your business is on and assess it. We&apos;ll even provide
                  recommendations if we think you should be using anything you&apos;re not.
                  <br />
                  <br />
                  You&apos;ll walk away knowing exactly what to fix, how to fix it, and the why behind every recommendation.
                </p>
              </div>
            </div>
          </section>
        </div>
  
        {/* WHAT WE AUDIT SECTION (full-width background) */}
        <section className="w-full bg-orange-100">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                Can You Give a Sneak Peek of This?
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                We audit the parts of your digital presence that most often drive (or block) customers:
                your website experience, your conversion paths, and the key business profiles people
                use to evaluate you before reaching out.
              </p>
            </div>
  
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Website Properties</h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We go page-by-page to find issues, friction, and missed conversion opportunities.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Broken links, missing pages, and confusing navigation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Contact paths: forms, calls, emails, booking, CTAs
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Clarity, trust signals, and any technical deficiencies
                  </li>
                </ul>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Key Profiles & listings</h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We review the profiles customers actually check before calling, booking, or buying.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Google Business Profile accuracy & completeness
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Social (FB/IG), Review (Yelp), Anything else relevant
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Reviews, photos, categories, service details, & outreach
                  </li>
                </ul>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Opportunities & next steps</h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We translate the audit into prioritized actions — so it&apos;s easy to execute.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    A clear priority list (quick wins → bigger improvements)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Recommendations & instructions your team can follow
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Identify any new digital property opportunities
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
  
        {/* Everything below stays consistently centered */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-24">
          {/* Who this is for / not for */}
          <section className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border-1 border-black bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Business owners looking for help, but not commitment</li>
                <li>Entrepreneurs wanting to test outside help</li>
                <li>Owners in-between “I think there&apos;s more” and “I don&apos;t know how”</li>
              </ul>
            </div>
  
            <div className="rounded-3xl border-1 border-black bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Businesses looking for a long-term engagement</li>
                <li>Teams looking for ads strategy and execution</li>
                <li>Anyone wanting a DIY solution</li>
              </ul>
            </div>
          </section>
  
          {/* Process */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight text-orange-500">
              What&apos;s the process?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
              This service is designed to be hands-off for you and your business. Answer a couple of
              questions upfront, then let us do our thing. From payment to completion, this service takes
              3–5 business days.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              {/* WHITE backgrounds here */}
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What we need from you</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Send the get started email or complete the form</li>
                  <li>Answer 2 questions</li>
                  <li>What digital properties does your business use?</li>
                  <li>What are your biggest concerns about them?</li>
                  <li>Then we get to work</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What we&apos;ll do</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>A real human finds & evaluates all digital properties you appear on</li>
                  <li>Pass 1 (consumer): how easy is it to trust & navigate?</li>
                  <li>Pass 2 (marketer): what&apos;s broken, missing, or unclear?</li>
                  <li>Document everything and recommend next steps</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What happens when we&apos;re done</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>You receive your document (a record of everything we found)</li>
                  <li>We review it together: findings, fixes, recommendations</li>
                  <li>You can implement yourself — or we can (included in cost)</li>
                </ul>
              </div>
            </div>
          </section>
  
          {/* What You Get */}
          <section className="mt-14 sm:mt-20">
            <div className="rounded-3xl border border-neutral-200 bg-white px-5 sm:px-6 py-8 sm:py-10">
              <h2 className="text-2xl font-semibold text-neutral-900">
                Specifics on what you receive:
              </h2>
  
              <p className="mt-4 text-sm sm:text-base text-neutral-700 leading-relaxed max-w-3xl">
                If you&apos;re into business jargon, you&apos;d call this the “deliverable.” It&apos;s a Google Sheet / Excel
                file with the findings, prioritization, and instructions from your digital health check.
              </p>
  
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <ul className="space-y-3 text-sm sm:text-base text-neutral-800">
                  <li className="font-semibold">The doc contains:</li>
                  <li className="font-semibold">1) WHERE</li>
                  <li>• A list of every digital property we found (even ones you didn’t know existed)</li>
                  <li className="font-semibold">2) REVIEW FINDINGS</li>
                  <li>• A tab for each property: problems, fixes, and recommendations</li>
                  <li className="font-semibold">3) WHAT TO ADD</li>
                  <li>• Suggestions for high-value properties you should consider adding</li>
                  <li className="font-semibold">4) VALUABLE DATA</li>
                  <li>• Relevant data points we find interesting about your business/category</li>
                </ul>
  
                <ul className="space-y-3 text-sm sm:text-base text-neutral-800">
                  <li className="font-semibold">WHAT THIS IS NOT:</li>
                  <li>• Not automated / AI scan — it’s human-reviewed</li>
                  <li>• Not a fluff report — it’s built to be used</li>
                  <li>• Not a “grade” — it’s a customer POV and improvement plan</li>
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
                  q: "How long does this digital health check take?",
                  a: "3–5 business days from when we receive payment & your form to delivery of your document.",
                },
                {
                  q: "Do I need to give you access to anything?",
                  a: "Not for the review. If you want us to implement changes, we’ll discuss access then (only what’s needed).",
                },
                {
                  q: "Is this recurring or one-time?",
                  a: (
                    <>
                      This service is a one-time project. If you&apos;re looking for an ongoing engagement, explore our other{" "}
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
                  q: "Can you check competitors too?",
                  a: "Yes — competitor checks can be helpful, but they’re a separate health check (you’d purchase two if you want yours + a competitor’s).",
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
          </section>
        </div>
      </main>
    );
  }  
  
  