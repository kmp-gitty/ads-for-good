import Link from "next/link";

export default function AdNetworkPage() {
    return (
      <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
        {/* Hero / Intro */}
        <section className="w-full max-w-4xl text-left">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
            ad Network
          </h1>
          <p className="mt-5 text-lg text-neutral-700">
            We're people that get bored easily, use the web to search for and solve any problem, and want to change what people currently do already - for Good.
          </p>
        </section>
  
        {/* Two-column content */}
        <section className="w-full max-w-5xl mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-orange-500">
              What our ad Network actually is
            </h2>
            <p className="mt-4 text-sm text-neutral-800">
              We build niche websites to keep our creative juices flowing. Things that people are searching for that fill a need. When people visit, we place ads, and the money we make goes to Good → <br />
              <br />
              We like to say: If you're going to scroll the internet, why not scroll with us? 
            </p>
          </div>
  
          <div>
            <h2 className="text-xl font-semibold text-orange-500">
              How it pays for Good
            </h2>
            <p className="mt-4 text-sm text-neutral-800">
              Firstly, we're not greedy. Our company should make just enough to continue operating and employing.<br />
              <br />Secondly, our people are most important. The company wouldn't be here or make money without them, the company makes money for them (not them making money for the company).<br />
              <br />Lastly, 20% of revenue is given away. The advertisers foot the bill, so its an easy option to pay it forward to charities & communities around us.
            </p>
          </div>
        </section>
  
        {/* Highlight band */}
        <section className="w-full max-w-5xl mt-16 rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8">
          <h2 className="text-lg font-semibold text-orange-500">
            Do you scroll the internet?
          </h2>
          <Link
  href="/network"
  className="mt-3 block text-sm text-neutral-900 underline hover:text-orange-500 transition"
>
  If so, check-out our Network here.
</Link>

        </section>
      </main>
    );
  }
  