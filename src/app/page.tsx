
import Link from "next/link";
import ExpertiseSection from "@/components/ExpertiseSection";

export const metadata = {
  title: "ads for Good | Ethical advertising consulting and tips for small businesses and people",
  description:
    "ads for Good is a mission-driven ad company focused on educating people about the ad industry and privacy protection, and consulting businesses on ethical and proper marketing tactics.",
};

export default function HomePage() {
  return (
    <main className="bg-white text-neutral-900">
      {/* Hero Section */}
{/* Hero Section */}
<section className="w-full bg-[#C85A1B] text-white">
  <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
    <div className="max-w-4xl">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/75">
        ads for Good
      </p>

      <h1 className="mt-6 text-5xl font-semibold tracking-tight leading-[1.02] text-white sm:text-6xl lg:text-7xl">
        On-demand marketing
        <br />
        support.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
        Flexible, hands-on marketing help for businesses that need momentum
        without hiring a full team.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/for-businesses"
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-[#C85A1B] transition hover:bg-white/90"
        >
          View Plans
        </Link>

        <Link
          href="/about"
          className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Learn More About Us
        </Link>
      </div>

      <p className="mt-8 text-sm text-white/70">
        Practical support across SEO, paid ads, email marketing, website
        updates, and more.
      </p>
    </div>
  </div>
</section>

{/* How It Works / Support Intro Band */}
<section className="w-full bg-[#1f2f44] py-20 sm:py-24">
  <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 sm:px-8 lg:grid-cols-[1.4fr_0.6fr]">
    <div className="max-w-4xl">
      <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.08]">
        How our flexible marketing support works
      </h2>

      <p className="mt-8 max-w-3xl text-lg leading-8 text-white/85 sm:text-xl">
        We offer 3 plans, and you choose the one that best fits your business
        needs. Each plan allows a certain amount of active marketing projects,
        provides milestones and completion at different schedules, comes with
        monthly meetings, and includes unlimited marketing advice over email.
      </p>
    </div>

    <div className="flex lg:justify-end">
      <Link
        href="/for-businesses"
        className="inline-flex min-h-[64px] items-center justify-center rounded-full bg-orange-500 px-10 py-4 text-base font-medium text-white transition hover:bg-orange-400 sm:px-12"
      >
        View Plans
      </Link>
    </div>
  </div>
</section>

<ExpertiseSection />

      {/* Tile Section (2x2 grid) */}
      {/* Marketing Support + Secondary Tiles */}
{/* For People Section */}
<section className="w-full bg-[#f7f4ee] py-24 sm:py-28">
  <div className="mx-auto max-w-6xl px-6 sm:px-8">
    <div className="max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
        For People
      </p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl leading-[1.05]">
        Education, privacy, and better online experiences.
      </h2>
    </div>

    <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <Link
        href="/for-people/education"
        className="group block"
      >
        <div className="rounded-[2rem] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition duration-300 group-hover:-translate-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
            Learn
          </p>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl leading-[1.08]">
            Education
          </h3>
          <p className="mt-5 max-w-sm text-base leading-7 text-neutral-700">
            Learn how advertising actually works from people who have spent years inside the industry.
          </p>
        </div>
      </Link>

      <Link
        href="/for-people/privacy-protection"
        className="group block md:translate-y-16"
      >
        <div className="rounded-[2rem] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition duration-300 group-hover:-translate-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
            Protect
          </p>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl leading-[1.08]">
            Privacy Protection
          </h3>
          <p className="mt-5 max-w-sm text-base leading-7 text-neutral-700">
            Free and paid resources to help people better protect their data and web experience.
          </p>
        </div>
      </Link>

      <Link
        href="/for-people/ad-network"
        className="group block lg:-translate-y-8"
      >
        <div className="rounded-[2rem] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition duration-300 group-hover:-translate-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
            Browse
          </p>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl leading-[1.08]">
            ad Network
          </h3>
          <p className="mt-5 max-w-sm text-base leading-7 text-neutral-700">
            A small group of sites that create value for people and help fund the bigger mission.
          </p>
        </div>
      </Link>
    </div>
  </div>
</section>

       {/* Impact / Highlights Section */}
       <section className="w-full bg-[#f7f4ee] py-24 sm:py-28">
  <div className="mx-auto max-w-6xl px-6 sm:px-8">
    <Link
      href="/for-good"
      className="group block"
    >
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
          for Good
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl leading-[1.05]">
          The fun part, what happens after we make some money.
        </h2>
      </div>
    </Link>

    <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <article className="rounded-[2rem] bg-[#1c1917] p-8 text-white shadow-[0_12px_36px_rgba(0,0,0,0.10)] sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300">
          For Good not Greed
        </p>
        <h3 className="mt-5 text-3xl font-semibold tracking-tight leading-[1.08] sm:text-4xl">
          A portion of everything in, goes out.
        </h3>
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/80">
          The business needs to operate in order to do this, but after keeping
          the lights on, the very next thing we spend on is someone else.
        </p>
      </article>

      <div className="grid gap-8">
        <article className="rounded-[2rem] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
            Impact
          </p>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900 leading-[1.08]">
            Charity. Community. People.
          </h3>
          <p className="mt-6 text-base leading-8 text-neutral-700">
            Money goes to charities, communities around us, and people in need.
          </p>
        </article>

        <article className="rounded-[2rem] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] sm:p-10 lg:ml-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-500">
            Reach
          </p>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900 leading-[1.08]">
            Education &amp; Eyeballs.
          </h3>
          <div className="mt-6 space-y-5 text-base leading-8 text-neutral-700">
            <p>
              <span className="font-medium text-neutral-900">
                for Businesses:
              </span>{" "}
              Our offerings aren't just a thing you use once and that's it. Our
              hope is to provide education that can be incorporated for as long
              as you're in business.
            </p>
            <p>
              <span className="font-medium text-neutral-900">
                for People:
              </span>{" "}
              All we ask is your attention. If you scroll or peruse the web with
              us, see an ad or two, that's more than enough.
            </p>
          </div>
        </article>
      </div>
    </div>
  </div>
</section>

    </main>
  );
}




