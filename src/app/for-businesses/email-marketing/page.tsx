import InquiryLauncher from "@/components/InquiryLauncher";

export const metadata = {
    title: "Email Marketing Services | Ads for Good",
    description:
      "Email marketing support for strategy, setup, segmentation, execution, and performance analysis.",
  };

export default function DigitalProfileManagementPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
      {/* HERO SECTION */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
<div className="flex-1 min-w-0 flex flex-col">
  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
    Email Marketing
  </h1>

  <div className="mt-3 flex gap-2 text-xs font-medium">
  <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
    Service Type: Marketing Project
  </span>
</div>

  <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
  Email marketing is one of the most practical ways to stay in touch with your audience, drive repeat business, and build stronger customer relationships over time. Whether you need help planning campaigns, setting up the technical side, improving performance, or organizing your audience into smarter segments, we can plug in where it’s most useful.
  </p>

  {/* CTA */}
  <section id="primary-cta" className="mt-8">
  <InquiryLauncher
    label="Talk To Us About On-Demand Marketing Plans"
    defaultServices={["Email Marketing"]}
    sourceLabel="Email Marketing — Hero CTA"
    className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
  />
  </section>
</div>


        {/* Right: Card / explainer */}
        <div className="flex-1">
          <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
            {/* Image */}
            <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
              <img
                src="/images/MarketingGuidebook.png"
                alt="Digital Profile Management"
                className="object-contain w-full h-full"
              />
            </div>

            <h2 className="text-sm font-semibold text-neutral-900">
              What Email Marketing Support Can Include:
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>Drip campaign strategy and content planning</li>
              <li>Campaign setup in tools like Mailchimp, SendGrid, Apollo, or similar platforms</li>
              <li>Audience segmentation and list organization</li>
              <li>Basic automation and workflow setup</li>
              <li>A/B test ideas for subject lines, messaging, or sends</li>
              <li>Cleanup of email flows that are outdated, inconsistent, or underperforming</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SNEAK PEEK SECTION */}
      <section className="w-full bg-orange-100 mt-32">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
              How We Approach Email Marketing.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
            We keep email marketing practical. Sometimes that means helping you map out the right messages and audience flow before anything gets sent. Other times it means jumping into the platform, building the campaign, checking the setup, reviewing results, and improving what happens next.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Pill 1 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                The goal isn't to send more emails.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                That's a waste of your time, money, and reputation.
              </p>
            </div>

            {/* Pill 2 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                The goal is to send better emails.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                More intention, more clarity, and more conversion.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* The sections below should stay inside your centered page width */}
      <div className="w-full max-w-6xl">
        {/* Who this is for / not for */}
        <section className="mt-8 sm:mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">Who this is for</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Owners who want email campaigns handled by someone else</li>
              <li>Businesses with outdated / inconsistent drip campaigns</li>
              <li>Anyone who wants extra help on a high ROI channel</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Businesses who want a one-time audit</li>
              <li>Teams looking for paid ads strategy</li>
              <li>Anyone wanting a DIY solution</li>
            </ul>
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
                a: "Sign up for service. Tell us which profiles to maintain. Provide access. That's it.",
              },
              {
                q: "Which ESP platforms do you manage?",
                a: "We've used Mailchimp, Shopify Messaging, SendGrid, and even manual gmail MailMerge when we first started. But, we're fast learners to whatever system you use.",
              },
              {
                q: "Is this recurring or one-time?",
                a: "This is a recurring, month-to-month service that lives as a marketing project option within each plan level.",
              },
              {
                q: "Do you respond to emails for us?",
                a: "It depends, but normally no. We're experts in getting the most out of your email channel, you're the expert in your brand voice.",
              },
              {
                q: "Do you manage existing email campaigns only?",
                a: "No, if you want to set up your first campaign - we cand to that too!",
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
  <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      
      {/* LEFT COLUMN */}
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900">
          Looking for more marketing help?
        </h2>

        <p className="mt-3 text-sm sm:text-base text-neutral-800">
          Find our on-demand marketing team plans here:
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://www.ads4good.com/for-businesses"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            View All Plans
          </a>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div>
        <h3 className="mt-4 md:mt-4 text-lg font-semibold text-neutral-900">
          Need help beyond email?
        </h3>

        <p className="mt-2 text-sm text-neutral-700">
          Other marketing services:
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="https://www.ads4good.com/for-businesses/seo-services"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For SEO Services
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

  
    </main>
  );
}
