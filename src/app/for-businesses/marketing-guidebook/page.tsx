export const metadata = {
    title: "diy marketing guidance | on demand marketing information",
    description:
      "Prefer to do things on your own, but just need a little help? Use our downloadable digital guidebook to learn how marketing is done by fortune 500 companies to make their strategies your own.",
  };

export default function MarketingGuidebookPage() {
    return (
      <main className="bg-white text-neutral-900 flex justify-center px-4 pt-16 pb-24">
        <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
  
          {/* Left: Hero copy */}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-orange-500">
              A marketing guidebook you can actually use.
            </h1>
  
            <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
              Some people like to DIY. Sometimes you just want a clear,
              step-by-step playbook you can follow on your own time — without digging through
              a hundred blogs and YouTube videos.
              <br /><br />
              The marketing guidebook is built for small and medium businesses who want to
              understand the &quot;why&quot; and the &quot;how&quot; of modern marketing, in
              plain language, with examples you can copy and adapt.
              <br /><br />
              Buy the guidebook here.
            </p>
          </div>
  
          {/* Right: Card / explainer */}
          <div className="flex-1">
            <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
  
              {/* Image replaces placeholder */}
              <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  src="/images/MarketingGuidebook.png"   // ← replace with your actual filename
                  alt="Marketing Guidebook Cover"
                  className="object-contain w-full h-full"
                />
              </div>
  
              <h2 className="text-sm font-semibold text-neutral-900">
                Free & Paid Tools inside.
              </h2>
  
              <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                $50 gets you the 16 page marketing guidebook to better your business. You'll find 
                simple, yet professional, tips and tricks &quot;the big guys&quot; use — just made 
                for local businesses.
                <br /><br />
                You'll learn what the thing is, why the thing is important, and how to implement 
                the thing (if you choose).
              </p>
            </div>
          </div>
  
        </section>
      </main>
    );
  }
  
  