import InquiryLauncher from "@/components/InquiryLauncher";
import StickyCTA from "@/components/StickyCTA";

export const metadata = {
    title: "Direct Mail Marketing | Ads for Good",
    description:
      "Professional and affordable direct mail marketing for your business. Reach local households with relevant messaging to get more business.",
  };
  
  export default function LocalMarketingDetailPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 overflow-x-hidden">
        {/* HERO (centered) */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-16">
          <section className="w-full flex flex-col gap-10 md:flex-row md:items-start">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
                Local mail marketing: more than nearby, inside your neighborhoods.
              </h1>
  
              <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
                We have a direct mail partnership with USPS. Working with them, we can mail every
                resident and business owner in any area.
                <br />
                <br />
                Direct mail has consistently been proven as one of the marketing channels that ranks
                highest for both: generating a return for businesses and liked by customers (when it&apos;s
                relevant).
                <br />
                <br />
                We have 2 offerings for this service →
              </p>
            </div>
  
            {/* Right */}
            <div className="flex-1 min-w-0">
              <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
                <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                  <img
                    src="/images/LocalMail.png"
                    alt="Local Marketing Visual"
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <h2 className="text-sm font-semibold text-neutral-900">
                  <a href="#ways-to-participate" className="text-orange-500 hover:underline">
                    2 ways to participate.
                  </a>
                </h2>
  
                <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                  <a href="#contact-forms" className="font-semibold text-orange-500 hover:underline">
                    for Good local newsletter:{" "}
                  </a>
                  share the cost with other advertisers through a monthly ad card sent to local
                  communities. Only 1 advertiser per category, see neighborhoods and grab your spot
                  here.
                  <br />
                  <br />
                  <a href="#contact-forms" className="font-semibold text-orange-500 hover:underline">
                    Custom direct mail campaign:{" "}
                  </a>
                  work with us to create a custom campaign for your business. Pricing varies, as it
                  depends on what you want to send, how many households you want to reach, and if
                  you&apos;re advertising alone or with others.
                </p>
              </div>
            </div>
          </section>
        </div>
  
        {/* WAYS TO PARTICIPATE (full-width band, centered inside) */}
        <section id="ways-to-participate" className="w-full bg-orange-100 scroll-mt-32">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                How do we activate direct local mail?
              </h2>
  
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                Pause for some data – in 2025, Direct Mail has shown to earn 161% ROI. Meaning, for
                every $1 in companies have earned nearly $3 back.{" "}
                <a
                  href="https://www.modernpostcard.com/blog/direct-mail-stats"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 underline hover:text-orange-600"
                >
                  Read more here.
                </a>
              </p>
            </div>
  
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <a
                href="#contact-forms"
                className="group block rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm transition-all duration-200 hover:bg-orange-50 hover:border-orange-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <h3 className="text-sm font-semibold text-neutral-900 transition-colors group-hover:text-orange-600">
                  for Good Local Newsletter
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We&apos;ve curated neighborhoods near and dear to us. We&apos;re expanding this list, but for now
                  businesses in the below areas can be a part of a co-op advertising newsletter:
                </p>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Manayunk, Philadelphia, PA
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Honolulu, HI
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Las Vegas, NV
                  </li>
                </ul>
  
                <div className="mt-3 text-[11px] text-neutral-600">Click to jump down →</div>
              </a>
  
              <a
                href="#contact-forms"
                className="group block rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm transition-all duration-200 hover:bg-orange-50 hover:border-orange-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <h3 className="text-sm font-semibold text-neutral-900 transition-colors group-hover:text-orange-600">
                  Custom Direct Mail Campaign
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  Don&apos;t see an area you&apos;d like to cover on the local list? Use this option to create your
                  own direct mail campaign with us.
                </p>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Reach any city in the US
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Target by Resident / Business, Average Age, or Average Income
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Submit inquiry below to learn more
                  </li>
                </ul>
  
                <div className="mt-3 text-[11px] text-neutral-600">Click to jump down →</div>
              </a>
  
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What Both Ways Get</h3>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Custom direct mail services: planning, designing, printing, and shipping
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    for Good giving element, a portion of our revenue is donated
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Measurement and impact tips: from simple to involved
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Secure delivery by USPS
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
  
        {/* CONTACT FORMS (centered) */}
        <section id="contact-forms" className="w-full scroll-mt-32">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="grid gap-10 md:grid-cols-2">
              <div className="rounded-3xl bg-white border border-orange-100 shadow-sm overflow-hidden">
                <div className="bg-neutral-100 h-56 w-full overflow-hidden">
                  <img
                    src="/images/LocalNewsletter.png"
                    alt="for Good Local Newsletter"
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <div className="px-6 py-6">
                  <p className="text-xs text-neutral-600">Way 1</p>
                  <h3 className="mt-2 text-2xl font-semibold text-neutral-900">
                    for Good Local Newsletter
                  </h3>
                  <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                    Be a part of a bimonthly newsletter for the local areas we serve. 1 Hero advertiser
                    and 12 Tile advertisers per newsletter, with category exclusivity.
                    <br />
                    <br />
                    Hero advertiser typically $0.20 per mailpiece, Tile advertiser typically $0.08.
                  </p>
                </div>
              </div>
  
              <div className="rounded-3xl bg-white border border-orange-100 shadow-sm overflow-hidden">
                <div className="bg-neutral-100 h-56 w-full overflow-hidden">
                  <img
                    src="/images/CustomDirectMail.png"
                    alt="Custom Direct Mail Campaign"
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <div className="px-6 py-6">
                  <p className="text-xs text-neutral-600">Way 2</p>
                  <h3 className="mt-2 text-2xl font-semibold text-neutral-900">
                    Custom Direct Mail Campaign
                  </h3>
                  <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                    Create a custom campaign to reach potential local customers. This Way is 100% you,
                    unless you bring partners into the mix.
                    <br />
                    <br />
                    Pricing dependent on campaign.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
  
{/* Full-width Direct Mail CTA */}
<section className="mx-auto w-full max-w-6xl px-4 py-10">
  <div className="rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8 sm:px-10 sm:py-10 flex justify-center">
  <div id="primary-cta">
    <InquiryLauncher
      label="Get Started On Your Direct Mail Campaign"
      defaultServices={["Local Direct Mail"]}
      sourceLabel="Direct Mail — Full Width CTA"
      className="w-full max-w-3xl text-center rounded-full bg-orange-500 px-8 py-4 text-base sm:text-lg font-semibold text-white hover:bg-orange-600"
    />
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
                <li>Business owners looking for direct mail campaign help</li>
                <li>Entrepreneurs wanting to reach local households</li>
                <li>Owners looking to reach potential local customers in a novel way</li>
              </ul>
            </div>
  
            <div className="rounded-3xl border border-black bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Businesses looking for a digital campaign</li>
                <li>Teams looking for ads consulting on free tools</li>
                <li>Anyone just looking for instructions on direct mail campaigns</li>
              </ul>
            </div>
          </section>
  
          {/* Process */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight text-orange-500">
              What&apos;s the process?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
              This service is designed to be as easy as possible for you. Tell us where and who you
              want to reach, and we&apos;ll take care of planning, design, printing, distribution, and tracking.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What we need from you</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Complete either the Local Newsletter or Custom Campaign form</li>
                  <li>Follow our setup, design, and measurement steps</li>
                  <li>Then we get to work</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What we&apos;ll do</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Planning, design, printing, USPS distribution management, and tracking performance</li>
                  <li>Communicate clearly at each step of the process</li>
                  <li>Work with you after mailing to measure success</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What happens when we&apos;re done</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>You get your brand inside potential customers&apos; homes</li>
                  <li>You receive more local business because of your mailers</li>
                  <li>We provide insight on how your campaign performed</li>
                </ul>
              </div>
            </div>
          </section>
  
          {/* Facts & Figures (already centered because we’re inside the wrapper now) */}
          <section className="mt-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Facts &amp; Figures:
            </h2>
  
            <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-4">
              {/* Card 1 */}
              <div className="rounded-[2rem] overflow-hidden bg-orange-400 text-white flex flex-col min-h-[340px]">
                <div className="flex-1 px-6 py-8">
                  <h3 className="text-2xl sm:text-3xl leading-tight">
                    <span className="font-semibold">86%</span> of people “like” receiving direct mail —{" "}
                    <em className="font-semibold">when relevant &amp; personal</em>
                  </h3>
                  <p className="mt-5 text-sm sm:text-base text-white/90 leading-relaxed">
                    Consumers like discounts and offers, seeing their name on the piece, and having
                    something tangible to hold.
                  </p>
                </div>
                <div className="px-6 py-5 bg-white/10 border-t border-white/15">
                  <p className="text-xs text-white/80">Source</p>
                  <a
                    href="https://www.lob.com/state-of-direct-mail/consumer-insights/2025-report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm underline underline-offset-2"
                  >
                    Lob State of Direct Mail Report (US) 2025
                  </a>
                </div>
              </div>
  
              {/* Card 2 */}
              <div className="rounded-[2rem] overflow-hidden bg-blue-700 text-white flex flex-col min-h-[340px]">
                <div className="flex-1 px-6 py-8">
                  <h3 className="text-2xl sm:text-3xl leading-tight">
                    <span className="font-semibold">61%</span> of people have taken action because of direct mail
                  </h3>
                  <p className="mt-5 text-sm sm:text-base text-white/90 leading-relaxed">
                    Consumers have made purchases, applied for services, or visited websites after receiving direct mail.
                  </p>
                </div>
                <div className="px-6 py-5 bg-white/10 border-t border-white/15">
                  <p className="text-xs text-white/80">Source</p>
                  <a
                    href="https://franklinmadisondirect.com/e-books/2025-consumer-trends/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm underline underline-offset-2"
                  >
                    Franklin Madison – Direct Mail Consumer Trends 2025
                  </a>
                </div>
              </div>
  
              {/* Card 3 */}
              <div className="rounded-[2rem] overflow-hidden bg-orange-400 text-white flex flex-col min-h-[340px]">
                <div className="flex-1 px-6 py-8">
                  <h3 className="text-2xl sm:text-3xl leading-tight">
                    “Direct Mail is <span className="font-semibold">Hot Again</span>” — US SBA
                  </h3>
                  <p className="mt-5 text-sm sm:text-base text-white/90 leading-relaxed">
                    Millions of businesses use direct mail, and that number has been growing the past few
                    years, with renewed interest driven by younger generations.
                  </p>
                </div>
                <div className="px-6 py-5 bg-white/10 border-t border-white/15">
                  <p className="text-xs text-white/80">Source</p>
                  <a
                    href="https://www.sba.gov/blog/direct-mail-hot-again-heres-how-use-it"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm underline underline-offset-2"
                  >
                    US Small Business Administration Blog 2019
                  </a>
                </div>
              </div>
  
              {/* Card 4 */}
              <div className="rounded-[2rem] overflow-hidden bg-blue-700 text-white flex flex-col min-h-[340px]">
                <div className="flex-1 px-6 py-8">
                  <h3 className="text-2xl sm:text-3xl leading-tight">
                    Average lifespan of a direct mail piece is <span className="font-semibold">17 days</span>
                  </h3>
                  <p className="mt-5 text-sm sm:text-base text-white/90 leading-relaxed">
                    Direct mail builds trust and memory, with pieces often staying visible in homes far longer than digital ads.
                  </p>
                </div>
                <div className="px-6 py-5 bg-white/10 border-t border-white/15">
                  <p className="text-xs text-white/80">Source</p>
                  <a
                    href="https://mailchimp.com/marketing-glossary/direct-mail/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm underline underline-offset-2"
                  >
                    Intuit Mailchimp – Direct Mail Blog 2025
                  </a>
                </div>
              </div>
            </div>
          </section>
  
          {/* Tracking performance */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight text-orange-500">
              How do you track performance?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
              This service only works for you if it&apos;s making you money. We only know that if we put in
              place some kind of tracking — we&apos;ve tried to make that as simple as possible while being as
              accurate as possible.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">How to think about this ad</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Exposure: your brand in nearby homes at a low cost</li>
                  <li>Remind: this could remind someone to come back</li>
                  <li>Convince: sway a new customer to give you a try</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What we measure</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Custom tracking for calls or web visits from the ad</li>
                  <li>Search monitoring - did searches increase after mailing</li>
                  <li>Return on investment estimation</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">What you can measure</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>Custom tracking, coupon, or redemption codes</li>
                  <li>In-person redemption, if you have a physical location</li>
                  <li>Gauge before &amp; after mailing business impact</li>
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
                  q: "How quickly can we create a campaign?",
                  a: "Local Ad Newsletters are planned 2-3 months in advance. A Custom Direct Mail campaign can be put together as quickly as a week.",
                },
                {
                  q: "Do I need to give you access to anything?",
                  a: "No, we want this to be as simple as possible.",
                },
                {
                  q: "Is this recurring or one-time?",
                  a: (
                    <>
                      This can be an ongoing service we provide, but if you&apos;re looking for anything else beyond Direct
                      Mail - we suggest looking at our full list of{" "}
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
                  q: "What targeting is available?",
                  a: "Yes. We can target by zip, household income, average age, household size, and by resident or business address.",
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
          Need help beyond a mailer campaign?
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
            href="https://www.ads4good.com/for-businesses/digital-profile-management"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For Digital Profile Management
          </a>
        </div>
      </div>

    </div>
  </div>
</section>
        </div>

        <StickyCTA
  targetId="primary-cta"
  label="Get Started On Your Direct Mail Campaign"
  defaultServices={["Local Direct Mail"]}
  sourceLabel="Local Direct Mail Page — Sticky CTA"
/>
      </main>
    );
  }
  
  
  
  
  
  
  