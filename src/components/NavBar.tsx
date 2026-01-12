"use client";

import { useState } from "react";
import Link from "next/link";

export function NavBar() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-4 bg-orange-50 relative">
      <div className="flex w-full max-w-6xl items-center justify-between rounded-full bg-white px-6 py-3 shadow-lg border border-orange-100">
        {/* LEFT — BRAND */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-sm font-bold">
            afG
          </div>
          <span className="text-sm font-semibold text-neutral-900">ads for Good</span>
        </Link>

        {/* CENTER — NAV MENU (DESKTOP ONLY) */}
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
            <Link href="/#services" className="flex items-center gap-1 hover:text-neutral-900">
              Services
              <span className="text-[10px]">▾</span>
            </Link>

            {/* DROPDOWN PANEL */}
            <div
              className={`absolute left-1/2 top-full -translate-x-1/2 transition ${
                servicesOpen
                  ? "opacity-100 pointer-events-auto translate-y-0"
                  : "opacity-0 pointer-events-none -translate-y-1"
              }`}
            >
              <div className="mt-2 w-[420px] rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-lg">
                <div className="flex gap-12 justify-center text-left">
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
{/* ============================== */}
{/*  FOR BUSINESSES COLUMN         */}
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

  {/* Group 1 */}
  <p className="mt-3 text-xs font-semibold text-neutral-800">
    For Ideas &amp; Guidance
  </p>
  <ul className="mt-2 space-y-1 text-sm">
    <li>
      <Link
        href="/for-businesses/marketing-guidebook"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Marketing Guidebook
      </Link>
    </li>

    <li>
      <Link
        href="/for-businesses/marketing-advice"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Marketing Advice On Demand
      </Link>
    </li>

    <li>
      <Link
        href="/for-businesses/digital-health-check"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Digital Health Check
      </Link>
    </li>

    <li>
      <Link
        href="/for-businesses/consulting"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Consulting
      </Link>
    </li>
  </ul>

  {/* Group 2 */}
  <p className="mt-4 text-xs font-semibold text-neutral-800">
    For Operation &amp; Execution
  </p>
  <ul className="mt-2 space-y-1 text-sm">
   
    <li>
      <Link
        href="/for-businesses/website-builds-updates"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Website Builds &amp; Updates
      </Link>
    </li>

    <li>
      <Link
        href="/for-businesses/digital-profile-management"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Digital Profile Management
      </Link>
    </li>

    <li>
      <Link
        href="/for-businesses/seo-services"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        SEO Services
      </Link>
    </li>

    <li>
      <Link
        href="/for-businesses/digital-ads"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Digital Ads
      </Link>
    </li>

    <li>
      <Link
        href="/for-businesses/direct-mail"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Local Direct Mail
      </Link>
    </li>
    <li>
      <Link
        href="/for-businesses/marketing-team"
        className="flex items-center gap-2 hover:text-orange-500"
      >
        <span className="h-1.5 w-1.5 bg-neutral-800 rounded-[2px]" />
        Be My Marketing Team
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

        {/* RIGHT — CONTACT BUTTON (DESKTOP) + MOBILE MENU BUTTON */}
        <div className="flex items-center gap-3">
          {/* Desktop contact */}
          <Link
            href="/contact"
            className="hidden md:inline-flex text-sm font-medium rounded-full px-4 py-1.5 bg-orange-500 text-white hover:bg-orange-600"
          >
            Contact
          </Link>

          {/* Mobile: menu button */}
          <button
            className="md:hidden text-sm font-medium text-neutral-900 hover:text-neutral-900 rounded-full px-4 py-1.5 border border-orange-200 hover:bg-orange-50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Open menu"
          >
            Menu
          </button>
        </div>
      </div>

      {/* MOBILE — DROPDOWN PANEL */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 px-4 md:hidden">
          <div className="mx-auto w-full max-w-6xl rounded-2xl border border-orange-100 bg-white p-4 shadow-lg">
            <div className="flex flex-col gap-3 text-sm text-neutral-800">
              <Link href="/about" onClick={() => setMobileOpen(false)} className="hover:text-orange-500">
                About
              </Link>

              <div className="pt-2 border-t border-orange-100" />

              <Link href="/#services" onClick={() => setMobileOpen(false)} className="font-semibold hover:text-orange-500">
                Services
              </Link>

              {/* for People */}
              <Link href="/for-people" onClick={() => setMobileOpen(false)} className="font-semibold hover:text-orange-500">
                for People
              </Link>
              <Link href="/for-people/education" onClick={() => setMobileOpen(false)} className="pl-3 hover:text-orange-500">
                Education
              </Link>
              <Link href="/for-people/privacy-protection" onClick={() => setMobileOpen(false)} className="pl-3 hover:text-orange-500">
                Privacy Protection
              </Link>
              <Link href="/for-people/ad-network" onClick={() => setMobileOpen(false)} className="pl-3 hover:text-orange-500">
                ad Network
              </Link>

              <div className="pt-2 border-t border-orange-100" />

             {/* for Businesses (mobile) */}
<Link
  href="/for-businesses"
  onClick={() => setMobileOpen(false)}
  className="font-semibold hover:text-orange-500"
>
  for Businesses
</Link>

<p className="pl-3 pt-1 text-xs font-semibold text-neutral-800">
  For Ideas &amp; Guidance
</p>

<Link
  href="/for-businesses/marketing-guidebook"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  Marketing Guidebook
</Link>

<Link
  href="/for-businesses/marketing-advice"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  Marketing Advice On Demand
</Link>

<Link
  href="/for-businesses/digital-health-check"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  Digital Health Check
</Link>

<Link
  href="/for-businesses/consulting"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  Consulting
</Link>

<p className="pl-3 pt-3 text-xs font-semibold text-neutral-800">
  For Operation &amp; Execution
</p>

<Link
  href="/for-businesses/website-builds-updates"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  Website Builds &amp; Updates
</Link>

<Link
  href="/for-businesses/digital-profile-management"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  Digital Profile Management
</Link>

<Link
  href="/for-businesses/seo-services"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  SEO Services
</Link>

<Link
  href="/for-businesses/digital-ads"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  Digital Ads
</Link>

<Link
  href="/for-businesses/direct-mail"
  onClick={() => setMobileOpen(false)}
  className="pl-6 hover:text-orange-500"
>
  Local Direct Mail
</Link>

<Link
        href="/for-businesses/marketing-team"
        onClick={() => setMobileOpen(false)}
        className="pl-6 hover:text-orange-500"
    >
        Be My Marketing Team
</Link>



              <div className="pt-2 border-t border-orange-100" />

              <Link href="/for-good" onClick={() => setMobileOpen(false)} className="hover:text-orange-500">
                for Good
              </Link>

              {/* Mobile contact */}
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex justify-center text-sm font-medium rounded-full px-4 py-2 bg-orange-500 text-white hover:bg-orange-600"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}







