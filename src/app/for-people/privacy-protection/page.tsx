import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "privacy and data | take back control",
  description:
    "You'd be surprised how many companies have and how many ways there are to use your data. Learn free tips to take back some control and enact our paid services for even more protection.",
};

export default function PrivacyProtectionPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900">

      {/* HERO */}
      <section className="w-full bg-[#C85A1B] text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 md:flex-row md:items-center">
          
          {/* Left */}
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              Privacy protection: understand ad data without needing a law degree.
            </h1>

            <p className="mt-6 text-base text-white/90 max-w-xl leading-relaxed">
              Everyone wants your data: apps, retailers, ad platforms, even the random sites you
              only visit once. This page is where we turn the lights on — explaining what&apos;s
              happening and give you practical ways to protect yourself.
            </p>
          </div>

          {/* Right */}
          <div className="flex-1">
            <div className="rounded-3xl bg-white text-neutral-900 border border-orange-200 shadow-sm p-5 h-full flex flex-col justify-between">
              
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
                <h2 className="text-sm font-semibold">
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

      {/* FREE TOOLS */}
      <section className="px-4 py-20">
        <div className="mx-auto w-full max-w-6xl">

          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-semibold">
              Free tools to take back a little control.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-neutral-700 leading-relaxed">
              Start here if you just want some quick wins. These are tools, settings, and habits
              that cost nothing but can make tracking a little less intense and your feeds a
              little more tolerable.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            
            {/* Card */}
            <div className="rounded-2xl bg-white border border-orange-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Ad Blockers</h3>
              <p className="mt-2 text-xs text-neutral-700">
                Stop pop-ups, video ads, trackers, or potential malware. Use an ad blocker to almost eliminate ads from your browsing experience. I recommend downloading a web extension.
              </p>
              <a
                href="https://www.pcmag.com/picks/best-ad-blockers"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[11px] font-medium"
              >
                Top ad blockers
              </a>
            </div>

            <div className="rounded-2xl bg-white border border-orange-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Third Party Cookies</h3>
              <p className="mt-2 text-xs text-neutral-700">
                Cookies are snippets of code websites and advertisers use to remember you. You can customize or deny them, usually an initial pop-up when you visit a site.
              </p>
              <a
                href="https://support.google.com/chrome/answer/95647?hl=en&co=GENIE.Platform%3DDesktop"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[11px] font-medium"
              >
                Manage cookies
              </a>
            </div>

            <div className="rounded-2xl bg-white border border-orange-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold">
                The Plus Method: "+"
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Signing up for something new? Add a "+" to your email, plus some identifier before the @ to track who sells your data.
                <br /><br />
                If your email is hello@gmail.com. You can use hello+facebook@gmail.com to sign up for Facebook. Still get emails like normal, and know if FB sold your email to someone else.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* PAID SECTION (BLUE ANCHOR) */}
      <section className="px-4 pb-24">
        <div className="mx-auto w-full max-w-6xl">

          <div className="rounded-3xl bg-[#24364D] text-white p-8 md:p-10">
            
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold">
                When you&apos;re ready to go deeper.
              </h2>
              <p className="mt-4 text-white/80 text-sm sm:text-base leading-relaxed">
                We're not necessarily anti-ad, it is our profession at the end of the day. We're very much 
                anti-creepy / scummy ads though.{" "}
                <Link href="/for-people/education" className="underline">
                  Our Education page
                </Link>{" "}
                gives you the ins and outs of how it all works.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              
              <div className="md:col-span-2 rounded-2xl bg-white text-neutral-900 p-6">
                <h3 className="text-sm font-semibold">
                  Future paid offering idea
                </h3>
                <p className="mt-3 text-xs leading-relaxed">
                  People go to a financial advisor needing help managing and investing money...
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-6">
                <h4 className="text-xs uppercase tracking-wide text-white/70">
                  Help to:
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-white/90 list-disc list-inside">
                  <li>Know who has your data.</li>
                  <li>Limit data exposure as much as possible.</li>
                  <li>Tailor ads to companies you actually want to see.</li>
                  <li>Receive customized offers from brands.</li>
                </ul>
              </div>

            </div>
          </div>

        </div>
      </section>

    </main>
  );
}