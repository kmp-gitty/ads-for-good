import Link from "next/link";
import InquiryLauncher from "@/components/InquiryLauncher";
import GuidebookCheckoutCTA from "@/components/GuidebookCheckoutCTA";
import TrackedLink from "@/components/TrackedLink";

export const metadata = {
  title: "Business Services | Ads for Good",
  description:
    "Explore our business services — start with guidance, move into execution, or plug us in as your marketing team.",
};

export default function ForBusinessesPage() {
  return (
    <main className="bg-[#f7f4ee] text-neutral-900">
      {/* HERO */}
      <section className="w-full bg-[#C85A1B] text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/75">
              for Businesses
            </p>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight leading-[1.04] sm:text-5xl lg:text-6xl">
              Flexible, on-demand marketing support—without hiring a full team.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
              Our plans includes a set number of active marketing projects. You can swap, pause, or change them anytime.
            </p>
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
              Plans
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Our On-Demand Marketing Plans:
            </h2>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {/* SUPPORT */}
          <div
            id="support"
            className="rounded-[2rem] border border-orange-700 bg-white p-6 shadow-sm"
          >
            <h3 className="text-2xl font-semibold">Support</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Someone handling marketing tasks when needed
            </p>

            <p className="mt-6 text-4xl font-semibold">$750</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-neutral-800">
              <li>2 active marketing projects</li>
              <li>Standard attention</li>
              <li>Biweekly to monthly milestones</li>
              <li>1 monthly meeting</li>
              <li>Unlimited email marketing advice</li>
            </ul>
          </div>

          {/* PARTNER */}
          <div
            id="partner"
            className="rounded-[2rem] border border-orange-200 bg-[#fff7ed] p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
  <h3 className="text-2xl font-semibold leading-none">Partner</h3>
  <span className="text-[10px] font-medium uppercase tracking-wide bg-orange-500 text-white px-2 py-0.5 rounded-full">
    Most Popular
  </span>
</div>
            <p className="mt-2 text-sm text-neutral-600">
              Reliable, part-time marketing support
            </p>

            <p className="mt-6 text-4xl font-semibold">$1,400</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-neutral-800">
              <li>4 active marketing projects</li>
              <li>Accelerated attention</li>
              <li>Weekly to biweekly milestones</li>
              <li>2 monthly meetings</li>
              <li>Unlimited email marketing advice</li>
            </ul>
          </div>

          {/* TEAM */}
          <div
            id="team"
            className="rounded-[2rem] border border-orange-700 bg-white p-6 shadow-sm"
          >
            <h3 className="text-2xl font-semibold">Team</h3>
            <p className="mt-2 text-sm text-neutral-600">
              A marketing team actively driving my business
            </p>

            <p className="mt-6 text-4xl font-semibold">$2,400</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-neutral-800">
              <li>8 active marketing projects</li>
              <li>Priority attention</li>
              <li>Few days to weekly milestones</li>
              <li>4 monthly meetings</li>
              <li>Unlimited email marketing advice</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PROJECT TYPES */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
            Project Types
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            What Is A Marketing Project?
          </h2>
          <p className="mt-4 text-neutral-700 max-w-2xl">
            Projects can include any of the following areas and can be swapped at any time.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3 text-sm">
          {[
            {
              label: "Digital Profile Management",
              href: "/for-businesses/digital-profile-management",
            },
            {
              label: "SEO",
              href: "/for-businesses/seo-services",
            },
            {
              label: "Paid Ads",
              href: "/for-businesses/digital-ads",
            },
            {
              label: "Website Updates",
              href: "/for-businesses/website-builds-updates",
            },
            {
              label: "Email Marketing",
              href: "/for-businesses/email-marketing",
            },
            {
              label: "Marketing Operations",
              href: "/for-businesses/marketing-ops",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-center rounded-2xl border border-orange-200 bg-white p-5 text-center font-semibold shadow-sm transition hover:bg-orange-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ADD-ONS / STANDALONES */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          {/* ADD-ONS */}
          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
  <h2 className="text-2xl font-semibold">Add-Ons</h2>
  <p className="mt-2 text-neutral-700 text-sm max-w-md leading-relaxed">
    Optional enhancements you can layer onto any plan to expand capacity, speed, or capabilities.
  </p>

  <div className="mt-6 grid gap-3 text-sm">
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-xl border-2 border-dashed border-orange-300 bg-[#fff3e6] px-4 py-3 w-[240px] text-center">
        Extra Marketing Project — $350
      </div>
      <div className="flex justify-center ml-6">
      <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
        Plan Add-On
      </div>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-xl border-2 border-dashed border-orange-300 bg-[#fff3e6] px-4 py-3 w-[240px] text-center">
        Rush Attention — $250
      </div>
      <div className="flex justify-center ml-6">
      <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
        Speed Upgrade
      </div>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/for-businesses/digital-health-check"
        className="rounded-xl border border-orange-200 bg-[#fff7ed] px-4 py-3 transition hover:bg-orange-100  w-[240px] text-center"
      >
        Digital Health Check — $500
      </Link>
      <div className="flex justify-center ml-6">
      <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
        One-Time Cost
      </div>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/for-businesses/local-direct-mail"
        className="rounded-xl border border-orange-200 bg-[#fff7ed] px-4 py-3 transition hover:bg-orange-100 w-[240px] text-center"
      >
        Direct Mail — varies
      </Link>
      <div className="flex justify-center ml-6">
      <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
        Custom Pricing
      </div>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/for-businesses/website-builds-updates"
        className="rounded-xl border border-orange-200 bg-[#fff7ed] px-4 py-3 transition hover:bg-orange-100 w-[240px] text-center"
      >
        Site Maintenance — $100
      </Link>
      <div className="flex justify-center ml-6">
      <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
        Monthly Cost
      </div>
      </div>
    </div>
  </div>
</div>

          {/* STANDALONES */}
          <div className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm">
  <h2 className="text-2xl font-semibold">Standalones</h2>
  <p className="mt-2 text-neutral-700 text-sm max-w-md leading-relaxed">
    One-time or project-based services for businesses not ready for ongoing marketing support.
  </p>

  <div className="mt-6 grid gap-3 text-sm">

    <div className="grid grid-cols-[240px_1fr] items-center gap-4">
      <Link
        href="/for-businesses/marketing-guidebook"
        className="w-[240px] text-center rounded-xl border border-orange-200 bg-[#fff7ed] px-4 py-3 transition hover:bg-orange-100"
      >
        Marketing Guidebook — $25
      </Link>
      <div className="flex justify-center ml-6">
        <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
          One-Time Cost
        </div>
      </div>
    </div>

    <div className="grid grid-cols-[240px_1fr] items-center gap-4">
      <Link
        href="/for-businesses/digital-health-check"
        className="w-[240px] text-center rounded-xl border border-orange-200 bg-[#fff7ed] px-4 py-3 transition hover:bg-orange-100"
      >
        Digital Health Check — $500
      </Link>
      <div className="flex justify-center ml-6">
        <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
          One-Time Cost
        </div>
      </div>
    </div>

    <div className="grid grid-cols-[240px_1fr] items-center gap-4">
      <Link
        href="/for-businesses/website-builds-updates"
        className="w-[240px] text-center rounded-xl border border-orange-200 bg-[#fff7ed] px-4 py-3 transition hover:bg-orange-100"
      >
        Site Build — $1,500
      </Link>
      <div className="flex justify-center ml-6">
        <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
          One-Time Cost
        </div>
      </div>
    </div>

    <div className="grid grid-cols-[240px_1fr] items-center gap-4">
      <Link
        href="/for-businesses/website-builds-updates"
        className="w-[240px] text-center rounded-xl border border-orange-200 bg-[#fff7ed] px-4 py-3 transition hover:bg-orange-100"
      >
        Site Update — $1,000
      </Link>
      <div className="flex justify-center ml-6">
        <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
          One-Time Cost
        </div>
      </div>
    </div>

    <div className="grid grid-cols-[240px_1fr] items-center gap-4">
      <Link
        href="/for-businesses/local-direct-mail"
        className="w-[240px] text-center rounded-xl border border-orange-200 bg-[#fff7ed] px-4 py-3 transition hover:bg-orange-100"
      >
        Direct Mail — varies
      </Link>
      <div className="flex justify-center ml-6">
        <div className="rounded-full border border-orange-300 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-orange-500">
          Custom Pricing
        </div>
      </div>
    </div>

  </div>
</div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
            Process
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            How It Works
          </h2>
        </div>

        <div className="mt-8 rounded-[2rem] border border-orange-200 bg-white p-8 shadow-sm">
          <ul className="space-y-4 text-neutral-800 text-sm list-disc pl-5">
            <li>
              Each plan includes a set number of active marketing projects you can swap, pause, or change at any time.
            </li>
            <li>
              Work progresses through key milestones: strategy, planning, setup, execution, and reporting—depending on the initiative.
            </li>
            <li>
              Timelines vary based on project complexity and responsiveness, but work is continuously happening behind the scenes.
            </li>
            <li>
              Your plan determines how quickly milestones are reached, based on priority and capacity.
            </li>
            <li>
              You’ll also have ongoing access to marketing advice via email, plus scheduled meetings depending on your plan.
            </li>
          </ul>
        </div>
      </section>

      {/* CHAPTER / LIFECYCLE INTELLIGENCE */}
      <section className="px-4 pb-28">
  <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#24364D] p-8 sm:p-10 text-white shadow-[0_12px_36px_rgba(0,0,0,0.10)]">

    {/* TOP: FULL WIDTH TITLE */}
    <div className="max-w-5xl">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-300">
        Chapter
      </p>

      <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.08]">
        Lifecycle Attribution - Measurement Beyond Marketing Activity
      </h2>
    </div>

    {/* CTA ROW */}
    <div className="mt-0 flex justify-start sm:justify-end">
      <Link
        href="/for-businesses/lifecycle-attribution"
        className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-4 text-sm font-semibold text-white hover:bg-orange-600 transition"
      >
        See What Chapter Can Do
      </Link>
    </div>

    {/* BODY TEXT */}
    <div className="relative mt-8 min-h-[220px]">
    <div className="mt-8 max-w-3xl">
      <p className="text-base leading-8 text-white/80">
        Chapter is our own technology, developed to help businesses understand how people interact with every piece of your business to do to what you care about. Instead of only looking at isolated clicks, channels, or last-touch conversions, Chapter's Lifecycle Intelligence is about seeing the full customer journey and using that context to make smarter business decisions.
      </p>

      <p className="mt-5 text-base leading-8 text-white/80">
        Pixel + Behavioral Analytics + Identity Graph + Data Modeling Across: Time, Channels, & Visits.
      </p>
    </div>
    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex h-[190px] w-[190px] items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 p-6 text-center shadow-[0_12px_36px_rgba(0,0,0,0.10)]">
      <p className="text-2xl font-semibold leading-tight text-white">
        20% Off for Plan Holders
      </p>
    </div>
    </div>
  </div>
</section>
    </main>
  );
}