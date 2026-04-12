import Link from "next/link";
import InquiryLauncher from "@/components/InquiryLauncher";
import SmoothScrollButton from "@/components/SmoothScrollButton";
import StickyCTA from "@/components/StickyCTA";

export const metadata = {
  title: "Lifecycle Attribution | Ads for Good",
  description:
    "Chapter helps businesses connect visits, channels, behavior, and conversions into one holistic view — so marketing decisions are based on full journeys, not isolated channels.",
};

export default function LifecycleAttributionPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900">
      {/* HERO */}
      <section className="w-full bg-[#C85A1B] text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <div className="max-w-5xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/75">
              Chapter: Measurement Technology We've Built:
            </p>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight leading-[1.04] sm:text-5xl lg:text-6xl">
              Beyond Marketing Attribution.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/85">
              Chapter gives you a fuller view of business performance across
              visits, channels, and real customer behavior — not just whichever
              platform shouts the loudest. <br/><br/>
              See how people go from first visit to action, and much more.
            </p>

            <div id="chapter-hero-cta" className="mt-8 flex flex-wrap gap-3">
              <InquiryLauncher
                label="Interested In Chapter"
                defaultServices={["Chapter: Lifecycle Attribution"]}
                sourceLabel="Lifecycle Attribution Page — Hero CTA"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-4 text-base font-semibold text-[#C85A1B] transition hover:bg-white/90"
              />

              <Link
                href="/for-businesses"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                View All Business Services
              </Link>

              {/* NEW CTA */}
              <SmoothScrollButton
  targetId="chapter.pricing"
  className="inline-flex items-center gap-3 rounded-full border border-white/30 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/10"
  >
    View Pricing
    <span className="inline-block translate-y-[1px]">↓</span>
  </SmoothScrollButton>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK VALUE */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Clarify paths</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-700">
              See how people get to you, what they do once they arrive, and what
              actually happens before purchase or other important actions.
            </p>
          </div>

          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Reduce duplicate credit</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-700">
              Stop relying soley on separate platform views where multiple tools
             claim the same person and the same conversion.
            </p>
          </div>

          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Make smarter decisions</h2>
            <p className="mt-3 text-sm leading-7 text-neutral-700">
              Use a holistic view to improve channel mix, engagement paths,
              landing experiences, and shortening the steps people take before action.
            </p>
          </div>
        </div>
      </section>

      {/* CHAPTER'S PIECES */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
            Chapter&apos;s Pieces
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            One system, four connected measurement techniques.
          </h2>
          <p className="mt-4 text-base leading-8 text-neutral-700">
            Chapter combines four layers that are usually handled separately:
            where users came from, what they did, who they are across visits,
            and what the data is telling you to do next.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Pixel
            </p>
            <h3 className="mt-4 text-2xl font-semibold">
              Measures where users came from
            </h3>
            <p className="mt-4 text-sm leading-7 text-neutral-700">
              Measures previous source before site visit, determines ad vs.
              organic vs. direct vs. other path in, and helps answer: what is
              the start of each journey to you?
            </p>
          </div>

          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Behavioral Analytics
            </p>
            <h3 className="mt-4 text-2xl font-semibold">
              Measures what users do
            </h3>
            <p className="mt-4 text-sm leading-7 text-neutral-700">
              Records engagement actions like clicks, scroll depth, time spent,
              form fills, contact actions, purchases, and more — with
              privacy-safe and consent-aware ingestion.
            </p>
          </div>

          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              ID Graph
            </p>
            <h3 className="mt-4 text-2xl font-semibold">
              Stitches visitors, actions, and journeys
            </h3>
            <p className="mt-4 text-sm leading-7 text-neutral-700">
              Uses identity graph logic to connect anonymous users, identified
              users, and events across visits, with capabilities to stitch
              online to offline and vice versa.<br/><em>*No invasive personally identifiable information used*</em>
            </p>
          </div>

          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Modeling
            </p>
            <h3 className="mt-4 text-2xl font-semibold">
              Provides actionable data across lifecycle
            </h3>
            <p className="mt-4 text-sm leading-7 text-neutral-700">
              Turns events and identities into lifecycle-based insights:
              observational data, channel correlations, lift-style signals, and
              practical answers to questions like: what to change to increase
              adoption, revenue, orders, or engagement.
            </p>
          </div>
        </div>
      </section>

      {/* STANDARD IN INDUSTRY */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-[2rem] border border-orange-200 bg-white p-8 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
              Why this matters
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              None of this is strange. It&apos;s just usually fragmented.
            </h2>
            <p className="mt-4 text-base leading-8 text-neutral-700">
              Pixels, identity graphs, behavioral analytics, and statistical
              modeling already exist across the industry. The problem is that
              most businesses see them through separate tools, separate teams,
              and separate stories. Chapter pieces them together into one view.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-orange-200 bg-[#fff7ed] p-5">
              <h3 className="text-lg font-semibold">Pixels</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                Standard measurement across ad platforms, delivery engines, and
                many website tools.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-[#fff7ed] p-5">
              <h3 className="text-lg font-semibold">Identity Graphs</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                Anonymous and identified user linkage already powers many
                attribution and customer data systems.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-[#fff7ed] p-5">
              <h3 className="text-lg font-semibold">Behavioral Analytics</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                On-site tracking, heatmapping, customer databases, and UX tools
                are already normal parts of the stack.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-[#fff7ed] p-5">
              <h3 className="text-lg font-semibold">Modeling</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                Sound statistical analysis remains the gold standard for better
                measurement and decision-making.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WITHOUT / WITH CHAPTER */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
            Example
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            The same customer journey looks very different with and without Chapter.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              Without Chapter
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Separate tools, duplicate credit, broken story
            </h3>

            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-orange-200 bg-[#fff7ed] px-4 py-2">
                Facebook visit
              </span>
              <span className="rounded-full border border-orange-200 bg-[#fff7ed] px-4 py-2">
                Product page
              </span>
              <span className="rounded-full border border-orange-200 bg-[#fff7ed] px-4 py-2">
                Exit
              </span>
              <span className="rounded-full border border-orange-200 bg-[#fff7ed] px-4 py-2">
                Reddit return visit
              </span>
              <span className="rounded-full border border-orange-200 bg-[#fff7ed] px-4 py-2">
                Product page
              </span>
              <span className="rounded-full border border-orange-200 bg-[#fff7ed] px-4 py-2">
                Purchase
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-sm leading-7 text-neutral-700">
              <li>GA sees separate sessions.</li>
              <li>Meta may claim the purchase.</li>
              <li>Reddit may also claim the purchase.</li>
              <li>Shopify knows a sale happened.</li>
              <li>You still have to interpret the real path manually.</li>
            </ul>
          </div>

          <div className="rounded-[2rem] bg-[#24364D] p-6 text-white shadow-[0_12px_36px_rgba(0,0,0,0.10)]">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-300">
              With Chapter
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              One connected path across visits, channels, and identity
            </h3>

            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                Facebook visit
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                Product page
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                Exit
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                Reddit return visit
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                Product page
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                Purchase
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-sm leading-7 text-white/80">
              <li>Anonymous user recognized across visits.</li>
              <li>Journeys stitched together.</li>
              <li>Purchase connected to the prior path.</li>
              <li>Channel credit can be split more appropriately.</li>
              <li>You see the fuller lifecycle, not just one platform’s version.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW TO USE CHAPTER */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-semibold">Smarter Ad Sequencing</h3>
            <p className="mt-4 text-sm leading-7 text-neutral-700">
              Learn what channel combinations create the quickest or strongest
              path to action.
            </p>
          </div>

          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-semibold">Increase Engagement</h3>
            <p className="mt-4 text-sm leading-7 text-neutral-700">
              Understand which pages, elements, and routes actually lead to more
              depth, time spent, and interaction.
            </p>
          </div>

          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-semibold">Clarify Paths to Purchase</h3>
            <p className="mt-4 text-sm leading-7 text-neutral-700">
              See the steps customers take before converting and which visits and
              touchpoints matter most.
            </p>
          </div>

          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-semibold">Understand Value</h3>
            <p className="mt-4 text-sm leading-7 text-neutral-700">
              Separate what drives direct conversion from what helps drive
              higher-quality journeys, lift, and future performance.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="chapter.pricing" className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Three tiers, plus room to grow.
          </h2>
          <p className="mt-4 text-base leading-8 text-neutral-700">
            Chapter pricing is designed around journey volume, access level, and
            how much custom interpretation you need from us. Meaning: visitors to your site, what they do, and how much you want our involvement.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
        <InquiryLauncher
  label={
    <div className="plan-shake rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm text-left cursor-pointer">
            <h3 className="text-2xl font-semibold">Standard</h3>
            <p className="mt-4 text-4xl font-semibold">$149</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-neutral-800">
              <li>Up to 25K journeys</li>
              <li>Basic attribution: first, last, linear</li>
              <li>Dashboard-only access</li>
              <li>30 day retention</li>
              <li>Email support</li>
            </ul>
          </div>
            }
            defaultServices={["Chapter: Lifecycle Attribution"]}
            sourceLabel="Lifecycle Attribution Page — Standard Plan Tile"
            className="block"
          />

<InquiryLauncher
  label={
    <div className="plan-shake rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm text-left cursor-pointer">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-semibold">Growth</h3>
            </div>

            <p className="mt-4 text-4xl font-semibold">$399</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-neutral-800">
              <li>Up to 100K journeys</li>
              <li>Basic attribution + 1 custom model</li>
              <li>Dashboard access + weekly insights (async)</li>
              <li>60 day retention</li>
              <li>Priority email & monthly call support</li>
            </ul>
          </div>
           }
           defaultServices={["Chapter: Lifecycle Attribution"]}
           sourceLabel="Lifecycle Attribution Page — Growth Plan Tile"
           className="block"
         />

          <InquiryLauncher
  label={
    <div className="plan-shake rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm text-left cursor-pointer">
            <h3 className="text-2xl font-semibold">Pro</h3>
            <p className="mt-4 text-4xl font-semibold">$799</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-neutral-800">
              <li>Up to 200K journeys</li>
              <li>Basic + Custom + Advanced attribution</li>
              <li>Dashboard + consulting insights & meetings</li>
              <li>60 day retention</li>
              <li>Accelerated email, phone, and dedicated support</li>
            </ul>
          </div>
    }
    defaultServices={["Chapter: Lifecycle Attribution"]}
    sourceLabel="Lifecycle Attribution Page — Pro Plan Tile"
    className="block"
  />
  </div>

        <div className="mt-6 rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
                Add-On
              </p>
              <h3 className="mt-2 text-2xl font-semibold">180 Day Retention</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-700">
                Extend retention when you need longer lookback windows for reporting, analysis, or planning.
              </p>
            </div>

            <div className="rounded-full border border-orange-200 bg-[#fff7ed] px-5 py-3 text-lg font-semibold">
              +$99 / month
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-28">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#24364D] p-8 text-white shadow-[0_12px_36px_rgba(0,0,0,0.10)] sm:p-10">
        <div>
  <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-300">
    Start with your current stack
  </p>
  <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl leading-[1.08]">
    Chapter is built to integrate with what you already use: do more with the data you already have.
  </h2>
  <p className="mt-5 max-w-3xl text-base leading-8 text-white/80">
    It is designed to sit on top of your existing website, ad
    platforms, analytics, ecommerce, and conversion flows — then turn
    that fragmented activity into a more useful lifecycle view.
  </p>

  <div className="mt-8">
    <InquiryLauncher
      label="Talk To Us About Chapter"
      defaultServices={["Lifecycle Attribution"]}
      sourceLabel="Lifecycle Attribution Page — Bottom CTA"
      className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-4 text-base font-semibold text-white transition hover:bg-orange-600"
    />
  </div>
</div>
        </div>
      </section>
   
      <StickyCTA
  targetId="chapter-hero-cta"
  label="Talk To Us About Chapter"
  defaultServices={["Chapter: Lifecycle Attribution"]}
  sourceLabel="Lifecycle Attribution Page — Sticky CTA"
/>

    </main>
  );
}