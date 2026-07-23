"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();

  if (pathname?.startsWith("/for-clients") || pathname?.startsWith("/chapter")) {
    return null;
  }

  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // desktop dropdown hover state
  const [aboutDesktopOpen, setAboutDesktopOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [marginOpen, setMarginOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 relative flex justify-center bg-orange-50 px-4 pt-4">
      <div className="flex w-full max-w-6xl items-center justify-between rounded-full border border-orange-100 bg-white px-6 py-3 shadow-lg">
        {/* LEFT — BRAND */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
            afG
          </div>
          <span className="text-sm font-semibold text-neutral-900">ads for Good</span>
        </Link>

        {/* CENTER — NAV MENU (DESKTOP ONLY) */}
        <nav className="hidden items-center gap-5 text-sm text-neutral-700 lg:flex">
          {/* ABOUT */}
          <div
            className="relative"
            onMouseEnter={() => setAboutDesktopOpen(true)}
            onMouseLeave={() => setAboutDesktopOpen(false)}
          >
            <Link href="/about" className="flex items-center gap-1 whitespace-nowrap hover:text-neutral-900">
              About
              <span className="text-[10px]">▾</span>
            </Link>

            <div
              className={`absolute left-1/2 top-full -translate-x-1/2 transition ${
                aboutDesktopOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <div className="mt-2 w-[240px] rounded-2xl border border-orange-100 bg-white px-3 py-3 shadow-lg">
                <div className="flex flex-col gap-2 text-sm text-neutral-800">
                  <Link
                    href="/privacy"
                    className="rounded-lg px-2 py-2 hover:bg-orange-50 hover:text-orange-500"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms-disclaimer"
                    className="rounded-lg px-2 py-2 hover:bg-orange-50 hover:text-orange-500"
                  >
                    Terms &amp; Disclaimer
                  </Link>
                  <Link
                    href="/about"
                    className="rounded-lg px-2 py-2 hover:bg-orange-50 hover:text-orange-500"
                  >
                    Who We Are
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <span aria-hidden className="h-4 w-px bg-orange-300" />

          {/* FOR GROWTH — Plans + Chapter */}
          <div
            className="relative"
            onMouseEnter={() => setSupportOpen(true)}
            onMouseLeave={() => setSupportOpen(false)}
          >
            <Link
              href="/for-businesses"
              className="flex items-center gap-1 whitespace-nowrap hover:text-neutral-900"
            >
              for Growth
              <span className="text-[10px]">▾</span>
            </Link>

            <div
              className={`absolute left-1/2 top-full -translate-x-1/2 transition ${
                supportOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <div className="mt-2 w-[260px] rounded-2xl border border-orange-100 bg-white px-4 py-4 shadow-lg">
                <div className="text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    How We Work
                  </p>

                  <Link
                    href="/for-businesses"
                    className="mt-3 block text-sm font-semibold text-neutral-900 hover:text-orange-500"
                  >
                    View All Plans
                  </Link>

                  <ul className="mt-3 space-y-2 text-sm">
                    <li>
                      <Link
                        href="/for-businesses#plans"
                        className="flex items-center gap-2 hover:text-orange-500"
                      >
                        <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                        Support
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/for-businesses#plans"
                        className="flex items-center gap-2 hover:text-orange-500"
                      >
                        <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                        Partner
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/for-businesses#plans"
                        className="flex items-center gap-2 hover:text-orange-500"
                      >
                        <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                        Team
                      </Link>
                    </li>
                  </ul>

                  <p className="mt-7 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Our Own Technology
                  </p>

                  <Link
                    href="/for-businesses/lifecycle-attribution"
                    className="mt-3 block text-sm font-semibold text-neutral-900 hover:text-orange-500"
                  >
                    Lifecycle Attribution
                  </Link>

                  <ul className="mt-2 space-y-1 text-sm">
                    <li>
                      <Link
                        href="/for-businesses/lifecycle-attribution"
                        className="flex items-center gap-2 hover:text-orange-500"
                      >
                        <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                        Chapter
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <span aria-hidden className="h-4 w-px bg-orange-300" />

          {/* FOR CLARITY — direct link to Chapter page */}
          <Link
            href="/for-businesses/lifecycle-attribution"
            className="whitespace-nowrap hover:text-neutral-900"
          >
            for Clarity
          </Link>

          <span aria-hidden className="h-4 w-px bg-orange-300" />

          {/* FOR MARGIN — Chapter standalones (more revenue / less cost) */}
          <div
            className="relative"
            onMouseEnter={() => setMarginOpen(true)}
            onMouseLeave={() => setMarginOpen(false)}
          >
            <span className="flex cursor-default items-center gap-1 whitespace-nowrap hover:text-neutral-900">
              for Margin
              <span className="text-[10px]">▾</span>
            </span>

            <div
              className={`absolute left-1/2 top-full -translate-x-1/2 transition ${
                marginOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <div className="mt-2 w-[280px] rounded-2xl border border-orange-100 bg-white px-4 py-4 shadow-lg">
                <div className="text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Getting More
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li>
                      <Link
                        href="/for-businesses/smart-links"
                        className="flex items-center gap-2 hover:text-orange-500"
                      >
                        <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                        Smart Links
                        <span className="text-[10px] font-semibold text-orange-500">Available Self-Serve</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/for-businesses/smart-prompts"
                        className="flex items-center gap-2 hover:text-orange-500"
                      >
                        <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                        Smart Prompts
                        <span className="text-[10px] font-semibold text-orange-500">Available Self-Serve</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/for-businesses/ad-monetization"
                        className="flex items-center gap-2 hover:text-orange-500"
                      >
                        <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                        Ad Monetization
                      </Link>
                    </li>
                  </ul>

                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Spending Less
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li>
                      <Link
                        href="/for-businesses/reduce-software-costs"
                        className="flex items-center gap-2 hover:text-orange-500"
                      >
                        <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                        Subscription Freedom
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <span aria-hidden className="h-4 w-px bg-orange-300" />

          {/* FOR SERVICES — Ideas & Guidance + Operation & Execution */}
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <span className="flex cursor-default items-center gap-1 whitespace-nowrap hover:text-neutral-900">
              for Services
              <span className="text-[10px]">▾</span>
            </span>

            <div
              className={`absolute left-1/2 top-full -translate-x-1/2 transition ${
                servicesOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <div className="mt-2 w-[560px] rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-lg">
                <div className="grid grid-cols-2 gap-10 text-left">
                  {/* LEFT — IDEAS & GUIDANCE */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Ideas &amp; Guidance
                    </p>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li>
                        <Link
                          href="/for-businesses/marketing-guidebook"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Marketing Guidebook
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/marketing-advice"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Marketing Advice On Demand
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/digital-health-check"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Digital Health Check
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/consulting"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Consulting
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* RIGHT — OPERATION & EXECUTION */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Operation &amp; Execution
                    </p>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li>
                        <Link
                          href="/for-businesses/website-builds-updates"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Website Builds &amp; Updates
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/digital-profile-management"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Digital Profile Management
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/seo-services"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          SEO Services
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/digital-ads"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Digital Ads
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/direct-mail"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Local Direct Mail
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/email-marketing"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Email Marketing
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/for-businesses/marketing-ops"
                          className="flex items-center gap-2 hover:text-orange-500"
                        >
                          <span className="h-1.5 w-1.5 rounded-[2px] bg-neutral-800" />
                          Marketing Operations
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <span aria-hidden className="h-4 w-px bg-orange-300" />

          {/* FOR GOOD */}
          <Link href="/for-good" className="whitespace-nowrap hover:text-neutral-900">
            for Good
          </Link>
        </nav>

        {/* RIGHT — CONTACT BUTTON + MOBILE MENU BUTTON */}
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600 lg:inline-flex"
          >
            Contact
          </Link>

          <button
            className="rounded-full border border-orange-200 px-4 py-1.5 text-sm font-medium text-neutral-900 hover:bg-orange-50 hover:text-neutral-900 lg:hidden"
            onClick={() => {
              setMobileOpen((v) => !v);
              setAboutOpen(false);
            }}
            aria-label="Open menu"
          >
            Menu
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
  <div className="fixed inset-x-0 top-[88px] bottom-4 z-[60] px-4 lg:hidden">
          <div className="mx-auto h-full w-full max-w-6xl overflow-y-auto overscroll-contain rounded-2xl border border-orange-100 bg-white p-4 shadow-lg touch-pan-y">
            <div className="flex flex-col gap-3 text-sm text-neutral-800">
              {/* ABOUT */}
              <div>
                <div className="flex items-center justify-between">
                  <Link
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    className="hover:text-orange-500"
                  >
                    About
                  </Link>

                  <button
                    type="button"
                    onClick={() => setAboutOpen((v) => !v)}
                    className="ml-2 text-[10px] hover:text-orange-500"
                    aria-expanded={aboutOpen}
                    aria-controls="mobile-about-menu"
                  >
                    {aboutOpen ? "▴" : "▾"}
                  </button>
                </div>

                {aboutOpen && (
                  <div id="mobile-about-menu" className="mt-2 flex flex-col gap-2 pl-3">
                    <Link
                      href="/privacy"
                      onClick={() => {
                        setMobileOpen(false);
                        setAboutOpen(false);
                      }}
                      className="hover:text-orange-500"
                    >
                      Privacy
                    </Link>

                    <Link
                      href="/terms-disclaimer"
                      onClick={() => {
                        setMobileOpen(false);
                        setAboutOpen(false);
                      }}
                      className="hover:text-orange-500"
                    >
                      Terms &amp; Disclaimer
                    </Link>

                    <Link
                      href="/about"
                      onClick={() => {
                        setMobileOpen(false);
                        setAboutOpen(false);
                      }}
                      className="hover:text-orange-500"
                    >
                      Who We Are
                    </Link>
                  </div>
                )}
              </div>

              <div className="border-t border-orange-100 pt-2" />

              {/* FOR GROWTH */}
              <Link
                href="/for-businesses"
                onClick={() => setMobileOpen(false)}
                className="font-semibold hover:text-orange-500"
              >
                for Growth
              </Link>

              <p className="pl-3 pt-1 text-xs font-semibold text-neutral-800">How We Work</p>
              <Link
                href="/for-businesses"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                View All Plans
              </Link>
              <Link
                href="/for-businesses#plans"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Support
              </Link>
              <Link
                href="/for-businesses#plans"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Partner
              </Link>
              <Link
                href="/for-businesses#plans"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Team
              </Link>

              <p className="pl-3 pt-2 text-xs font-semibold text-neutral-800">Our Own Technology</p>
              <Link
                href="/for-businesses/lifecycle-attribution"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Chapter: Lifecycle Attribution
              </Link>

              <div className="border-t border-orange-100 pt-2" />

              {/* FOR CLARITY */}
              <Link
                href="/for-businesses/lifecycle-attribution"
                onClick={() => setMobileOpen(false)}
                className="hover:text-orange-500"
              >
                <span className="font-semibold">for Clarity:</span> Our Marketing Tech
              </Link>

              <div className="border-t border-orange-100 pt-2" />

              {/* FOR MARGIN */}
              <p className="font-semibold text-neutral-900">for Margin</p>
              <p className="pl-3 pt-1 text-xs font-semibold text-neutral-800">
                Getting More
              </p>
              <Link
                href="/for-businesses/smart-links"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Smart Links
                <span className="ml-2 text-[10px] font-semibold text-orange-500">Available Self-Serve</span>
              </Link>
              <Link
                href="/for-businesses/smart-prompts"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Smart Prompts
                <span className="ml-2 text-[10px] font-semibold text-orange-500">Available Self-Serve</span>
              </Link>
              <Link
                href="/for-businesses/ad-monetization"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Ad Monetization
              </Link>
              <p className="pl-3 pt-2 text-xs font-semibold text-neutral-800">
                Spending Less
              </p>
              <Link
                href="/for-businesses/reduce-software-costs"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Subscription Freedom
              </Link>

              <div className="border-t border-orange-100 pt-2" />

              {/* FOR SERVICES */}
              <p className="font-semibold text-neutral-900">for Services</p>
              <p className="pl-3 pt-1 text-xs font-semibold text-neutral-800">
                Ideas &amp; Guidance
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

              <p className="pl-3 pt-2 text-xs font-semibold text-neutral-800">
                Operation &amp; Execution
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
                href="/for-businesses/email-marketing"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Email Marketing
              </Link>
              <Link
                href="/for-businesses/marketing-ops"
                onClick={() => setMobileOpen(false)}
                className="pl-6 hover:text-orange-500"
              >
                Marketing Operations
              </Link>

              <div className="border-t border-orange-100 pt-2" />

              {/* PEOPLE */}
              <Link
                href="/for-people"
                onClick={() => setMobileOpen(false)}
                className="font-semibold hover:text-orange-500"
              >
                for People
              </Link>
              <Link
                href="/for-people/education"
                onClick={() => setMobileOpen(false)}
                className="pl-3 hover:text-orange-500"
              >
                Education
              </Link>
              <Link
                href="/for-people/privacy-protection"
                onClick={() => setMobileOpen(false)}
                className="pl-3 hover:text-orange-500"
              >
                Privacy Protection
              </Link>
              <Link
                href="/for-people/ad-network"
                onClick={() => setMobileOpen(false)}
                className="pl-3 hover:text-orange-500"
              >
                ad Network
              </Link>

              <div className="border-t border-orange-100 pt-2" />

              <Link
                href="/for-good"
                onClick={() => setMobileOpen(false)}
                className="hover:text-orange-500"
              >
                for Good
              </Link>

              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex justify-center rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
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
