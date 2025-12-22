"use client";

import { useState } from "react";

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
            we're here to listen. Select the category below — forms coming soon.
          </p>
  
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

    {/* Toggle link */}
    <span
      onClick={() => setPeopleFormOpen((prev) => !prev)}
      className="italic text-neutral-600 underline cursor-pointer hover:text-orange-500"
    >
      Click here to complete for People form. (Will take a second to load)
    </span>
  </p>

  {/* Dropdown Form Area */}
  {peopleFormOpen && (
    <div className="mt-6 rounded-2xl bg-white border border-orange-100 p-4">
      <iframe
        src="https://forms.gle/m4of5pfYoM1ky86w9"
        width="100%"
        height="700"
        frameBorder="0"
        marginHeight={0}
        marginWidth={0}
        className="w-full"
      >
        Loading…
      </iframe>
    </div>
  )}
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

    {/* Toggle link */}
    <span
      onClick={() => setBusinessFormOpen((prev) => !prev)}
      className="italic text-neutral-600 underline cursor-pointer hover:text-orange-500"
    >
      Complete for Businesses form. (Will take a second to load)
    </span>
  </p>

  {/* Dropdown Form */}
  {businessFormOpen && (
    <div className="mt-6 rounded-2xl bg-white border border-orange-100 p-4">
      <iframe
        src="https://forms.gle/eGpPWyMZCp5VeJbq6"
        width="100%"
        height="900"
        frameBorder="0"
        marginHeight={0}
        marginWidth={0}
        className="w-full"
      >
        Loading…
      </iframe>
    </div>
  )}
</section>

  
          </div>
        </div>
      </main>
    );
  }
  