"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

type Satellite = {
  id: number;
  name: string;
  category: string;
  tagline: string;
  description: ReactNode; // string, or JSX with inline links
  slug: string; // internal detail page, e.g. /network/utilitycommons
  image?: string; // optional — falls back to a branded placeholder tile
  url?: string; // external site; defaults to https://<slug>.com
  ctaLabel?: string; // external CTA label; defaults to "Go to Calculator"
};

const SITES_PER_LOAD = 8;

// Placeholder satellites – replace / expand as you create real sites
const satellites: Satellite[] = [
  {
    id: 4,
    name: "Utility Commons",
    category: "Everyday Tools",
    tagline: "A growing family of everyday calculators, charts, and quizzes.",
    description: (
      <>
        The umbrella site for quick answers — from a{" "}
        <a
          href="https://utilitycommons.com/calculators/finance/tip-calculator/"
          target="_blank"
          rel="noopener"
          className="text-orange-500 hover:underline"
        >
          tip calculator
        </a>{" "}
        and{" "}
        <a
          href="https://utilitycommons.com/calculators/finance/take-home-pay-calculator/"
          target="_blank"
          rel="noopener"
          className="text-orange-500 hover:underline"
        >
          take-home pay calculator
        </a>{" "}
        to a full{" "}
        <a
          href="https://utilitycommons.com/charts/shoe-size-chart/"
          target="_blank"
          rel="noopener"
          className="text-orange-500 hover:underline"
        >
          shoe size chart
        </a>
        . Over 40 tools and counting.
      </>
    ),
    slug: "utilitycommons",
    image: "/images/UtilityCommons_Logo.png",
    url: "https://utilitycommons.com/",
    ctaLabel: "Go to Site",
  },
  {
    id: 1,
    name: "Steps to Miles Calculator",
    category: "Fitness & Health",
    tagline: "Calculate how far your steps have taken you.",
    description:
      "An easy to use calculator for estimating how far you've gone based on how many steps you've taken.",
    slug: "steps2miles",
    image: "/images/Steps2Miles_Logo.png"
  },
  {
    id: 2,
    name: "Group Bill Splitter",
    category: "Money & Tools",
    tagline: "Easily split any group bill or expense.",
    description:
      "An intuitive calculator for splitting a dinner bill, travel expenses, or any other shared cost.",
    slug: "splitbillsfairly",
    image: "/images/Splitbillsfairly.logo.png"
  },
  {
    id: 3,
    name: "Overtime Pay Calculator",
    category: "Money & Tools",
    tagline: "Estimate your expected overtime pay.",
    description:
      "A straightforward calculator for calculating your overtime pay - also use it to calculate your hourly rates and see your total pay.",
    slug: "calculateovertimepay",
    image: "/images/Overtimepaycalculator_logo.png"
  },
  // Add more as you create satellites...
];

export default function NetworkClient() {
    const [visibleCount, setVisibleCount] = useState(SITES_PER_LOAD);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
    // If a topic is selected, filter the satellites; otherwise show all
    const filteredSatellites = selectedCategory
      ? satellites.filter((site) => site.category === selectedCategory)
      : satellites;
  
    // Only show up to visibleCount
    const visibleSites = filteredSatellites.slice(0, visibleCount);
    const canLoadMore = visibleCount < filteredSatellites.length;
  
    const handleLoadMore = () => {
      setVisibleCount((prev) =>
        Math.min(prev + SITES_PER_LOAD, filteredSatellites.length)
      );
    };
  
    const handleCategoryClick = (category: string) => {
      setSelectedCategory(category);
      setVisibleCount(SITES_PER_LOAD); // reset count when switching filters
    };
  
    const handleClearFilter = () => {
      setSelectedCategory(null);
      setVisibleCount(SITES_PER_LOAD); // reset when unfiltering
    };

  return (
    <main className="bg-white text-neutral-900 px-4 pt-16 pb-24 flex justify-center">
      <div className="w-full max-w-6xl grid gap-10 md:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
        {/* LEFT: Main content (satellite tiles) */}
        <section>
          {/* Page title */}
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
              our Network
            </h1>
            <p className="mt-4 text-neutral-700 max-w-2xl text-sm sm:text-base">
              A family of small, useful sites for everyday life — calculators, checklists, and
              quiet little tools that make the internet feel a bit less extractive, and a bit
              more for Good.
            </p>
          </header>

          {/* Tiles grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {visibleSites.map((site) => (
              <article
                key={site.id}
                className="flex flex-col rounded-3xl bg-orange-50/40 border border-orange-100 overflow-hidden shadow-sm"
              >
                {/* Top media area (image, or branded placeholder if none) */}
                <div className="relative h-40 bg-neutral-200/60">
                    {site.image ? (
                      <Image
                        src={site.image}
                        alt={`${site.name} preview`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={site.id === 1}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                        <span className="px-4 text-center text-lg font-bold text-orange-600">
                          {site.name}
                        </span>
                      </div>
                    )}

                  {/* Category badge */}
                  <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-neutral-700 shadow-sm">
                    {site.category}
                  </div>
                </div>

                {/* Bottom text area */}
                <div className="flex flex-1 flex-col bg-white px-5 py-4">
                  <h2 className="mt-1 text-base font-semibold text-neutral-900">
                    {site.name}
                  </h2>
                  <p className="mt-1 text-xs text-neutral-600">
                    {site.tagline}
                  </p>
                  <p
                    className={
                      typeof site.description === "string"
                        ? "mt-2 text-sm text-neutral-700 line-clamp-3"
                        : "mt-2 text-sm text-neutral-700"
                    }
                  >
                    {site.description}
                  </p>

                  {/* Learn more row – will later link to a detail article */}
                  {/* Bottom row: Learn more (left) + Go to Calculator (right) */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                    <Link
                        href={`/network/${site.slug}`}
                        className="group inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:underline"
                    >
                        Learn more
                        <span
                        aria-hidden="true"
                        className="text-lg transition-transform group-hover:translate-x-0.5"
                        >
                        →
                        </span>
                    </Link>

                    <a
                        href={site.url ?? `https://${site.slug}.com`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-2 text-sm font-medium text-black hover:underline"
                    >
                        {site.ctaLabel ?? "Go to Calculator"} <span aria-hidden="true">↑</span>
                    </a>
                    </div>

                </div>
              </article>
            ))}
          </div>

          {/* Load more button */}
          {canLoadMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="rounded-full border border-orange-200 bg-orange-50 px-5 py-2 text-sm font-medium text-neutral-900 hover:bg-orange-100 transition"
              >
                Load previous sites
              </button>
            </div>
          )}
        </section>

        {/* RIGHT: Sidebar (future callouts / explanations) */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 py-4">
          <h3 className="text-sm font-semibold text-neutral-900">
  <Link href="/ad-network" className="hover:underline text-orange-500">
    What is the network?
  </Link>
</h3>
            <p className="mt-2 text-xs text-neutral-700">
              A collection of small, useful sites we own and operate. They&apos;re built to be
              helpful first — and ad-supported second.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              How this stays &quot;for Good&quot;
            </h3>
            <p className="mt-2 text-xs text-neutral-700">
  20% revenue that flows through these sites doesn&apos;t stay with us. It
  helps support local causes and communities — details live on the{" "}
  <Link href="/for-good" className="text-orange-500 hover:underline">
    for Good page.
  </Link>
</p>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 py-4">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold text-neutral-900">
      Topic groups
    </h3>

    {/* Instruction / unfilter text */}
    {selectedCategory ? (
      <button
        type="button"
        onClick={handleClearFilter}
        className="text-[11px] text-neutral-900 underline hover:text-orange-500"
      >
        Click here to unfilter
      </button>
    ) : (
      <span className="text-[11px] text-neutral-700">
        Click a topic group below to filter
      </span>
    )}
  </div>

  <ul className="mt-2 space-y-1 text-xs text-neutral-700">
    <li>
      <button
        type="button"
        onClick={() => handleCategoryClick("Home & Everyday")}
        className="text-neutral-900 hover:text-orange-500 hover:underline"
      >
        Home &amp; Everyday tools
      </button>
    </li>
    <li>
      <button
        type="button"
        onClick={() => handleCategoryClick("Fitness & Health")}
        className="text-neutral-900 hover:text-orange-500 hover:underline"
      >
        Fitness &amp; Health utilities
      </button>
    </li>
    <li>
      <button
        type="button"
        onClick={() => handleCategoryClick("Mind & Psychology")}
        className="text-neutral-900 hover:text-orange-500 hover:underline"
      >
        Mind &amp; Psychology check-ins
      </button>
    </li>
    <li>
      <button
        type="button"
        onClick={() => handleCategoryClick("Money & Tools")}
        className="text-neutral-900 hover:text-orange-500 hover:underline"
      >
        Money &amp; Practical calculators
      </button>
    </li>
  </ul>
</div>

        </aside>
      </div>
    </main>
  );
}
