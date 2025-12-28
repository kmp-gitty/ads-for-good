export const metadata = {
    title: "business consulting | face to face discussions for your business problems",
    description:
      "Talk through your marketing or general business problems with our team. Take the time to review ideas, mock strategies, and answer any business questions you have.",
  };
  
  export default function ConsultancyPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
        <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
  
          {/* Left: Hero copy */}
<div className="flex-1">
  <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-orange-500">
    Marketing & Business Consulting, without the agency song and dance.
  </h1>

  <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
    There's power in talking over something live, whether on the phone, over video chat, or
    in-person. Prefer to discuss advertising or business problems face to face, this is the
    right spot.
    <br /><br />
    We&apos;ll help you evaluate ideas, pressure-test plans, and educate on anything needed.
    <br /><br />
    <a
      href="mailto:katoa@ads4good.com?subject=Consulting&body=Hi%20Katoa%2C%0D%0A%0D%0ALooking%20to%20learn%20more%20about%20consulting%20with%20you%20for%20either%20advertising%2C%20marketing%20or%20my%20business.%20Can%20you%20help%3F"
      className="text-orange-500 underline hover:text-orange-600"
    >
      Ready to get started? Send us this email.
    </a>
  </p>

  {/* Dropdown to embed your Google Form (must NOT be inside <p>) */}
  <div className="mt-6 border-t border-orange-200 pt-4">
    <details>
      <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-900 hover:text-orange-500">
        If the email link above didn&apos;t do anything when you clicked it, your settings blocks
        email links — use this form instead.
      </summary>

      <div className="mt-4 rounded-2xl bg-white border border-orange-100 p-4">
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLScLX4QyPNb-rTViF3Q3klF-Wj2vJI30s6Om7UO0HkVb3LdplA/viewform?embedded=true"
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

  
          {/* Right: Card / explainer */}
          <div className="flex-1">
            <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
  
              {/* Image inserted here */}
              <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  src="/images/Consulting.png"  // ← replace with any filename in public/images
                  alt="Consulting Session Illustration"
                  width={500}
                  height={500}
                  className="object-contain w-full h-full"
                />
              </div>
  
              <h2 className="text-sm font-semibold text-neutral-900">
                Your guide.
              </h2>
  
              <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                $500 gets you 5 meeting hours. A meeting hour is whenever we're actually talking 
                about advertising or your business, not travel or niceties.
                <br /><br />
                These usually start as a "how do Google Ads work?" discussion, then lead to a 
                relationship where I help manage your ads. If this happens, the $500 is credited 
                toward the initial project we do together.
              </p>
            </div>
          </div>
  
        </section>
  
        {/* WAYS TO PARTICIPATE SECTION (reused, no clickability) */}
        <section className="w-full bg-orange-100 mt-32">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                What can we help with?
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                Use us as your business consultants, ad agency, mini-marketing team, data source, or idea vetters. We can discuss anything business and marketing related; here's some specific areas we've started conversations with that have lead to ongoing projects:{" "}
              </p>
            </div>
  
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {/* Way 1 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  I have a website, but don't like it - what can be done?
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We've discussed the "ins & outs" of website design and coding. Explaning how companies use no-code tools or web developers to create "better looking" websites. Leading to:
                </p>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Website design and planning (UX & UI)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Custom website builds
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    SEO & other technical implementation
                  </li>
                </ul>
              </div>
  
              {/* Way 2 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  I think I should start to focus on more digital things but don't know how.
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We've helped explain the plethora of digital tools a business can use (free & paid) to promote, manage, and grow a business. Turning into:
                </p>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                   Business profile creation & management (Google, Yelp, Angi, Houzz, etc)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Review and select ad channels that make sense for the business & budget
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Set up, correct and udpate website contact methods to make it easier for customer outreach 
                  </li>
                </ul>
              </div>
  
              {/* General */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Here's what a past agency told us to do for advertising, is it working?
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We've reviewed past ad data, evaluated channels, and discussed new teqhcniques. Resulting in:
                </p>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Ad data evaluation, discussion and improvement consulting
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Ad spend planning, buying, and management
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Performance tracking and ROI tracking
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }
  
  
  