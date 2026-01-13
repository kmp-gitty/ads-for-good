export const metadata = {
  title: "Outsourced Marketing Team for Small Businesses | Ads for Good",
  description:
    "Work with an experienced outsourced marketing team for your small business. Strategy, execution, SEO, paid ads, and ongoing support - without the cost of a full-time hire.",
};

export default function MarketingTeamPage() {
  return (
    <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
      {/* HERO SECTION */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
        <div className="flex-1">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            Built for Small Businesses: Your Marketing Team
          </h1>

          <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
            You started your business because of a passion, or you're really good at something, or (like us) you just got tired of listening to someone else. Sound like you?
            <br /><br />
            You got a website, maybe some equipment and a space, and are getting some clients. Going pretty good, but you didn't expect: accounting paperwork, legal documents, and growing a business takes some marketing. Also sound like you?
            <br /><br />
            We built this product for exactly you. We want you to have the more time for your business, while we work on the piece we know: Marketing.
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
              We can be your Marketing Team - without needing full-time staff:
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>Marketing and business strategy & guidance</li>
              <li>Website builds, updates, and maintenance</li>
              <li>SEO and organic search monitoring</li>
              <li>Paid ads strategy and management across channels</li>
              <li>Unlimited email access & meeting availability</li>
            </ul>

            <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
              $1,500 a month gets you full force and knowledge of a marketing team - without needing to spend endless time and money.
            </p>
          </div>
        </div>
      </section>

      {/* SNEAK PEEK SECTION */}
      <section className="w-full bg-orange-100 mt-32">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
              The Details on What You Get.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
              Your Need: Someone to help manage everything marketing related, without making a huge dent on your expenses.<br /><br />
              This Service: Just that.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Tool 1 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Strategy & Guidance
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Get some resources for education, and immediately have marketing brains on tap.
              </p>

              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Receive our Marketing Guidebook for some reading
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Open line for ideas, questions, and discussion
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Digital Health Check - we'll do a once-over on everything, make sure it's in order and fix if not
                </li>
              </ul>
            </div>

            {/* Tool 2 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Organic and Free Tools
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                We'll manage every unpaid avenue to grow your business. Helping you at each step.
              </p>

              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Website builds, updates, and maintenance
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  SEO analysis, planning, and organic search growth
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Digital profile and listing management: reviews, comments, & community
                </li>
              </ul>
            </div>

            {/* Tool 3 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Paid and Ad Tools
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
              We'll manage every paid avenue to grow your business. Upgrades, ads, and software.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Planning, prioritization, and performance
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Ads analysis, clean-up, and campaign management
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                  Education and exploration of the digital marketing, and beyond, industry
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
              <li>Business owners needing help with marketing management</li>
              <li>Anyone curious about positive outsourcing</li>
              <li>Entrepreneurs ready to spend more time on their business</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Businesses looking for a short-term engagement</li>
              <li>Teams looking for advice only</li>
              <li>Anyone wanting a cookie-cutter solution</li>
            </ul>
          </div>
        </section>

{/* Process */}
<section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight text-orange-500">
              What&apos;s the process?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
              This is our most hands-on service, but because it's the most helpful. We think the process we have makes it easy, and we can go as fast or as slow as you'd like. Always customized to your goals & needs.
            </p>
  
            <div className="mt-6 grid gap-6 md:grid-cols-3 items-start">
              {/* WHITE backgrounds here */}
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">1) Discussion & Learning</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>We'll meet to get your story and reason for reaching out</li>
                  <li>We're going to ask a lot of questions</li>
                  <li>The goal is to figure out what you need help with most</li>
                  <li>Then, we'll do our own research and prioritize</li>
                  <li>First step includes Digital Health Check, SEO & Ad analysis</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">2) Access & Updates</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>We'll have a prioritized list of immediate updates after the Health Check / analyses</li>
                  <li>We work together to get access to the appropriate channels for us to do our work</li>
                  <li>Bigger projects take longer, but we can make easy (& impactful) changes first</li>
                  <li>To be successful long-term, we'll also setup proper marketing tracking</li>
                </ul>
              </div>
  
              <div className="rounded-3xl border border-orange-100 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">3) Ongoing Work & Success</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                  <li>If not used before, you'll get more valuable marketing information to grow</li>
                  <li>We'll takeover the tedious profile and listing management</li>
                  <li>Continue work on bigger projects like ad fixes and management</li>
                  <li>Open communication, scheduled check-ins, and performance tracking</li>
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
                q: "Do I need to commit to this?",
                a: "No, this is built to be a month to month service.",
              },
              {
                q: "How do I know if this service is for me?",
                a: "1) Have a business? 2) Annoyed at keeping up with the comments, ad spend, website updates, etc? If you said 'yes' to both - we should talk.",
              },
              {
                q: "Is this better than hiring someone?",
                a: (
                  <>
                    We think so. You'll get the force and brains of a marketing team, without the impact on your wallet. But, it only makes sense if you're looking to offload all marketing duties. Looking for just a channel or task instead? Check out one of our other{" "}
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
                q: "What do I need to provide?",
                a: "If we work together on everything, as this service is designed, we'll need access to your: website, digital profiles (FB, IG, Google Business Profile, etc), any ads managers you use, and any marketing/reporting/data software you use.",
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
                  href="https://www.ads4good.com/for-businesses#ops-executionk"
                  className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                >
                  For Operation & Execution
                </a>
  
              </div>
            </div>
          </section>
      </div>
    </main>
  );
}
  