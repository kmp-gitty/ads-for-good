"use client";

import Link from "next/link";

const articles = [
  { title: "How to Monetize A Site", href: "#" },
  { title: "Google AdSense", href: "#" },
  { title: "Google Ad Manager", href: "#" },
  { title: "What is Programmatic Advertising", href: "#" },
  { title: "How Do I Know if I Can Monetize", href: "#" },
];

export default function ArticlesStrip() {
  // duplicate for seamless loop
  const items = [...articles, ...articles];

  return (
    <section className="bg-[#F6F3EF]">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="grid items-center gap-6 md:grid-cols-12">
          <div className="md:col-span-3">
            <h3 className="text-3xl font-black tracking-tight text-black">
              Helpful Articles:
            </h3>
          </div>

          <div className="md:col-span-9">
            <div className="relative">
              {/* viewport */}
              <div
                className="overflow-hidden"
                // “take away” manual scrolling
                onWheel={(e) => e.preventDefault()}
                onTouchMove={(e) => e.preventDefault()}
              >
                {/* moving track */}
                <div className="tb-marquee group flex w-max gap-4 py-1">
                  {items.map((a, i) => (
                    <article
                      key={`${a.title}-${i}`}
                      className="min-w-[220px] rounded-xl border border-neutral-200 bg-neutral-50 p-4"
                    >
                      <h4 className="text-base font-black leading-snug text-black">
                        {a.title}
                      </h4>

                      <div className="mt-3">
                        <Link
                          href={a.href}
                          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Read
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* subtle fade edges */}
              <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent" />

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}