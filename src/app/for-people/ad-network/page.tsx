import Link from "next/link";

export const metadata = {
  title: "ads for Good network | websites that help in more ways than one",
  description:
    "Most ad networks just want you on their site to take your data and use you for company revenue. Our network aims to be useful and serve relevant ads that don't just take.",
};

export default function AdNetworkPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-20 pb-28">
      {/* Hero / Intro */}
      <section className="w-full max-w-3xl text-left">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-orange-500">
          ad Network: ads that give, not just take
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-700">
          We&apos;re people that get bored easily, use the web to search for and
          solve any problem, and want to change what people currently do
          - for Good.
        </p>
      </section>

      {/* Two-column content */}
      <section className="w-full max-w-5xl mt-20 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-orange-500">
            What our ad Network actually is
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            We build niche websites to keep our creative juices flowing. Things
            that people are searching for that fill a need. When people visit,
            we place ads, and the money we make goes to Good → <br />
            <br />
            We like to say: If you&apos;re going to scroll the internet, why not
            scroll with us?
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-orange-500">
            How it pays for Good
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            Firstly, we&apos;re not greedy. Our company should make just enough to
            continue operating and employing.<br />
            <br />
            Secondly, our people are most important. The company wouldn&apos;t be
            here or make money without them, the company makes money for them
            (not them making money for the company).<br />
            <br />
            Lastly, 20% of revenue is given away. The advertisers foot the bill,
            so its an easy option to pay it forward to charities &amp; communities
            around us.
          </p>
        </div>
      </section>

      {/* Highlight section */}
      <section className="w-full max-w-5xl mt-20">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
            <h3 className="text-sm font-semibold text-orange-500">
              Browse with purpose
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-800">
              Do you scroll the internet? Do so with us, and make your mundane search meaningful.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
            <h3 className="text-sm font-semibold text-orange-500">
              Our Network
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-800">
              Silly tools that help you solve everyday problems.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-orange-500">
                Take a Look
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-800">
                Sound interesting? If so, check it out.
              </p>
            </div>

            <Link
              href="/network"
              className="mt-6 inline-flex w-fit items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-orange-100"
            >
              View Network
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}