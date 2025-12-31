export const metadata = {
    title: "philanthropic impact | how ads for Good services are different",
    description:
      "Putting our money where our heart is. Using advertising revenue and profits for the betterment of our people and our communities.",
  };

export default function ForGoodPage() {
    return (
      <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
        {/* Hero / Intro */}
        <section className="w-full max-w-4xl text-left">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
            for Good: How we use ads for Good
          </h1>
          <p className="mt-5 text-lg text-neutral-700">
            This is where Good over Greed and Profits over People come in. The goal of our company is to make money, sure, but also not be a**holes about it. We want a company that works for all of the people that help it run: employees and customers. We're tired of overworked people droning for their company, we want our company to work for our people.
          </p>
        </section>
  
        {/* Two-column content */}
        <section className="w-full max-w-5xl mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-orange-500">
              Current State
            </h2>
            <p className="mt-4 text-sm text-neutral-800">
              Some situations, 50% of ad revenue is given away: to partner local businesses and charity organizations. In others, 20% of revenue from our services are given away to local community organizations.
            </p>
          </div>
  
          <div>
            <h2 className="text-xl font-semibold text-orange-500">
              Future State
            </h2>
            <p className="mt-4 text-sm text-neutral-800">
              A lot of our staff, at one point in time, worked multiple jobs to stay afloat and had many nights eating packaged ramen. We've started with giving to official organizaitons, because it's easier. But, we're figuring out a way to give to individuals. Need an extra buck for rent? Want to make your kids birthday more special? Need some help saving for a wedding? We want to help you too.<br />
              <br />
              We've also got a for Good tracker in the works, so we can easily share where and how many dollars were given. And, have an idea to allow our customers to be able to tell us where they want the revenue they generate to go.
            </p>
          </div>
        </section>
  
        {/* Highlight band */}
        <section className="w-full max-w-5xl mt-16 rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8">
          <h2 className="text-lg font-semibold text-orange-500">
            Where we've given so far
          </h2>
          <p className="mt-3 text-sm text-neutral-800">
            Our company started as an idea to give back to local businesses and local organizations. We tested the idea by partnering with Philadelphia-area businesses, whenever a sandwich shop, grocer, retail or other location completed a purchase - a sticker was given with an ad on it. We called it "Stickers for Schools", some money went to the partner business, some to local schools (shout out Sun Valley High School), and our business kept some. That test showed early interest from businesses and success for advertisers, and transformed into ads for Good.
          </p>
        </section>
      </main>
    );
  }
  