export const metadata = {
    title: "Privacy Policy | ads for Good",
    description:
      "How ads for Good collects, uses, and protects information when you visit our site.",
  };
  
  export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Effective date: <span className="font-semibold">February 2026</span>
        </p>
  
        <section className="mt-8 space-y-3 text-sm leading-relaxed text-neutral-700">
          <p>
            This Privacy Policy explains how ads for Good (&ldquo;afG&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and protects
            information when you visit our website.
          </p>
          <p>
            We aim to be privacy-forward. We use measurement tools to understand
            how people use the site and to improve performance. We do not sell
            personal information.
          </p>
        </section>
  
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-extrabold">Information we collect</h2>
          <div className="space-y-3 text-sm leading-relaxed text-neutral-700">
            <p>
              <span className="font-semibold">Usage &amp; device data:</span>{" "}
              Pages viewed, buttons clicked, time on page, scroll depth, referrer,
              approximate location (city/region/country), browser and device
              information. This data is used for analytics and site improvement.
            </p>
            <p>
              <span className="font-semibold">Contact information you provide:</span>{" "}
              If you submit a form or contact us, we may collect information such
              as your name, email address, company name, and any details you
              include in your message.
            </p>
            <p>
              <span className="font-semibold">Cookies and similar technologies:</span>{" "}
              We may use cookies/local storage and similar technologies to remember
              preferences and support measurement. You can usually control cookies
              through your browser settings.
            </p>
          </div>
        </section>
  
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-extrabold">How we use information</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
            <li>Operate and maintain the website</li>
            <li>Understand performance and improve user experience</li>
            <li>Measure interest in content and services</li>
            <li>Respond to inquiries and provide requested information</li>
            <li>Prevent fraud, abuse, and security incidents</li>
          </ul>
        </section>
  
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-extrabold">Measurement &amp; analytics</h2>
          <div className="space-y-3 text-sm leading-relaxed text-neutral-700">
            <p>
              We use analytics/measurement tools to understand site usage (for
              example: which pages are visited and which interactions occur). This
              helps us improve content, navigation, and performance.
            </p>
            <p>
              When measurement is enabled, we may collect source information such
              as UTM parameters and common click identifiers (for example, an ad
              click id). We use these signals to understand which channels and
              campaigns drive visits and conversions.
            </p>
            <p>
              We may also use first-party identifiers on a client’s site when a
              user voluntarily provides them (for example, logging in or making a
              purchase). In those cases, identifiers should be hashed before
              storage and used for measurement, attribution, and fraud prevention.
            </p>
          </div>
        </section>
  
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-extrabold">Data retention</h2>
          <p className="text-sm leading-relaxed text-neutral-700">
            We retain information only as long as necessary for the purposes
            described above, unless a longer retention period is required or
            permitted by law. We may retain aggregated, de-identified analytics
            data for longer periods to understand long-term trends.
          </p>
        </section>
  
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-extrabold">Sharing</h2>
          <div className="space-y-3 text-sm leading-relaxed text-neutral-700">
            <p>
              We do not sell personal information. We may share information with
              service providers who help us operate the website (for example,
              hosting, analytics, or email tooling), under contractual obligations
              to protect the information and use it only for providing services.
            </p>
            <p>
              We may disclose information if required by law, to protect rights
              and safety, or to investigate fraud/security issues.
            </p>
          </div>
        </section>
  
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-extrabold">Your choices</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
            <li>
              You can control cookies and local storage through browser settings.
            </li>
            <li>
              You can choose not to submit personal information through forms.
            </li>
            <li>
              Depending on your location, you may have rights to access, correct,
              or delete certain information. Contact us to exercise these rights.
            </li>
          </ul>
        </section>
  
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-extrabold">Contact</h2>
          <p className="text-sm leading-relaxed text-neutral-700">
            Questions? Contact us via the site contact form.
          </p>
        </section>
        </div>
      </main>
    );
  }
  