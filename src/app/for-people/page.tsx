import Link from "next/link";
import Image from "next/image";

export const metadata = {
    title: "consumer services | education, privacy information, and a for good ad network",
    description:
      "The ad industry impacts every day consumers, so why shouldn't you know more about it? Use our education blog, privacy protection services, or ad network to be a more conscious ad consumer.",
  };

export default function ForPeoplePage() {
  return (
    <main className="bg-white text-neutral-900">
      {/* Title / Hero Section */}
      <section className="flex items-center justify-center px-4 pt-16 pb-20">
        <div className="w-full max-w-5xl text-left">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-orange-500">
            for People: Education, Privacy Protection & ad Network
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            Ads should feel respectful, honest, and useful — not creepy. This is where we put
            people first: education, clarity, control, and with our own sites.
          </p>
        </div>
      </section>

      {/* Section 1 – Education (Image Left, Text Right) */}
      <Link href="/for-people/education" className="block w-full bg-orange-50">
        <section className="w-full">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center transition hover:bg-orange-100">
            {/* Media */}
            <div className="flex-1 rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden h-40">
              <Image
                src="/images/EducationWallpaper.png"
                alt="Education about digital media and advertising"
                width={800}
                height={600}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Text */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">
                Education
              </h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                Check out our blog providing information and a look under the curtain of the ad
                industry.
              </p>
            </div>
          </div>
        </section>
      </Link>

      {/* Section 2 – Privacy Protection (Text Left, Image Right) */}
      <Link href="/for-people/privacy-protection" className="block w-full bg-white">
        <section className="w-full">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center transition hover:bg-orange-100">
            {/* Text */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">
                Privacy Protection
              </h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                You purchase something, upload your receipt, make a search, heck just walk around –
                everyone is grabbing your data somehow. Learn the who, how, where, and why in the
                Education section above – but use this section to learn how to take action.
                <br />
                <br />
                We provide free &amp; paid tools to try and block as much data scraping as possible
                or give you the power to be able to choose the ads you want to see.
              </p>
            </div>

            {/* Media */}
            <div className="flex-1 rounded-3xl border border-neutral-900 bg-white shadow-sm overflow-hidden h-40">
              <Image
                src="/images/PrivacyProtectionWallpaper.png"
                alt="Privacy and data protection illustration"
                width={800}
                height={600}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
      </Link>

      {/* Section 3 – ad Network (Image Left, Text Right) */}
      <Link href="/for-people/ad-network" className="block w-full bg-orange-50">
        <section className="w-full">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center transition hover:bg-orange-100">
            {/* Media */}
            <div className="flex-1 rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden h-40">
              <Image
                src="/images/adNetworkWallpaper.png"
                alt="Network of ethical advertising sites"
                width={800}
                height={600}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Text */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">
                ad Network
              </h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                We build, own, and operate a family of websites that fill every day needs. From step
                counters, to calculators, to tips &amp; tricks blogs. We place ads on these sites to
                give us some revenue, nothing new, but a portion of each ad supports a cause for
                Good.
                <br />
                <br />
                So, if you&apos;re going to scroll the web anyways – scroll with us.
              </p>
            </div>
          </div>
        </section>
      </Link>

      {/* Section 4 – Own a Business? (Text Left, Image Right) */}
      <Link href="/for-businesses" className="block w-full bg-white">
        <section className="w-full pb-24">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center transition hover:bg-orange-100">
            {/* Text */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">
                Own a Business?
              </h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                As a consumer, this page is for you. But, if you own a business – check out our for
                Businesses page.
              </p>
            </div>

            {/* Media */}
            <div className="flex-1 rounded-3xl border border-neutral-900 bg-white shadow-sm overflow-hidden h-40">
              <Image
                src="/images/OwnaBusinessWallpaper.png"
                alt="Local businesses and marketing illustration"
                width={500}
                height={500}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
      </Link>
    </main>
  );
}


  