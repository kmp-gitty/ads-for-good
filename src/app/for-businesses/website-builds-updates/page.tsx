import InquiryLauncher from "@/components/InquiryLauncher";
import StickyCTA from "@/components/StickyCTA";

export const metadata = {
    title: "Website Builds - Website Updates | Ads for Good",
    description:
      "Get a new custom website, update your existing website, or maintain site performance - clear scope, simple pricing, clean execution.",
  };
  
  export default function WebsiteBuildsUpdatesPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 overflow-x-hidden">
        {/* Top container */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-16">
          <section className="w-full flex flex-col gap-10 md:flex-row md:items-start">
            {/* Left: Hero copy */}
<div className="flex-1 min-w-0 flex flex-col">
  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
    Website Services: New, Existing, and Upkeep
  </h1>

  <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
    If you're looking to get a new website built. Looking to make changes to your existing website.
    Or, just want someone to monitor and be on standby for general site maintenance.
    <br />
    <br />
    This is the right page.
    <br />
    <br />
    Ready to get started?
  </p>

  {/* CTA */}
  <section id="primary-cta" className="mt-8">
  <InquiryLauncher
    label="Contact Us About This Service"
    defaultServices={["Website Builds & Updates"]}
    sourceLabel="Website Builds & Updates — Hero CTA"
    className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
  />
  </section>
</div>

  
            {/* Right: Card / explainer */}
            <div className="flex-1 min-w-0">
              <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
                <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                  <img
                    src="/images/DigitalAudit.png"
                    alt="Website Builds & Updates Illustration"
                    width={500}
                    height={500}
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <h2 className="text-sm font-semibold text-neutral-900">Our 3 website services:</h2>
  
                <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                  NEW BUILDS: Have us create a custom website for your business, hobby, church-group, whatever. We custom code, host your site, and can create anything you want. We do everything, so you have complete flexibility.
                  <br />
                  <br />
                  UPDATES: Does your site need a face lift? Want to add sections or services? Work with us to make updates, rebrand your web pages, and even build your own forms.
                  <br />
                  <br />
                  MAINTENANCE: Is your site in a good place, but just want someone available for monitoring and general updates? We do that too.
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
                Let's dive a little deeper into each web service
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                *Disclaimer* Our goal is to make these services easy to understand and implement. However, that doesn't mean each situation won't be different. Two new site build projects could have totally different outcomes based on desire, use-case, needs, etc. Our services are general, but processes are custom.
              </p>
            </div>
  
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">New Builds: $1,000 one-time</h3>
                <p className="mt-2 text-xs text-neutral-700">
                  Straightfoward - we build what you want & need.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Custom website for information & communication
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Efficient hosting for cheapest maintenance cost
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Complete freedom, since we code everything ourselves
                  </li>
                </ul>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Updates: $500 one-time</h3>
                <p className="mt-2 text-xs text-neutral-700">
                  Make the changes to your site you've been meaning to do.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Rebrand or look & feel refresh
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Finish partial builds for optimal performance
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Add new pages, services, content, etc
                  </li>
                </ul>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Maintenance: $100/mo</h3>
                <p className="mt-2 text-xs text-neutral-700">
                 Looking for a better webmaster & on-call udpates?
                </p>
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Technical monitoring (site speed & performance)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Unlimited updates (detail edits, info addition, etc)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Proactively flag any issues or necessary updates
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
                <li>Business owners looking for website help and expertise</li>
                <li>Entrepreneurs wanting to test outside help</li>
                <li>Owners without time to make changes themselves</li>
              </ul>
            </div>
  
            <div className="rounded-3xl border-1 border-black bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Businesses looking for a cookie-cutter solution</li>
                <li>Teams looking for site building software</li>
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
              Each services has a slightly different process, but all geared toward making it as easy as possible for you to hand-off the reigns for your website needs.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">New Builds: $1,000 one-time</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Initial meeting to learn your vision</li>
                  <li>Website outlining</li>
                  <li>Outline meeting to approve layout & functions</li>
                  <li>Website drafting</li>
                  <li>Feedback & edits until approved</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Updates: $500 one-time</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Initial meeting to learn desired updates</li>
                  <li>Technical access to your current site</li>
                  <li>Outline meeting to approve layout & functions</li>
                  <li>Update drafting</li>
                  <li>Feedback & edits until approved</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Maintenance: $100/mo</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Technical access to your current site</li>
                  <li>Visit, performance, and action tracking setup</li>
                  <li>Monthly performance check-ups</li>
                  <li>Simple updates as-needed</li>
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
                Each service will be tailored to your specific needs, but these are the basics of what each will do for your business.
              </p>
  
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <ul className="space-y-3 text-sm sm:text-base text-neutral-800">
                  <li className="font-semibold">General Approaches:</li>
                  <li className="font-semibold">1) CLEAR PLANNING</li>
                  <li>• We'll meet before taking action. Ensuring we know what you want / need before we sketch something and you approve before we build.</li>
                  <li className="font-semibold">2) CHANCES FOR FEEDBACK</li>
                  <li>• You're paying, so it should be what you want. We'll recommend what is best based on your desires, but you tell us if anything is off the mark.</li>
                  <li className="font-semibold">3) EDITS</li>
                  <li>• We're human, won't always hit a homerun every at-bat. We'll edit until you're satisfied.</li>
                  <li className="font-semibold">4) COMMUNICATION</li>
                  <li>• You're busy running a business, we'll make sure we keep moving forward. That means we'll be politely annoying if you're not responding.</li>
                </ul>
  
                <ul className="space-y-3 text-sm sm:text-base text-neutral-800">
                  <li className="font-semibold">Technical Elements:</li>
                  <li>• Not automated / AI — human-built/reviewed/delivered</li>
                  <li>• Core web metrics reporting & monitoring</li>
                  <li>• Integrations, APIs, and webhooks as needed</li>
                  <li>• SEO best practices and recommendations</li>
                  <li>• Secure & safe website practices</li>
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
                  q: "Are all of these monthly services?",
                  a: "No, Builds & Updates are a one-time fee and project. Mainteance is a monthly service.",
                },
                {
                  q: "Do I need to give you access to anything?",
                  a: "You might. If you have an existing site, and want to keep it where it's hosted - we'll need access to make changes / monitor for you.",
                },
                {
                  q: "Is this services to help my website's SEO?",
                  a: (
                    <>
                      Not exactly. Web performance goes into your site's ranking, and any Builds or Updates will have SEO best practices baked in. However, if you're looking for SEO-only services, please check our{" "}
                      <a
                        href="https://www.ads4good.com/for-businesses/seo-services"
                        className="text-orange-500 underline hover:text-orange-600"
                      >
                        SEO Services
                      </a>
                      .
                    </>
                  ),
                },
                {
                  q: "If you build a website for me, do I HAVE to buy ongoing maintenance?",
                  a: "No, not if you don't want to. Our Mintenance service is separate from Builds & Updates. But, keep in mind, your website still has ongoing maintenance costs - which we'll make clear if you want to maintain your own site after we build.",
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

        <StickyCTA
  targetId="primary-cta"
  label="Contact Us About This Service"
  defaultServices={["Website Builds & Updates"]}
  sourceLabel="Website Builds & Updates Page — Sticky CTA"
/>
      </main>
    );
  }
  