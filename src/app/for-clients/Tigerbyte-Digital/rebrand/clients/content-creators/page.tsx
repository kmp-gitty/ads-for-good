import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function ContentCreatorsPage() {
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
                Website Monetization for Content Creators
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                If you run a blog, recipe site, niche content website, or
                independent site, your audience can become a sustainable
                revenue stream. Many content creators begin as passion projects,
                but growing traffic can quickly turn a site into a real
                publishing business.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps content creators implement advertising
                strategies, monetization systems, and revenue optimization that
                transform website traffic into long-term income.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Start Monetization Consultation
                </Link>

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/services/website-monetization"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                >
                  Learn About Website Monetization
                </Link>

              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold" style={{ color: "var(--tb-dark)" }}>
                Content sites we commonly work with
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Recipe and food blogs</li>
                <li>• Travel and lifestyle blogs</li>
                <li>• DIY and hobby websites</li>
                <li>• Parenting and family blogs</li>
                <li>• Niche guides and tutorial sites</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* HOW BLOGS MAKE MONEY */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            How Content Creators Monetize Websites
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Many bloggers and content creators eventually reach a point where
            their website receives consistent traffic. At that stage,
            monetization can transform a website from a passion project into a
            real publishing business.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-4">

            {[
              {
                title: "Display Advertising",
                body: "Programmatic ads and networks like Google AdSense allow creators to earn revenue from pageviews."
              },
              {
                title: "Affiliate Content",
                body: "Product recommendations and reviews generate commission when readers purchase through links."
              },
              {
                title: "Sponsored Content",
                body: "Brands pay to collaborate with publishers whose audience matches their target market."
              },
              {
                title: "Programmatic Advertising",
                body: "Advanced advertising systems increase demand competition and revenue potential."
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

      {/* IS MY WEBSITE READY FOR ADS */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">

          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Is My Website Ready for Monetization?
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Many content creators wonder when it makes sense to begin monetizing
            their website. While every publisher is different, most successful
            sites share a few common signals before implementing advertising.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-4">

            {[
              "Consistent monthly traffic growth",
              "Long-form content that attracts readers",
              "Returning visitors and engaged audiences",
              "Regular publishing schedule"
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
            Even smaller websites can begin monetizing traffic if they have
            consistent growth and engaged readers.
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
            Common Challenges for New Content Publishers
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            {[
              {
                title: "Low AdSense Revenue",
                body: "Many creators start with AdSense but struggle to increase revenue beyond a small baseline."
              },
              {
                title: "Poor Ad Placement",
                body: "Incorrect layouts can reduce both revenue and user experience."
              },
              {
                title: "Limited Advertiser Demand",
                body: "Without access to broader advertising markets, publishers may miss revenue opportunities."
              },
              {
                title: "Unclear Monetization Strategy",
                body: "Many creators simply don't know what the next step should be after launching ads."
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
            How Tigerbyte Digital Helps Content Creators
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-4">

            {[
              {
                title: "Monetization Setup",
                body: "Launch programmatic advertising and monetization infrastructure."
              },
              {
                title: "Ad Revenue Optimization",
                body: "Improve ad layouts and demand competition to increase revenue."
              },
              {
                title: "Traffic & Engagement Growth",
                body: "Improve SEO and user experience to increase discoverability."
              },
              {
                title: "Long-Term Publisher Strategy",
                body: "Develop a roadmap to grow your site into a sustainable media property."
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
            Ready to Monetize Your Website?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            If your website is growing and you're ready to turn traffic into
            revenue, Tigerbyte Digital can help you implement a monetization
            strategy built for independent publishers.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Start Monetization Consultation
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}