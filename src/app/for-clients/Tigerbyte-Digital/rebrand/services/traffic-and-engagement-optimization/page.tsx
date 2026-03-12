import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function TrafficEngagementOptimizationPage() {
  return (
    <main>
      <Header />

      {/* HERO */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-2">

            <div>
              <h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Publisher SEO & User Experience Optimization
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Traffic and engagement are the foundation of website
                monetization. Even the best ad stack cannot perform well if
                content is hard to discover, users bounce quickly, or pages are
                not optimized for reader engagement.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital combines search engine optimization (SEO)
                with user experience improvements to help publishers attract
                more qualified traffic, increase session depth, and create
                stronger monetization opportunities.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request SEO & UX Audit
                </Link>

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/services"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  View Monetization Services
                </Link>

              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3
                className="text-xl font-bold"
                style={{ color: "var(--tb-dark)" }}
              >
                What this service improves
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Organic search visibility</li>
                <li>• Content discoverability</li>
                <li>• Reader engagement and time on page</li>
                <li>• Session depth and pageviews</li>
                <li>• Monetizable user interactions</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* WHY SEO + UX MATTER */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Why Traffic and Engagement Matter for Publishers & Content Sites
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Many publishers invest heavily in monetization technology but miss
            the opportunity to improve the foundation that drives revenue:
            traffic quality and reader engagement.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            Strong search visibility and user experience improvements help
            publishers increase session depth, pageviews per visitor, and the
            total value generated from each reader.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">

            {[
              {
                title: "More Organic Traffic",
                body: "SEO improvements increase the discoverability of content across search engines."
              },
              {
                title: "Higher Engagement",
                body: "Better layout and content structure encourage readers to stay longer and explore more pages."
              },
              {
                title: "More Monetization Opportunities",
                body: "Increased pageviews and engagement naturally create more ad impressions and revenue potential."
              }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-lg font-bold text-black">{item.title}</h3>
                <p className="mt-3 text-sm text-neutral-700">{item.body}</p>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* COMMON PUBLISHER CHALLENGES */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Common SEO and Engagement Challenges for Publishers
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            {[
              {
                title: "Content Is Hard to Discover",
                body: "Great articles often remain buried because internal linking, category structure, or SEO foundations are weak."
              },
              {
                title: "High Bounce Rates",
                body: "Visitors leave quickly when content layout, readability, or navigation makes it difficult to explore more pages."
              },
              {
                title: "Low Session Depth",
                body: "Without proper content architecture and internal linking, readers may only view a single page."
              },
              {
                title: "Misaligned Page Layout",
                body: "Pages designed without UX consideration can reduce engagement and ultimately hurt monetization potential."
              }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-lg font-bold text-black">{item.title}</h3>
                <p className="mt-3 text-sm text-neutral-700">{item.body}</p>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* WHAT WE AUDIT */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What We Analyze in a Traffic & Engagement Audit
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">

            {[
              "Content discoverability",
              "Internal linking structure",
              "Navigation and site architecture",
              "Page layout and readability",
              "Content taxonomy and categories",
              "Search intent alignment",
              "Content engagement signals",
              "Page performance and speed",
              "User journey across content pages"
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <p className="font-medium text-neutral-800">{item}</p>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* WHAT WE IMPROVE */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What We Improve
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-4">

            {[
              {
                title: "SEO Foundations",
                body: "Improve technical SEO, content optimization, and search visibility."
              },
              {
                title: "Content Structure",
                body: "Enhance readability and content flow to keep readers engaged."
              },
              {
                title: "Internal Linking",
                body: "Strengthen site structure so content supports long-term organic growth."
              },
              {
                title: "Reader Experience",
                body: "Optimize layout and navigation to increase pageviews and engagement."
              }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-lg font-bold text-black">{item.title}</h3>
                <p className="mt-3 text-sm text-neutral-700">{item.body}</p>
              </div>
            ))}

          </div>

        </div>
      </section>

      {/* TESTIMONIALS */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-14">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight text-center"
            style={{ color: "var(--tb-dark)" }}
          >
            What Publishers Say
          </h2>

          <div className="mt-10">
            <TestimonialFlipStrip />
          </div>

        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16 text-center">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Ready to Grow Your Traffic and Reader Engagement?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            A strong monetization strategy starts with strong audience
            engagement. Our SEO and UX improvements help publishers increase
            organic visibility, session depth, and long-term revenue potential.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Request Traffic & Engagement Audit
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}