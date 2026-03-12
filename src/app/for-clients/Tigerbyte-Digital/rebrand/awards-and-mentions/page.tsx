import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";

const mentions = [
  {
    title: "AdTech Industry Recognition",
    description:
      "Tigerbyte Digital’s publisher monetization framework was highlighted as a practical strategy for independent publishers looking to increase programmatic revenue.",
    organization: "AdTech Weekly",
    year: "2024",
    href: "#",
  },
  {
    title: "Publisher Revenue Optimization Feature",
    description:
      "Tigerbyte Digital’s work helping publishers improve advertising yield and demand competition was featured in a digital publishing industry roundup.",
    organization: "Digital Publishing Today",
    year: "2023",
    href: "#",
  },
  {
    title: "Programmatic Strategy Recognition",
    description:
      "Industry analysts referenced Tigerbyte Digital’s monetization strategy approach when discussing revenue optimization for independent publishers.",
    organization: "Programmatic Insider",
    year: "2023",
    href: "#",
  },
  {
    title: "Publisher Growth Case Mention",
    description:
      "A client case study highlighting Tigerbyte Digital’s monetization improvements was cited as an example of effective programmatic revenue strategy.",
    organization: "Media Growth Report",
    year: "2022",
    href: "#",
  },
  {
    title: "Ad Operations Excellence Mention",
    description:
      "Tigerbyte Digital’s operational expertise supporting publisher ad stacks and campaign delivery was recognized in an industry discussion on publisher operations.",
    organization: "AdOps Digest",
    year: "2022",
    href: "#",
  },
  {
    title: "Programmatic Revenue Innovation",
    description:
      "Tigerbyte Digital’s approach to combining ad operations, monetization strategy, and traffic growth was cited in a broader industry discussion on publisher revenue models.",
    organization: "AdTech Review",
    year: "2021",
    href: "#",
  },
];

export default function AwardsMentionsPage() {
  return (
    <main>
      <Header />

      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">

            {/* LEFT CONTENT */}
            <div>

              <h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Industry Recognition & Media Mentions
              </h1>

              <p className="mt-5 max-w-[75ch] text-base md:text-lg text-neutral-700 leading-relaxed">
                Tigerbyte Digital’s work helping publishers improve advertising
                revenue, ad operations, and monetization strategy has been
                recognized across industry publications, publisher networks, and
                digital media communities.
              </p>

              <div className="mt-10 grid gap-6 md:grid-cols-2">

                {mentions.map((item) => (
                  <article
                    key={item.title}
                    className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
                  >

                    {/* Logo placeholder */}
                    <div
                      className="h-44 border-b border-neutral-200 flex items-center justify-center text-sm text-neutral-500"
                      style={{ backgroundColor: "var(--tb-light)" }}
                    >
                      {item.organization} Logo
                    </div>

                    <div className="p-6">

                      <div className="flex items-start justify-between gap-4">

                        <h2
                          className="text-xl font-black leading-tight"
                          style={{ color: "var(--tb-dark)" }}
                        >
                          {item.title}
                        </h2>

                        <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
                          {item.year}
                        </span>

                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                        {item.description}
                      </p>

                      <div className="mt-6 flex items-center justify-between">

                        <span className="text-xs text-neutral-500">
                          {item.organization}
                        </span>

                        <Link
                          href={item.href}
                          className="text-sm font-semibold transition hover:opacity-80"
                          style={{ color: "var(--tb-orange)" }}
                        >
                          View mention →
                        </Link>

                      </div>

                    </div>
                  </article>
                ))}

              </div>
            </div>

            {/* RIGHT RAIL */}
            <aside className="space-y-6 lg:sticky lg:top-28 self-start">

              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">

                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--tb-dark)" }}
                >
                  What this page highlights
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  Industry recognition, media mentions, and professional
                  acknowledgements of Tigerbyte Digital’s work helping publishers
                  improve monetization strategy, advertising infrastructure, and
                  revenue optimization.
                </p>

              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">

                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--tb-dark)" }}
                >
                  Types of recognition
                </h3>

                <ul className="mt-4 space-y-2 text-sm text-neutral-700">
                  <li>Industry publication features</li>
                  <li>AdTech ecosystem mentions</li>
                  <li>Publisher case references</li>
                  <li>Media and analyst coverage</li>
                </ul>

              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">

                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--tb-dark)" }}
                >
                  Work with Tigerbyte Digital
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  If you operate a content site, publisher network, or media
                  platform and want to strengthen your advertising revenue
                  strategy, Tigerbyte Digital can help.
                </p>

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="mt-4 inline-block text-sm font-semibold"
                  style={{ color: "var(--tb-orange)" }}
                >
                  Schedule a consultation →
                </Link>

              </div>

            </aside>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}