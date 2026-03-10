import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TestimonialFlipStrip from "../../components/TestimonialFlipStrip";
import Link from "next/link";

export default function AdSensePage() {
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
                Google AdSense Consulting
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed text-neutral-700">
                Google AdSense is one of the easiest ways to start monetizing a
                website. For newer publishers, content creators, and site owners,
                it offers a simple path to earning revenue from traffic without
                needing a full ad tech stack.
              </p>

              <p className="mt-4 text-neutral-700">
                Tigerbyte Digital helps publishers understand what AdSense is,
                whether it is the right fit, and how to optimize it for stronger
                RPM, better user experience, and long-term revenue growth.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                >
                  Request AdSense Audit
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
                Why publishers choose AdSense
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-neutral-700">
                <li>• Easy to get started</li>
                <li>• Managed by Google</li>
                <li>• Works for small and growing sites</li>
                <li>• Simple approval and implementation process</li>
                <li>• Good first monetization step before GAM</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS ADSENSE */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            What Is Google AdSense?
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            Google AdSense is a website monetization platform that allows
            publishers to earn money by displaying ads on their websites. Google
            matches ads to your site content and audience, and publishers earn
            revenue based on impressions, clicks, and advertiser demand.
          </p>

          <p className="mt-4 max-w-[80ch] text-neutral-700">
            For many website owners, AdSense is the first monetization product
            they use because it is relatively simple to implement, requires less
            technical setup than Google Ad Manager, and gives smaller publishers
            access to advertising demand quickly.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Simple Setup",
                body: "AdSense is designed to be beginner-friendly, making it one of the easiest ways to monetize a website.",
              },
              {
                title: "Google Demand",
                body: "Publishers gain access to advertiser demand managed through Google’s ecosystem.",
              },
              {
                title: "Scalable Starting Point",
                body: "AdSense can work well for smaller sites today and help publishers prepare for more advanced monetization later.",
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

      {/* WHO ADSENSE IS FOR */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Who Is AdSense Best For?
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              "New publishers just starting to monetize",
              "Content creators building steady organic traffic",
              "Website owners who want simple ad implementation",
              "Growing sites not yet ready for a full programmatic stack",
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
            AdSense is often the best first step for publishers researching how
            to monetize a website, especially when traffic is growing but the
            site is not yet ready for a more advanced ad operations setup.
          </p>
        </div>
      </section>

      {/* COMMON ADSENSE CHALLENGES */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Common AdSense Challenges
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Low RPM",
                body: "Many publishers get approved but struggle to earn meaningful revenue because ads are poorly placed or layouts are not optimized.",
              },
              {
                title: "Poor User Experience",
                body: "Adding too many ads or placing them in the wrong spots can hurt engagement and reduce the long-term value of traffic.",
              },
              {
                title: "Policy Concerns",
                body: "Publishers need to stay compliant with Google’s ad policies to avoid warnings, limitations, or account issues.",
              },
              {
                title: "No Clear Next Step",
                body: "Many site owners do not know whether to keep improving AdSense or when to move toward Google Ad Manager and broader programmatic monetization.",
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
            How Tigerbyte Digital Helps with AdSense
          </h2>

          <p className="mt-5 max-w-[80ch] text-neutral-700 leading-relaxed">
            We help publishers use AdSense the right way: as both a revenue
            engine today and a foundation for future monetization growth.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "AdSense Setup Guidance",
                body: "Support for publishers launching AdSense for the first time, including ad placements and monetization best practices.",
              },
              {
                title: "Revenue Optimization",
                body: "Improve RPM through better ad layout, stronger viewability, and more intentional monetization decisions.",
              },
              {
                title: "Growth Roadmapping",
                body: "Understand when AdSense is enough, when to keep optimizing, and when to transition into more advanced monetization tools.",
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

      {/* FAQs / EDUCATIONAL BLOCK */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <h2
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--tb-dark)" }}
          >
            Frequently Asked Questions About AdSense
          </h2>

          <div className="mt-10 space-y-6">
            {[
              {
                q: "How do I qualify for AdSense?",
                a: "Most publishers need original content, a usable website, policy-compliant pages, and enough site quality for Google to approve the account.",
              },
              {
                q: "How much can AdSense pay?",
                a: "Revenue varies based on niche, geography, advertiser demand, traffic quality, and ad layout. Some sites earn modest supplemental revenue, while others grow much further with optimization.",
              },
              {
                q: "Is AdSense worth it for small websites?",
                a: "Yes, especially for sites just beginning monetization. It is often the most practical first monetization step.",
              },
              {
                q: "What is the difference between AdSense and Google Ad Manager?",
                a: "AdSense is simpler and easier to launch. Google Ad Manager is more advanced, giving publishers greater control over inventory, demand, and optimization.",
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
            Thinking About AdSense?
          </h2>

          <p className="mt-5 mx-auto max-w-[70ch] text-neutral-700">
            Whether you're deciding if AdSense is right for your website or want
            help increasing revenue from an existing setup, Tigerbyte Digital can
            help you move forward with a smarter monetization plan.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/for-clients/Tigerbyte-Digital/rebrand/contact"
              className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
            >
              Talk to an AdSense Expert
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}