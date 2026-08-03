import Link from "next/link";
import InquiryLauncher from "@/components/InquiryLauncher";

export const metadata = {
  alternates: { canonical: "https://www.ads4good.com/for-businesses/newsletter-advertising" },
  title: "Newsletter Advertising: Reach Engaged Inboxes | ads for Good",
  description:
    "Text-only ads inside newsletters people actually open. Extra is our growing ad network — tell us who you want to reach and we'll match you as senders come online.",
};

export default function NewsletterAdvertisingPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900 flex flex-col items-center px-4 pt-8 pb-24">
      {/* HERO */}
      <section className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-start">
        {/* Left: Hero copy */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
            Newsletter Advertising: get into the inbox, not past it
          </h1>

          <div className="mt-3 flex gap-2 text-xs font-medium">
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
              Service Type: Standalone · Powered by Extra
            </span>
          </div>

          <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
            Display ads get scrolled past. Social ads get skipped. A text ad
            inside a newsletter someone chose to open, from a sender they already
            trust, gets read.
          </p>

          <p className="mt-4 text-base sm:text-lg text-neutral-800 leading-relaxed">
            Extra is our ad network. It places text-only messages inside the
            email sends of businesses, publishers, and creators — clearly marked,
            and approved by the sender before anything runs.
          </p>

          <p className="mt-4 text-base sm:text-lg font-semibold text-neutral-900 leading-relaxed">
            We&apos;re building it now, and we&apos;re taking advertisers early.
          </p>

          {/* CTA */}
          <section id="primary-cta" className="mt-8">
            <InquiryLauncher
              label="Tell Us Who You Want To Reach"
              defaultServices={["Newsletter Advertising"]}
              sourceLabel="Newsletter Advertising — Hero CTA"
              className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
            />
          </section>
        </div>

        {/* Right: Explainer card */}
        <div className="flex-1">
          <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
            <h2 className="text-sm font-semibold text-neutral-900">
              Why it lands:
            </h2>

            <ul className="mt-3 space-y-1.5 text-xs sm:text-sm text-neutral-800 list-disc list-inside">
              <li>Readers opted in — nobody accidentally subscribes</li>
              <li>The sender&apos;s trust carries to your message</li>
              <li>Text-only means text-read — no banner blindness</li>
              <li>The inbox isn&apos;t crowded the way the feed is</li>
              <li>Approved by the sender before it ever runs</li>
            </ul>
          </div>
        </div>
      </section>

      {/* WHERE THIS IS TODAY */}
      <section className="w-full max-w-6xl mt-12">
        <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-6 py-8 sm:px-10 sm:py-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
            Where this is today
          </h2>
          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-neutral-800">
            Straight answer, because you&apos;d find out anyway: Extra is early.
          </p>
          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-neutral-800">
            We&apos;re onboarding senders first, deliberately, so that advertisers
            arriving later find audiences worth reaching rather than whatever
            inventory we could sign fastest. That means we&apos;re not selling
            placements off a rate card today.
          </p>
          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-neutral-800">
            What we are doing is talking to advertisers about who they want to
            reach, so we can build toward it. If you tell us your audience now,
            you get first look as matching sends come online — and some say in the
            kind of network this becomes.
          </p>
          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-neutral-800">
            If you need placements running this quarter, we&apos;re not the right
            call yet. Come back, or tell us and we&apos;ll reach out when we are.
          </p>
        </div>
      </section>

      {/* WHY NEWSLETTERS */}
      <section className="w-full bg-orange-100 mt-12">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
            Why newsletters, though
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900">
                People opted in
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-800">
                Nobody accidentally subscribes to a newsletter. Every reader chose
                to be there — a higher bar than any audience you can buy on a
                social platform.
              </p>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900">
                The sender&apos;s trust carries
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-800">
                Your message arrives inside something the reader opens on purpose.
                That context does work no display placement replicates.
              </p>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900">
                Text-only means text-read
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-800">
                No images, no banners, nothing that pattern-matches to
                &ldquo;advertisement&rdquo; and gets ignored. It reads as part of
                the email because it looks like part of the email.
              </p>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900">
                The inbox isn&apos;t crowded the way the feed is
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-800">
                You&apos;re competing with a handful of senders, not an infinite
                scroll.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WILL WORK */}
      <section className="w-full max-w-6xl mt-12">
        <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
          How it will work
        </h2>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Step 1
            </p>
            <h3 className="mt-3 text-lg font-semibold text-neutral-900">
              Tell us who you&apos;re trying to reach
            </h3>
            <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-800">
              Audience, category, geography, and what a good customer looks like.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Step 2
            </p>
            <h3 className="mt-3 text-lg font-semibold text-neutral-900">
              We match you as sends come online
            </h3>
            <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-800">
              Your text ad runs inside emails whose audiences fit. Every sender
              approves the advertisers appearing in their sends, so placement is
              never adversarial — which is also why it takes a little longer than
              buying a programmatic slot.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-500">
              Step 3
            </p>
            <h3 className="mt-3 text-lg font-semibold text-neutral-900">
              You see what it did
            </h3>
            <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-800">
              Delivery, engagement, and downstream action — measured properly
              rather than inferred from a platform&apos;s own report.
            </p>
          </div>
        </div>
      </section>

      {/* TEXT-ONLY, ON PURPOSE */}
      <section className="w-full max-w-6xl mt-12">
        <div className="rounded-3xl bg-[#24364D] px-6 py-8 sm:px-10 sm:py-10 text-white shadow-[0_12px_36px_rgba(0,0,0,0.10)]">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            Text-only, on purpose
          </h2>
          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-white/80">
            Extra runs text ads. No images, no rich media, no takeovers.
          </p>
          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-white/80">
            That&apos;s a constraint, and it&apos;s deliberate. Image-heavy email
            ads get stripped by clients, blocked by image settings, and mentally
            filed as advertising before they&apos;re read. A well-written text ad
            in the flow of an email people are already reading gets read.
          </p>
          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-white/80">
            It also means senders are willing to run them. Nobody wants a banner
            wedged into their newsletter. A clean text placement they approved is
            a different proposition — which is why the inventory exists at all.
          </p>
        </div>
      </section>

      {/* WHO FOR / NOT FOR */}
      <section className="w-full max-w-6xl mt-8 sm:mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
          <h3 className="text-sm font-semibold text-neutral-900">
            Who this is for
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
            <li>
              Businesses wanting to reach engaged, opted-in audiences rather than
              rented attention
            </li>
            <li>Advertisers whose results have flattened on paid social and search</li>
            <li>Anyone selling something worth explaining in a sentence or two</li>
            <li>Advertisers willing to get in early and grow with a network</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-neutral-300 bg-white px-5 sm:px-6 py-5 sm:py-6">
          <h3 className="text-sm font-semibold text-neutral-900">
            Who this is not for
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
            <li>Anyone needing placements live this quarter</li>
            <li>Anyone needing image, video, or rich-media creative</li>
            <li>
              Advertisers wanting to buy a specific named publication — Extra
              places across a network, not one title
            </li>
            <li>
              Businesses expecting last-click attribution to tell the whole story.
              Email advertising influences more than it closes, which is exactly
              why we built Chapter.
            </li>
          </ul>
        </div>
      </section>

      {/* MEASUREMENT */}
      <section className="w-full max-w-6xl mt-12">
        <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
          Measurement, since that&apos;s what we do
        </h2>
        <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-neutral-800">
          Most newsletter advertising is measured on opens and clicks, which
          tells you almost nothing about whether it worked.
        </p>
        <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-neutral-800">
          Extra is built by the same team as{" "}
          <Link
            href="/for-businesses/lifecycle-attribution"
            className="text-orange-500 underline hover:text-orange-600"
          >
            Chapter
          </Link>
          , our attribution platform. Placements can be measured as part of a full
          customer journey — including visits that happen days later, from a
          different device, with no click to trace.
        </p>
        <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-neutral-800">
          If newsletter advertising is quietly producing customers you&apos;re
          currently crediting to search, that&apos;s the kind of thing we can show
          you.
        </p>
      </section>

      {/* FAQ */}
      <section className="w-full max-w-6xl mt-12">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
          FAQ
        </h2>

        <div className="mt-6 space-y-3 max-w-4xl">
          {[
            {
              q: "What is newsletter advertising?",
              a: "Paying to place a message inside someone else's email newsletter, in front of an audience that opted in to hear from that sender. It's distinct from advertising your newsletter on social platforms, and distinct from LinkedIn's newsletter ad format — this is about appearing inside emails people already receive.",
            },
            {
              q: "Can I buy placements today?",
              a: "Not off a rate card. We're onboarding senders first so that advertisers find audiences worth reaching. Tell us who you want to reach and you get first look as matching sends come online.",
            },
            {
              q: "How is this different from email marketing?",
              a: "Email marketing sends to your own list. Newsletter advertising puts you inside someone else's send, in front of people who don't know you yet. One retains, the other acquires.",
            },
            {
              q: "What do the ads look like?",
              a: "Text only. A short headline and a couple of lines of copy, clearly marked as sponsored, set in the newsletter's own formatting. No images or rich media.",
            },
            {
              q: "Which newsletters will I be in?",
              a: "Extra places across a network of senders whose audiences match your target. Every sender approves the advertisers in their sends, so placement depends on fit on both sides.",
            },
            {
              q: "How will I know it worked?",
              a: "Beyond delivery and engagement, placements can be measured through Chapter, our attribution platform, which connects a placement to what someone did afterward — including later visits from other devices with no click to follow.",
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

          <details className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm">
            <summary className="cursor-pointer select-none font-medium text-neutral-900 text-sm sm:text-base">
              Can I advertise and monetize at the same time?
            </summary>
            <div className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
              Yes. Plenty of businesses do both: earning from ads in their own
              sends while advertising inside other people&apos;s. See{" "}
              <Link
                href="/for-businesses/ad-monetization"
                className="text-orange-500 underline hover:text-orange-600"
              >
                newsletter monetization
              </Link>{" "}
              for the earning side.
            </div>
          </details>
        </div>
      </section>

      {/* Built by afG / cross-links */}
      <section className="w-full max-w-6xl mt-14 sm:mt-16">
        <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* LEFT COLUMN */}
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900">
                Built by afG, like Chapter.
              </h2>

              <p className="mt-3 text-sm sm:text-base text-neutral-800">
                Extra and Chapter are the two networks we&apos;ve built in-house
                — ad monetization and attribution.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/for-businesses/lifecycle-attribution"
                  className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
                >
                  Explore Chapter
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
                Tell us who you&apos;re trying to reach.
              </p>

              <div className="mt-5">
                <InquiryLauncher
                  label="Tell Us Who You Want To Reach"
                  defaultServices={["Newsletter Advertising"]}
                  sourceLabel="Newsletter Advertising — Bottom CTA"
                  className="inline-flex w-fit items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-orange-600"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
