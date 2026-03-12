import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function AdSensePublishersClientPage() {
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
                Monetization Growth for AdSense Publishers
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                AdSense is often the first real monetization step for publishers.
                It is simple, trusted, and easy to launch. But many publishers
                eventually hit a ceiling and start asking the next question:
                how do I increase revenue beyond AdSense alone?
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps AdSense publishers improve RPM, optimize
                layouts, strengthen user experience, and understand when it
                makes sense to expand into more advanced monetization strategies.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request AdSense Review
                </Link>

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/services/adsense"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  Learn About AdSense
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold" style={{ color: "var(--tb-dark)" }}>
                Common goals for AdSense publishers
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Increase AdSense RPM</li>
                <li>• Improve ad placement without hurting UX</li>
                <li>• Understand whether AdSense is still the right fit</li>
                <li>• Explore alternatives or next-step monetization paths</li>
                <li>• Build a stronger long-term revenue strategy</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT HAPPENS AFTER ADSENSE */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What Happens After You Start Using AdSense?
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            For many publishers, AdSense is the easiest way to begin monetizing
            website traffic. But once ads are live, the questions change. Site
            owners start wondering whether their layout is optimized, whether
            they are earning as much as they should be, and whether a more
            advanced monetization setup could perform better.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "AdSense works — but feels limited",
                body: "Many publishers appreciate AdSense’s simplicity, but feel they may be leaving revenue on the table."
              },
              {
                title: "Traffic grows faster than monetization",
                body: "As sessions increase, revenue does not always scale proportionally without optimization."
              },
              {
                title: "The next step becomes unclear",
                body: "Publishers often need help deciding whether to improve AdSense, add partners, or move into a broader stack."
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

      {/* SIGNS YOU MAY HAVE OUTGROWN ADSENSE */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Signs You May Have Outgrown a Basic AdSense Setup
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              "You have steady traffic but RPM feels low",
              "You want better reporting and visibility into performance",
              "You are experimenting with more premium ad placements",
              "You want more control over monetization strategy"
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <p className="font-medium text-neutral-800">{item}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-[80ch] text-neutral-700">
            Not every publisher needs to move beyond AdSense immediately. But
            many growing sites benefit from understanding where AdSense fits in
            a broader monetization roadmap.
          </p>
        </div>
      </section>

      {/* COMMON CHALLENGES */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Common Challenges for AdSense Publishers
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Low RPM or flat revenue",
                body: "Traffic may be growing, but revenue stays inconsistent or underwhelming without optimization."
              },
              {
                title: "Weak ad layout strategy",
                body: "Ads may be technically live, but poorly positioned for attention, engagement, or long-term UX."
              },
              {
                title: "No clear performance roadmap",
                body: "Many publishers do not know what to change first to improve monetization results."
              },
              {
                title: "Questions about alternatives",
                body: "As sites grow, publishers often want to know when to consider Google Ad Manager, header bidding, or other monetization paths."
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

      {/* HOW TIGERBYTE HELPS */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Tigerbyte Digital Helps AdSense Publishers
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              {
                title: "AdSense Optimization",
                body: "Improve layout, placements, and monetization strategy to increase revenue from your existing setup."
              },
              {
                title: "Traffic & Engagement Improvements",
                body: "Strengthen SEO and user experience so more of your traffic becomes monetizable."
              },
              {
                title: "Monetization Roadmapping",
                body: "Understand when to continue with AdSense and when to expand into more advanced monetization."
              },
              {
                title: "Independent Guidance",
                body: "Get a transparent partner who helps you evaluate the next step without locking you into a black-box platform."
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

      {/* ADSENSE VS NEXT STEP */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            AdSense vs Your Next Monetization Step
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3
                className="text-2xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                Keep Improving AdSense
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Best for publishers still growing traffic</li>
                <li>• Strong fit for simpler setups</li>
                <li>• Good when layout and UX still need work</li>
                <li>• Often the best short-term path for early-stage sites</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3
                className="text-2xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                Expand Beyond AdSense
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Best for more established publishers</li>
                <li>• Useful when traffic and revenue scale justify complexity</li>
                <li>• Opens the door to more demand sources and control</li>
                <li>• Can support stronger long-term monetization strategy</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
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
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16 text-center">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Want to Grow Beyond Basic AdSense?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            If you already run AdSense and want to improve revenue, user
            experience, and your long-term monetization strategy, Tigerbyte
            Digital can help you find the right next step.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Request AdSense Review
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}