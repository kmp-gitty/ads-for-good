import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-10 pb-16">
      {/* Hero Section */}
      <section className="w-full max-w-5xl text-center">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-orange-500">
          Good over Greed
        </h1>

        <p className="mt-6 max-w-3xl mx-auto text-lg text-neutral-700">
          Advertising can be creepy, and for-profit companies can be callous. Why should it be that way?
          Our coalition crosses the profession we know with our passion for helping people.
        </p>

        <p className="mt-4 max-w-2xl mx-auto text-sm text-neutral-600">
          A company that uses profits for people, not the other way around.
        </p>

        <Link
  href="/about"
  className="mt-10 inline-flex items-center justify-center rounded-full bg-orange-50 text-neutral-900 border border-orange-200 px-6 py-2 text-sm font-medium shadow-sm hover:bg-orange-100 transition"
>
  Learn More
</Link>
      </section>

      {/* Tile Section (2x2 grid) */}
      <section
        id="services"
        className="w-full max-w-6xl mt-32 scroll-mt-32"
      >{/* Section Title + Subtext */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-neutral-900">Services</h2>
        <p className="mt-3 text-neutral-700">
          How we make the thing to keep our thing going: money.
        </p>
      </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top-left tile - pale orange box */}
          <Link
  href="/for-people/education"
  className="block rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm text-center hover:bg-orange-100 transition"
>
  <h3 className="text-lg font-semibold text-neutral-900">
    Education
  </h3>
  <p className="mt-3 text-sm text-neutral-700">
    We are advertising industry experts, but have heard from family, friends, and every day 
    consumers — no one outside of advertising knows the ins &amp; outs. Over a decade working 
    for agencies, brands, and publishers... it's a crazy world. We'd like to educate people on 
    how it works.
  </p>
</Link>


          {/* Top-right tile */}
          <Link
  href="/for-people/privacy-protection"
  className="block rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm text-center hover:bg-orange-100 transition"
>
  <h3 className="text-lg font-semibold text-neutral-900">
    Privacy Protection
  </h3>
  <p className="mt-3 text-sm text-neutral-700">
    Everyone has your data. Everyone. We offer free and paid resources to help you block 
    them the best you can or help you receive ads that are actually relevant to your life.
  </p>
</Link>


          {/* Bottom-left tile */}
          <Link
  href="/for-businesses"
  className="block rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm text-center hover:bg-orange-100 transition"
>
  <h3 className="text-lg font-semibold text-neutral-900">
    for Businesses
  </h3>
  <p className="mt-3 text-sm text-neutral-700">
    We've done all aspects of marketing successfully for "the big guys", we'd like to help share 
    that knowledge with small and medium business owners.
  </p>
</Link>


          {/* Bottom-right tile */}
          <Link
  href="/for-people/ad-network"
  className="block rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm text-center hover:bg-orange-100 transition"
>
  <h3 className="text-lg font-semibold text-neutral-900">
    ad Network
  </h3>
  <p className="mt-3 text-sm text-neutral-700">
    Not a spammy and annoying group, as the title suggests. We own and operate a handful of 
    websites that provides some value to people and helps us with a bit of ad revenue.
  </p>
</Link>

        </div>
      </section>

       {/* Impact / Highlights Section */}
       <section className="w-full max-w-6xl mt-32">
        {/* Section Title + Subtext */}
        <Link
  href="/for-good"
  className="block text-center mb-10 rounded-xl p-4 transition hover:bg-orange-100 cursor-pointer"
>
  <h2 className="text-3xl font-bold text-neutral-900">
    for Good
  </h2>
  <p className="mt-3 text-neutral-700">
    The fun part, what happens after we make some money.
  </p>
</Link>


        {/* 3 Tall Rectangles */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1 */}
          <article className="rounded-3xl border border-neutral-900 bg-white p-6 shadow-sm min-h-[260px]">
            <h3 className="text-lg font-semibold text-orange-500">
              A portion of everything in, goes out.
            </h3>
            <p className="mt-3 text-sm text-neutral-900">
              The business needs to operate in order to do this, but after keeping the lights on, the very next thing we spend on is the community.
            </p>
          </article>

          {/* Card 2 */}
          <article className="rounded-3xl border border-neutral-900 bg-white p-6 shadow-sm min-h-[260px] text-center">
            <h3 className="text-lg font-semibold text-orange-500">
              Charity. Community. People.
            </h3>
            <p className="mt-3 text-sm text-neutral-900">
              Money goes to charities, communities around us, and people in need.
            </p>
          </article>

          {/* Card 3 */}
          <article className="rounded-3xl border border-neutral-900 bg-white p-6 shadow-sm min-h-[260px] text-right">
            <h3 className="text-lg font-semibold text-orange-500">
              Education & Eyeballs.
            </h3>
            <p className="mt-3 text-sm text-neutral-900">
              for Businesses: Our offerings aren't just a thing you use once and that's it. Our hope is to provide education that can be incorporated for as long as you're in business.<br />
              <br />
              for People: All we ask is your attention. If you scroll or peruse the web with us, see an ad or two, that's more than enough.
            </p>
          </article>
        </div>
      </section>

    </main>
  );
}




