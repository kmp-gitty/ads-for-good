import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "privacy and data | take back control",
  description:
    "You'd be surprised how many companies have and how many ways there are to use your data. Learn free tips to take back some control and enact our paid services for even more protection.",
};

export default function PrivacyProtectionPage() {
    return (
      <main className="bg-white text-neutral-900">
        {/* HERO / INTRO SECTION */}
        <section className="w-full bg-orange-50">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center">
            {/* Left: text */}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-orange-500">
                Privacy protection: understand ad data without needing a law degree.
              </h1>
              <p className="mt-6 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-xl">
                Everyone wants your data: apps, retailers, ad platforms, even the random sites you
                only visit once. This page is where we turn the lights on — explaining what&apos;s
                happening and give you practical ways to protect yourself.
              </p>
            </div>
  
            {/* Right: visual */}
<div className="flex-1">
  <div className="rounded-3xl bg-white border border-orange-100 shadow-sm p-5 h-full flex flex-col justify-between">
    
    {/* Replace placeholder with your image */}
    <div className="h-40 rounded-2xl bg-neutral-100 flex items-center justify-center overflow-hidden">
      <Image
        src="/images/PrivacyProtection.png"
        alt="Privacy protection illustration"
        width={500}
        height={500}
        className="object-contain w-full h-full"
      />
    </div>

    <div className="mt-4">
      <h2 className="text-sm font-semibold text-neutral-900">
        A guide, not a scare tactic.
      </h2>
      <p className="mt-2 text-xs text-neutral-700">
        We&apos;re not here to panic you — just to explain what&apos;s going on and give
        you options so you can decide what feels right for you.
      </p>
    </div>
  </div>
</div>

          </div>
        </section>
  
        {/* FREE TOOLS SECTION (middle band) */}
        <section className="w-full bg-orange-100">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            {/* Heading / copy */}
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                Free tools to take back a little control.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                Start here if you just want some quick wins. These are tools, settings, and habits
                that cost nothing but can make tracking a little less intense and your feeds a
                little more tolerable.
              </p>
            </div>
  
            {/* Tool slots */}
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {/* Tool card 1 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Ad Blockers
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  Stop pop-ups, video ads, trackers, or potential malware. Use an ad blocker to almost eliminate ads from your browsing experience. I recommend downloading a web extension.
                </p>
                <a
  href="https://www.pcmag.com/picks/best-ad-blockers"
  target="_blank"
  rel="noopener noreferrer"
  className="mt-4 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[11px] font-medium text-neutral-900"
>
  Top ad blockers
</a>

              </div>
  
              {/* Tool card 2 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Third Party Cookies
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  Cookies are snippets of code websites and advertisers use to remember you. You can customize or deny them, usually an initial pop-up when you visit a site. Deny or remove them from your settings.
                </p>
                <a
  href="https://support.google.com/chrome/answer/95647?hl=en&co=GENIE.Platform%3DDesktop"
  target="_blank"
  rel="noopener noreferrer"
  className="mt-4 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[11px] font-medium text-neutral-900"
>
  Manage cookies in Chrome (similar steps for others)
</a>

              </div>
  
              {/* Tool card 3 */}
              <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  The Plus Method: "+" (Works for Gmail, Hotmail & Outlook)
                </h3>
                <p className="mt-2 text-xs text-neutral-700">
                  Signing up for something new? Try adding a "+" and some identifier text before the @ in your email, then if you get emails from anything other than the intended source - you know they are selling your data.
                </p>
                <br />
                <p className="mt-2 text-xs text-neutral-700">
                For example, if your email is hello@gmail.com. You can use hello+facebook@gmail.com to sign up for Facebook. Emails sent to that address still go to your inbox, and if an email comes in from anywhere else than Facebook - they sold your data. Change the identifier for whatever else.
                </p>
              </div>
            </div>
          </div>
        </section>
  
        {/* PAID OFFERING SECTION (bottom) */}
        <section className="w-full bg-white pb-24">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            {/* Heading / copy */}
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                When you&apos;re ready to go deeper.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
  We're not necessarily anti-ad, it is our profession at the end of the day. We're very much 
  anti-creepy / scummy ads though.{" "}
  <Link href="/for-people/education" className="text-orange-500 hover:underline">
    Our Education page
  </Link>{" "}
  gives you the ins and outs of how it all works, the section above gives you some free tools to 
  take back some control, this section is our paid offering for this.
</p>

            </div>
  
            {/* Paid layout shell */}
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {/* Left column – highlight card */}
              <div className="md:col-span-2 rounded-3xl border border-orange-100 bg-orange-50 px-6 py-6 shadow-sm">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Future paid offering idea
                </h3>
                <p className="mt-3 text-xs text-neutral-800 leading-relaxed">
                  People go to a financial advisor needing help managing and investing money. Go to a real estate agent needing help navigating the home buying process. Go to a lawyer for advice and action with their legal situation.<br />
                  <br />
                  Our vision is those positions, but for your marketing privacy. Whether you want to limit your data exposure and ads altogether, or just make the ads you see as relevant as possible - we'll advise you there and manage everything.
                </p>
              </div>
  
              {/* Right column – detail list */}
              <div className="rounded-3xl border border-orange-100 bg-white px-5 py-5 shadow-sm">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Help to:
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-neutral-800 list-disc list-inside">
                  <li>Know who has your data.</li>
                  <li>Limit data exposure as much as possible.</li>
                  <li>Tailor ads to companies you actually want to see.</li>
                  <li>Receive customized offers from brands, just for you.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }
  