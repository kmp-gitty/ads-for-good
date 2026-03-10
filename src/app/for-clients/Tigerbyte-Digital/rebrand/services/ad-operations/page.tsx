import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function AdOperationsPage() {
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
                Ad Operations Expert
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Ad operations is the engine behind effective digital advertising.
                For established publishers, strong ad ops helps campaigns launch
                cleanly, deliver accurately, report reliably, and create a better
                experience for both advertisers and readers.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital supports independent publishers with ad delivery
                consulting and operational services that strengthen advertiser
                trust, improve campaign execution, and build a more scalable ad
                business.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request Ad Ops Review
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
                What strong ad operations delivers
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Cleaner campaign launches and trafficking</li>
                <li>• Better communication with advertisers and buyers</li>
                <li>• Accurate delivery, pacing, and reporting</li>
                <li>• Stronger advertiser retention and trust</li>
                <li>• A more professional publisher operation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS AD OPERATIONS */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What Is Ad Operations?
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Ad operations is the process of managing, delivering, monitoring, and
            optimizing digital ad campaigns. It connects the commercial side of a
            publisher&apos;s advertising business with the technical systems that
            actually serve ads.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            In practice, ad ops includes campaign setup, creative QA, trafficking,
            inventory management, troubleshooting, pacing, reporting, advertiser
            communication, and the operational workflows that keep revenue moving.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Campaign Execution",
                body: "Launch campaigns correctly, map placements, traffic creatives, and confirm they deliver as promised.",
              },
              {
                title: "Operational Oversight",
                body: "Monitor delivery, fix issues quickly, manage pacing, and keep campaigns aligned with advertiser expectations.",
              },
              {
                title: "Reporting & Optimization",
                body: "Provide accurate reporting and identify where delivery, layout, or setup can be improved.",
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

      {/* WHY AD OPS MATTERS */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Why Ad Operations Matters for Publishers
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Advertiser Confidence",
                body: "Reliable ad delivery and clear reporting make advertisers more likely to renew and spend more.",
              },
              {
                title: "Revenue Protection",
                body: "Operational issues like underdelivery, broken creatives, or missed pacing can quietly erode revenue.",
              },
              {
                title: "Internal Efficiency",
                body: "Clean workflows reduce manual headaches and make it easier to manage both programmatic and direct campaigns.",
              },
              {
                title: "Publisher Reputation",
                body: "Well-run ad operations signal that your publication is a serious, premium advertising partner.",
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

      {/* POPULAR AD FORMATS */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Popular Ad Formats Publishers Should Understand
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Strong ad ops is not only about delivery. It also means understanding
            which formats fit different advertiser goals, content environments,
            and audience behaviors.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Display Banners",
                body: "Standard placements such as leaderboard, rectangle, and skyscraper units remain foundational for both programmatic and direct campaigns.",
              },
              {
                title: "Sticky Units",
                body: "Persistent placements that remain visible as users scroll can improve attention and viewability when implemented thoughtfully.",
              },
              {
                title: "Native-Style Placements",
                body: "Ads designed to fit the structure of content feeds or editorial layouts can improve engagement and reduce banner blindness.",
              },
              {
                title: "In-Content Ads",
                body: "Units inserted between paragraphs or content blocks often perform well because they align with natural reading flow.",
              },
              {
                title: "Video Ad Formats",
                body: "Pre-roll, outstream, and in-article video units can open premium demand opportunities when audience and content support them.",
              },
              {
                title: "Custom Sponsorship Units",
                body: "Branded placements, homepage takeovers, newsletter integrations, and other custom executions can create premium direct revenue.",
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

      {/* PROGRAMMATIC VS DIRECT */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Programmatic vs Direct Advertising
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Premium publishers often need to support both programmatic and direct
            advertising. Strong ad operations helps make each channel work
            properly — and helps publishers understand when each approach makes
            sense.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3
                className="text-2xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                Programmatic Advertising
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Automated ad buying and selling</li>
                <li>• Efficient for scaling advertiser demand</li>
                <li>• Best for broad inventory monetization</li>
                <li>• Requires attention to viewability, demand competition, and setup quality</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3
                className="text-2xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                Direct / Custom Advertising
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Sold directly to brands or agencies</li>
                <li>• Often tied to premium placements or custom programs</li>
                <li>• Higher-touch and operationally heavier</li>
                <li>• Strong ad ops is critical for custom execution, pacing, and reporting</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h3
              className="text-lg font-bold"
              style={{ color: "var(--tb-dark)" }}
            >
              The best publishers do both well
            </h3>
            <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
              Programmatic helps monetize broad inventory efficiently, while
              direct advertising can unlock premium rates and deeper advertiser
              relationships. Ad operations is what makes both systems function
              cleanly together.
            </p>
          </div>
        </div>
      </section>

      {/* HOW TO BETTER SERVE ADS */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Publishers Can Better Serve Ads for Advertisers
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Improve inventory organization",
                body: "Clean ad units, clear naming conventions, and better placement strategy make trafficking and reporting much easier.",
              },
              {
                title: "Protect viewability and UX",
                body: "Advertisers care about attention and outcomes. Strong layouts help ads perform without overwhelming readers.",
              },
              {
                title: "Create reliable reporting",
                body: "Advertisers want accurate, timely, and understandable campaign reporting. Good ad ops creates trust.",
              },
              {
                title: "Support custom executions cleanly",
                body: "Premium placements, sponsorships, and tailored campaigns require strong internal process and technical discipline.",
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
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Tigerbyte Digital Supports Publisher Ad Operations
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            We provide hands-on ad operations support for publishers that want
            cleaner campaign execution, stronger advertiser experience, and more
            confidence in how ads are delivered and reported.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Campaign Trafficking & QA",
                body: "Support for setup, launch checks, delivery validation, and issue prevention before campaigns go live.",
              },
              {
                title: "Operational Process Improvement",
                body: "Build cleaner workflows for pacing, troubleshooting, reporting, advertiser coordination, and inventory oversight.",
              },
              {
                title: "Publisher Ad Delivery Strategy",
                body: "Improve how ad products are packaged, delivered, and maintained across both programmatic and direct campaigns.",
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
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Frequently Asked Questions About Ad Operations
          </h2>

          <div className="mt-10 space-y-6">
            {[
              {
                q: "What does ad operations include?",
                a: "Ad operations typically includes trafficking, campaign setup, creative QA, delivery monitoring, pacing, reporting, troubleshooting, and broader ad delivery management.",
              },
              {
                q: "Why is ad ops important for publishers?",
                a: "Because even strong advertiser demand can underperform if campaigns are not launched, delivered, and managed properly. Good ad ops protects both revenue and relationships.",
              },
              {
                q: "What is the difference between ad ops and monetization strategy?",
                a: "Monetization strategy focuses on how a publisher makes money. Ad operations focuses on the systems, execution, and workflows that actually deliver campaigns and support advertisers.",
              },
              {
                q: "Can smaller publishers benefit from ad operations consulting?",
                a: "Yes, especially if they are beginning to sell direct campaigns, expand ad formats, or professionalize how they work with advertisers.",
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

      {/* FINAL CTA */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16 text-center">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Need Stronger Ad Operations?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            If your publication is growing and advertisers expect more polished
            campaign delivery, reporting, and operational consistency, Tigerbyte
            Digital can help strengthen your ad operations foundation.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Talk to an Ad Ops Expert
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}