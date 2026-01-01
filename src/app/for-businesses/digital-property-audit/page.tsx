export const metadata = {
    title: "digital audit | find what’s broken, fix what’s weak, uncover what’s missing",
    description:
      "A full review of your website and business profiles to identify what’s broken, what to improve, and what opportunities you’re missing — with clear instructions and recommendations.",
  };
  
  export default function DigitalPropertyAuditPage() {
    return (
      <main className="bg-orange-50 text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
        <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
          {/* Left: Hero copy */}
          <div className="flex-1">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
              Digital Property Audit: assess your business's digital presence.
            </h1>
  
            <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
              If you suspect your website or business profiles could do more — you&apos;re probably right.
              We&apos;ll review your site, pages, links, key profiles, and any other digital presence to uncover issues, improve
              conversions, and recommend the best next moves.
              <br />
              <br />
              You get a clear assessment, prioritized fixes, and practical instructions — if you want, I'll also help you make any necessary improvements.
              <br />
              <br />
              <a
                href="mailto:katoa@ads4good.com?subject=Digital%20Property%20Audit&body=Hi%20Katoa%2C%0D%0A%0D%0AI%E2%80%99m%20interested%20in%20a%20Digital%20Property%20Audit.%20Can%20you%20share%20next%20steps%20and%20what%20you%E2%80%99d%20need%20from%20me%3F"
                className="text-orange-500 underline hover:text-orange-600"
              >
                Ready to get started? Send us this email.
              </a>
            </p>
  
            {/* Dropdown to embed your Google Form (must NOT be inside <p>) */}
            <div className="mt-6 border-t border-orange-200 pt-4">
              <details>
                <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-900 hover:text-orange-500">
                  If the email link above didn&apos;t do anything when you clicked it, your settings block
                  email links — use this form instead.
                </summary>
  
                <div className="mt-4 rounded-2xl bg-white border border-orange-100 p-4">
                  <iframe
                    src="https://docs.google.com/forms/d/e/1FAIpQLSfffYUKSRf30SZ2CBi792g2JO9k1-31Jv78RcTVw2uZI2If8g/viewform?embedded=true"
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
              </details>
            </div>
          </div>
  
          {/* Right: Card / explainer */}
          <div className="flex-1">
            <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
              {/* Image inserted here */}
              <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  src="/images/DigitalAudit.png" // ← replace with any filename in public/images
                  alt="Digital Property Audit Illustration"
                  width={500}
                  height={500}
                  className="object-contain w-full h-full"
                />
              </div>
  
              <h2 className="text-sm font-semibold text-neutral-900">What you get.</h2>
  
              <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                $1,000 gets you a full digital property audit — including assessment, prioritized
                fixes, and clear recommendations.
                <br />
                <br />
                We'll ask what's concerning you most and start there, but will do some sleuthing and find ANY digital property your business is on and assess it. We'll even provide recommendations if we think you should be using anything you're not.
                <br />
                <br />
                You&apos;ll walk away knowing exactly what to fix, how to fix it, and why behind every recommendation.
              </p>
            </div>
          </div>
        </section>
  
        {/* WHAT WE AUDIT SECTION (reused, no clickability) */}
        <section className="w-full bg-orange-100 mt-32">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                Can You Give a Sneak Peek of An Audit?
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                We audit the parts of your digital presence that most often drive (or block) customers:
                your website experience, your conversion paths, and the key business profiles people
                use to evaluate you before reaching out.
              </p>
            </div>
  
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {/* Column 1 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Website Properties</h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We go page-by-page to find issues, friction, and missed conversion opportunities.
                </p>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Broken links, missing pages, and confusing navigation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Contact paths: forms, calls, emails, booking, CTAs
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Clarity, trust signals, and any technical deficiencies
                  </li>
                </ul>
              </div>
  
              {/* Column 2 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Key Profiles & listings</h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We review the profiles customers actually check before calling, booking, or buying.
                </p>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Google Business Profile accuracy & completeness
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Social (FB/IG), Review (Yelp), Anything else relevant
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Reviews, photos, categories, service details, & outreach
                  </li>
                </ul>
              </div>
  
              {/* Column 3 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">Opportunities & next steps</h3>
                <p className="mt-2 text-xs text-neutral-700">
                  We translate the audit into prioritized actions — so it&apos;s easy to execute.
                </p>
  
                <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    A clear priority list (quick wins → bigger improvements)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Recommendations & instructions your team can follow
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-500"></span>
                    Identify any new digital property opportunities
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }
  
  