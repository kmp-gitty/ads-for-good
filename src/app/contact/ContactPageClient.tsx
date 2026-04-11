"use client";

import { useState } from "react";
import InquiryLauncher from "@/components/InquiryLauncher";

export default function ContactPageClient() {
  const [peopleFormOpen, setPeopleFormOpen] = useState(false);
  const [businessFormOpen, setBusinessFormOpen] = useState(false);

  return (
    <main className="bg-[#f7f4ee] text-neutral-900 px-4 pt-20 pb-28 flex justify-center">
      <div className="w-full max-w-6xl">

        {/* HERO (split layout) */}
        <section className="grid gap-10 md:grid-cols-2 items-start">
          
          {/* LEFT */}
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Contact Us
            </h1>

            <p className="mt-5 text-neutral-700 max-w-xl leading-relaxed">
              Whether you're a consumer looking for help or a business wanting to partner,
              we're here to listen - use the button to the right.
              <br /><br />
              Our physical location is in Manayunk, Philadelphia, PA. Never been? Great small town vibe next to a big city. But, we're a remote team that helps people and clients all over.
              <br /><br />
              Where we have roots & connections:
            </p>

            <ul className="mt-4 text-neutral-700 max-w-xl list-disc list-inside space-y-1">
              <li>Manayunk, Philadelphia, PA</li>
              <li>Wernersville & Reading, PA</li>
              <li>San Francisco, CA</li>
              <li>Las Vegas, NV</li>
              <li>Honolulu, HI</li>
            </ul>
          </div>

          {/* RIGHT (CTA ABOVE THE FOLD) */}
          <div className="flex items-center md:justify-end mt-6 md:mt-20">
            <div className="w-full max-w-sm rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-900">
                Get in touch
              </h2>
              <p className="mt-2 text-xs text-neutral-600">
                Quick form for any questions, partnership inquiry, or support.
              </p>

              <InquiryLauncher
                label="Fill Out Our Contact Form"
                defaultServices={["General Contact"]}
                sourceLabel="Contact Page — Hero CTA"
                className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600"
              />
            </div>
          </div>

        </section>

        {/* BOTTOM CARDS */}
        <section className="mt-20 grid gap-6 md:grid-cols-2">

          {/* FOR PEOPLE */}
          <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-orange-500 uppercase tracking-wide">
              for People
            </h2>

            <p className="mt-4 text-sm text-neutral-700 leading-relaxed">
              Have a question about privacy tools, our education resources, or how our 
              mission works? This area contains a simple form for consumer inquiries.
              <br /><br />
            </p>
          </div>

          {/* FOR BUSINESSES */}
          <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-orange-500 uppercase tracking-wide">
              for Businesses
            </h2>

            <p className="mt-4 text-sm text-neutral-700 leading-relaxed">
              Want help with marketing? Interested in partnering with our ad network?
              Curious about ethical advertising programs? This column contains our business inquiry form.
              <br /><br />
            </p>
          </div>

        </section>

      </div>
    </main>
  );
}