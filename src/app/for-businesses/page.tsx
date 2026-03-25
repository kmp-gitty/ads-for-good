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
    <main className="bg-orange-50 text-neutral-900">

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-orange-500">
          Flexible, on-demand marketing support—without hiring a full team.
        </h1>
        <p className="mt-6 text-lg text-neutral-800 max-w-2xl">
          Our plans includes a set number of active marketing projects. You can swap, pause, or change them anytime.
        </p>
      </section>

      {/* PLANS */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-semibold mb-8">Our On-Demand Marketing Plans:</h2>

        <div className="grid md:grid-cols-3 gap-6">

          {/* SUPPORT */}
          <div id="support" className="bg-white rounded-3xl p-6 border border-orange-200">
            <h3 className="text-xl font-semibold">Support</h3>
            <p className="mt-2 text-sm text-neutral-600">Someone handling marketing tasks when needed</p>

            <p className="mt-4 text-3xl font-bold">$600</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-2 text-sm">
              <li>2 active marketing projects</li>
              <li>Standard attention</li>
              <li>Biweekly to monthly milestones</li>
              <li>1 monthly meeting</li>
              <li>Unlimited email marketing advice</li>
            </ul>
          </div>

          {/* PARTNER */}
          <div id="partner" className="bg-white rounded-3xl p-6 border border-orange-200">
            <h3 className="text-xl font-semibold">Partner</h3>
            <p className="mt-2 text-sm text-neutral-600">Reliable, part-time marketing support</p>

            <p className="mt-4 text-3xl font-bold">$1,200</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-2 text-sm">
              <li>4 active marketing projects</li>
              <li>Accelerated attention</li>
              <li>Weekly to biweekly milestones</li>
              <li>2 monthly meetings</li>
              <li>Unlimited email marketing advice</li>
            </ul>
          </div>

          {/* TEAM */}
          <div id="team" className="bg-white rounded-3xl p-6 border border-orange-200">
            <h3 className="text-xl font-semibold">Team</h3>
            <p className="mt-2 text-sm text-neutral-600">A marketing team actively driving my business</p>

            <p className="mt-4 text-3xl font-bold">$2,200</p>
            <p className="text-sm text-neutral-600">/month</p>

            <ul className="mt-6 space-y-2 text-sm">
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
  <h2 className="text-2xl font-semibold mb-4">What Is A Marketing Project?</h2>
  <p className="text-neutral-700 max-w-2xl">
    Projects can include any of the following areas and can be swapped at any time.
  </p>

  <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
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
        className="bg-white border border-orange-200 rounded-xl p-4 text-center font-semibold flex items-center justify-center hover:bg-orange-100 transition"
      >
        {item.label}
      </Link>
    ))}
  </div>
</section>

<section className="mx-auto max-w-6xl px-4 pb-16">
  <div className="grid md:grid-cols-2 gap-10">

    {/* ADD-ONS */}
    <div>
      <h2 className="text-2xl font-semibold">Add-Ons</h2>
      <p className="mt-2 text-neutral-700 text-sm max-w-md">
        Optional enhancements you can layer onto any plan to expand capacity, speed, or capabilities.
      </p>

      <div className="mt-6 space-y-3 text-sm">
        <Link href="/for-businesses/digital-health-check" className="block hover:underline">
          Digital Health Check — $500 (one-time)
        </Link>

        <div>Extra Marketing Project — $350 (per project)</div>

        <div>Rush Upgrade — $250 (per project)</div>

        <Link href="/for-businesses/local-direct-mail" className="block hover:underline">
          Direct Mail — varies (custom pricing)
        </Link>

        <Link href="/for-businesses/website-builds-updates" className="block hover:underline">
          Site Maintenance — $100 (monthly)
        </Link>
      </div>
    </div>

    {/* STANDALONES */}
    <div>
      <h2 className="text-2xl font-semibold">Standalones</h2>
      <p className="mt-2 text-neutral-700 text-sm max-w-md">
        One-time or project-based services for businesses not ready for ongoing marketing support.
      </p>

      <div className="mt-6 space-y-3 text-sm">
        <Link href="/for-businesses/marketing-guidebook" className="block hover:underline">
          Marketing Guidebook — $25 (one-time)
        </Link>

        <Link href="/for-businesses/digital-health-check" className="block hover:underline">
          Digital Health Check — $500 (one-time)
        </Link>

        <Link href="/for-businesses/website-builds-updates" className="block hover:underline">
          Site Build — $1,500 (one-time)
        </Link>

        <Link href="/for-businesses/website-builds-updates" className="block hover:underline">
          Site Update — $1,000 (one-time)
        </Link>

        <Link href="/for-businesses/local-direct-mail" className="block hover:underline">
          Direct Mail — varies (custom pricing)
        </Link>
      </div>
    </div>

  </div>
</section>

{/* HOW IT WORKS */}
<section className="mx-auto max-w-6xl px-4 pb-20">
  <h2 className="text-2xl font-semibold mb-6">How It Works</h2>

  <div className="bg-white border border-orange-200 rounded-3xl p-8">
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

    </main>
  );
}











  