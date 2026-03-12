import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";

const articles = [
  {
    title: "What Is Website Monetization?",
    description:
      "A practical introduction to how publishers turn traffic into revenue through ads, affiliate models, and broader monetization strategy.",
    category: "Getting Started",
    href: "#",
  },
  {
    title: "Google AdSense Basics for Publishers",
    description:
      "Understand when AdSense makes sense, how it works, and what early-stage publishers should know before getting started.",
    category: "AdSense",
    href: "#",
  },
  {
    title: "When to Upgrade from AdSense",
    description:
      "A guide to knowing when your site may be ready for Google Ad Manager, stronger demand competition, or more advanced monetization.",
    category: "Growth",
    href: "#",
  },
  {
    title: "What Is Header Bidding?",
    description:
      "Learn how header bidding works, why it matters, and how publishers use it to increase auction pressure and improve yield.",
    category: "Programmatic",
    href: "#",
  },
  {
    title: "Ad Operations Explained",
    description:
      "A simple overview of ad trafficking, reporting, troubleshooting, and campaign delivery for independent publishers.",
    category: "Ad Operations",
    href: "#",
  },
  {
    title: "SEO and UX for Publishers",
    description:
      "How search visibility and stronger user experience increase engagement, pageviews, and long-term monetization potential.",
    category: "Traffic & Engagement",
    href: "#",
  },
];

export default function CaseStudiesPage() {
  return (
    <main>
      <Header />

      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            {/* Left main column */}
            <div>
              <h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Tigerbyte Digital Case Studies
              </h1>

              <p className="mt-5 max-w-[75ch] text-base md:text-lg text-neutral-700 leading-relaxed">
                Delivery optimization, layout improvements, ad operation tasks, and beyond - find the good work we do with our many happy clients here.
              </p>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {articles.map((article) => (
                  <article
                    key={article.title}
                    className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
                  >
                    {/* Thumbnail placeholder */}
                    <div
                      className="h-52 border-b border-neutral-200"
                      style={{ backgroundColor: "var(--tb-light)" }}
                    />

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <h2
                          className="text-2xl font-black leading-tight"
                          style={{ color: "var(--tb-dark)" }}
                        >
                          {article.title}
                        </h2>

                        <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
                          {article.category}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                        {article.description}
                      </p>

                      <div className="mt-6 flex items-center justify-between gap-4">
                        <Link
                          href={article.href}
                          className="text-sm font-semibold transition hover:opacity-80"
                          style={{ color: "var(--tb-orange)" }}
                        >
                          Read article →
                        </Link>

                        <Link
                          href={article.href}
                          className="text-sm text-black transition hover:opacity-80"
                        >
                          Open resource ↑
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Right info rail */}
            <aside className="space-y-6 lg:sticky lg:top-28 self-start">
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--tb-dark)" }}
                >
                  What you’ll find here
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  Guides, explainers, and practical resources around website
                  monetization, AdSense, Google Ad Manager, header bidding, ad
                  operations, and publisher growth.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--tb-dark)" }}
                >
                  How to use these resources
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  Start with foundational topics if you’re newer to monetization,
                  then move into operational and revenue optimization topics as
                  your site grows.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3
                    className="text-xl font-black"
                    style={{ color: "var(--tb-dark)" }}
                  >
                    Topic groups
                  </h3>
                  <span className="text-xs text-neutral-500">
                    Filters later
                  </span>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-neutral-700">
                  <li>Website Monetization</li>
                  <li>AdSense</li>
                  <li>Google Ad Manager</li>
                  <li>Header Bidding</li>
                  <li>Ad Operations</li>
                  <li>Traffic & Engagement</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}