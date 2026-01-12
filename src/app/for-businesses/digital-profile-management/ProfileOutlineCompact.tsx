"use client";

import { useState } from "react";

export default function ProfileOutlineCompact() {
  const [selected, setSelected] = useState(0);

  const outline = [
    {
      title: "Google Business Profile",
      summary:
        "Keep your knowledge panel and map pin accurate and up to date. Use this service to respond to reviews and obtain new ones too.",
    },
    {
      title: "Yelp Listing",
      summary:
        "Receive listing management from a former Yelper. Use this service to respond to reviews and obtain new ones too.",
    },
    {
      title: "Facebook Page",
      summary:
        "How you manage this page should depend on your business type and offerings - receive bespoke service based on what you offer.",
    },
    {
      title: "Instagram",
      summary:
        "How you manage this page should depend on your business type and offerings - receive bespoke service based on what you offer",
    },
    {
      title: "Angi Profile",
      summary:
        "Are you a services business on Angi? We can manage, interact, and update this profile too.",
    },
    {
      title: "Reddit",
      summary:
        "Profiles and ads only work with a dedicated community manager on this platform - use this service for efficient engagement.",
    },
    {
      title: "LinkedIn Page",
      summary:
        "Keep your business profile up to date, on the most businessy platform around.",
    },
    {
      title: "Other",
      summary:
        "Use another platform for something else? Let us know, and we can take over.",
    },
  ];

  const active = outline[selected];

  return (
    <div className="mt-8">
      {/* Selector row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-neutral-900 mr-1">
          Select profile:
        </span>

        {outline.map((item, i) => {
          const isActive = i === selected;

          return (
            <button
              key={item.title}
              type="button"
              onClick={() => setSelected(i)}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                isActive
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-orange-300 hover:bg-orange-50",
              ].join(" ")}
              aria-pressed={isActive}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Active content card */}
      <div className="mt-6 rounded-3xl border border-orange-200 bg-white px-6 py-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          {active.title}
        </h3>

        <p className="mt-3 text-base text-neutral-700 leading-relaxed">
          {active.summary}
        </p>
      </div>
    </div>
  );
}

