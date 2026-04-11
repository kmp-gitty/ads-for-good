import Link from "next/link";

export const metadata = {
  title: "about ads for Good | Ad tactics and information with people in mind",
  description:
    "Former corporate ad pros using their knowledge to make ads less creepy, and use advertising for community impact instead of just profit.",
};

export default function AboutPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-20 pb-28">
      
      {/* HERO */}
      <section className="w-full max-w-3xl text-left">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-orange-500">
          About Us.
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-neutral-700">
          Our team has been working in the advertising industry for over a decade. We've worked for agencies that employ 8,000 people, ones that employ 40 people, and all inbetween. We've worked for large brands like Adobe, Chevron, Williams Sonoma, Pottery Barn, etc. We've also worked for ad networks and social channels like Yelp, Kargo, and Meta.
          <br /><br />
          Across our time working for these large companies, a few things nagged at us: <br />
          -How much information these companies have on people is scary. <br />
          -How these companies operate is a mystery to anyone that isn't in the industry. <br />
          -How there's such a focus on profit, the advertising world would step over a person to pickup a nickel. <br />
          <br />
          So, we quit our corporate jobs and started our own thing. Advertising is what we know, and we want to use it for as much good as possible.
        </p>
      </section>

      {/* FOR PEOPLE / BUSINESSES */}
      <section className="w-full max-w-5xl mt-20 grid gap-6 md:grid-cols-2">
        
        <Link
          href="/for-people"
          className="group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-orange-200 hover:bg-orange-50"
        >
          <h2 className="text-lg font-semibold text-orange-500">
            for People
          </h2>
          <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
            The aim is to educate and protect. Provide information on how the ad world works and 
            give you tools &amp; tips to either: protect your information or make the ads you see 
            more relevant.
          </p>
        </Link>

        <Link
          href="/for-businesses"
          className="group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-orange-200 hover:bg-orange-50"
        >
          <h2 className="text-lg font-semibold text-orange-500">
            for Businesses
          </h2>
          <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
            The aim is to take the "big company" learnings and make it relevant for small and medium businesses. 
            Not everything will apply, but we want to give you the information to better your business while 
            also thinking more of your customers.
          </p>
        </Link>
      </section>

      {/* FOR GOOD */}
      <Link
        href="/for-good"
        className="block w-full max-w-5xl mt-16 rounded-3xl border border-orange-200 bg-orange-50 px-8 py-10 transition hover:bg-orange-100"
      >
        <h2 className="text-lg font-semibold text-orange-500">
          What does 'for Good' really mean?
        </h2>
        <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
          Not using scummy or scammy ad tactics. Giving people knowledge and control of their data. 
          And most of all: giving away money. A portion of every dollar in goes out to charities 
          and local communities.
        </p>
      </Link>

      {/* VALUES SECTION */}
      <section className="w-full max-w-6xl mt-24">
        
        <h2 className="text-sm uppercase tracking-widest text-neutral-500 mb-10">
          Our Values
        </h2>

        <div className="space-y-16">
          
          {/* Value 1 */}
          <div className="max-w-2xl">
            <h3 className="text-4xl italic font-semibold text-orange-500">
              Give A Sh*t
            </h3>
            <p className="mt-4 text-neutral-700 leading-relaxed">
              About the environment, one another, yourself. We should all care about how our words and actions affect the people around us, even if we don't know them personally. Especially so through your business, when it can impact someone's feelings and wallet.
            </p>
          </div>

          {/* Value 2 */}
          <div className="max-w-2xl ml-auto">
            <h3 className="text-4xl italic font-semibold text-orange-500">
              Work to Live, not Live to Work
            </h3>
            <p className="mt-4 text-neutral-700 leading-relaxed">
              Can't do much without money, but that's not the most important thing. We prefer walking our dogs, going to the gym, or spending a day with our families instead of sitting at our desk for hours on end. Our work is there to help enjoy life, not become it. We've got a healthy balance.
            </p>
          </div>

          {/* Value 3 */}
          <div className="max-w-2xl">
            <h3 className="text-4xl italic font-semibold text-orange-500">
              It Must Work
            </h3>
            <p className="mt-4 text-neutral-700 leading-relaxed">
              Whatever "it" is. Our recommendations, actions, campaigns, technology, etc... all must provide our clients value and work for them. Otherwise, what's the dang point? If we're not delivering for you, we expect you to leave and go find someone that does.
            </p>
          </div>

        </div>
      </section>

    </main>
  );
}