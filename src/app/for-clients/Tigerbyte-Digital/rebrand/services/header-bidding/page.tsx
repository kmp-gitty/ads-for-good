import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function HeaderBiddingPage() {
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
                Header Bidding Solutions
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Header bidding is one of the most important technologies in modern
                programmatic advertising. It allows publishers to increase
                competition for ad inventory by letting multiple demand partners
                bid simultaneously before the ad server chooses a winner.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps publishers implement transparent,
                performance-focused header bidding solutions using technologies
                like Prebid and partner-direct integrations that maximize yield
                without sacrificing site speed or user experience.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request Header Bidding Audit
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
                Why publishers use header bidding
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Increase demand competition for inventory</li>
                <li>• Improve CPMs and total revenue yield</li>
                <li>• Reduce reliance on a single ad network</li>
                <li>• Gain more transparency into bidding activity</li>
                <li>• Build a scalable programmatic monetization stack</li>
              </ul>

            </div>

          </div>
        </div>
      </section>

      {/* WHAT IS HEADER BIDDING */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What Is Header Bidding?
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Header bidding is a programmatic advertising technique that allows
            multiple ad exchanges and demand partners to bid on inventory at the
            same time before the publisher’s ad server makes a decision.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            In traditional ad setups, ad servers might prioritize certain demand
            sources first. Header bidding changes this by running a real-time
            auction where multiple buyers compete simultaneously, helping
            publishers maximize the value of each impression.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">

            {[
              {
                title: "More Competition",
                body: "Multiple demand partners compete simultaneously for each impression, increasing the likelihood of higher bids."
              },
              {
                title: "Better Yield",
                body: "Header bidding often improves CPM performance by allowing broader advertiser participation in auctions."
              },
              {
                title: "More Transparency",
                body: "Publishers gain better visibility into which demand sources are bidding and how auctions perform."
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

      {/* HOW HEADER BIDDING WORKS */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Header Bidding Works
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-4">

            {[
              "A user loads a page containing publisher ad inventory.",
              "Header bidding technology sends bid requests to multiple demand partners.",
              "Demand partners respond with bids in real time.",
              "The winning bid is passed to the ad server and the ad is served."
            ].map((step) => (
              <div
                key={step}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <p className="font-medium text-neutral-800">{step}</p>
              </div>
            ))}

          </div>

          <p className="mt-8 max-w-[80ch] text-neutral-700">
            Many header bidding implementations use open-source frameworks like
            Prebid (often referred to as “pre-bid” or “pre bidding”) which allow
            publishers to connect multiple demand partners in a flexible and
            customizable way.
          </p>

        </div>
      </section>

      {/* OPEN SOURCE VS PARTNER SOLUTIONS */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Open Source vs Partner Header Bidding Solutions
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">

              <h3
                className="text-2xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                Open Source (Prebid)
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Built using open frameworks like Prebid</li>
                <li>• Highly customizable</li>
                <li>• Maximum transparency</li>
                <li>• Requires technical implementation and maintenance</li>
              </ul>

            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">

              <h3
                className="text-2xl font-black"
                style={{ color: "var(--tb-dark)" }}
              >
                Partner-Managed Solutions
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Managed integrations with multiple demand partners</li>
                <li>• Easier implementation for many publishers</li>
                <li>• Operational support included</li>
                <li>• Sometimes less transparency depending on the platform</li>
              </ul>

            </div>

          </div>

        </div>
      </section>

      {/* TECH REQUIREMENTS */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Technology Required for Header Bidding
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">

            {[
              {
                title: "Ad Server",
                body: "Most header bidding implementations connect with an ad server like Google Ad Manager to finalize auction decisions."
              },
              {
                title: "Header Bidding Wrapper",
                body: "Frameworks like Prebid manage communication between your website and demand partners."
              },
              {
                title: "Demand Partners",
                body: "Ad exchanges and SSPs provide bids that compete in the auction."
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

      {/* IMPACT */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Impact on Revenue and Ad Delivery
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            When implemented correctly, header bidding can increase CPMs,
            strengthen auction competition, and provide publishers with a more
            balanced monetization strategy.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            {[
              {
                title: "Revenue Growth",
                body: "More bidders in the auction increases demand pressure and improves the likelihood of higher winning bids."
              },
              {
                title: "Inventory Transparency",
                body: "Publishers gain deeper insight into which partners are bidding and how auctions perform."
              },
              {
                title: "Improved Auction Dynamics",
                body: "Balanced demand competition prevents a single network from dominating your inventory."
              },
              {
                title: "Operational Complexity",
                body: "Header bidding requires careful setup and monitoring to avoid latency or performance issues."
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
            Ready to Implement Header Bidding?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            If your site is ready to expand beyond a single ad network, a
            well-implemented header bidding setup can increase competition,
            improve yield, and unlock stronger monetization performance.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Talk to a Header Bidding Expert
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}