export const metadata = {
    title: "business consulting | face to face discussions for your business problems",
    description:
      "Talk through your marketing or general business problems with our team. Take the time to review ideas, mock strategies, and answer any business questions you have.",
  };

export default function ConsultancyPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 flex justify-center px-4 pt-16 pb-24">
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
      </main>
    );
  }
  
  