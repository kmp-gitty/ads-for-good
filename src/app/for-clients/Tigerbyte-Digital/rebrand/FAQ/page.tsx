"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TocItem = {
  id: string;
  label: string;
};

function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0] ?? "");

  useEffect(() => {
    if (!ids.length) return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActiveId(visible.target.id);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0.15, 0.3, 0.5, 0.7],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

function FAQSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2
        className="text-2xl md:text-3xl font-black tracking-tight"
        style={{ color: "var(--tb-dark)" }}
      >
        {title}
      </h2>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer list-none pr-8 text-base font-semibold text-neutral-900">
        {question}
        <span className="float-right text-neutral-500">⌄</span>
      </summary>
      <p className="mt-4 text-sm leading-relaxed text-neutral-700">{answer}</p>
    </details>
  );
}

export default function FAQPage() {
  const toc: TocItem[] = useMemo(
    () => [
      { id: "website-monetization", label: "Website Monetization" },
      { id: "adsense", label: "Google AdSense" },
      { id: "google-ad-manager", label: "Google Ad Manager" },
      { id: "header-bidding", label: "Header Bidding" },
      { id: "ad-operations", label: "Ad Operations" },
      { id: "traffic-engagement", label: "Traffic & Engagement" },
    ],
    []
  );

  const activeId = useActiveSection(toc.map((item) => item.id));

  function scrollToId(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main>
      <Header />

      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[240px_1fr_320px]">
            {/* LEFT SECTION SELECTOR */}
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Section Selector
                </div>

                <nav className="mt-4 space-y-2">
                  {toc.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToId(item.id)}
                        className={[
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                          isActive
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-700 hover:bg-neutral-100",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* CENTER CONTENT */}
            <div>
              <h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Frequently Asked Questions
              </h1>

              <p className="mt-5 max-w-[80ch] text-base md:text-lg leading-relaxed text-neutral-700">
                Answers to common questions about website monetization, Google
                AdSense, Google Ad Manager, header bidding, ad operations, and
                publisher growth.
              </p>

              <div className="mt-12 space-y-14">
                <FAQSection
                  id="website-monetization"
                  title="Website Monetization FAQ"
                >
                  <FAQItem
                    question="What is website monetization?"
                    answer="Website monetization is the process of generating revenue from website traffic. For publishers, this often includes display advertising, affiliate links, sponsorships, and other audience-based revenue models."
                  />
                  <FAQItem
                    question="How do I monetize my website?"
                    answer="Most publishers begin with advertising platforms like Google AdSense, then improve results through better layout strategy, stronger traffic, and more advanced monetization systems as the site grows."
                  />
                  <FAQItem
                    question="When is a website ready for monetization?"
                    answer="A site is often ready when it has consistent traffic growth, quality content, and a user experience strong enough to support ads without hurting engagement."
                  />
                  <FAQItem
                    question="What is the best way to monetize a content website?"
                    answer="It depends on the site, but common paths include display ads, programmatic advertising, affiliate content, sponsorships, and a broader monetization strategy built around traffic quality and audience engagement."
                  />
                </FAQSection>

                <FAQSection id="adsense" title="Google AdSense FAQ">
                  <FAQItem
                    question="What is Google AdSense?"
                    answer="Google AdSense is an advertising platform that allows publishers to earn money by displaying ads on their websites. It is often the easiest first step for publishers starting to monetize traffic."
                  />
                  <FAQItem
                    question="Is AdSense good for smaller publishers?"
                    answer="Yes. AdSense is often a strong starting point for smaller or newer publishers because it is simple to set up and managed by Google."
                  />
                  <FAQItem
                    question="How can I increase AdSense revenue?"
                    answer="AdSense revenue can often be improved through better ad placement, stronger user experience, higher-quality traffic, better page engagement, and a clearer monetization strategy."
                  />
                  <FAQItem
                    question="When should I move beyond AdSense?"
                    answer="Many publishers explore broader monetization options when traffic grows, reporting needs become more advanced, or AdSense alone no longer provides enough control or revenue potential."
                  />
                </FAQSection>

                <FAQSection
                  id="google-ad-manager"
                  title="Google Ad Manager FAQ"
                >
                  <FAQItem
                    question="What is Google Ad Manager?"
                    answer="Google Ad Manager is an ad management platform that gives publishers more control over inventory, ad delivery, demand sources, and reporting than a basic AdSense setup."
                  />
                  <FAQItem
                    question="Is Google Ad Manager the same as AdSense?"
                    answer="No. AdSense is simpler and more automated. Google Ad Manager is more flexible and is designed for publishers who need deeper control over ad operations and monetization."
                  />
                  <FAQItem
                    question="Who should use Google Ad Manager?"
                    answer="It is often best for publishers with growing traffic, more complex monetization needs, or a desire to work with multiple demand sources and stronger reporting."
                  />
                  <FAQItem
                    question="Can AdSense and Google Ad Manager work together?"
                    answer="Yes. Many publishers use both as part of a broader monetization strategy."
                  />
                </FAQSection>

                <FAQSection id="header-bidding" title="Header Bidding FAQ">
                  <FAQItem
                    question="What is header bidding?"
                    answer="Header bidding is a programmatic advertising approach where multiple demand partners bid on an impression before the ad server selects the winning ad. It increases auction competition and can improve publisher revenue."
                  />
                  <FAQItem
                    question="What is Prebid or pre-bid?"
                    answer="Prebid is a widely used open-source header bidding framework that helps publishers connect multiple demand partners in a transparent and customizable way."
                  />
                  <FAQItem
                    question="Does header bidding increase revenue?"
                    answer="It often can, because more demand partners are competing at the same time. However, results depend on setup quality, demand mix, page speed, and overall monetization strategy."
                  />
                  <FAQItem
                    question="What tech do publishers need for header bidding?"
                    answer="Most implementations use an ad server like Google Ad Manager, a header bidding wrapper such as Prebid, and multiple connected demand partners."
                  />
                </FAQSection>

                <FAQSection id="ad-operations" title="Ad Operations FAQ">
                  <FAQItem
                    question="What is ad operations?"
                    answer="Ad operations is the process of setting up, trafficking, monitoring, troubleshooting, and reporting on ad campaigns and ad inventory. It is the operational backbone of digital advertising."
                  />
                  <FAQItem
                    question="Why is ad operations important for publishers?"
                    answer="Good ad operations helps campaigns launch correctly, report accurately, and perform consistently. It also improves advertiser trust and protects publisher revenue."
                  />
                  <FAQItem
                    question="What does ad ops support include?"
                    answer="Typical support includes trafficking, creative QA, delivery monitoring, reporting, issue resolution, pacing support, and workflow improvements."
                  />
                  <FAQItem
                    question="Do smaller publishers need ad operations help?"
                    answer="They can. As soon as campaigns, demand partners, or reporting become difficult to manage internally, ad ops support can save time and improve execution."
                  />
                </FAQSection>

                <FAQSection
                  id="traffic-engagement"
                  title="Traffic & Engagement FAQ"
                >
                  <FAQItem
                    question="Why do traffic and engagement matter for monetization?"
                    answer="More qualified traffic and better reader engagement create more pageviews, more ad opportunities, and stronger long-term monetization potential."
                  />
                  <FAQItem
                    question="How does SEO help publishers earn more revenue?"
                    answer="SEO increases visibility in search engines, which can drive more readers to content pages. More high-quality traffic often leads to more monetizable sessions."
                  />
                  <FAQItem
                    question="How does user experience affect ad revenue?"
                    answer="A better user experience can improve time on page, session depth, and content engagement. Those improvements can support stronger ad performance without overwhelming readers."
                  />
                  <FAQItem
                    question="What does a publisher SEO and UX audit look at?"
                    answer="It often includes content discoverability, internal linking, site structure, readability, page speed, navigation, engagement patterns, and monetization alignment."
                  />
                </FAQSection>
              </div>
            </div>

            {/* RIGHT RAIL */}
            <aside className="space-y-6 lg:sticky lg:top-28 self-start">
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--tb-dark)" }}
                >
                  What this page covers
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  A quick-reference FAQ for publishers researching monetization,
                  revenue growth, ad operations, and traffic strategy.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--tb-dark)" }}
                >
                  Best way to use it
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  Use the section selector to jump to the topic that best matches
                  where you are now: getting started, improving AdSense, growing
                  into Google Ad Manager, or optimizing a larger publisher stack.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h3
                  className="text-xl font-black"
                  style={{ color: "var(--tb-dark)" }}
                >
                  Still have questions?
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  If you want a practical answer based on your site, monetization
                  setup, and growth stage, reach out for a publisher consultation.
                </p>

                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="mt-4 inline-block text-sm font-semibold transition hover:opacity-80"
                  style={{ color: "var(--tb-orange)" }}
                >
                  Contact Tigerbyte →
                </Link>
              </div>
            </aside>
          </div>

          {/* MOBILE SECTION SELECTOR */}
          <div className="mt-10 lg:hidden rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Section Selector
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {toc.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToId(item.id)}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}