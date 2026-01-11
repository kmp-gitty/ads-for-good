import Link from "next/link";

export const metadata = {
  title: "Sitemap | ads for Good",
  description: "Browse all pages on ads for Good.",
};

export default function SitemapPage() {
  return (
    <main className="bg-white text-neutral-900 flex justify-center px-4 pt-16 pb-24">
      <section className="w-full max-w-6xl">
        {/* Page title */}
        <header className="mb-10">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            Sitemap
          </h1>
          <p className="mt-4 text-sm sm:text-base text-neutral-700 max-w-2xl">
            A simple directory of every page on ads for Good.
          </p>
        </header>

        {/* Sections */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* For People */}
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">For People</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/for-people/education" className="text-orange-500 hover:underline">
                  Education
                </Link>
              </li>
              <li>
                <Link
                  href="/for-people/privacy-protection"
                  className="text-orange-500 hover:underline"
                >
                  Privacy Protection
                </Link>
              </li>
              <li>
                <Link href="/for-people/ad-network" className="text-orange-500 hover:underline">
                  Ad Network
                </Link>
              </li>
            </ul>
          </div>

          {/* For Businesses */}
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">For Businesses</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link
                  href="/for-businesses/marketing-advice"
                  className="text-orange-500 hover:underline"
                >
                  Ask Us Anything
                </Link>
              </li>
              <li>
                <Link href="/for-businesses/consulting" className="text-orange-500 hover:underline">
                  Consulting
                </Link>
              </li>
              <li>
                <Link
                  href="/for-businesses/marketing-guidebook"
                  className="text-orange-500 hover:underline"
                >
                  Marketing Guidebook
                </Link>
              </li>

              <li>
                <Link
                  href="/for-businesses/digital-health-check"
                  className="text-orange-500 hover:underline"
                >
                  Digital Health Check
                </Link>
              </li>

              <li>
                <Link
                  href="/for-businesses/direct-mail"
                  className="text-orange-500 hover:underline"
                >
                  Local Direct Mail
                </Link>
              </li>
            </ul>
          </div>

          {/* for Good */}
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">for Good</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/for-good" className="text-orange-500 hover:underline">
                  Giving Model &amp; Community Impact
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Company</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-orange-500 hover:underline">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-orange-500 hover:underline">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Optional small note */}
        <p className="mt-10 text-xs text-neutral-600">
          Looking for the XML sitemap? It lives at{" "}
          <a href="/sitemap.xml" className="text-orange-500 underline hover:text-orange-600">
            /sitemap.xml
          </a>
          .
        </p>
      </section>
    </main>
  );
}