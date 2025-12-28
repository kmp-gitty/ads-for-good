export const metadata = {
    title:
      "business questions | have a marketing team on standby, and ask anything related to your business",
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
            <h2 className="text-xl font-semibold text-orange-500">How it works</h2>
            <p className="mt-4 text-sm text-neutral-800 leading-relaxed">
              A low flat monthly fee gets you unlimited questions over email. You send us your
              questions — as many as you want. They can be big (&quot;How do I get more local
              customers?&quot;) or tiny (&quot;Should I boost this post?&quot;). We&apos;ll respond
              with clear guidance, options, and any applicable data or links.
              <br />
              <br />
              Think of it as having a marketing team on call, without needing to hire one. No
              jargon, just conversations about your business.
            </p>
          </div>
  
          <div>
            <h2 className="text-xl font-semibold text-orange-500">What you can ask about</h2>
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
  
        {/* Highlight band (now two half-width cards) */}
        <section className="w-full max-w-5xl mt-16 grid gap-10 md:grid-cols-2">
          {/* Left card */}
          <div className="rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8">
            <h2 className="text-lg font-semibold text-orange-500">Simple pricing, fast answers.</h2>
            <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
              $100 a month gets you this access, no accounts or new apps to download.
              <br />
              <br />
              We can usually respond same-day, but an answer will never take more than 2 business
              days to get back to you.
            </p>
          </div>
  
          {/* Right card */}
          <div className="rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8">
            <h2 className="text-lg font-semibold text-orange-500">Getting started is easy</h2>
            <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
              <a
                href="mailto:katoa@ads4good.com?subject=Ask%20us%20Anything&body=Hi%20Katoa%2C%0D%0A%0D%0AInterested%20in%20learning%20about%20your%20%22Ask%20Us%20Anything%22%20offering.%20Can%20you%20tell%20me%20more%3F"
                className="text-orange-500 underline hover:text-orange-600"
              >
                Just send us this email.
              </a>
              <br />
              <br />
              If the email link above didn&apos;t do anything when you clicked it, your settings
              blocks email links — use the form below instead.
            </p>
  
            {/* Dropdown to embed your Google Form */}
            <div className="mt-6 border-t border-orange-200 pt-4">
              <details>
                <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-900 hover:text-orange-500">
                  Open the Ask Us Anything form
                </summary>
  
                <div className="mt-4 rounded-2xl bg-white border border-orange-100 p-4">
                  <iframe
                    // Replace this with your Google Form embed src
                    src="https://docs.google.com/forms/d/e/1FAIpQLSdiqveFfe-lLC-84BwMVX8EbY06_a5TgxRPdDRvJp9BrmSXew/viewform?embedded=true"
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
        </section>

        {/* EXAMPLE QUESTIONS SECTION */}
<section className="w-full max-w-5xl mt-20">
  <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-10">
    <h2 className="text-2xl font-semibold text-neutral-900">
      Example questions we can help with
    </h2>

    <p className="mt-4 text-sm sm:text-base text-neutral-700 leading-relaxed max-w-3xl">
      These are real types of questions business owners ask us every day. If it&apos;s related to
      marketing, growth, or running a business — chances are we&apos;ve done it or helped someone through it
      before.
    </p>

    <div className="mt-8 grid gap-6 md:grid-cols-2">
      {/* Column 1 */}
      <ul className="space-y-3 text-sm text-neutral-800">
        <li>• How do I get more local customers without wasting money on ads?</li>
        <li>• Should I be running Google Ads, Meta Ads, or neither?</li>
        <li>• What marketing channels make sense for my type of business?</li>
        <li>• How much should I realistically be spending on marketing?</li>
        <li>• Why did my ads stop performing, and how do I fix it?</li>
        <li>• What should I track to know if marketing is working?</li>
        <li>• Should I focus on SEO, paid ads, email, or social media first?</li>
      </ul>

      {/* Column 2 */}
      <ul className="space-y-3 text-sm text-neutral-800">
        <li>• How do I compete with bigger brands in my area?</li>
        <li>• How do I turn more one-time customers into repeat customers?</li>
        <li>• Do I even need to spend money on ads?</li>
        <li>• Is my website actually converting visitors into customers?</li>
        <li>• How can I expand my business offerings?</li>
        <li>• When is it time to pivot or close a business?</li>
        <li>• How do I start a business?</li>
      </ul>
    </div>
  </div>
</section>

      </main>
    );
  }
  
  