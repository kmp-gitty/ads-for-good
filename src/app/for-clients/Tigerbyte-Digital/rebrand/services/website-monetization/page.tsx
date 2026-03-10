import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function WebsiteMonetizationPage() {
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
                Website Monetization
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Website monetization is the process of turning your audience and
                content into sustainable revenue. Whether you're running a blog,
                publisher site, media brand, or niche content platform, the right
                monetization strategy can dramatically increase the value of your
                traffic.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps publishers build scalable monetization
                systems through ad optimization, revenue strategy, and technical
                ad operations.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request Monetization Audit
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
                Monetization starts with strategy
              </h3>

              <ul className="mt-5 space-y-3 text-neutral-700 text-sm">
                <li>• Ad layout optimization</li>
                <li>• Google AdSense and Google Ad Manager setup</li>
                <li>• Programmatic demand strategy</li>
                <li>• Viewability and UX improvements</li>
                <li>• Revenue analytics and reporting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS WEBSITE MONETIZATION */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What Is Website Monetization?
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Website monetization refers to the methods publishers use to generate
            revenue from website traffic. Most publishers begin monetizing through
            advertising networks like Google AdSense, but as traffic grows,
            additional monetization strategies become available.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            These strategies include programmatic advertising, ad layout
            optimization, header bidding, direct advertiser partnerships, and
            revenue analytics.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Display Advertising",
                body: "The most common monetization method. Ads appear within your site layout and generate revenue based on impressions and clicks.",
              },
              {
                title: "Programmatic Advertising",
                body: "Automated ad auctions allow multiple advertisers to compete for your inventory, increasing competition and potential revenue.",
              },
              {
                title: "Affiliate Marketing",
                body: "Publishers earn commissions when readers purchase products through affiliate links embedded in content.",
              },
              {
                title: "Sponsored Content",
                body: "Brands pay publishers to feature their products or services within editorial content.",
              },
              {
                title: "Subscriptions or Memberships",
                body: "Some publishers monetize through paid access to premium content or exclusive communities.",
              },
              {
                title: "Direct Advertising",
                body: "Selling ad placements directly to advertisers rather than through automated networks.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
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
            Common Website Monetization Challenges
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              "Low ad revenue despite strong traffic",
              "Poor ad placement and layout decisions",
              "Lack of competition in the ad auction",
              "Ad policies and compliance concerns",
              "Difficulty implementing Google Ad Manager",
              "Limited visibility into revenue analytics",
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

      {/* HOW TIGERBYTE HELPS */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Tigerbyte Digital Helps Publishers Monetize
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700">
            Our approach focuses on sustainable revenue growth through technical
            ad optimization and smart monetization strategy.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Monetization Strategy",
                body: "Identify the highest-impact revenue opportunities based on your audience, traffic patterns, and content.",
              },
              {
                title: "Ad Layout Optimization",
                body: "Improve ad placement and user experience to increase viewability and engagement.",
              },
              {
                title: "Technical Ad Operations",
                body: "Implement and maintain ad infrastructure including Google Ad Manager and programmatic demand partners.",
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

      {/* TESTIMONIAL STRIP */}
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
            Ready to Monetize Your Website?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            Whether you're just getting started with AdSense or scaling a large
            publisher site, Tigerbyte Digital can help you maximize the value of
            your traffic.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Request a Monetization Consultation
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}