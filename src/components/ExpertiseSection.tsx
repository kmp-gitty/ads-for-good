"use client";

import { useState } from "react";

type ExpertiseItem = {
  title: string;
  sectionOneTitle: string;
  sectionOneBody: string;
  sectionTwoTitle: string;
  sectionTwoBody: string;
};

const expertiseItems: ExpertiseItem[] = [
  {
    title: "SEO",
    sectionOneTitle: "Technical SEO",
    sectionOneBody:
      "Are the hidden elements that search engines only see setup properly?",
    sectionTwoTitle: "Authority & Content Strategy",
    sectionTwoBody:
      "What actions do you need to take to rank higher in search results?",
  },
  {
    title: "Paid Ads",
    sectionOneTitle: "Digital Ads",
    sectionOneBody:
      "Paid social, paid search, programmatic, ecommerce, direct-buys, etc.",
    sectionTwoTitle: "Direct Mail and More",
    sectionTwoBody:
      "Create custom and out of the box campaigns to fit your need.",
  },
  {
    title: "Email Marketing",
    sectionOneTitle: "Operations & Execution",
    sectionOneBody:
      "Are you setup for success? Do you have a segmentation strategy?",
    sectionTwoTitle: "Content & Analysis",
    sectionTwoBody:
      "How can your emails convert better and earn more revenue?",
  },
  {
    title: "Websites",
    sectionOneTitle: "Builds",
    sectionOneBody:
      "Need a custom site that doesn't break the bank?",
    sectionTwoTitle: "Updates & Support",
    sectionTwoBody:
      "Just need a facelift instead? Need someone to make edits or increase site security?",
  },
  {
    title: "Digital Profile Management",
    sectionOneTitle: "Review Platforms",
    sectionOneBody:
      "Want time back from review, comment, and other replies?",
    sectionTwoTitle: "Social Platforms",
    sectionTwoBody:
      "Need more social media engagement and planning/",
  },
  {
    title: "Marketing Operations",
    sectionOneTitle: "Marketing Technology",
    sectionOneBody:
      "Are you using the right tools to push your business forward?",
    sectionTwoTitle: "Marketing Activity",
    sectionTwoBody:
      "Need someone to cleanup your CRM? Too mamny bots hitting your site? Any other marketing problems?",
  },
];

function ExpertiseCard({
  item,
  isOpen,
  onOpen,
  onClose,
}: {
  item: ExpertiseItem;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
    return (
        <div
          className="group relative"
          onMouseEnter={onOpen}
          onMouseLeave={onClose}
          onFocus={onOpen}
          onBlur={onClose}
        >
          <button
            type="button"
            onClick={isOpen ? onClose : onOpen}
            className={`relative w-full rounded-3xl border px-6 py-5 text-left transition duration-300 ${
              isOpen
                ? "z-10 border-orange-300 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.10)]"
                : "z-10 border-orange-200 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
            }`}
            aria-expanded={isOpen}
          >
            <h3 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {item.title}
            </h3>
            <p className="mt-3 text-sm text-neutral-500">Explore area</p>
          </button>
      
          <div
            className={`absolute inset-x-0 top-[115px] transition-all duration-300 ${
              isOpen
                ? "pointer-events-auto opacity-100 translate-y-0"
                : "pointer-events-none opacity-0 translate-y-2"
            }`}
          >
            <div className="relative h-[330px]">
              {/* Card 2 */}
              <div className="absolute inset-x-3 top-0 z-20 rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_14px_36px_rgba(0,0,0,0.10)]">
                <h4 className="text-lg font-semibold text-neutral-900">
                  {item.sectionOneTitle}
                </h4>
                <p className="mt-3 text-sm leading-7 text-neutral-700">
                  {item.sectionOneBody}
                </p>
              </div>
      
              {/* Card 3 */}
              <div className="absolute inset-x-6 top-[140px] z-30 rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
                <h4 className="text-lg font-semibold text-neutral-900">
                  {item.sectionTwoTitle}
                </h4>
                <p className="mt-3 text-sm leading-7 text-neutral-700">
                  {item.sectionTwoBody}
                </p>
              </div>
            </div>
          </div>
      
          <div className={isOpen ? "h-[345px]" : "h-0"} />
        </div>
      );
}

export default function ExpertiseSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Areas of Marketing Knowledge and Expertise
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {expertiseItems.map((item, index) => (
            <ExpertiseCard
              key={item.title}
              item={item}
              isOpen={openIndex === index}
              onOpen={() => setOpenIndex(index)}
              onClose={() =>
                setOpenIndex((current) => (current === index ? null : current))
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}