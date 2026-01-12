import Link from "next/link";

export const metadata = {
  title: "Business Services | Ads for Good",
  description:
    "Explore our business services — start with guidance, move into execution, or plug us in as your marketing team.",
};

export default function ForBusinessesPage() {
  // ===========
  // Edit these
  // ===========
  const hero = {
    h1: "Business Services for Growth: Guidance, Execution, & Full Support",
    description:
      "Pick what you need: talk through ideas first, get execution help, or plug us in as your marketing team. Clear scope, fair pricing, and work that’s actually useful.",
  };

  // ==================
  // Data (edit freely)
  // ==================
  const ideasGuidance = {
    id: "ideas-guidance",
    title: "For Ideas & Guidance",
    subtitle:
      "Start here if you want clarity before commitment. Have conversations and make plans before making changes. Talk through strategy, pressure-test plans, and get a clear path before moving.",
    horizontalFeature: {
      title: "DIY Marketing Guidebook",
      sub: "Self-paced playbook to understand marketing, make better decisions, and avoid common pitfalls.",
      price: "$25",
      priceNote: "One-time",
      primaryCtaLabel: "Purchase",
      primaryHref: "/for-businesses/marketing-guidebook",
      learnLabel: "Learn",
      learnHref: "/for-businesses/marketing-guidebook",
      rightDetailsTitle: "What's inside:",
      rightDetails: ["16 pages", "Free & Paid Tools Insight", "Data, Thoughts, Instructions"],
    },
    verticalCards: [
      {
        title: "Marketing Advice On Demand",
        sub: "Ask us anything, expert advice over email — whenever you need it.",
        price: "$100",
        priceLabel: "Monthly cost",
        body:
          "Perfect when you need guidance, a second opinion, or a clear explanation. Unlimited answers without a long engagement.",
        primaryCtaLabel: "Set Up",
        primaryHref: "/for-businesses/marketing-advice",
        learnLabel: "Learn",
        learnHref: "/for-businesses/marketing-advice",
        bulletsTitle: "Includes",
        bullets: ["Unlimited email access", "Priority recommendations", "Data and justifications"],
      },
      {
        title: "Digital Health Check",
        sub: "Human-reviewed audit of your website and digital profiles.",
        price: "$500",
        priceLabel: "One-time",
        body:
          "We find what exists, what’s broken, and what to improve or add — with clear, prioritized steps.",
        primaryCtaLabel: "Purchase",
        primaryHref: "/for-businesses/digital-health-check",
        learnLabel: "Learn",
        learnHref: "/for-businesses/digital-health-check",
        bulletsTitle: "You get",
        bullets: ["Tangible document with findings", "Fixes included in cost", "Tailored best practices"],
      },
      {
        title: "Consulting",
        sub: "You’re purchasing hours of time. Talk through anything unknown and get direction.",
        price: "$500",
        priceLabel: "8 meeting hours",
        body:
          "We talk through strategy, challenges, and options — and get you to a confident plan.",
        primaryCtaLabel: "Buy",
        primaryHref: "/for-businesses/consulting",
        learnLabel: "Learn",
        learnHref: "/for-businesses/consulting",
        bulletsTitle: "Good for",
        bullets: ["Learning what you don't know", "Fixing a stuck plan", "Picking channels/tools"],
      },
    ],
  };

  const opsExecution = {
    id: "ops-execution",
    title: "For Operation & Execution",
    subtitle:
      "Start here if you already know what you need and want an expert to take over for you.",
    cards: [
      {
        title: "Website Builds & Updates",
        href: "/for-businesses/website",
        pricingLabel: "Options:",
        pricing: [
          { label: "New Site Build", value: "$1,000" },
          { label: "Old Site Update", value: "$500" },
          { label: "Site Maintenance", value: "$100/mo" },
        ],
      },
      {
        title: "Digital Profile Management",
        href: "/for-businesses/digital-profiles",
        pricingLabel: "Month to month",
        pricing: [{ label: "All profiles", value: "$200/mo" }],
      },
      {
        title: "SEO Services",
        href: "/for-businesses/seo",
        pricingLabel: "2 Month minimum",
        pricing: [
          { label: "Initial analysis & planning", value: "$250" },
          { label: "SEO monitoring", value: "$50/mo" },
        ],
      },
      {
        title: "Digital Ads",
        href: "/for-businesses/digital-ads",
        pricingLabel: "2 Month minimum",
        pricing: [
          { label: "Initial analysis & planning", value: "$250" },
          { label: "Ads management", value: "$100/mo/channel" },
        ],
      },
      {
        title: "Local Direct Mail",
        href: "/for-businesses/direct-mail",
        pricingLabel: "Multiple campaign types available",
        pricing: [{ label: "Starting at", value: "$750" }],
      },
      {
        title: "Be My Marketing Team",
        href: "#be-my-marketing-team",
        pricingLabel: "Month to month",
        pricing: [{ label: "Full support", value: "$1,500/mo" }],
      },
    ],
  };

  const team = {
    id: "be-my-marketing-team",
    title: "Be My Marketing Team",
    subtitle:
      "You know your business better than anyone — leave the marketing headache to people who do this every day. If you want consistent help across multiple areas, this is the simplest way to work together.",
    leftPill: {
      title: "Be My Marketing Team",
      sub: "Ongoing support for ideas + execution.",
      price: "$1,500",
      priceLabel: "Monthly cost",
      ctaLabel: "Contact Us",
      href: "mailto:katoa@ads4good.com?subject=Be%20My%20Marketing%20Team",
      learnMoreLabel: "Learn More",
      learnMoreHref: "/for-businesses/marketing-team",
      bulletsTitle: "What to expect:",
      bullets: [
        "Proactive communication and education",
        "Clear deliverables and checkpoints",
        "No fluff reports — real actions",
      ],
    },
    rightDetails: {
      title: "How it works",
      paragraphs: [
        "We don't “take over” — we work with you and own the marketing process together.",
        "Start with a conversation, define the problems, set a plan, and execute steadily.",
        "If you don’t need ongoing help, we’ll point you to the right smaller service instead.",
      ],
      points: [
        "Marketing Guidebook & Digital Health Check",
        "Website Updates, SEO + Ads Analysis, Digital Profile Management",
        "SEO Monitoring & Ads Management",
        "Unlimited Email Access & Meeting Availability",
      ],
    },
  };

  return (
    <main className="bg-orange-50 text-neutral-900 overflow-x-hidden">
      {/* HERO */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:pt-16 pb-10">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight text-orange-500">
              {hero.h1}
            </h1>
            <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
              {hero.description}
            </p>

            {/* Mobile-friendly pill nav */}
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <a
                href={`#${ideasGuidance.id}`}
                className="w-full sm:w-auto text-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-100 hover:underline"
              >
                For Ideas &amp; Guidance
              </a>
              <a
                href={`#${opsExecution.id}`}
                className="w-full sm:w-auto text-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-100 hover:underline"
              >
                For Operation &amp; Execution
              </a>
              <a
                href={`#${team.id}`}
                className="w-full sm:w-auto text-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-100 hover:underline"
              >
                Be My Marketing Team
              </a>
            </div>
          </div>

          {/* Right: minimal animated keyword cloud (keep yours as-is) */}
          <div className="min-w-0">
            <div className="relative h-[260px] sm:h-[360px] w-full overflow-hidden rounded-2xl">
              <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-orange-100/60 blur-3xl" />
              <div className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-orange-100/50 blur-3xl" />
              <div className="absolute top-10 right-12 h-32 w-32 rounded-full bg-orange-100/40 blur-3xl" />

              <div className="absolute inset-0">
                {[
                  { t: "marketing consulting", s: "text-lg sm:text-xl font-semibold", x: "left-[8%]", y: "top-[12%]" },
                  { t: "digital health check", s: "text-base sm:text-lg font-semibold", x: "left-[46%]", y: "top-[16%]" },
                  { t: "direct mail marketing", s: "text-base sm:text-lg font-semibold", x: "left-[14%]", y: "top-[38%]" },
                  { t: "local direct mail", s: "text-sm sm:text-base font-medium", x: "left-[60%]", y: "top-[40%]" },
                  { t: "marketing advice", s: "text-sm sm:text-base font-medium", x: "left-[72%]", y: "top-[10%]" },
                  { t: "get more customers", s: "text-sm sm:text-base font-medium", x: "left-[70%]", y: "top-[34%]" },

                  { t: "DIY marketing guidebook", s: "text-sm sm:text-base", x: "left-[10%]", y: "top-[58%]" },
                  { t: "website updates", s: "text-xs sm:text-sm", x: "left-[52%]", y: "top-[58%]" },
                  { t: "profile management", s: "text-xs sm:text-sm", x: "left-[70%]", y: "top-[52%]" },
                  { t: "SEO services", s: "text-xs sm:text-sm", x: "left-[20%]", y: "top-[74%]" },
                  { t: "digital ads", s: "text-xs sm:text-sm", x: "left-[42%]", y: "top-[78%]" },

                  // Hide the tiniest/helper phrases on mobile to reduce crowding
                  { t: "get more leads", s: "hidden sm:inline text-xs sm:text-sm", x: "left-[52%]", y: "top-[88%]" },
                  { t: "pressure-test a plan", s: "hidden sm:inline text-xs sm:text-sm", x: "left-[6%]", y: "top-[28%]" },
                  { t: "what should we do next?", s: "hidden sm:inline text-xs sm:text-sm", x: "left-[58%]", y: "top-[26%]" },
                  { t: "fix what’s broken", s: "hidden sm:inline text-xs sm:text-sm", x: "left-[32%]", y: "top-[48%]" },
                  { t: "improve conversions", s: "hidden sm:inline text-xs sm:text-sm", x: "left-[34%]", y: "top-[66%]" },
                  { t: "track ROI simply", s: "hidden sm:inline text-xs sm:text-sm", x: "left-[10%]", y: "top-[86%]" },
                  { t: "build trust locally", s: "hidden sm:inline text-xs sm:text-sm", x: "left-[72%]", y: "top-[74%]" },
                  { t: "get more business", s: "hidden sm:inline text-xs sm:text-sm", x: "left-[78%]", y: "top-[84%]" },
                ].map((w, i) => (
                  <span
                    key={w.t}
                    className={["kw-float absolute select-none whitespace-nowrap", "text-neutral-800", w.s, w.x, w.y].join(" ")}
                    style={{
                      animation: `kwDance ${9000 + (i % 7) * 360}ms ease-in-out ${(i % 9) * 160}ms infinite`,
                    }}
                  >
                    {w.t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IDEAS & GUIDANCE */}
      <section
        id={ideasGuidance.id}
        className="mx-auto w-full max-w-6xl px-4 pt-10 pb-14 scroll-mt-28"
      >
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
              {ideasGuidance.title}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-md">
              {ideasGuidance.subtitle}
            </p>
          </div>

          {/* Guidebook pill */}
          <div className="min-w-0">
            <div className="rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden">
              <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.5fr_0.55fr_0.75fr_1.1fr] lg:items-center">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-neutral-900">
                    {ideasGuidance.horizontalFeature.title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">
                    {ideasGuidance.horizontalFeature.sub}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-neutral-600">{ideasGuidance.horizontalFeature.priceNote}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-none">
                    {ideasGuidance.horizontalFeature.price}
                  </p>
                </div>

                <div className="min-w-0 flex flex-col gap-2">
                  <Link
                    href={ideasGuidance.horizontalFeature.primaryHref}
                    className="inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    {ideasGuidance.horizontalFeature.primaryCtaLabel} →
                  </Link>

                  <Link
                    href={ideasGuidance.horizontalFeature.learnHref}
                    className="inline-flex w-full items-center justify-center rounded-full border border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-100"
                  >
                    {ideasGuidance.horizontalFeature.learnLabel}
                  </Link>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                  <p className="text-sm font-semibold text-neutral-900">
                    {ideasGuidance.horizontalFeature.rightDetailsTitle}
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-neutral-800">
                    {ideasGuidance.horizontalFeature.rightDetails.map((d) => (
                      <li key={d} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 vertical pills */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {ideasGuidance.verticalCards.map((c) => (
            <div
              key={c.title}
              className="rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 sm:p-7 flex-1 flex flex-col">
                <h3 className="text-xl font-semibold text-neutral-900">{c.title}</h3>
                <p className="mt-2 text-sm text-neutral-700">{c.sub}</p>

                <div className="mt-5 min-h-[64px]">
                  <p className="text-xs text-neutral-600">{c.priceLabel}</p>
                  <p className="text-3xl font-bold text-neutral-900 leading-none">{c.price}</p>
                </div>

                <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                  {c.body}
                </p>

                <div className="mt-auto pt-6 grid gap-3 sm:flex sm:flex-wrap">
                  <Link
                    href={c.primaryHref}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    {c.primaryCtaLabel} →
                  </Link>

                  <Link
                    href={c.learnHref}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-100"
                  >
                    {c.learnLabel}
                  </Link>
                </div>
              </div>

              <div className="border-t border-orange-100 bg-orange-50/70 p-6 sm:p-7">
                <p className="text-sm font-semibold text-neutral-900">{c.bulletsTitle}</p>
                <ul className="mt-3 space-y-2 text-sm text-neutral-800">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OPS & EXECUTION */}
      <section id={opsExecution.id} className="w-full bg-orange-100 scroll-mt-28">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
            {opsExecution.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-4xl">
            {opsExecution.subtitle}
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {opsExecution.cards.map((x) => (
              <Link
                key={x.title}
                href={x.href}
                className="group rounded-3xl border border-orange-200 bg-white px-5 sm:px-6 py-5 sm:py-6 shadow-sm transition hover:shadow-md hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300 flex flex-col"
              >
                <p className="text-sm font-semibold text-neutral-900 group-hover:text-orange-600">
                  {x.title}
                </p>

                <div className="mt-4 flex-1">
                  <p className="text-xs font-medium text-orange-500">{x.pricingLabel}</p>

                  <div className="mt-3 space-y-2">
                    {x.pricing.map((p) => (
                      <div
                        key={`${x.title}-${p.label}`}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="text-xs text-neutral-700 pr-2">
                          {p.label}
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 whitespace-nowrap">
                          {p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-auto pt-5 text-xs text-neutral-700">
                  Click to learn more →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BE MY MARKETING TEAM */}
      <section
        id={team.id}
        className="mx-auto w-full max-w-6xl px-4 pt-14 pb-20 scroll-mt-28"
      >
        <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">{team.title}</h2>
        <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-4xl">
          {team.subtitle}
        </p>

        <div className="mt-8 rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="p-6 sm:p-7 border-b lg:border-b-0 lg:border-r border-orange-100 bg-orange-50/60">
              <h3 className="text-xl font-semibold text-neutral-900">{team.leftPill.title}</h3>
              <p className="mt-2 text-sm text-neutral-700">{team.leftPill.sub}</p>

              <div className="mt-5">
                <p className="text-xs text-neutral-600">{team.leftPill.priceLabel}</p>
                <p className="text-3xl font-bold text-neutral-900">{team.leftPill.price}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                <a
                  href={team.leftPill.href}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  {team.leftPill.ctaLabel}
                </a>

                <Link
                  href={team.leftPill.learnMoreHref}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100"
                >
                  {team.leftPill.learnMoreLabel}
                </Link>
              </div>

              <div className="mt-8">
                <p className="text-sm font-semibold text-neutral-900">{team.leftPill.bulletsTitle}</p>
                <ul className="mt-3 space-y-2 text-sm text-neutral-800">
                  {team.leftPill.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-6 sm:p-7 lg:col-span-2">
              <h4 className="text-lg font-semibold text-neutral-900">{team.rightDetails.title}</h4>

              <div className="mt-4 space-y-4 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
                {team.rightDetails.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/70 p-5">
                <p className="text-sm font-semibold text-neutral-900">What's included</p>
                <ul className="mt-3 space-y-2 text-sm text-neutral-800">
                  {team.rightDetails.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-500" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}









  