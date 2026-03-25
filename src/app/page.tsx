
import Link from "next/link";

export const metadata = {
  title: "ads for Good | Ethical advertising consulting and tips for small businesses and people",
  description:
    "ads for Good is a mission-driven ad company focused on educating people about the ad industry and privacy protection, and consulting businesses on ethical and proper marketing tactics.",
};

export default function HomePage() {
  return (
    <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-10 pb-16">
      {/* Hero Section */}
      <section className="w-full max-w-5xl text-center bg-white border border-orange-100 rounded-3xl px-8 py-12 shadow-sm">
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
      {/* Marketing Support + Secondary Tiles */}
<section
  id="services"
  className="w-full max-w-6xl mt-32 scroll-mt-32"
>
  <div className="text-center mb-10">
    <h2 className="text-3xl font-bold text-neutral-900">
      Flexible Marketing Support
    </h2>
    <p className="mt-3 text-neutral-700 max-w-2xl mx-auto">
      Structured marketing support for businesses that need momentum without hiring a full-time team.
    </p>
  </div>

  <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
    {/* Primary business tile */}
    <Link
      href="/for-businesses"
      className="block rounded-3xl border border-orange-200 bg-orange-50 p-8 shadow-sm hover:bg-orange-100 transition"
    >
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
          For Businesses
        </p>

        <h3 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900">
          Marketing support that adapts to your priorities
        </h3>

        <p className="mt-4 text-base text-neutral-700 leading-relaxed">
          Work across SEO, paid ads, email marketing, website updates, and more through flexible plans built for small and growing businesses.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
  <span className="rounded-full border border-orange-200 bg-white px-5 py-2 text-sm font-medium text-neutral-900 shadow-sm">
    Our Plan Levels:
  </span>

  <div className="mt-8 grid gap-4 sm:grid-cols-3">
  <div className="rounded-2xl border border-orange-200 bg-white p-4 text-center">
    <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-neutral-900">
      Support
    </span>
    <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
      Someone handling marketing tasks when I need them
    </p>
  </div>

  <div className="rounded-2xl border border-orange-200 bg-white p-4 text-center">
    <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-neutral-900">
      Partner
    </span>
    <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
      Reliable, part-time marketing support
    </p>
  </div>

  <div className="rounded-2xl border border-orange-200 bg-white p-4 text-center">
    <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-neutral-900">
      Team
    </span>
    <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
      A marketing team actively driving my business
    </p>
  </div>
</div>
</div>
      </div>
    </Link>

    {/* Secondary stack */}
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
      <Link
        href="/for-people/education"
        className="block rounded-3xl border border-orange-200 bg-white p-6 shadow-sm hover:bg-orange-50 transition"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
  For People
</p>
        <h3 className="text-lg font-semibold text-neutral-900">
          Education
        </h3>
        <p className="mt-3 text-sm text-neutral-700">
          Learn how advertising actually works from people who have spent years inside the industry.
        </p>
      </Link>

      <Link
        href="/for-people/privacy-protection"
        className="block rounded-3xl border border-orange-200 bg-white p-6 shadow-sm hover:bg-orange-50 transition"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
  For People
</p>
        <h3 className="text-lg font-semibold text-neutral-900">
          Privacy Protection
        </h3>
        <p className="mt-3 text-sm text-neutral-700">
          Free and paid resources to help people better protect their data and web experience.
        </p>
      </Link>

      <Link
        href="/for-people/ad-network"
        className="block rounded-3xl border border-orange-200 bg-white p-6 shadow-sm hover:bg-orange-50 transition"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
  For People
</p>
        <h3 className="text-lg font-semibold text-neutral-900">
          ad Network
        </h3>
        <p className="mt-3 text-sm text-neutral-700">
          A small group of sites that create value for people and help fund the bigger mission.
        </p>
      </Link>
    </div>
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
  <article className="rounded-3xl border border-orange-200 bg-orange-50 p-8 shadow-sm min-h-[260px]">
    <h3 className="text-lg font-semibold text-orange-500">
      A portion of everything in, goes out.
    </h3>
    <p className="mt-4 text-sm leading-relaxed text-neutral-900">
      The business needs to operate in order to do this, but after keeping the lights on, the very next thing we spend on is the community.
    </p>
  </article>

  <article className="rounded-3xl border border-orange-200 bg-white p-8 shadow-sm min-h-[260px]">
    <h3 className="text-lg font-semibold text-orange-500">
      Charity. Community. People.
    </h3>
    <p className="mt-4 text-sm leading-relaxed text-neutral-900">
      Money goes to charities, communities around us, and people in need.
    </p>
  </article>

  <article className="rounded-3xl border border-orange-200 bg-white p-8 shadow-sm min-h-[260px]">
    <h3 className="text-lg font-semibold text-orange-500">
      Education &amp; Eyeballs.
    </h3>
    <p className="mt-4 text-sm leading-relaxed text-neutral-900">
      for Businesses: Our offerings aren't just a thing you use once and that's it. Our hope is to provide education that can be incorporated for as long as you're in business.
      <br />
      <br />
      for People: All we ask is your attention. If you scroll or peruse the web with us, see an ad or two, that's more than enough.
    </p>
  </article>
</div>
      </section>

    </main>
  );
}




