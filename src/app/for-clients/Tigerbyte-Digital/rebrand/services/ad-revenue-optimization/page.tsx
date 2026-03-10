import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function AdRevenueOptimizationPage() {
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
                Ad Revenue Optimization
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Ad revenue optimization is the process of increasing publisher
                earnings from existing traffic through better yield management,
                cleaner ad operations, stronger auction competition, and smarter
                monetization strategy.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps independent publishers optimize ad
                revenue without black-box technology, fuzzy reporting, or
                restrictive revenue-share models. If your site is already
                monetized and you want more transparency, more control, and
                better performance, we can help.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request Revenue Audit
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
                A transparent alternative to your current black-box yield partner
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Yield optimization strategy</li>
                <li>• Ad revenue optimization consulting</li>
                <li>• Hands-on ad operations support</li>
                <li>• Better reporting and revenue visibility</li>
                <li>• More control for independent publishers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS AD REVENUE OPTIMIZATION */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What Is Ad Revenue Optimization?
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Ad revenue optimization means improving the total value of your ad
            inventory. For publishers, that usually includes stronger demand
            competition, better pricing strategy, improved ad layout, cleaner ad
            operations, and more useful reporting.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            It is not just about adding more ads. The best ad revenue
            optimization strategies improve yield while protecting user
            experience, viewability, advertiser confidence, and long-term site
            performance.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Yield Optimization",
                body: "Improve how inventory is priced, competed on, and delivered so more advertiser demand translates into stronger publisher revenue.",
              },
              {
                title: "Ad Layout Optimization",
                body: "Refine placements, density, and page structure so ads attract attention without overwhelming readers.",
              },
              {
                title: "Operational Optimization",
                body: "Support the technical and workflow side of monetization so revenue is not lost to setup issues, underdelivery, or poor reporting.",
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

      {/* WHY PUBLISHERS SWITCH */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Why Publishers Switch from Black-Box Platforms
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Many publishers using tools like AdPushup, Ezoic, or other
            monetization consultancies eventually want more clarity around what
            is actually driving results. They want to understand their setup,
            their tradeoffs, and their true net revenue opportunity.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Lack of Transparency",
                body: "Publishers often struggle to understand what changes are being made, how inventory is being managed, and what is actually driving revenue lift.",
              },
              {
                title: "Limited Control",
                body: "Black-box platforms can make it difficult for publishers to own their monetization roadmap or make independent strategic decisions.",
              },
              {
                title: "Unclear Reporting",
                body: "When reporting is vague or overly abstracted, it becomes harder to diagnose problems and identify real optimization opportunities.",
              },
              {
                title: "Revenue Share Fatigue",
                body: "Some publishers reach a point where they would rather retain more control and keep more of the value created by their own traffic.",
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

      {/* HOW TIGERBYTE APPROACHES OPTIMIZATION */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Tigerbyte Digital Approaches Ad Revenue Optimization
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            We help publishers optimize ad revenue through transparent strategy,
            hands-on operational support, and a practical understanding of how
            advertising systems actually work.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Yield Strategy",
                body: "Improve pricing, auction pressure, and monetization structure to unlock stronger revenue performance.",
              },
              {
                title: "Ad Layout & UX",
                body: "Increase value from existing traffic without creating a poor reader experience.",
              },
              {
                title: "Ad Ops Support",
                body: "Manage and improve the operational layer behind monetization, including troubleshooting and reporting.",
              },
              {
                title: "Transparent Reporting",
                body: "Give publishers a clearer view of performance, tradeoffs, and the real drivers of revenue lift.",
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

      {/* POPULAR TERMS / EDUCATIONAL BLOCK */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Key Ad Revenue Optimization Terms Publishers Should Know
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Yield Optimization",
                body: "Yield optimization focuses on improving how ad inventory is priced, sold, and delivered to increase total publisher revenue.",
              },
              {
                title: "Ad Revenue Optimization",
                body: "A broader term that includes yield strategy, layout improvements, ad ops, reporting, and monetization planning.",
              },
              {
                title: "Viewability",
                body: "A measure of whether ads are actually seen. Higher-quality viewability can improve advertiser confidence and monetization outcomes.",
              },
              {
                title: "Auction Competition",
                body: "The more meaningful demand sources competing for your inventory, the stronger your monetization potential tends to be.",
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

      {/* WHO THIS IS FOR */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Who This Service Is For
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              "Publishers already running ads and wanting more revenue",
              "Sites currently using AdPushup, Ezoic, or similar platforms",
              "Independent publishers who want more transparency",
              "Teams that need both strategy and hands-on ad operations support",
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
            This service is ideal for publishers who are already monetized but
            believe more yield can be unlocked through better strategy,
            execution, and transparency.
          </p>
        </div>
      </section>

      {/* FAQS */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Frequently Asked Questions About Ad Revenue Optimization
          </h2>

          <div className="mt-10 space-y-6">
            {[
              {
                q: "What is ad revenue optimization?",
                a: "Ad revenue optimization is the process of increasing publisher revenue from existing traffic through better inventory strategy, stronger demand competition, improved ad layout, and cleaner operations.",
              },
              {
                q: "What is yield optimization?",
                a: "Yield optimization is a component of ad revenue optimization focused on improving the value earned from each impression or ad opportunity.",
              },
              {
                q: "How can I optimize ad revenue without hurting UX?",
                a: "The best approach is not simply adding more ads. Instead, publishers should improve placement quality, attention, viewability, and auction performance while protecting the reading experience.",
              },
              {
                q: "Why would a publisher leave AdPushup or Ezoic?",
                a: "Often because they want more transparency, more control, cleaner reporting, or a more tailored consulting relationship instead of relying on a black-box system.",
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
            Ready for More Transparent Revenue Growth?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            If your site is already monetized and you want better yield, clearer
            reporting, and a more transparent optimization partner, Tigerbyte
            Digital can help you take control of your ad revenue strategy.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Talk to an Optimization Expert
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}