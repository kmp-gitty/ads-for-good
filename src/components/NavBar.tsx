"use client";

import { useState } from "react";
import Link from "next/link";

export function NavBar() {
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-4 bg-orange-50">
      <div className="flex w-full max-w-6xl items-center justify-between rounded-full bg-white px-6 py-3 shadow-lg border border-orange-100">
        
        {/* LEFT — BRAND */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-sm font-bold">
            afG
          </div>
          <span className="text-sm font-semibold text-neutral-900">
            ads for Good
          </span>
        </Link>

        {/* CENTER — NAV MENU */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-700">

          {/* ABOUT */}
          <Link href="/about" className="hover:text-neutral-900">
            About
          </Link>

          {/* SERVICES + DROPDOWN */}
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            {/* Always go to /#services so history/back works properly */}
            <Link
              href="/#services"
              className="flex items-center gap-1 hover:text-neutral-900"
            >
              Services
              <span className="text-[10px]">▾</span>
            </Link>

            {/* DROPDOWN PANEL */}
            <div
              className={`absolute left-1/2 top-full -translate-x-1/2 transition
                ${
                  servicesOpen
                    ? "opacity-100 pointer-events-auto translate-y-0"
                    : "opacity-0 pointer-events-none -translate-y-1"
                }`}
            >
              <div className="mt-2 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-lg">
                <div className="flex gap-10 text-left">

                  {/* ============================== */}
                  {/*  FOR PEOPLE COLUMN             */}
                  {/* ============================== */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      <Link
                        href="/for-people"
                        className="hover:text-orange-500 hover:underline"
                      >
                        for People
                      </Link>
                    </p>

                    <ul className="mt-2 space-y-1 text-sm">

                      <li>
                        <Link
                          href="/for-people/education"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                          Education
                        </Link>
                      </li>

                      <li>
                        <Link
                          href="/for-people/privacy-protection"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                          Privacy Protection
                        </Link>
                      </li>

                      <li>
                        <Link
                          href="/for-people/ad-network"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                          ad Network
                        </Link>
                      </li>

                    </ul>
                  </div>

                  {/* ============================== */}
                  {/*  FOR BUSINESSES COLUMN        */}
                  {/* ============================== */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      <Link
                        href="/for-businesses"
                        className="hover:text-orange-500 hover:underline"
                      >
                        for Businesses
                      </Link>
                    </p>

                    <ul className="mt-2 space-y-1 text-sm">

                      <li>
                        <Link
                          href="/for-businesses/ask-us-anything"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                          Ask Us Anything
                        </Link>
                      </li>

                      <li>
                        <Link
                          href="/for-businesses/consulting"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                          Consulting
                        </Link>
                      </li>

                      <li>
                        <Link
                          href="/for-businesses/marketing-guidebook"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                          Marketing Guidebook
                        </Link>
                      </li>

                      <li>
                        <Link
                          href="/for-businesses/local-marketing"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                          Local Direct Mail
                        </Link>
                      </li>

                    </ul>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* FOR GOOD */}
          <Link href="/for-good" className="hover:text-neutral-900">
            for Good
          </Link>
        </nav>

        {/* RIGHT — CONTACT BUTTON */}
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="text-sm font-medium rounded-full px-4 py-1.5 bg-orange-500 text-white hover:bg-orange-600"
          >
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}






