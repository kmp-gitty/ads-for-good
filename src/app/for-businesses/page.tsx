import Link from "next/link";

export const metadata = {
  title: "business services | questions, consulting, guidance, and direct mail",
  description:
    "Our various marketing and business services aim to do one thing: teach the corporate marketing strategies big businesses use, but make it ethical and useful for small & medium businesses.",
};

export default function ForBusinessesPage() {
  return (
    <main className="bg-white text-neutral-900">
      {/* Title / Hero Section */}
      <section className="flex items-center justify-center px-4 pt-16 pb-20">
        <div className="w-full max-w-5xl text-left">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            for Businesses: info for the small & medium businesses, marketing tactics for your area.
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            We take the kind of thinking usually reserved for giant brands and apply it to real
            neighborhoods, independent businesses, and community organizations. Same brains,
            smaller radius, more impact.
          </p>
        </div>
      </section>

      {/* ------------------------------------------- */}
      {/* Section 1 – Ask Us Anything */}
      {/* ------------------------------------------- */}
      <section className="w-full bg-orange-50">
        <Link href="/for-businesses/ask-us-anything" className="block">
          <div
            className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16
                       md:flex-row md:items-center rounded-3xl transition hover:bg-orange-100 cursor-pointer"
          >
            {/* Image */}
            <div className="flex-1 rounded-3xl border border-neutral-900 bg-white shadow-sm overflow-hidden aspect-[16/10]">
              <img
                src="/images/AskUsAnythingWallpaper.png"
                alt="Ask Us Anything"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Text */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">Ask Us Anything</h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                We’ve done everything in marketing you can do. We’ve also joined and built our own
                businesses – from a boutique gym turned fitness cooperative, to a retail brand
                focused on new mothers, and even a small cottage operation selling homemade pies.
                <br />
                <br />
                $100 a month gets you unlimited business & marketing questions via email. Always
                with data and sources included.
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* ------------------------------------------- */}
      {/* Section 2 – Consulting Sessions */}
      {/* ------------------------------------------- */}
      <section className="w-full bg-white">
        <Link href="/for-businesses/consulting" className="block">
          <div
            className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16
                       md:flex-row md:items-center rounded-3xl transition hover:bg-orange-100 cursor-pointer"
          >
            {/* Text */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">Consulting Sessions</h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                Prefer to talk face to face? We can do that too. Phone, video, or in-person
                (Philadelphia area).
                <br />
                <br />
                $500 gets you 5 meeting hours. Hours are credited toward any future project
                we agree to work on together.
              </p>
            </div>

            {/* Image */}
            <div className="flex-1 rounded-3xl border border-neutral-900 bg-white shadow-sm overflow-hidden aspect-[16/10]">
              <img
                src="/images/ConsultingWallpaper.png"
                alt="Consulting Sessions"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </Link>
      </section>

      {/* ------------------------------------------- */}
      {/* Section 3 – Marketing Guidebook */}
      {/* ------------------------------------------- */}
      <section className="w-full bg-orange-50">
        <Link href="/for-businesses/marketing-guidebook" className="block">
          <div
            className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16
                       md:flex-row md:items-center rounded-3xl transition hover:bg-orange-100 cursor-pointer"
          >
            {/* Image */}
            <div className="flex-1 rounded-3xl border border-neutral-900 bg-white shadow-sm overflow-hidden aspect-[16/10]">
              <img
                src="/images/MarketingGuidebookWallpaper.png"
                alt="Marketing Guidebook"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Text */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">Marketing Guidebook</h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                For DIY marketers. A 16-page guidebook with everything you need to get
                smarter, more efficient, and better equipped.
                <br />
                <br />
                $50 gets you the full guidebook with explanations, free tools, and
                beginner paid tools worth knowing about.
              </p>
            </div>
          </div>
        </Link>
      </section>

            {/* ------------------------------------------- */}
      {/* Section 4 – Digital Property Audit */}
      {/* Background: white */}
      {/* ------------------------------------------- */}
      <section className="w-full bg-white">
        <Link href="/for-businesses/digital-property-audit" className="block">
          <div
            className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16
                       md:flex-row md:items-center rounded-3xl transition hover:bg-orange-100 cursor-pointer"
          >
            {/* Text (now first) */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">Digital Property Audit</h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                Know your website and social profiles could do more? Think there's something else out there you could use, but don't know what? We'll audit all of your digital properties to figure out what's broken, how to make things better, and provide new ideas to try.
                <br /><br />
                One Example: we'll walkthrough every page and link on your site to figure out what's broken and how you could convert customers better.
                <br /><br />
                $1,000 gets you a full digital property audit, including: audit, assessment, instructions, and any recommendations.
              </p>
            </div>

            {/* Image (now second) */}
            <div className="flex-1 rounded-3xl border border-neutral-900 bg-white shadow-sm overflow-hidden aspect-[16/10]">
              <img
                src="/images/DigitalAuditWallpaper.png"
                alt="Digital Property Audit"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </Link>
      </section>

      {/* ------------------------------------------- */}
      {/* Section 5 – Local Direct Mail */}
      {/* Background: pale orange */}
      {/* ------------------------------------------- */}
      <section className="w-full bg-orange-50 pb-24">
        <Link href="/for-businesses/local-marketing" className="block">
          <div
            className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16
                       md:flex-row md:items-center rounded-3xl transition hover:bg-orange-100 cursor-pointer"
          >
            {/* Image (now first) */}
            <div className="flex-1 rounded-3xl border border-neutral-900 bg-white shadow-sm overflow-hidden aspect-[16/10]">
              <img
                src="/images/LocalMailWallpaper.png"
                alt="Local Direct Mail"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Text (now second) */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-orange-500">Local Direct Mail</h2>
              <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
                Direct mail is still one of the highest-ROI channels for small businesses.
                We work with USPS to reach every household in your local area.
                <br /><br />
                Pricing varies by mailer type, household count, and whether you're mailing solo
                or alongside others.
              </p>
            </div>
          </div>
        </Link>
      </section>

    </main>
  );
}



  