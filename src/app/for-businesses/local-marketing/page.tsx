export const metadata = {
    title: "direct mail marketing | reach potential customers right around the corner",
    description:
      "Professional and affordable direct mail marketing for your business. Reach local customers with relevant messaging to get more business.",
  };
  
  export default function LocalMarketingDetailPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
        <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
          {/* Left: Hero copy */}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-orange-500">
              Local marketing: not just nearby, within your neighborhoods.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
              For now, we do this through a direct mail partnership with USPS. Working with them, we can mail every
              resident and/or business owner in your area (any area really).
              <br />
              <br />
              Direct mail has consistently shown as one of the marketing channels that ranks highest for both:
              generating a return for businesses and liked by customers (when it's relevant).
              <br />
              <br />
              We have 2 offerings for this service →
            </p>
          </div>
  
          {/* Right: Card / explainer */}
          <div className="flex-1">
            <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
              {/* Replaced placeholder with image */}
              <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  src="/images/LocalMail.png" // ← Replace with correct file name
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
                <a href="#ways-to-participate" className="font-semibold text-orange-500 hover:underline">
                  for Good local newsletter:{" "}
                </a>
                share the cost with other advertisers through a monthly ad card sent to local communities. Only 1
                advertiser per category, see neighborhoods and grab your spot here.
                <br />
                <br />
                <a href="#ways-to-participate" className="font-semibold text-orange-500 hover:underline">
                  Custom direct mail campaign:{" "}
                </a>
                work with us to create a custom campaign for your business. Pricing varies, as it depends on what you
                want to send, how many households you want to reach, and if you're advertising alone or with others.
              </p>
            </div>
          </div>
        </section>
  
        {/* WAYS TO PARTICIPATE SECTION */}
        <section id="ways-to-participate" className="w-full bg-orange-100 mt-32 scroll-mt-32">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                How do we activate direct local mail?
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                Pause for some data – in 2025, Direct Mail has shown to earn 161% ROI. Meaning, for every $1 in companies
                have earned nearly $3 back.{" "}
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
              {/* Way 1 (CLICKABLE -> ANCHOR TO LAST SECTION) */}
              <a
                href="#contact-forms"
                className="group block rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm transition-all duration-200 hover:bg-orange-50 hover:border-orange-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <h3 className="text-sm font-semibold text-neutral-900 transition-colors group-hover:text-orange-600">
                  for Good Local Newsletter
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We've curated neighborhoods near and dear to us. We're expanding this list, but for now businesses in
                  the below areas can be a part of a co-op advertising newsletter:
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
  
                {/* Optional polish #1: subtle hint */}
                <div className="mt-3 text-[11px] text-neutral-600">
                  Click to jump down →
                </div>
              </a>
  
              {/* Way 2 (CLICKABLE -> ANCHOR TO LAST SECTION) */}
              <a
                href="#contact-forms"
                className="group block rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm transition-all duration-200 hover:bg-orange-50 hover:border-orange-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <h3 className="text-sm font-semibold text-neutral-900 transition-colors group-hover:text-orange-600">
                  Custom Direct Mail Campaign
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  Don't see an area you'd like to cover on the local list? Use this option to create your own direct mail
                  campaign with us.
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
  
                {/* Optional polish #1: subtle hint */}
                <div className="mt-3 text-[11px] text-neutral-600">
                  Click to jump down →
                </div>
              </a>
  
              {/* General (unchanged) */}
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
  
        {/* NEW TWO-WAY SECTION (FORMS) */}
        <section id="contact-forms" className="w-full mt-32 scroll-mt-32">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="grid gap-10 md:grid-cols-2">
              {/* LEFT BOX */}
              <div className="rounded-3xl bg-white border border-orange-100 shadow-sm overflow-hidden">
                {/* Hero image */}
                <div className="bg-neutral-100 h-56 w-full overflow-hidden">
                  <img
                    src="/images/LocalNewsletter.png"
                    alt="for Good Local Newsletter"
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <div className="px-6 py-6">
                  <p className="text-xs text-neutral-600">Way 1</p>
                  <h3 className="mt-2 text-2xl font-semibold text-neutral-900">for Good Local Newsletter</h3>
                  <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                    Be a part of a bimonthly newsletter for the local areas we serve. 1 Hero advertiser and 12 Tile
                    advertisers per newsletter, with category exclusivity.
                    <br />
                    <br />
                    Hero advertiser typically $0.20 per mailpiece, Tile advertiser typically $0.10.
                  </p>
  
                  {/* Dropdown (independent) */}
                  <div className="mt-6 border-t border-neutral-200 pt-4">
                    <details>
                      <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-900 hover:text-orange-500">
                        Become a local newsletter advertiser
                      </summary>
  
                      <div className="mt-4 rounded-2xl bg-orange-50 border border-orange-100 p-4">
                        <iframe
                          src="https://docs.google.com/forms/d/e/1FAIpQLSeRgG-kjDdwg7AGavc2wMaO_MsRHlOJeVF-IlQXSbwA3z3I3w/viewform?embedded=true"
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
              </div>
  
              {/* RIGHT BOX */}
              <div className="rounded-3xl bg-white border border-orange-100 shadow-sm overflow-hidden">
                {/* Hero image */}
                <div className="bg-neutral-100 h-56 w-full overflow-hidden">
                  <img
                    src="/images/CustomDirectMail.png"
                    alt="Custom Direct Mail Campaign"
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <div className="px-6 py-6">
                  <p className="text-xs text-neutral-600">Way 2</p>
                  <h3 className="mt-2 text-2xl font-semibold text-neutral-900">Custom Direct Mail Campaign</h3>
                  <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                    Create a custom campaign to reach potential local customers. This Way is 100% you, unless you bring
                    partners into the mix.
                    <br />
                    <br />
                    Pricing dependent on campaign.
                  </p>
  
                  {/* Dropdown (independent) */}
                  <div className="mt-6 border-t border-neutral-200 pt-4">
                    <details>
                      <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-900 hover:text-orange-500">
                        Create your custom campaign
                      </summary>
  
                      <div className="mt-4 rounded-2xl bg-orange-50 border border-orange-100 p-4">
                        <iframe
                          src="https://docs.google.com/forms/d/e/1FAIpQLSdEmjS678shnDjm0wsuPwq6RBUN8-KUOn_ysSk7a-AwbWcS3A/viewform?embedded=true"
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
              </div>
            </div>
  
            
          </div>
        </section>
      </main>
    );
  }
  
  
  
  
  
  