"use client";

import { useState } from "react";

export default function GuidebookOutlineCompact() {
  const [selected, setSelected] = useState(0);

  const guidebookPages = [
    {
      title: "Intro",
      summary:
        "Summary: Content and guidebook overview.",
      keywords: ["Free Marketing Tools", "Paid Marketing Tools", "Marketing Guidebook"],
    },
    {
      title: "Purpose",
      summary:
        "Summary: What's inside. Limitation, How to interpret. Use cases.",
      keywords: ["How do I use this thing?"],
    },
    {
        title: "Owned & Operated Properties",
        summary:
          "Summary: Definitions, consistency, and how to take action with your properties.",
        keywords: ["Website", "Digital Properties", "User Point of View"],
      },
      {
        title: "Site & Property Audit",
        summary:
          "Summary: Do your properties do what you want them to?",
        keywords: ["Look & Feel", "Consistency", "Cohesion"],
      },
      {
        title: "Get the Most out of your: Website",
        summary:
          "Summary: Is your site easy to use and does it get you leads/clients/sales?",
        keywords: ["User Experience", "User Interface", "Function"],
      },
      {
        title: "Get the Most out of your: Google Profile",
        summary:
          "Summary: How can you best use the free profile on the world's largest search platform.",
        keywords: ["Google Business Profile"],
      },
      {
        title: "Get the Most out of your: Facebook Profile",
        summary:
          "Summary: How can you best use the free profile on one of the world's largest social platforms.",
        keywords: ["Facebook Page"],
      },
      {
        title: "Get the Most out of your: Yelp Page",
        summary:
          "Summary: How can you best use the free profile on one of the world's largest review platforms.",
        keywords: ["Yelp for Business","Yelp Listing"],
      },
      {
        title: "Get the Most out of your: Content",
        summary:
          "Summary: Have cool content? This page goes over how to use across platforms.",
        keywords: ["Instagram","Youtube","TikTok","Twitter","Reddit","Nextdoor"],
      },
      {
        title: "Get the Most out of your: Email & Other Software",
        summary:
          "Summary: A smaller section, but one touching on email and other useful business software.",
        keywords: ["Email Marketing","SaaS"],
      },
      {
        title: "Paid Ads",
        summary:
          "Summary: An overview of paid resources and how to use them.",
        keywords: ["Paid Media"],
      },
      {
        title: "Paid Search",
        summary:
          "Summary: Basics and information for 3 major search channels.",
        keywords: ["Google Ads","Yelp Ads","Bing/Microsoft Ads"],
      },
      {
        title: "Paid Social",
        summary:
          "Summary: Basics and information for 2 major social channels.",
        keywords: ["Meta Ads","Facebook Ads","Instagram Ads"],
      },
      {
        title: "Amazon Selling",
        summary:
          "Summary: Basics and information for selling on digital marketplaces.",
        keywords: ["Amazon Sponsored Ads","Amazon Store"],
      },
      {
        title: "Large Business Ad Facts",
        summary:
          "Summary: Basics and information for enterprise ad methods and tactics.",
        keywords: ["Programmatic Advertising","TV","Out of Home"],
      },
      {
        title: "Appendix",
        summary:
          "Summary: Specific examples to follow for your business.",
        keywords: ["Social Media Management","SEO","Email Marketing"],
      },
  ];
  

  const active = guidebookPages[selected];

  return (
    <div className="mt-8">
      {/* Selector row */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
        <span className="font-medium text-neutral-900">Select Page:</span>

        {guidebookPages.map((_, i) => {
          const isActive = i === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={[
                "h-8 w-8 rounded-full border text-sm font-medium transition",
                isActive
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-orange-300 hover:bg-orange-50",
              ].join(" ")}
              aria-label={`Select guidebook page ${i + 1}`}
              aria-pressed={isActive}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Single compact card */}
      <div className="mt-6 rounded-3xl border border-orange-200 bg-white px-6 py-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          {selected + 1}) {active.title}
        </h3>

        <p className="mt-3 text-base text-neutral-700 leading-relaxed">
          {active.summary}
        </p>

        <p className="mt-3 text-sm text-neutral-500">
          Topics / keywords:{" "}
          <span className="text-neutral-600">{active.keywords.join(", ")}</span>
        </p>
      </div>
    </div>
  );
}
