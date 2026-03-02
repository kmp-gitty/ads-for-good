"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type TocItem = { id: string; label: string };

function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollHeight = doc.scrollHeight - window.innerHeight;
      const p = scrollHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollHeight)) : 0;
      setProgress(p);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return progress;
}

function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0] ?? "");

  useEffect(() => {
    if (!ids.length) return;

    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible intersecting section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      {
        root: null,
        // Trigger when section header is comfortably in view
        rootMargin: "-30% 0px -60% 0px",
        threshold: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
      }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ids]);

  return activeId;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: "var(--tb-dark)" }}>
        {title}
      </h2>
      <div className="mt-4 text-neutral-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function ResourcesPage() {
  const progress = useScrollProgress();

  const toc: TocItem[] = useMemo(
    () => [
      { id: "key-takeaways", label: "Key Takeaways" },
      { id: "resource-1", label: "Resource #1" },
      { id: "resource-2", label: "Resource #2" },
      { id: "resource-3", label: "Resource #3" },
      { id: "faq", label: "FAQ" },
    ],
    []
  );

  const activeId = useActiveSection(toc.map((t) => t.id));

  function scrollToId(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main>
      {/* Top scroll progress bar */}
      <div className="fixed left-0 top-0 z-[60] h-[4px] w-full bg-transparent">
        <div
          className="h-full origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${progress})`,
            backgroundColor: "var(--tb-blue)",
          }}
        />
      </div>

      <Header />

      {/* Page Hero */}
      <section style={{ backgroundColor: "var(--tb-light)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:py-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight" style={{ color: "var(--tb-dark)" }}>
            Resources
          </h1>
          <p className="mt-5 max-w-[80ch] text-base md:text-lg text-neutral-700 leading-relaxed">
            A working outline page you can turn into real articles later. It’s designed for scan-ability:
            key takeaways up top, deeper sections below, and a sticky contents rail to keep readers moving.
          </p>
        </div>
      </section>

      {/* Body */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-14">
          <div className="grid gap-10 lg:grid-cols-[240px_1fr_320px]">
            {/* Left: Contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Contents
                </div>
                <nav className="mt-4 space-y-2">
                  {toc.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => scrollToId(item.id)}
                        className={[
                          "w-full text-left rounded-lg px-3 py-2 text-sm transition",
                          isActive
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-700 hover:bg-neutral-100",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Center: Content */}
            <div className="space-y-14">
              <Section id="key-takeaways" title="Key Takeaways">
                <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
                  <ul className="space-y-3 text-sm md:text-base">
                    <li>• The fastest lift usually comes from placement + layout hygiene, not “more ads.”</li>
                    <li>• Protect UX first: viewability + attention distribution beats spammy density.</li>
                    <li>• Build a testing rhythm so improvements compound and don’t break templates.</li>
                    <li>• Know when to graduate beyond AdSense-only to a more competitive stack.</li>
                  </ul>
                </div>
              </Section>

              <Section id="resource-1" title="Resource #1: Mobile & Native Advertising (Overview)">
                <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
                  <h3 className="text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                    What it is
                  </h3>
                  <p className="mt-2">
                    Native-style placements blend into content patterns. The goal isn’t to “hide ads” — it’s to
                    match user behavior so attention is earned, not forced.
                  </p>

                  <h3 className="mt-6 text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                    When it works best
                  </h3>
                  <ul className="mt-2 space-y-2">
                    <li>• Content-heavy pages with natural scroll depth</li>
                    <li>• Clear content modules (cards, lists, feeds)</li>
                    <li>• Strong editorial rhythm (headings, images, breaks)</li>
                  </ul>

                  <div className="mt-6">
                    <Link
                      href="#"
                      className="inline-flex items-center justify-center rounded-full border border-black bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                    >
                      Read next →
                    </Link>
                  </div>
                </div>
              </Section>

              <Section id="resource-2" title="Resource #2: Layout Decisions Without Revenue Context">
                <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
                  <h3 className="text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                    The problem
                  </h3>
                  <p className="mt-2">
                    Teams change templates for UX or editorial needs, and revenue drops quietly due to
                    viewability shifts, density changes, or auction pressure.
                  </p>

                  <h3 className="mt-6 text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                    The fix
                  </h3>
                  <ul className="mt-2 space-y-2">
                    <li>• Track “before/after” layout changes</li>
                    <li>• Create a safe testing roadmap (impact vs effort)</li>
                    <li>• Validate with clean measurement windows</li>
                  </ul>

                  <div className="mt-6">
                    <Link
                      href="#"
                      className="inline-flex items-center justify-center rounded-full border border-black bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                    >
                      Read next →
                    </Link>
                  </div>
                </div>
              </Section>

              <Section id="resource-3" title="Resource #3: GAM + AdOps Hygiene Checklist">
                <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
                  <h3 className="text-lg font-bold" style={{ color: "var(--tb-dark)" }}>
                    Quick checklist
                  </h3>
                  <ul className="mt-2 space-y-2">
                    <li>• Inventory structure: units + placements are consistent and intentional</li>
                    <li>• Floors and pricing rules are coherent (no internal competition killers)</li>
                    <li>• Reporting is set up for diagnosis (not just dashboards)</li>
                    <li>• Operational playbook exists for outages / drop-offs</li>
                  </ul>

                  <div className="mt-6">
                    <Link
                      href="#"
                      className="inline-flex items-center justify-center rounded-full border border-black bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                    >
                      Read next →
                    </Link>
                  </div>
                </div>
              </Section>

              <Section id="faq" title="FAQ">
                <div className="space-y-4">
                  {[
                    {
                      q: "Do you need access to our accounts?",
                      a: "Not always. We can start with screenshots + a walkthrough. If deeper diagnostics are required, we’ll request read-only access.",
                    },
                    {
                      q: "Do you take a revenue share?",
                      a: "No — we’re independent consultants. You keep ownership of your inventory, relationships, and decisions.",
                    },
                    {
                      q: "Can you help if we only run AdSense?",
                      a: "Yes. We work with AdSense-only publishers and can advise when it’s time to graduate to GAM / a more competitive stack.",
                    },
                    {
                      q: "How fast can we see improvement?",
                      a: "Some wins are immediate (placement and hygiene). Larger lift typically comes from structured testing over a few iterations.",
                    },
                  ].map((item) => (
                    <details
                      key={item.q}
                      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
                    >
                      <summary className="cursor-pointer list-none font-semibold text-neutral-900">
                        {item.q}
                        <span className="float-right text-neutral-500">⌄</span>
                      </summary>
                      <p className="mt-3 text-sm text-neutral-700 leading-relaxed">{item.a}</p>
                    </details>
                  ))}
                </div>
              </Section>
            </div>

            {/* Right: Sticky message tile */}
            <aside>
              <div className="sticky top-28">
                <div
                  className="rounded-3xl border border-neutral-200 p-7 shadow-sm"
                  style={{ backgroundColor: "var(--tb-blue)" }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
                    Quick message
                  </div>
                  <h3 className="mt-3 text-xl font-black" style={{ color: "var(--tb-dark)" }}>
                    Want a fast revenue audit?
                  </h3>
                  <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
                    Share your URL and current setup. We’ll respond with a short summary of quick wins + a
                    recommended roadmap.
                  </p>

                  <div className="mt-6 grid gap-3">
                    <Link
                      href="/for-clients/Tigerbyte-Digital/rebrand/contact"
                      className="inline-flex items-center justify-center rounded-full border border-black bg-[var(--tb-orange)] px-5 py-3 text-sm font-semibold text-black hover:opacity-90 transition"
                    >
                      Request an Audit
                    </Link>
                    <Link
                      href="/for-clients/Tigerbyte-Digital/rebrand/services"
                      className="inline-flex items-center justify-center rounded-full border border-black bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-neutral-50 transition"
                    >
                      View Services
                    </Link>
                  </div>

                  <p className="mt-4 text-[12px] text-neutral-700">
                    No lock-in. No revenue share. Just clear next steps.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* Mobile “Contents” (optional) */}
          <div className="lg:hidden mt-10 rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Contents
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {toc.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToId(item.id)}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}