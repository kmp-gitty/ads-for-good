import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function MediaBrandsPage() {
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
                Advertising Infrastructure & Revenue Strategy for Media Brands
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Media brands and large publisher networks operate complex
                advertising systems that require both strategic oversight and
                operational execution. As audiences scale and advertising demand
                grows, monetization infrastructure becomes a critical component
                of business performance.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps media companies strengthen advertising
                systems, optimize programmatic revenue, and implement scalable
                ad operations designed to support long-term growth.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Schedule Publisher Consultation
                </Link>

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/services"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  Explore Publisher Services
                </Link>

              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold" style={{ color: "var(--tb-dark)" }}>
                Media organizations we typically support
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Digital media companies</li>
                <li>• Multi-site publisher networks</li>
                <li>• Established editorial publications</li>
                <li>• High-traffic content platforms</li>
                <li>• Independent media brands</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* COMPLEXITY SECTION */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Monetization Complexity for Media Brands
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            As media organizations scale, advertising systems often grow more
            complex. Multiple demand partners, direct advertiser campaigns,
            programmatic auctions, and evolving monetization strategies require
            consistent oversight and technical coordination.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            Without strong infrastructure and operational support, even large
            media brands can struggle to maximize the value of their audience.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">

            {[
              {
                title: "Growing Advertising Infrastructure",
                body: "Larger publishers often operate multiple monetization systems that require coordinated management."
              },
              {
                title: "Demand Partner Complexity",
                body: "Managing multiple exchanges, SSPs, and demand partners can create operational challenges."
              },
              {
                title: "Revenue Optimization Opportunities",
                body: "Even mature publishers frequently discover additional revenue potential through optimization."
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

      {/* CHALLENGES */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Common Monetization Challenges for Media Brands
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            {[
              {
                title: "Operational Complexity",
                body: "Campaign setup, troubleshooting, reporting, and advertiser coordination require consistent management."
              },
              {
                title: "Fragmented Advertising Systems",
                body: "Multiple platforms and partners can make performance visibility difficult."
              },
              {
                title: "Underperforming Inventory",
                body: "Large sites often have inventory that could generate stronger revenue with better optimization."
              },
              {
                title: "Balancing UX with Monetization",
                body: "Media brands must carefully balance advertising revenue with reader experience."
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
            How Tigerbyte Digital Supports Media Brands
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-4">

            {[
              {
                title: "Ad Operations Management",
                body: "Campaign setup, reporting, troubleshooting, and operational support for complex ad stacks."
              },
              {
                title: "Programmatic Strategy",
                body: "Design monetization systems that maximize demand competition and auction performance."
              },
              {
                title: "Revenue Optimization",
                body: "Improve yield, placements, and monetization structure across large inventories."
              },
              {
                title: "Traffic & Engagement Growth",
                body: "Strengthen SEO and user experience to support long-term audience growth."
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
            Ready to Strengthen Your Advertising Infrastructure?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            If your media brand manages large audiences and complex advertising
            systems, Tigerbyte Digital can help improve revenue performance,
            streamline operations, and build a stronger monetization strategy.
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