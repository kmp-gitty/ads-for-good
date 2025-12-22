export const metadata = {
    title: "business questions | have a marketing team on standby, and ask anything related to your business",
    description:
      "Have business questions, but want something flexible? Get guidance and information from marketing and entrepreneurial pros that have done it before.",
  };

export default function AskUsAnythingPage() {
    return (
      <main className="bg-white text-neutral-900 flex flex-col items-center px-4 pt-16 pb-24">
        {/* Hero / Intro */}
        <section className="w-full max-w-4xl text-left">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-orange-500">
            Ask Us Anything For Your Business
          </h1>
          <p className="mt-5 text-lg text-neutral-700">
            A simple way for small and medium businesses to get honest, practical answers about
            marketing, growth, and whatever else you want to talk through for your business.
          </p>
        </section>
  
        {/* Two-column content */}
        <section className="w-full max-w-5xl mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold text-orange-500">
              How it works
            </h2>
            <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
              A low flat monthly fee gets you unlimited questions over email. You send us your questions — as many as you want. They can be big
              (&quot;How do I get more local customers?&quot;) or tiny
              (&quot;Should I boost this post?&quot;). We&apos;ll respond with clear guidance,
              options, and any applicable data or links.
              <br />
              <br />
              Think of it as having a marketing team on call, without needing to hire one. No
              jargon, just conversations about your business.
            </p>
          </div>
  
          <div>
            <h2 className="text-xl font-semibold text-orange-500">
              What you can ask about
            </h2>
            <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
              Ads, websites, social media, email, branding, analytics, offers, promotions,
              customer journeys — if it touches advertising or your business, it&apos;s fair game.
              <br />
              <br />
              If something&apos;s outside our lane, we&apos;ll say so. But most of the time,
              there&apos;s a way for us to apply our expertise and knowledge.
            </p>
          </div>
        </section>
  
        {/* Highlight band */}
        <section className="w-full max-w-5xl mt-16 rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8">
          <h2 className="text-lg font-semibold text-orange-500">
            Simple pricing, fast answers.
          </h2>
          <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
  $100 a month gets you this access, no accounts or new apps to download.{" "}
  <a
    href="mailto:katoa@ads4good.com?subject=Ask%20us%20Anything&body=Hi%20Katoa%2C%0D%0A%0D%0AInterested%20in%20learning%20about%20your%20%22Ask%20Us%20Anything%22%20offering.%20Can%20you%20tell%20me%20more%3F"
    className="text-orange-500 underline hover:text-orange-600"
  >
    Just send us this email to get started.
  </a>
  <br />
  <br />
  We can usually respond same-day, but an answer will never take more than 2 business
  days to get back to you.
</p>
        </section>
      </main>
    );
  }
  