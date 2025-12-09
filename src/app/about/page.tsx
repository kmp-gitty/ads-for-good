import Link from "next/link";

export default function AboutPage() {
    return (
      <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
        {/* Hero / Intro */}
        <section className="w-full max-w-4xl text-left">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
            About Us.
          </h1>
          <p className="mt-5 text-lg text-neutral-700">
            {/* Replace this with your real story later */}
            Our team has been working in the advertising industry for over a decade. We've worked for agencies that employ 8,000 people, ones that employ 40 people, and all inbetween. We've worked for large brands like Adobe, Chevron, Williams Sonoma, Pottery Barn, etc. We've also worked for ad networks and social channels like Yelp, Kargo, and Meta.<br />
            <br />
            Across our time working for these large companies, a few things nagged at us: <br />
            -How much information these companies have on people is scary. <br />
            -How these companies operate is a mystery to anyone that isn't in the industry. <br />
            -How there's such a focus on profit, the advertising world would step over a person to pickup a nickel. <br />
            <br />
            So, we quit our corporate jobs and started our own thing. Advertising is what we know, and we want to use it for as much good as possble.
          </p>
        </section>
  
        {/* Two-column style content */}
        <section className="w-full max-w-5xl mt-16 grid gap-10 md:grid-cols-2">
        <Link
  href="/for-people"
  className="block rounded-xl p-4 transition hover:bg-orange-50"
>
  <h2 className="text-xl font-semibold text-orange-500">
    for People
  </h2>
  <p className="mt-4 text-sm text-neutral-800">
    The aim is to educate and protect. Provide information on how the ad world works and 
    give you tools &amp; tips to either: protect your information or make the ads you see 
    more relevant.
  </p>
</Link>

  
          <Link
  href="/for-businesses"
  className="block rounded-xl p-4 transition hover:bg-orange-50"
>
  <h2 className="text-xl font-semibold text-orange-500">
    for Businesses
  </h2>
  <p className="mt-4 text-sm text-neutral-800">
    The aim is to take the "big company" learnings and make it relevant for small and medium businesses. 
    Not everything will apply, but we want to give you the information to better your business while 
    also thinking more of your customers.
  </p>
</Link>
</section>
  
        {/* Highlight band */}
        <Link
  href="/for-good"
  className="block w-full max-w-5xl mt-16 rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8 transition hover:bg-orange-100"
>
  <h2 className="text-lg font-semibold text-orange-500">
    What does 'for Good' really mean?
  </h2>
  <p className="mt-3 text-sm text-neutral-800">
    Not using scummy or scammy ad tactics. Giving people knowledge and control of their data. 
    And most of all: giving away money. A portion of every dollar in goes out to charities 
    and local communities.
  </p>
</Link>

      </main>
    );
  }
  