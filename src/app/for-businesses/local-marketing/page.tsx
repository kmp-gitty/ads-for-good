export default function LocalMarketingDetailPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 flex justify-center px-4 pt-16 pb-24">
        <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
  
          {/* Left: Hero copy */}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-orange-500">
              Local marketing: not just nearby, within your neighborhoods.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
              For now, we do this through a direct mail partnership with USPS. Working with them, we can mail every resident and/or business owner in your area (any area really).
              <br /><br />
              Direct mail has consistently shown as one of the marketing channels that ranks highest for both: generating a return for businesses and liked by customers (when it's relevant).
              <br /><br />
              Two offerings being finalized, check back soon or reach out for information.
            </p>
          </div>
  
          {/* Right: Card / explainer */}
          <div className="flex-1">
            <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
  
              {/* Replaced placeholder with image */}
              <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  src="/images/LocalMail.png"   // ← Replace with correct file name
                  alt="Local Marketing Visual"
                  className="object-contain w-full h-full"
                />
              </div>
  
              <h2 className="text-sm font-semibold text-neutral-900">
                2 ways to participate.
              </h2>
  
              <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                for Good local newsletter: share the cost with other advertisers through a monthly ad card sent to local communities. Only 1 advertiser per category, see neighborhoods and grab your spot here.
                <br /><br />
                Custom direct mail campaign: work with us to create a custom campaign for your business. Pricing varies, as it depends on what you want to send, how many households you want to reach, and if you're advertising alone or with others.
              </p>
            </div>
          </div>
  
        </section>
      </main>
    );
  }
  
  