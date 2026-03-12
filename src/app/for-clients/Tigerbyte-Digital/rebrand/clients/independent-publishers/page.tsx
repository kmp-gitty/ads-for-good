import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function IndependentPublishersPage() {
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
                Monetization Strategy & Ad Operations for Independent Publishers
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Independent publishers often reach a point where traffic,
                content production, and audience loyalty are strong—but
                monetization infrastructure becomes more complex. Managing ad
                demand, operations, and revenue optimization can quickly become
                a full-time responsibility.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps independent publishers strengthen their
                advertising stack, optimize revenue performance, and implement
                scalable monetization strategies designed for long-term
                publishing growth.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request Monetization Review
                </Link>

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/services"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  View Publisher Services
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold" style={{ color: "var(--tb-dark)" }}>
                Independent publishers we typically support
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Established content websites</li>
                <li>• Multi-author blogs and niche media sites</li>
                <li>• High-traffic vertical publishers</li>
                <li>• Affiliate and editorial content networks</li>
                <li>• Independent digital publications</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT INDEPENDENT PUBLISHERS NEED */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            The Monetization Challenge for Independent Publishers
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            As publisher traffic grows, monetization often becomes more
            complicated. Sites move beyond simple advertising setups and begin
            managing multiple demand partners, ad technologies, and operational
            workflows.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            Without a clear monetization strategy and operational support,
            publishers may struggle to maximize revenue, manage advertiser
            demand, or maintain consistent ad performance.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Growing Monetization Complexity",
                body: "As sites scale, managing multiple advertising systems and demand partners becomes more difficult."
              },
              {
                title: "Operational Workload",
                body: "Campaign management, ad troubleshooting, and reporting can take significant internal resources."
              },
              {
                title: "Revenue Optimization Opportunities",
                body: "Many independent publishers are capable of earning more from their existing traffic."
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

      {/* COMMON CHALLENGES */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Common Challenges Independent Publishers Face
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Managing Multiple Ad Technologies",
                body: "Ad servers, demand partners, and optimization systems can quickly become difficult to manage."
              },
              {
                title: "Revenue Not Scaling with Traffic",
                body: "Traffic growth does not always translate into stronger monetization without proper strategy."
              },
              {
                title: "Ad Operations Complexity",
                body: "Campaign troubleshooting, reporting, and advertiser coordination require consistent oversight."
              },
              {
                title: "Limited Transparency from Platforms",
                body: "Some monetization partners provide limited visibility into performance or auction dynamics."
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

      {/* WHAT'S NEXT FOR INDEPENDENT PUBLISHERS' */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Independent Publishers Grow Advertising Revenue
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
          There's a certain point in traffic growth where many independent sites expand beyond basic ad networks and begin building a broader monetization stack designed to increase both revenue and yield.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
          This typically includes three areas of expansion:
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "More Demand Partners",
                body: "Independent publishers often connect to multiple ad exchanges and demand platforms. Examples include companies like OpenX, Magnite, Index Exchange, PubMatic, and Amazon’s advertising marketplace. When more advertisers compete for inventory, auction pressure increases and revenue potential grows."
              },
              {
                title: "Header Bidding",
                body: "Independent publishers often connect to multiple ad exchanges and demand platforms. Examples include companies like OpenX, Magnite, Index Exchange, PubMatic, and Amazon’s advertising marketplace. When more advertisers compete for inventory, auction pressure increases and revenue potential grows."
              },
              {
                title: "Premium and Direct Advertising",
                body: "As sites mature, many publishers supplement programmatic revenue with direct campaigns or premium demand sources that provide more stable revenue and higher-value placements."
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
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Tigerbyte Digital Supports Independent Publishers
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              {
                title: "Ad Operations Support",
                body: "Manage campaign setup, troubleshooting, reporting, and advertiser coordination."
              },
              {
                title: "Ad Revenue Optimization",
                body: "Improve yield, placements, and demand competition to increase publisher earnings."
              },
              {
                title: "Header Bidding Strategy",
                body: "Implement or refine header bidding systems that increase auction competition."
              },
              {
                title: "Traffic & Engagement Growth",
                body: "Improve SEO and user experience to strengthen audience growth."
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

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16 text-center">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Ready to Scale Your Publisher Revenue?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            If your publication is growing and monetization is becoming more
            complex, Tigerbyte Digital can help you build a stronger advertising
            strategy and operational foundation.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Schedule Publisher Consultation
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}