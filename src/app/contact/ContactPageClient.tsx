"use client";

import { useState } from "react";
import InquiryLauncher from "@/components/InquiryLauncher";

export default function ContactPageClient() {
    const [peopleFormOpen, setPeopleFormOpen] = useState(false);
    const [businessFormOpen, setBusinessFormOpen] = useState(false);

    return (
      <main className="bg-white text-neutral-900 px-4 pt-20 pb-32 flex justify-center">
        <div className="w-full max-w-5xl">
          {/* Page Title */}
          <h1 className="text-4xl font-bold text-neutral-900 text-center">
            Contact Us
          </h1>
          <p className="mt-3 text-center text-neutral-700 max-w-xl mx-auto">
            Whether you're a consumer looking for help or a business wanting to partner,
            we're here to listen - use the forms below.
            <br /><br />
            Our physical location is in Manayunk, Philadelphia, PA. Never been? Great small town vibe next to a big city. But, we're a remote team that helps people and clients all over.
            <br /><br />
            Where we have roots & connections:
            </p>

            <ul className="mt-3 text-center text-neutral-700 max-w-xl mx-auto list-disc list-inside">
            <li>Manayunk, Philadelphia, PA</li>
            <li>Wernersville & Reading, PA</li>
            <li>San Francisco, CA</li>
            <li>Las Vegas, NV</li>
            <li>Honolulu, HI</li>
            </ul>
  
          {/* Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-16">
  
            {/* For People Column */}
<section className="rounded-3xl border border-orange-200 bg-orange-50 p-8 shadow-sm">
  <h2 className="text-xl font-semibold text-orange-500 uppercase tracking-wide">
    for People
  </h2>

  <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
    Have a question about privacy tools, our education resources, or how our 
    mission works? This area contains a simple form for consumer inquiries.
    <br /><br />
  </p>
</section>

  
            {/* For Businesses Column */}
<section className="rounded-3xl border border-orange-200 bg-orange-50 p-8 shadow-sm">
  <h2 className="text-xl font-semibold text-orange-500 uppercase tracking-wide">
    for Businesses
  </h2>

  <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
    Want help with marketing? Interested in partnering with our ad network?
    Curious about ethical advertising programs? This column contains our business inquiry form.
    <br /><br />
  </p>
</section>

  
          </div>
{/* Full-width CTA */}
<div className="mt-12">
  <InquiryLauncher
    label="Fill Out Our Contact Form"
    defaultServices={["General Contact"]}
    sourceLabel="Contact Page — Full Width CTA"
    className="w-full inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-4 text-base sm:text-lg font-semibold text-white hover:bg-orange-600"
  />
</div>

        </div>
      </main>
    );
  }
  