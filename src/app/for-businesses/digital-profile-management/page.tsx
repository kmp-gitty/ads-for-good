import ProfileOutlineCompact from "./ProfileOutlineCompact";
import InquiryLauncher from "@/components/InquiryLauncher";
import StickyCTA from "@/components/StickyCTA";

export const metadata = {
  title: "Digital Profile Management for Small Businesses | Ads for Good",
  description:
    "Ongoing profile management services. We maintain Google Business, Yelp, Facebook, and other key listings to keep your digital presence accurate, consistent, and responsive.",
};

export default function DigitalProfileManagementPage() {
  return (
    <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
      {/* HERO SECTION */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
<div className="flex-1 min-w-0 flex flex-col">
  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
    Digital Listing Management: Save Time and Gain Reassurance.
  </h1>

  <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
    Your business gets evaluated before you ever hear from a customer — usually through your
    online profiles, reviews, photos, categories, and listings.
    <br />
    <br />
    Digital Profile Management keeps your online presence accurate, consistent, and up-to-date
    across the platforms people actually use, so you show up and look more trustworthy when they find you.
  </p>

  {/* CTA */}
  <section id="primary-cta" className="mt-8">
  <InquiryLauncher
    label="Set Up Digital Profile Management"
    defaultServices={["Digital Profile Management"]}
    sourceLabel="Digital Profile Management — Hero CTA"
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
              What We Manage: $200/mo
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>Information, accuracy, & consistency across platforms</li>
              <li>Business info (hours, services, categories, contact paths)</li>
              <li>Photos, descriptions, and trust signals</li>
              <li>Review monitoring + responses</li>
              <li>New profile opportunities (if you&apos;re missing key listings)</li>
            </ul>

            <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
              The goal is simple: look legitimate, show up more, and remove customer friction while giving you time back to run your business.
            </p>
          </div>
        </div>
      </section>

      {/* SNEAK PEEK SECTION */}
      <section className="w-full bg-orange-100 mt-32">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
              What does profile management really mean?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
              Your profiles aren&apos;t “set it and forget it", but take effort to manage. It can be hard to track and manage all of your business's listings, especially when best practices and algorithms change constantly across different platforms. We'll do the tedious part, so you can focus on your business.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Pill 1 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Information Consistency
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Across platforms, your business information should be uniform, accurate, and correct.
              </p>

              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  General business information and hours
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Clean-up and unification
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Contact path updates and access
                </li>
              </ul>
            </div>

            {/* Pill 2 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Trust & Completeness
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Make it easy for customers to trust you — and keep up with profile trends.
              </p>

              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Full profiles, updating missing sections
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Best practices and key platform changes
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Eliminating duplicates and incorrect listings
                </li>
              </ul>
            </div>

            {/* Pill 3 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Review & Community Management
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Respond appropriately and in a timely manner to inquiries, comments, and reviews.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Review responses and moderation
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Comment responses and moderation
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Increase review and follow count
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
              <li>Owners who want profiles handled by someone else</li>
              <li>Businesses with outdated / inconsistent listings</li>
              <li>Anyone who wants to show up and look more legitimate online</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Businesses who want a one-time audit only</li>
              <li>Teams looking for paid ads strategy</li>
              <li>Anyone wanting a DIY solution</li>
            </ul>
          </div>
        </section>

        {/* Outline (compact + selectable) */}
        <section className="mt-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            Profiles & Listings We Maintain
          </h2>

          <p className="mt-3 text-base sm:text-lg text-neutral-700 leading-relaxed max-w-4xl">
            Use the selector below to jump through the common listings we manage. Don't see one you use? No worries, this list is just an example. This service includes management for ALL profiles you want to hand-off.
          </p>

          <ProfileOutlineCompact />
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
                q: "Which platforms do you manage?",
                a: "Typically: Google, Yelp, Facebook/Instagram, and any other listings you're using.",
              },
              {
                q: "Is this recurring or one-time?",
                a: "This is a recurring, month-to-month service.",
              },
              {
                q: "Do you respond to reviews for us?",
                a: "Yes, comments too. We'll have a meeting to learn your voice and check-in on anything necessary.",
              },
              {
                q: "Do you manage existing profiles only?",
                a: "No, if we find you're not using a profile you should - we'll create it for you.",
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
  label="Set Up Digital Profile Management"
  defaultServices={["Digital Profile Management"]}
  sourceLabel="Digital Profile Management Page — Sticky CTA"
/>
    </main>
  );
}
