import Link from "next/link";
import InquiryLauncher from "@/components/InquiryLauncher";
import SmartPromptsGraphic from "@/components/SmartPromptsGraphic";

export const metadata = {
  title: "Smart Prompts | Ads for Good",
  description:
    "Show the right prompt at the right moment — exit-intent, cart-abandon, time-spent — with your copy and an optional offer. Capture more sales, signups, and leads.",
};

const PROMPT_TYPES: { name: string; desc: string; soon?: boolean }[] = [
  { name: "Email Exchange", desc: "Email + button, with an optional offer revealed on submit." },
  { name: "Custom Form", desc: "Multi-field capture for richer signups and qualification." },
  { name: "Custom Notification", desc: "Lightweight corner bubble — yes/no or single CTA." },
  { name: "Make an Offer", desc: "Cart-recovery offers with your thresholds and counter-offers." },
  { name: "Phone Call", desc: "Click-to-call CTAs for calls-driven businesses." },
  { name: "Remind Me", desc: "Price-drop and restock alerts that notify on trigger." },
];

export default function SmartPromptsPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-8 pb-24">
      {/* HERO SECTION */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            Smart Prompts: Capture the extra sale, signup, or lead.
          </h1>

          <div className="mt-3 flex gap-2 text-xs font-medium">
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
              Chapter Feature · Available Standalone
            </span>
          </div>

          <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
            Show the right prompt at the right moment — exit-intent,
            cart-abandon, time-spent — paired with your copy and an optional
            offer.
          </p>

          {/* CTA */}
          <section id="primary-cta" className="mt-8">
            <InquiryLauncher
              label="Talk To Us About Smart Prompts"
              defaultServices={["Smart Prompts"]}
              sourceLabel="Smart Prompts — Hero CTA"
              className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
            />
          </section>
        </div>

        {/* Right: Explainer card */}
        <div className="flex-1">
          <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-5">
            <h2 className="text-sm font-semibold text-neutral-900">
              Capture more at the right moment:
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>
                Fire a prompt on exit-intent, cart-abandon, time-spent, scroll,
                or click
              </li>
              <li>Increase submissions or sales by prompting more action</li>
              <li>
                Your own copy + an optional discount code — the nudge that earns
                the action
              </li>
              <li>Capture email signups, form fills, or drive the sale directly</li>
              <li>See each prompt&apos;s show-to-submit rate and optimize it</li>
            </ul>
          </div>

          <div className="mt-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Prompt types
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PROMPT_TYPES.map((p) => (
                <div
                  key={p.name}
                  className="rounded-2xl border border-orange-100 bg-white px-3 py-2 shadow-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-neutral-900">
                      {p.name}
                    </p>
                    {p.soon && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-neutral-500">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN DO SECTION */}
      <section className="w-full bg-orange-100 mt-8">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                What you can do with Smart Prompts.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
                Upgrade lost moments to conversions — capture the extra sale,
                signup, or lead with a prompt that fires at exactly the right
                time.
              </p>
            </div>

            <SmartPromptsGraphic />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Pill 1 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Turn loss into action.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Trigger on exit-intent, cart-abandon, time-spent, scroll, click,
                or winback — whenever a visitor is most likely to act.
              </p>
            </div>

            {/* Pill 2 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Your offer, your copy.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Pair a prompt with your message and an optional discount code —
                the nudge that turns a browser into a buyer or subscriber.
              </p>
            </div>

            {/* Pill 3 */}
            <div className="rounded-3xl bg-white border border-orange-100 px-5 py-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Prompts that grade themselves.
              </h3>
              <p className="mt-2 text-xs text-neutral-700">
                Chapter logs shown / submitted / dismissed for every prompt, so
                you can optimize.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Centered content below */}
      <div className="w-full max-w-6xl">
        {/* Who this is for / not for */}
        <section className="mt-8 sm:mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              Who this is for
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>
                Ecommerce brands that want to capture more sales, signups, and
                leads
              </li>
              <li>
                Anyone running popups (Klaviyo / Privy) who wants smarter
                triggers and real measurement
              </li>
              <li>
                Businesses that want to test offers and nudges at high-intent
                moments
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              Who this is not for
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
              <li>Businesses that don&apos;t want any on-site prompts</li>
              <li>
                Anyone looking for a full email or CRM platform to send from —
                this is the capture layer
              </li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            FAQ
          </h2>
          <p className="mt-2 text-sm sm:text-base text-neutral-800 max-w-3xl">
            Quick answers to the most common questions.
          </p>

          <div className="mt-6 space-y-3 max-w-4xl">
            {[
              {
                q: "Does this replace my email platform?",
                a: "No. Smart Prompts is the capture and nudge layer — keep sending through your ESP (Klaviyo, Mailchimp, and others).",
              },
              {
                q: "What can trigger a prompt?",
                a: "Exit-intent, time-spent, scroll-depth, click, cart-abandon, winback, and more.",
              },
              {
                q: "What can a prompt capture?",
                a: "Email signups, form fills, or a direct sale — paired with your copy and an optional discount code.",
              },
              {
                q: "Can I measure how prompts perform?",
                a: "Yes. Chapter logs shown / submitted / dismissed for every prompt, so you see show → submit rates and can optimize.",
              },
              {
                q: "Is it privacy-safe?",
                a: "Yes — consent-respecting by default, and emails are hashed in the visitor's browser.",
              },
              {
                q: "Do I have to use all of Chapter?",
                a: "No. Smart Prompts works on its own; it's also part of the full Chapter platform.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm"
              >
                <summary className="cursor-pointer select-none font-medium text-neutral-900 text-sm sm:text-base">
                  {item.q}
                </summary>

                <div className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Part of Chapter / cross-links */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* LEFT COLUMN */}
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900">
                  Smart Prompts is one piece of Chapter.
                </h2>

                <p className="mt-3 text-sm sm:text-base text-neutral-800">
                  See how the full platform connects every prompt, click, visit,
                  and conversion into one lifecycle view.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/for-businesses/lifecycle-attribution"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    Explore Chapter
                  </Link>

                  <Link
                    href="/for-businesses/smart-links"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    Chapter Links
                  </Link>

                  <Link
                    href="/for-businesses"
                    className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                  >
                    View All Plans
                  </Link>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div>
                <h3 className="mt-4 md:mt-4 text-lg font-semibold text-neutral-900">
                  Prefer to talk it through?
                </h3>

                <p className="mt-2 text-sm text-neutral-700">
                  Tell us where you&apos;d add prompts on your site.
                </p>

                <div className="mt-5">
                  <InquiryLauncher
                    label="Talk To Us About Smart Prompts"
                    defaultServices={["Smart Prompts"]}
                    sourceLabel="Smart Prompts — Bottom CTA"
                    className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
