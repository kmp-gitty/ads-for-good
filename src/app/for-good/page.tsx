export const metadata = {
  title: "philanthropic impact | how ads for Good services are different",
  description:
    "Putting our money where our heart is. Using advertising revenue and profits for the betterment of our people and our communities.",
};

export default function ForGoodPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-20 pb-28">
      
      {/* HERO */}
      <section className="w-full max-w-3xl text-left">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-orange-500">
          for Good: How we use ads for Good
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-neutral-700">
          This is where Good over Greed and Profits over People come in. The goal of our company is to make money, sure, but also not be a**holes about it. We want a company that works for all of the people that help it run: employees and customers. We're tired of overworked people droning for their company, we want our company to work for our people.
        </p>
      </section>

      {/* CURRENT / FUTURE */}
      <section className="w-full max-w-5xl mt-20 grid gap-6 md:grid-cols-2">
        
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-orange-500">
            Current State
          </h2>
          <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
            10% - 20% of revenue is given away to:<br /><br />Partner local businesses, charity organizations, and community groups.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-orange-500">
            Future State
          </h2>
          <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
            Our staff, at one point in time, worked multiple jobs to stay afloat and had many nights eating packaged ramen. We've started with giving to official organizaitons, because it's easier. But, we're figuring out a way to give to individuals.
          </p>
        </div>

      </section>

      {/* WHERE WE'VE GIVEN */}
      <section className="w-full max-w-5xl mt-20">
  
  <h2 className="text-sm uppercase tracking-widest text-neutral-500 mb-6">
    Where we've given so far
  </h2>

  <div className="grid gap-6 md:grid-cols-3">
    
    {/* LEFT */}
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
      <h3 className="text-sm font-semibold text-orange-500">
        Our Start
      </h3>
      <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
        Our company started as an idea to give back to local businesses and schools. We tested the idea by partnering with Philadelphia-area businesses, whenever a sandwich shop, grocer, retail or other location completed a purchase - a sticker was given with an ad on it. We called it "Stickers for Schools", some money went to the partner business, some to local schools (shout out Sun Valley High School), and our business kept some.
      </p>
    </div>

    {/* MIDDLE */}
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
      <h3 className="text-sm font-semibold text-orange-500">
        What We Can Afford Right Now
      </h3>
      <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
        Still a growing company, so we're not yet in full-force, but for the clients we work with our free month of service and no-payment-processing-passthrough policy - currently amounts to 10% of revenue given back to current clients.
      </p>
    </div>

    {/* RIGHT */}
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
      <h3 className="text-sm font-semibold text-orange-500">
        What's Next
      </h3>
      <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
        As business picks up and there's more than "keep the lights on" dollars in the bank, organizations we're connected to and plan to give to include:<br /><br />
        Small Things Philly<br />
        The Phoenix Philly<br />
        Hawaiian Humane Society <br />
      </p>
    </div>

  </div>
</section>

    </main>
  );
}