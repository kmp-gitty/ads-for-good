import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function GoogleAdManagerPage() {
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
                Google Ad Manager Consulting (GAM)
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Google Ad Manager gives publishers more control over ad inventory,
                demand sources, reporting, and monetization strategy. For
                publishers outgrowing AdSense, it is often the next step toward a
                more scalable revenue operation.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps publishers implement, optimize, and manage
                Google Ad Manager so they can improve yield, reduce inefficiencies,
                and build a stronger monetization foundation.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request GAM Audit
                </Link>

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/services"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  View Services
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3
                className="text-xl font-bold"
                style={{ color: "var(--tb-dark)" }}
              >
                Why publishers move to Google Ad Manager
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• More control over inventory and placements</li>
                <li>• Ability to work with multiple demand sources</li>
                <li>• Better reporting and revenue visibility</li>
                <li>• Support for direct deals and more complex setups</li>
                <li>• A stronger long-term monetization foundation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS GAM */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What Is Google Ad Manager?
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Google Ad Manager is an ad management platform designed for publishers
            who need more than a simple plug-and-play ad network. It allows you
            to manage inventory, configure ad delivery rules, work with multiple
            demand sources, and analyze monetization performance at a deeper
            level.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            Unlike AdSense, which is focused on automation and ease of setup,
            Google Ad Manager is built for publishers who want more flexibility,
            greater operational control, and a more advanced monetization stack.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Inventory Control",
                body: "Manage ad units, placements, pricing rules, and delivery logic in a more structured way.",
              },
              {
                title: "Multiple Demand Sources",
                body: "Support AdSense, Ad Exchange, direct deals, and third-party demand partners within one platform.",
              },
              {
                title: "Granular Reporting",
                body: "Analyze monetization performance with deeper reporting than most entry-level ad solutions provide.",
              },
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

      {/* GAM VS ADSENSE */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Google Ad Manager vs AdSense
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Publishers often ask whether Google Ad Manager is simply a “better”
            version of AdSense. It is not. They are different products built for
            different needs.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3
                className="text-2xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                AdSense
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Best for publishers who want more automation</li>
                <li>• Faster to implement</li>
                <li>• Simpler reporting and setup</li>
                <li>• Ideal for smaller teams and newer sites</li>
                <li>• Google largely optimizes inventory for you</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3
                className="text-2xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                Google Ad Manager
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Best for publishers who want more control</li>
                <li>• Supports multiple demand sources and direct deals</li>
                <li>• More complex reporting and operational flexibility</li>
                <li>• Better suited for larger or more advanced publishers</li>
                <li>• Lets you actively manage and optimize inventory strategy</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h3
              className="text-lg font-bold"
              style={{ color: "var(--tb-dark)" }}
            >
              When should a publisher move from AdSense to Google Ad Manager?
            </h3>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Usually when monetization becomes important enough that automation
              alone is not enough. If you want deeper reporting, multiple demand
              sources, cleaner inventory management, or more revenue control,
              Google Ad Manager may be the right next step.
            </p>
          </div>
        </div>
      </section>

      {/* WHO GAM IS FOR */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Who Is Google Ad Manager Best For?
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              "Publishers outgrowing AdSense",
              "Sites with meaningful traffic and monetization potential",
              "Teams that want more control over ad operations",
              "Publishers managing direct deals or multiple demand partners",
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
            Google Ad Manager is especially useful for publishers who have moved
            past basic monetization and are ready to build a more professional,
            data-driven ad revenue operation.
          </p>
        </div>
      </section>

      {/* COMMON GAM CHALLENGES */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Common Google Ad Manager Challenges
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Complex Setup",
                body: "Google Ad Manager offers much more control, but that also means more complexity in ad units, placements, pricing rules, and reporting.",
              },
              {
                title: "Revenue Inefficiencies",
                body: "A poorly configured setup can reduce yield, limit competition, and create avoidable performance issues.",
              },
              {
                title: "Operational Burden",
                body: "Publishers often need help managing trafficking, inventory hygiene, troubleshooting, and reporting workflows.",
              },
              {
                title: "No Clear Monetization Strategy",
                body: "Moving to Google Ad Manager is not enough on its own. Publishers also need a strategy for placements, demand, reporting, and ongoing optimization.",
              },
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
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Tigerbyte Digital Helps with Google Ad Manager
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            We help publishers use Google Ad Manager effectively, whether they
            are launching it for the first time or trying to improve an existing
            setup.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Implementation Guidance",
                body: "Support for ad unit structure, inventory setup, placements, and monetization architecture.",
              },
              {
                title: "Optimization Strategy",
                body: "Improve revenue through stronger demand competition, cleaner reporting, and better monetization decisions.",
              },
              {
                title: "Ongoing Ad Operations",
                body: "Hands-on support for troubleshooting, trafficking, reporting, and the day-to-day realities of ad monetization.",
              },
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

      {/* FAQS */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Frequently Asked Questions About Google Ad Manager
          </h2>

          <div className="mt-10 space-y-6">
            {[
              {
                q: "Is Google Ad Manager better than AdSense?",
                a: "Not automatically. It gives publishers more control and flexibility, but it also requires more setup, strategy, and operations to use effectively.",
              },
              {
                q: "Can I use AdSense and Google Ad Manager together?",
                a: "Yes. Many publishers use AdSense alongside Google Ad Manager as part of a broader monetization setup.",
              },
              {
                q: "Who should use Google Ad Manager?",
                a: "Publishers with growing traffic, more complex monetization goals, or a need for more control over inventory and reporting.",
              },
              {
                q: "Is Google Ad Manager only for large publishers?",
                a: "It is often best suited for more advanced publishers, but smaller publishers can also benefit when they are ready for a more robust monetization stack.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-lg font-bold text-black">{item.q}</h3>
                <p className="mt-3 text-sm text-neutral-700">{item.a}</p>
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

      {/* FINAL CTA */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16 text-center">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Ready for More Control Than AdSense?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            If your site is growing and you need stronger monetization tools,
            better reporting, and more revenue flexibility, Tigerbyte Digital can
            help you get started with Google Ad Manager the right way.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Talk to a GAM Expert
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}