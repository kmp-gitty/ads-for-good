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
    h1: "Business Services for Growth (Without the Agency Song and Dance)",
    description:
      "Pick what you need: talk through ideas first, get execution help, or plug us in as your marketing team. Clear scope, fair pricing, and work that’s actually useful.",
    imageSrc: "/images/for-businesses-pricing-example.png",
    imageAlt: "Pricing style example",
  };

  // ==================
  // Data (edit freely)
  // ==================
  const ideasGuidance = {
    id: "ideas-guidance",
    title: "For Ideas & Guidance",
    subtitle:
      "Start here if you want clarity before committing. Talk through strategy, pressure-test plans, and get a real next-step path.",
    horizontalFeature: {
      title: "DIY Marketing Guidebook",
      sub: "Self-paced playbook to understand marketing, make better decisions, and avoid common pitfalls.",
      price: "$___",
      ctaLabel: "View Guidebook",
      href: "/for-businesses/marketing-guidebook",
      rightDetailsTitle: "What you’ll get",
      rightDetails: ["16 short sections", "Templates + examples", "Built for small teams"],
    },
    verticalCards: [
      {
        title: "Marketing Advice On Demand",
        sub: "Quick answers and direction when you don’t want a long engagement.",
        price: "$___",
        body:
          "Perfect when you need a decision, a second opinion, or a clear explanation of what to do next.",
        ctaLabel: "Learn More",
        href: "/for-businesses/marketing-advice",
        bulletsTitle: "Includes",
        bullets: ["Rapid Q&A", "Priority recommendations", "Next-step checklist"],
      },
      {
        title: "Digital Health Check",
        sub: "Human-reviewed assessment of your website + digital profiles.",
        price: "$500",
        body:
          "We find what exists, what’s broken, and what to improve or add — with clear, prioritized steps.",
        ctaLabel: "View Details",
        href: "/for-businesses/digital-health-check",
        bulletsTitle: "You get",
        bullets: ["Full inventory", "Issues + fixes", "Priority plan"],
      },
      {
        title: "Consulting",
        sub: "Start with a conversation. Pressure-test ideas before you build or buy.",
        price: "$500",
        body: "We talk through strategy, challenges, and options — and get you to a confident plan.",
        ctaLabel: "View Consulting",
        href: "/for-businesses/consulting",
        bulletsTitle: "Good for",
        bullets: ["New initiatives", "Fixing a stuck plan", "Picking channels/tools"],
      },
    ],
  };

  const opsExecution = {
    id: "ops-execution",
    title: "For Operation & Execution",
    subtitle:
      "Start here if you already know what you need and want it built, fixed, managed, or shipped.",
    cards: [
      { title: "Website Builds & Updates", href: "/for-businesses/website", price: "$___" },
      { title: "Digital Profile Management", href: "/for-businesses/digital-profiles", price: "$___" },
      { title: "SEO Services", href: "/for-businesses/seo", price: "$___" },
      { title: "Digital Ads", href: "/for-businesses/digital-ads", price: "$___" },
      { title: "Local Direct Mail", href: "/for-businesses/direct-mail", price: "$___" },
      { title: "Be My Marketing Team", href: "#be-my-marketing-team", price: "Custom" },
    ],
  };

  const team = {
    id: "be-my-marketing-team",
    title: "Be My Marketing Team",
    subtitle:
      "If you want consistent help across multiple channels, this is the simplest way to work together long-term.",
    leftPill: {
      title: "Be My Marketing Team",
      sub: "Ongoing support across strategy + execution.",
      price: "Custom",
      ctaLabel: "Contact Us",
      learnMoreLabel: "Learn More",
      learnMoreHref: "/for-businesses/marketing-team",
      href: "mailto:katoa@ads4good.com?subject=Be%20My%20Marketing%20Team",
      bulletsTitle: "Common support areas",
      bullets: [
        "Planning + prioritization",
        "Website + profiles + SEO",
        "Ads + tracking + reporting",
        "Ongoing improvements",
      ],
    },
    rightDetails: {
      title: "How it works",
      paragraphs: [
        "We start with your goals, current setup, and what’s blocking growth.",
        "Then we build a simple plan (what matters first), execute, measure, and iterate.",
        "If you don’t need full ongoing help, we’ll point you to the right smaller service instead.",
      ],
      points: [
        "Monthly cadence (or project cadence)",
        "Clear deliverables and checkpoints",
        "No fluff reports — real actions",
      ],
    },
  };

  return (
    <main className="bg-orange-50 text-neutral-900 overflow-x-hidden">
      {/* HERO */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-10">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
              {hero.h1}
            </h1>
            <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
              {hero.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`#${ideasGuidance.id}`}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-100 hover:underline"
              >
                For Ideas &amp; Guidance
              </a>
              <a
                href={`#${opsExecution.id}`}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-100 hover:underline"
              >
                For Operation &amp; Execution
              </a>
              <a
                href={`#${team.id}`}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-100 hover:underline"
              >
                Be My Marketing Team
              </a>
            </div>
          </div>

          <div className="min-w-0">
            <div className="rounded-3xl border border-orange-200 bg-white shadow-sm p-4 sm:p-5 overflow-hidden">
              <div className="h-64 sm:h-72 w-full rounded-2xl bg-neutral-100 overflow-hidden">
                <img
                  src={hero.imageSrc}
                  alt={hero.imageAlt}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="mt-4 text-xs sm:text-sm text-neutral-700 leading-relaxed">
                This page is organized like pricing tables: pick a lane, compare options, then click in for details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* IDEAS & GUIDANCE */}
      <section
        id={ideasGuidance.id}
        className="mx-auto w-full max-w-6xl px-4 pt-10 pb-14 scroll-mt-28"
      >
        {/* UPDATED: make subtitle column narrower so the Guidebook fits inline */}
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          {/* Left: title + wrapped description */}
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
              {ideasGuidance.title}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-md">
              {ideasGuidance.subtitle}
            </p>
          </div>

          {/* Right: SMALL Guidebook pill, inline with the left */}
          <div className="min-w-0">
            <div className="rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden">
              {/* Left-to-right: Title/desc | Price | Button | Details */}
              <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.5fr_0.55fr_0.7fr_1.1fr] lg:items-center">
                {/* 1) Title + description */}
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-neutral-900">
                    {ideasGuidance.horizontalFeature.title}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">
                    {ideasGuidance.horizontalFeature.sub}
                  </p>
                </div>

                {/* 2) Price */}
                <div className="min-w-0">
                  <p className="text-[11px] text-neutral-600">Starting at</p>
                  <p className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-none">
                    {ideasGuidance.horizontalFeature.price}
                  </p>
                </div>

                {/* 3) Buy button */}
                <div className="min-w-0">
                  <Link
                    href={ideasGuidance.horizontalFeature.href}
                    className="inline-flex w-full lg:w-fit items-center justify-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    {ideasGuidance.horizontalFeature.ctaLabel} →
                  </Link>
                </div>

                {/* 4) Details */}
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
              <div className="p-6 sm:p-7 flex-1">
                <h3 className="text-xl font-semibold text-neutral-900">{c.title}</h3>
                <p className="mt-2 text-sm text-neutral-700">{c.sub}</p>

                <div className="mt-5">
                  <p className="text-xs text-neutral-600">Starting at</p>
                  <p className="text-3xl font-bold text-neutral-900">{c.price}</p>
                </div>

                <p className="mt-4 text-sm text-neutral-800 leading-relaxed">{c.body}</p>

                <Link
                  href={c.href}
                  className="mt-6 inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  {c.ctaLabel} →
                </Link>
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
          <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">{opsExecution.title}</h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-4xl">
            {opsExecution.subtitle}
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {opsExecution.cards.map((x) => (
              <Link
                key={x.title}
                href={x.href}
                className="group rounded-3xl border border-orange-200 bg-white px-6 py-6 shadow-sm transition hover:shadow-md hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <p className="text-sm font-semibold text-neutral-900 group-hover:text-orange-600">
                  {x.title}
                </p>
                <div className="mt-3">
                  <p className="text-xs text-neutral-600">Starting at</p>
                  <p className="text-2xl font-bold text-neutral-900">{x.price}</p>
                </div>
                <p className="mt-4 text-xs text-neutral-700">Click to view details →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BE MY MARKETING TEAM */}
      <section id={team.id} className="mx-auto w-full max-w-6xl px-4 pt-14 pb-20 scroll-mt-28">
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
                <p className="text-xs text-neutral-600">Pricing</p>
                <p className="text-3xl font-bold text-neutral-900">{team.leftPill.price}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={team.leftPill.href}
                  className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  {team.leftPill.ctaLabel}
                </a>

                <Link
                  href={team.leftPill.learnMoreHref}
                  className="inline-flex items-center justify-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100"
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
                <p className="text-sm font-semibold text-neutral-900">What you can expect</p>
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







  