"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MenuKey = "publisher" | "resources" | "about" | null;

function useOutsideClick(
    ref: React.RefObject<HTMLElement | null>,
    onOutside: () => void
  ) {
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [ref, onOutside]);
}

function Caret({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "ml-2 inline-block transition-transform",
        open ? "rotate-180" : "",
      ].join(" ")}
    >
      ▼
    </span>
  );
}

export default function Header() {
  const [open, setOpen] = useState<MenuKey>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useOutsideClick(wrapRef, () => setOpen(null));

  return (
    <header
  className="sticky top-0 z-50"
  style={{ backgroundColor: "var(--tb-orange)" }}
>
      <div
        ref={wrapRef}
        className="mx-auto max-w-[1200px] px-6 py-4 flex items-center justify-between"
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-black" />
          <span style={{ color: "var(--tb-dark)" }} className="font-semibold">Tigerbyte Digital</span>
        </div>

        {/* Center: Nav */}
        <nav
  className="hidden md:flex items-center gap-6 px-6 py-2 rounded-xl shadow-sm relative"
  style={{
    backgroundColor: "var(--tb-light)",
    border: "1px solid var(--tb-blue)",
  }}
>
          {/* Publisher Services */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(open === "publisher" ? null : "publisher")}
              className="text-sm font-medium hover:opacity-80"
              style={{ color: "var(--tb-dark)" }}
              aria-haspopup="menu"
              aria-expanded={open === "publisher"}
            >
              Publisher Services <Caret open={open === "publisher"} />
            </button>

            {open === "publisher" && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-3 w-[560px] rounded-2xl border border-neutral-200 bg-white p-5 shadow-lg z-50"
              >
                <div className="grid grid-cols-2 gap-6">
                  {/* Left column */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                      What we do
                    </div>
                    <ul className="space-y-2">
                      {[
                        "Website Monetization",
                        "AdSense",
                        "Google Ad Manager",
                        "Ad Operations",
                        "Ad Revenue Optimization",
                      ].map((label) => (
                        <li key={label}>
                          <Link
                            href="#"
                            onClick={() => setOpen(null)}
                            className="block rounded-lg px-3 py-2 text-sm transition"
style={{ color: "var(--tb-dark)" }}
onMouseEnter={(e) =>
  (e.currentTarget.style.backgroundColor = "var(--tb-blue)")
}
onMouseLeave={(e) =>
  (e.currentTarget.style.backgroundColor = "transparent")
}
                          >
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right column */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
                      Who we serve
                    </div>
                    <ul className="space-y-2">
                      {[
                        "Content Creators",
                        "AdSense Publishers",
                        "Independent Publishers",
                        "Media Brands",
                      ].map((label) => (
                        <li key={label}>
                          <Link
                            href="#"
                            onClick={() => setOpen(null)}
                            className="block rounded-lg px-3 py-2 text-sm transition"
style={{ color: "var(--tb-dark)" }}
onMouseEnter={(e) =>
  (e.currentTarget.style.backgroundColor = "var(--tb-blue)")
}
onMouseLeave={(e) =>
  (e.currentTarget.style.backgroundColor = "transparent")
}
                          >
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resources */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(open === "resources" ? null : "resources")}
              className="text-sm font-medium hover:opacity-80"
              style={{ color: "var(--tb-dark)" }}
              aria-haspopup="menu"
              aria-expanded={open === "resources"}
            >
              Resources <Caret open={open === "resources"} />
            </button>

            {open === "resources" && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-3 w-[260px] rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg z-50"
              >
                <ul className="space-y-1">
                  {["Articles", "Case Studies", "FAQ"].map((label) => (
                    <li key={label}>
                      <Link
                        href="#"
                        onClick={() => setOpen(null)}
                        className="block rounded-lg px-3 py-2 text-sm transition"
style={{ color: "var(--tb-dark)" }}
onMouseEnter={(e) =>
  (e.currentTarget.style.backgroundColor = "var(--tb-blue)")
}
onMouseLeave={(e) =>
  (e.currentTarget.style.backgroundColor = "transparent")
}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* About */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(open === "about" ? null : "about")}
              className="text-sm font-medium hover:opacity-80"
              style={{ color: "var(--tb-dark)" }}
              aria-haspopup="menu"
              aria-expanded={open === "about"}
            >
              About <Caret open={open === "about"} />
            </button>

            {open === "about" && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-3 w-[320px] rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg z-50"
              >
                <ul className="space-y-1">
                  {[
                    "Company",
                    "Awards & Mentions",
                    "Privacy, Terms & Disclaimer",
                    "Contact",
                  ].map((label) => (
                    <li key={label}>
                      <Link
                        href="#"
                        onClick={() => setOpen(null)}
                        className="block rounded-lg px-3 py-2 text-sm transition"
style={{ color: "var(--tb-dark)" }}
onMouseEnter={(e) =>
  (e.currentTarget.style.backgroundColor = "var(--tb-blue)")
}
onMouseLeave={(e) =>
  (e.currentTarget.style.backgroundColor = "transparent")
}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Testimonials (no dropdown) */}
          <Link href="#" style={{ color: "var(--tb-dark)" }} className="text-sm font-medium hover:opacity-80">
            Testimonials
          </Link>
        </nav>

        {/* Right: CTA */}
        <div>
        <Link
  href="#"
  className="inline-flex items-center rounded-full px-5 py-2 text-sm font-medium transition hover:brightness-95"
  style={{
    backgroundColor: "var(--tb-orange)",
    color: "var(--tb-light)",
    border: "2px solid var(--tb-dark)",
  }}
>
  Free Monetization Advice ✨
</Link>
        </div>
      </div>
    </header>
  );
}