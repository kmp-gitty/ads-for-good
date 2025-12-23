export const metadata = {
    title: "diy marketing guidance | on demand marketing information",
    description:
      "Prefer to do things on your own, but just need a little help? Use our downloadable digital guidebook to learn how marketing is done by fortune 500 companies to make their strategies your own.",
  };
  
  export default function MarketingGuidebookPage() {
    return (
      <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
  
        {/* HERO SECTION */}
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
              <a
                href="https://forms.gle/mSm6dfmz8AhVzjkw9"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 underline hover:text-orange-600"
              >
                Buy the guidebook here.
              </a>
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
  
        {/* SNEAK PEEK SECTION */}
        <section className="w-full bg-orange-100 mt-32">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                A sneak peek of what's inside.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                Disclaimer: I believe in "if it ain't broke, don't fix it". If you're running a successful business, and for the past 30 years you've found that word of mouth and a simple website works - I don't want you buying this, it won't be helpful.<br /><br />
                However, if you think there's more on the table and you've been thinking of taking marketing and digital tools more seriously - this guidebook is the perfect place to start.
              </p>
            </div>
  
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {/* Tool 1 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Free Tools: aka "Owned & Operated"
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
  What can you do with the free tools you already have (or can easily setup)?
</p>

<ul className="mt-2 space-y-1 text-xs text-neutral-700">
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    Website & other digital properties (Facebook page, IG page, etc)
  </li>
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    Profiles: Google, Yelp, etc
  </li>
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    Other things: Content, email, software, etc
  </li>
</ul>
              </div>
  
              {/* Tool 2 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Paid Tools: Search, Social, Ecommerce, & More
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
  What can you do with paid tools to grow your business?
</p>

<ul className="mt-2 space-y-1 text-xs text-neutral-700">
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    The big ad platforms: Paid Search & Paid Social
  </li>
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    Ecommerce: Selling on Amazon
  </li>
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    Other things: SEO, Programmatic Ads, TV, OOH (Out of Home)
  </li>
</ul>
              </div>
  
              {/* Tool 3 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  General Tips Across Sections
                </h3>

<ul className="mt-2 space-y-1 text-xs text-neutral-700">
<li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    What is a marketing guidebook and how do I use it?
  </li>
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    How should I interpret marketing topics for my business?
  </li>
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    How can I apply these marketing tactics to my business?
  </li>
  <li className="flex items-start gap-2">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
    What are some examples across marketing topics I can implement?
  </li>
</ul>
              </div>
            </div>
          </div>
        </section>
  
      </main>
    );
  }
  
  
  