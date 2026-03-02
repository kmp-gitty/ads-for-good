"use client";

import { useMemo, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

type Tab = "privacy" | "terms";

export default function PrivacyTermsDisclaimerPage() {
  const [active, setActive] = useState<Tab>("privacy");

  const tabs = useMemo(
    () => [
      { key: "privacy" as const, label: "Privacy Policy" },
      { key: "terms" as const, label: "Terms & Conditions + Disclaimer" },
    ],
    []
  );

  function go(tab: Tab) {
    setActive(tab);
    const el = document.getElementById(tab);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main>
      <Header />

      <section className="bg-white">
        <div className="mx-auto max-w-[900px] px-6 py-16">
        <h1
  className="text-4xl md:text-5xl font-black tracking-tight"
  style={{ color: "var(--tb-dark)" }}
>
            Privacy Policy, Terms &amp; Conditions, and Disclaimer
          </h1>

          <p className="mt-6 text-base leading-relaxed text-neutral-700">
            This privacy policy, terms &amp; conditions, and disclaimer applies
            to Tigerbyte Digital web properties and consulting services. We are
            people and consumers too, and care about how our information is used
            and shared - so we take great care for your information. These
            policies explain what information may be collected when either
            accessing our site or engaging in our consulting services. They
            review how the information will be collected, used, stored,
            retained/deleted - and most importantly, how you can control
            collection, correction, and/or deletion. Click either section to
            read more below.
          </p>

          {/* Pills */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {tabs.map((t) => {
              const isActive = active === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => go(t.key)}
                  className={[
                    "rounded-full px-5 py-2 text-sm font-medium transition",
                    "border",
                    isActive
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-neutral-300 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="bg-white scroll-mt-28">
        <div className="mx-auto max-w-[900px] px-6 pb-16">
        <h2
  className="text-3xl font-black tracking-tight"
  style={{ color: "var(--tb-dark)" }}
>Privacy Policy</h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-700">
            (Draft placeholder) This section will describe what information we
            collect, how we use it, how we share it, retention/deletion, and how
            you can request access, correction, or deletion.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-700">
            <div>
              <h3 className="text-base font-bold text-black">
                1. Information We Collect
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Information you provide (e.g., name, email, message).</li>
                <li>Usage data (e.g., pages visited, referrers, device/browser).</li>
                <li>Cookies and similar technologies (where applicable).</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-black">
                2. How We Use Information
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>To operate and improve our website and services.</li>
                <li>To respond to inquiries and provide consulting services.</li>
                <li>To analyze performance and prevent fraud/abuse.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-black">
                3. Your Choices &amp; Requests
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Request access, correction, or deletion of your data.</li>
                <li>Control cookies via browser settings (where applicable).</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Terms */}
      <section id="terms" className="bg-white scroll-mt-28">
        <div className="mx-auto max-w-[900px] px-6 pb-24">
        <h2
  className="text-3xl font-black tracking-tight"
  style={{ color: "var(--tb-dark)" }}
>
            Terms &amp; Conditions + Disclaimer
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-700">
            (Draft placeholder) This section will cover service scope, acceptable
            use, intellectual property, limitation of liability, and disclaimers.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-700">
            <div>
              <h3 className="text-base font-bold text-black">
                1. Use of Site &amp; Services
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>By using this site, you agree to these terms.</li>
                <li>Do not misuse the site or attempt unauthorized access.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-black">
                2. Disclaimer
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Information is provided “as-is” without warranties.</li>
                <li>
                  Consulting outcomes vary; we do not guarantee specific revenue
                  results.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-black">
                3. Limitation of Liability
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>
                  To the maximum extent permitted by law, Tigerbyte Digital is not
                  liable for indirect or consequential damages.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}