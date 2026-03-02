import Header from "../components/Header";
import Footer from "../components/Footer";
import TestimonialFlipStrip from "../components/TestimonialFlipStrip";
import Link from "next/link";

export default function ClientsAdSensePublishersPage() {
  return (
    <main>
      <Header />

      {/* Hero */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1
                className="text-4xl md:text-6xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Ready to level up from AdSense?
              </h1>
              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                AdSense is a great starting point: simple, dependable, and fast to
                implement. But as you grow, you’ll want more control, more demand,
                better performance tooling, and real human support.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Get Started
                </Link>
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/services"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  See Capabilities
                </Link>
              </div>
            </div>

            {/* Right: simple visual placeholder (swap to image anytime) */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="text-sm font-semibold text-neutral-500">
                What you get
              </div>
              <div
                className="mt-4 text-2xl md:text-3xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                More revenue, better UX, and less operational headache.
              </div>
              <div className="mt-6 grid gap-3 text-sm text-neutral-700">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  Faster testing cycles + clearer winners
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  Stronger demand + cleaner auction dynamics
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  A real partner, not a black box
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom-made section */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Built for AdSense Publishers
          </h2>
          <p className="mt-3 max-w-[72ch] text-neutral-700">
            A practical stack of optimization + operations that helps you increase
            yield without sacrificing user experience.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Automated layout testing",
                body: "Rapidly test layout variants and validate changes with a structured approach (instead of guesswork).",
              },
              {
                title: "Smart in-session refresh",
                body: "Serve refreshed impressions when it makes sense — while protecting viewability and inventory quality.",
              },
              {
                title: "Managed header bidding",
                body: "Add competition to your auction with a managed setup that fits your site and resources.",
              },
              {
                title: "Premium demand access (when applicable)",
                body: "Expand beyond a single source of demand to increase bid pressure and reduce volatility.",
              },
              {
                title: "High-UX ad formats",
                body: "Modern formats (sticky, in-content, native-style placements) to fight banner blindness and boost attention.",
              },
              {
                title: "Adblock recovery options",
                body: "Recover a portion of adblocked inventory with approaches that respect user choice and policy constraints.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (reuse your flip strip) */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-14">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight text-center"
            style={{ color: "var(--tb-dark)" }}
          >
            What publishers say
          </h2>
          <div className="mt-8">
            <TestimonialFlipStrip />
          </div>
        </div>
      </section>

      {/* Market leader / credibility block */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Credibility
              </div>
              <h2
                className="mt-3 text-3xl md:text-4xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Market leader in revenue optimization
              </h2>
              <p className="mt-4 text-neutral-700 leading-relaxed">
                We focus on sustainable lift — improving layout strategy, auction
                health, and operational execution so results compound over time.
              </p>

              <div className="mt-6">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  See Case Studies
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
              <h3 className="text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                Why publishers switch
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-neutral-700">
                <li>• More control over placements and strategy</li>
                <li>• Better experimentation + iteration cadence</li>
                <li>• Stronger auction dynamics through added demand</li>
                <li>• Real support when things break</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Keep more of your revenue */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2
                className="text-3xl md:text-4xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Keep more of your revenue
              </h2>
              <p className="mt-4 text-neutral-700 leading-relaxed">
                If you’re growing, the “default” setup often leaves money on the
                table. The goal is to increase total yield while protecting UX —
                so net revenue improves month after month.
              </p>

              <div className="mt-7 flex gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Get Started
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="text-sm font-semibold text-neutral-500">
                Typical outcomes
              </div>
              <div className="mt-4 grid gap-3 text-sm text-neutral-700">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  Better viewability + cleaner attention distribution
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  Improved auction competition / reduced inefficiencies
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  Safer testing roadmap with measurable lift
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Never feel stuck again (support section) */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Never feel stuck again
          </h2>
          <p className="mt-4 max-w-[80ch] text-neutral-700 leading-relaxed">
            When revenue dips or pages change, you shouldn’t have to troubleshoot
            alone. We provide hands-on support and a clear operating rhythm.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
              <h3 className="text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                Dedicated support
              </h3>
              <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
                Get an owner for your account — onboarding, troubleshooting, and
                ongoing performance monitoring.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
              <h3 className="text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                Policy-safe improvements
              </h3>
              <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
                Practical guidance to keep implementation clean, compliant, and
                stable as you scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Case study highlight */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h2
                className="text-3xl md:text-4xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Example outcome (case study)
              </h2>
              <p className="mt-4 text-neutral-700 leading-relaxed">
                Add a real publisher story here later (vertical, problem, approach,
                and measured lift). Keep it short and scannable.
              </p>

              <div className="mt-7">
                <Link
                  href="#"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  View case study
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-10">
              <div className="text-sm font-semibold text-neutral-500">
                Case study image placeholder
              </div>
              <div className="mt-4 h-44 rounded-2xl border border-dashed border-neutral-300 bg-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Learn more about AdSense (3 cards) */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Learn more about AdSense
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              "Best ad networks for publishers",
              "How to improve AdSense revenue (practical guide)",
              "What you can expect to earn with AdSense",
            ].map((t) => (
              <article
                key={t}
                className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                  {t}
                </h3>
                <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
                  Short teaser text goes here. You can swap these into real blog
                  posts later.
                </p>
                <div className="mt-6">
                  <Link
                    href="#"
                    className="inline-flex items-center justify-center rounded-full border border-black bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                  >
                    Read
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* NOTE: Memberships intentionally omitted per your request */}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 shadow-sm text-center">
            <h2
              className="text-3xl md:text-4xl font-black tracking-tight"
              style={{ color: "var(--tb-dark)" }}
            >
              Ready to get started?
            </h2>
            <p className="mt-4 mx-auto max-w-[80ch] text-neutral-700 leading-relaxed">
              We’ll review your current setup and share a clear set of next steps
              for sustainable revenue lift — without compromising UX.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-7 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}