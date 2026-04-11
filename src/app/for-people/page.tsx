import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "consumer services | education, privacy information, and a for good ad network",
  description:
    "The ad industry impacts every day consumers, so why shouldn't you know more about it? Use our education blog, privacy protection services, or ad network to be a more conscious ad consumer.",
};

export default function ForPeoplePage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900">
      {/* Hero */}
      <section className="px-4 pt-20 pb-16">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
            for People
          </p>

          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl leading-[1.04]">
            Education, Privacy Protection &amp; ad Network
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-700">
            Ads should feel respectful, honest, and useful — not creepy. This is
            where we put people first: education, clarity, control, and with our
            own sites.
          </p>
        </div>
      </section>

      {/* Services Stack */}
      <section className="px-4 pb-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          {/* Education */}
          <Link
            href="/for-people/education"
            className="group block rounded-[2rem] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5"
          >
            <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div className="overflow-hidden rounded-[1.5rem] bg-[#f7f4ee] aspect-[4/3]">
                <Image
                  src="/images/EducationWallpaper.png"
                  alt="Education about digital media and advertising"
                  width={800}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
                  Learn
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl leading-[1.08]">
                  Education
                </h2>
                <p className="mt-5 text-base leading-8 text-neutral-700">
                  Check out our blog providing information and a look under the
                  curtain of the ad industry.
                </p>
              </div>
            </div>
          </Link>

          {/* Privacy Protection */}
          <Link
            href="/for-people/privacy-protection"
            className="group block rounded-[2rem] bg-[#fff7ed] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5"
          >
            <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div className="max-w-2xl md:order-1">
                <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
                  Protect
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl leading-[1.08]">
                  Privacy Protection
                </h2>
                <p className="mt-5 text-base leading-8 text-neutral-700">
                  You purchase something, upload your receipt, make a search,
                  heck just walk around – everyone is grabbing your data somehow.
                  Learn the who, how, where, and why in the Education section
                  above – but use this section to learn how to take action.
                  <br />
                  <br />
                  We provide free &amp; paid tools to try and block as much data
                  scraping as possible or give you the power to be able to choose
                  the ads you want to see.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] bg-white aspect-[4/3] md:order-2">
                <Image
                  src="/images/PrivacyProtectionWallpaper.png"
                  alt="Privacy and data protection illustration"
                  width={800}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </Link>

          {/* ad Network */}
          <Link
            href="/for-people/ad-network"
            className="group block rounded-[2rem] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5"
          >
            <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div className="overflow-hidden rounded-[1.5rem] bg-[#f7f4ee] aspect-[4/3]">
                <Image
                  src="/images/adNetworkWallpaper.png"
                  alt="Network of ethical advertising sites"
                  width={800}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
                  Browse
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl leading-[1.08]">
                  ad Network
                </h2>
                <p className="mt-5 text-base leading-8 text-neutral-700">
                  We build, own, and operate a family of websites that fill every
                  day needs. From step counters, to calculators, to tips &amp;
                  tricks blogs. We place ads on these sites to give us some
                  revenue, nothing new, but a portion of each ad supports a cause
                  for Good.
                  <br />
                  <br />
                  So, if you&apos;re going to scroll the web anyways – scroll
                  with us.
                </p>
              </div>
            </div>
          </Link>

          {/* Own a Business */}
          <Link
            href="/for-businesses"
            className="group block rounded-[2rem] bg-[#24364D] p-6 text-white shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5"
          >
            <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div className="max-w-2xl md:order-1">
                <p className="text-xs uppercase tracking-[0.18em] text-orange-300">
                  Next Step
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl leading-[1.08]">
                  Own a Business?
                </h2>
                <p className="mt-5 text-base leading-8 text-white/80">
                  As a consumer, this page is for you. But, if you own a business
                  – check out our for Businesses page.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] bg-white/10 aspect-[4/3] md:order-2">
                <Image
                  src="/images/OwnaBusinessWallpaper.png"
                  alt="Local businesses and marketing illustration"
                  width={500}
                  height={500}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}