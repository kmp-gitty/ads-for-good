import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactCTA from "../components/ContactCTA";

export default function CompanyPage() {
  return (
    <main>
      <Header />

      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-20">
          <div className="mx-auto max-w-[900px]">
            <h1
              className="text-4xl md:text-5xl font-black tracking-tight"
              style={{ color: "var(--tb-orange)" }}
            >
              About Us.
            </h1>

            <div
              className="mt-8 space-y-8 text-lg leading-relaxed"
              style={{ color: "var(--tb-dark)" }}
            >
              <p>
                Tigerbyte Digital helps publishers grow revenue through
                transparent monetization strategy, ad operations support, and
                audience growth improvements. We work with content creators,
                independent publishers, and media brands that want stronger ad
                performance without black-box platforms or vague reporting.
              </p>

              <p>
                Our approach combines practical advertising expertise with a
                publisher-first mindset. That means helping clients understand
                what is happening in their ad stack, what opportunities exist,
                and what changes will actually move revenue in the right
                direction.
              </p>

              <div>
                <p className="font-semibold">
                  Across publisher monetization, a few things stand out:
                </p>
                <div className="mt-3 space-y-2">
                  <p>- Too many publishers are asked to trust systems they cannot see.</p>
                  <p>- Too many revenue decisions are made without clear explanation.</p>
                  <p>- Too many sites are forced to choose between better monetization and better user experience.</p>
                </div>
              </div>

              <p>
                We built Tigerbyte Digital to offer an alternative: independent
                guidance, clearer strategy, hands-on support, and a more
                transparent path to publisher growth.
              </p>
            </div>

            <div className="mt-20 grid gap-12 md:grid-cols-2">
              <div>
                <h2
                  className="text-3xl font-black tracking-tight"
                  style={{ color: "var(--tb-orange)" }}
                >
                  For Publishers of All Sizes
                </h2>

                <p
                  className="mt-5 text-base leading-relaxed"
                  style={{ color: "var(--tb-dark)" }}
                >
                  We help publishers turn traffic into a stronger business
                  through monetization strategy, AdSense and Google Ad Manager
                  support, header bidding guidance, ad operations, and traffic
                  and engagement optimization.
                </p>
              </div>

              <div>
                <h2
                  className="text-3xl font-black tracking-tight"
                  style={{ color: "var(--tb-orange)" }}
                >
                  For Growth in All Forms
                </h2>

                <p
                  className="mt-5 text-base leading-relaxed"
                  style={{ color: "var(--tb-dark)" }}
                >
                  The goal is not just to increase revenue in the short term.
                  It is to build a more durable publishing operation: better
                  ad performance, better visibility into results, better user
                  experience, and stronger long-term audience value.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ContactCTA />
      <Footer />
    </main>
  );
}