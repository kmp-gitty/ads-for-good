"use client";

import Link from "next/link";
import Header from "./../components/Header";
import Footer from "./../components/Footer";
import RaveAccordion from "./../components/RaveAccordion";
import TestimonialFlipStrip from "./../components/TestimonialFlipStrip";

export default function ServicesPage() {
  return (
    <main>
      <Header />

      {/* 1) HERO */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7">
              <h1
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Services Template Header
              </h1>

              <p
                className="mt-6 text-base leading-relaxed"
                style={{ color: "var(--tb-dark)", opacity: 0.85 }}
              >
                This is an example paragraph for real content. Website Monetization, AdSense, Google Ad Manager, AdOps, & Ad Revenue Optimization services will use this.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:brightness-95"
                  style={{
                    backgroundColor: "var(--tb-orange)",
                    color: "var(--tb-light)",
                    border: "2px solid #000",
                  }}
                >
                  Get Started
                </Link>

                <Link
                  href="#capabilities"
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:bg-neutral-50"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--tb-dark)",
                    border: "2px solid #000",
                  }}
                >
                  See Capabilities
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Tag>Independent consulting</Tag>
                <Tag>No revenue share</Tag>
                <Tag>UX-safe optimization</Tag>
                <Tag>AdSense + GAM</Tag>
              </div>
            </div>

            {/* Right side “stat tile” placeholder */}
            <div className="md:col-span-5">
              <div className="rounded-3xl border bg-white p-8 shadow-sm">
                <div className="flex items-end justify-between gap-6">
                  <div
                    className="text-6xl md:text-7xl font-black tracking-tight"
                    style={{ color: "var(--tb-dark)" }}
                  >
                    +40%
                  </div>
                  <div
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--tb-dark)", opacity: 0.7 }}
                  >
                    Average Revenue Lift
                  </div>
                </div>

                <p
                  className="mt-5 text-sm leading-relaxed"
                  style={{ color: "var(--tb-dark)", opacity: 0.85 }}
                >
                  Placeholder stat tile (keep consistent with your homepage). Replace
                  with a proof point, badge, or mini-case snippet later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2) KEY PUBLISHER CHALLENGES */}
      <section style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-4">
              <h2
                className="text-3xl md:text-4xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Key Publisher Challenges
              </h2>
              <p
                className="mt-4 text-sm leading-relaxed"
                style={{ color: "var(--tb-dark)", opacity: 0.85 }}
              >
                Most revenue issues aren’t “one big thing.” They’re small inefficiencies
                stacked together — across layout, ad density, demand setup, and reporting.
                These are the most common friction points we see.
              </p>
            </div>

            {/* AdPushUp-ish layout: 2x2 cards (plus one wide) */}
            <div className="md:col-span-8">
              <div className="grid gap-6 md:grid-cols-2">
                <ChallengeCard
                  title="Layout decisions made without revenue context"
                  body="Teams change templates for UX or editorial needs — and revenue quietly drops due to viewability, density, or auction pressure."
                />
                <ChallengeCard
                  title="Low viewability and poor attention distribution"
                  body="Ads exist, but they’re not seen. We map attention, viewability, and placement strategy to restore value."
                />
                <ChallengeCard
                  title="Demand overlap and auction inefficiency"
                  body="Bad floor strategy, missing competition, or misconfigured GAM/AdSense reduces yield even with strong traffic."
                />
                <ChallengeCard
                  title="No clean testing framework"
                  body="Publishers want lift, but don’t have a safe way to test changes without nuking UX or causing volatility."
                />
              </div>

              <div className="mt-6">
                <div className="rounded-3xl border bg-neutral-50 p-8">
                  <div className="grid gap-6 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-8">
                      <div
                        className="text-lg font-black"
                        style={{ color: "var(--tb-dark)" }}
                      >
                        The outcome you want:
                      </div>
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: "var(--tb-dark)", opacity: 0.85 }}
                      >
                        A revenue-first layout strategy that protects UX — with a clear
                        roadmap, prioritization, and measurable lift.
                      </p>
                    </div>
                    <div className="md:col-span-4 md:text-right">
                      <Link
                        href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                        className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:brightness-95"
                        style={{
                          backgroundColor: "var(--tb-orange)",
                          color: "var(--tb-light)",
                          border: "2px solid #000",
                        }}
                      >
                        Request an Audit
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3) TestimonialFlipStrip */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
        <h2
                className="text-3xl md:text-4xl font-black tracking-tight text-center mb-12"
                style={{ color: "var(--tb-dark)" }}
              >
                How Publishers Rave
              </h2>
          <div className="mt-12 overflow-hidden">
            <TestimonialFlipStrip />
          </div>
        </div>
      </section>

      {/* 4) CAPABILITIES */}
      <section id="capabilities" style={{ backgroundColor: "white" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-4 md:order-2">
              <h2
                className="text-3xl md:text-4xl font-black tracking-tight"
                style={{ color: "var(--tb-dark)" }}
              >
                Capabilities
              </h2>
              <p
                className="mt-4 text-sm leading-relaxed"
                style={{ color: "var(--tb-dark)", opacity: 0.85 }}
              >
                This is your “Product Capability” equivalent — simple, scannable, and
                easy to expand later into sub-pages.
              </p>
            </div>

            <div className="md:col-span-8 md:order-1">
              <div className="grid gap-6 md:grid-cols-2">
                <CapCard
                  title="Layout + placement strategy"
                  body="We recommend placements that improve attention and viewability without adding spammy density."
                />
                <CapCard
                  title="GAM structure + hygiene"
                  body="Line items, key-values, ad units, floors, and reporting structure that supports scalable optimization."
                />
                <CapCard
                  title="AdSense optimization"
                  body="RPM diagnostics, policy-safe improvements, and practical guidance for AdSense-first publishers."
                />
                <CapCard
                  title="AdOps support"
                  body="Trafficking, troubleshooting, reporting, monitoring, and operational best practices."
                />
                <CapCard
                  title="Yield & performance analysis"
                  body="Find what’s working, what’s wasting inventory, and where lift can be unlocked with minimal risk."
                />
                <CapCard
                  title="Testing roadmap"
                  body="A staged plan to test improvements safely (prioritized by impact and effort)."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5) DISCOVER / CTA SECTION */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="rounded-3xl border bg-white p-10 shadow-sm">
            <div className="grid gap-10 md:grid-cols-12 md:items-center">
              <div className="md:col-span-7">
                <h2
                  className="text-3xl md:text-4xl font-black tracking-tight"
                  style={{ color: "var(--tb-dark)" }}
                >
                  Discover revenue lift without guesswork
                </h2>
                <p
                  className="mt-4 text-sm leading-relaxed"
                  style={{ color: "var(--tb-dark)", opacity: 0.85 }}
                >
                  Replace this copy with your “Discover Automated A/B…” equivalent.
                  The goal is to describe a repeatable methodology: diagnose → prioritize
                  → implement → measure. Keep it concrete and operator-focused.
                </p>

                <ul
                  className="mt-6 list-disc space-y-2 pl-5 text-sm"
                  style={{ color: "var(--tb-dark)", opacity: 0.85 }}
                >
                  <li>Quick audit + prioritized opportunities</li>
                  <li>Layout and configuration recommendations</li>
                  <li>Implementation support if needed</li>
                  <li>Measurement and iteration plan</li>
                </ul>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                    className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:brightness-95"
                    style={{
                      backgroundColor: "var(--tb-orange)",
                      color: "var(--tb-light)",
                      border: "2px solid #000",
                    }}
                  >
                    Get Started
                  </Link>

                  <Link
                    href="/for-clients/Tigerbyte-Digital/rebrand/privacy-terms-disclaimer"
                    className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:bg-neutral-50"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--tb-dark)",
                      border: "2px solid #000",
                    }}
                  >
                    See Capabilities
                  </Link>
                </div>
              </div>

              <div className="md:col-span-5">
                <div className="rounded-3xl border bg-neutral-50 p-8">
                  <div
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--tb-dark)", opacity: 0.7 }}
                  >
                    Example deliverables
                  </div>
                  <div
                    className="mt-3 text-xl font-black"
                    style={{ color: "var(--tb-dark)" }}
                  >
                    A roadmap your team can act on
                  </div>
                  <p
                    className="mt-4 text-sm leading-relaxed"
                    style={{ color: "var(--tb-dark)", opacity: 0.85 }}
                  >
                    Replace this with a short bullet-style deliverables list based on
                    the service you’re templating (layout optimization, GAM consulting, etc.).
                  </p>

                  <div className="mt-6 grid gap-3">
                    <MiniDeliverable>Inventory + layout review</MiniDeliverable>
                    <MiniDeliverable>Placement + viewability priorities</MiniDeliverable>
                    <MiniDeliverable>GAM / AdSense configuration checks</MiniDeliverable>
                    <MiniDeliverable>Testing plan + measurement guidance</MiniDeliverable>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold"
      style={{
        backgroundColor: "rgba(0,0,0,0.04)",
        color: "var(--tb-dark)",
        border: "1px solid rgba(0,0,0,0.10)",
      }}
    >
      {children}
    </span>
  );
}

function ChallengeCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border bg-white p-7 shadow-sm">
      <div className="text-lg font-black" style={{ color: "var(--tb-dark)" }}>
        {title}
      </div>
      <div
        className="mt-3 text-sm leading-relaxed"
        style={{ color: "var(--tb-dark)", opacity: 0.85 }}
      >
        {body}
      </div>
    </div>
  );
}

function CapCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border bg-white p-7 shadow-sm">
      <div className="text-base font-black" style={{ color: "var(--tb-dark)" }}>
        {title}
      </div>
      <div
        className="mt-3 text-sm leading-relaxed"
        style={{ color: "var(--tb-dark)", opacity: 0.85 }}
      >
        {body}
      </div>
    </div>
  );
}

function MiniDeliverable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold"
      style={{ color: "var(--tb-dark)" }}
    >
      {children}
    </div>
  );
}