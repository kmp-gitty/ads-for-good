"use client";

import { useState } from "react";

type Item = {
  title: string;
  body: string;
  stat?: string;
};

const items: Item[] = [
  {
    title: "Industry Publisher: Lubes'n'Greases",
    body: "Tigerbyte Digital has been their full-service Ad Ops partner for over 4 years. Helping onboard, traffic, manage, and optimize over 25 advertisers across display & newsletter ad placements.",
    stat: "+27% Lifetime Advertiser Revenue",
  },
  {
    title: "Independent Newspaper: Community Advocate",
    body: "Tigerbyte Digital modernized their ad offerings, by integrating Google Ad Manager into their digital edition for increased advertiser offerings and revenue.",
    stat: "+60% Advertising Revenue",
  },
];

export default function RaveAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="grid gap-10 md:grid-cols-12 md:items-start">
          {/* Left */}
          <div className="md:col-span-5">
            <h2 className="text-5xl font-black tracking-tight text-black">
              How Publishers Rave
            </h2>
            <p className="mt-6 max-w-[40ch] text-base text-neutral-700">
              For our 10 years of being in business, we&apos;ve helped
              Publishers increase their ad revenue by an average of 40%.
            </p>
          </div>

          {/* Right: Accordion */}
          <div className="md:col-span-7">
            <div className="space-y-4">
              {items.map((item, idx) => {
                const isOpen = idx === openIndex;
                return (
                  <div
                    key={item.title}
                    className={[
                      "rounded-3xl border border-transparent",
                      isOpen ? "bg-[#E9D8FF]" : "bg-[#E9D8FF]",
                    ].join(" ")}
                  >
                    {/* Header */}
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                      className="flex w-full items-center justify-between gap-6 px-8 py-6 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-xl font-black tracking-tight text-black">
                        {item.title}
                      </span>

                      <span
                        className={[
                          "inline-flex h-10 w-10 items-center justify-center rounded-full",
                          "text-black",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M6 9l6 6 6-6"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              transformOrigin: "50% 50%",
                              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 200ms ease",
                            }}
                          />
                        </svg>
                      </span>
                    </button>

                    {/* Panel */}
                    {isOpen && (
                      <div className="px-8 pb-10">
                        <p className="max-w-[55ch] text-lg leading-relaxed text-black">
                          {item.body}
                        </p>

                        <div className="mt-10 flex items-end justify-between gap-10">
                          <div className="text-7xl font-black tracking-tight text-black">
                            {item.stat ?? "+0%"}
                          </div>

                          {/* simple “growth” icon placeholder */}
                          <div className="h-28 w-44">
                            <svg
                              viewBox="0 0 220 140"
                              className="h-full w-full"
                              fill="none"
                            >
                              <path
                                d="M20 110 C60 80, 90 90, 120 60 C150 30, 170 40, 200 20"
                                stroke="#111"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <path
                                d="M195 20 L206 20 L206 31"
                                stroke="#111"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <rect x="22" y="102" width="26" height="24" fill="#111" />
                              <rect x="60" y="86" width="26" height="40" fill="#111" />
                              <rect x="98" y="68" width="26" height="58" fill="#111" />
                              <rect x="136" y="50" width="26" height="76" fill="#111" />
                              <rect x="174" y="28" width="26" height="98" fill="#111" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}