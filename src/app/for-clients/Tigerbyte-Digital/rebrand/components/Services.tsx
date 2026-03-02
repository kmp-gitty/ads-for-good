import Link from "next/link";

const services = [
  {
    title: "Website Monetization",
    desc: "Turn your traffic into sustainable revenue with monetization systems built for long-term growth — not short-term, spam-driven tactics.",
    href: "#",
  },
  {
    title: "AdSense",
    desc: "Increase AdSense RPM without compromising user experience through smarter placements, improved viewability, and policy-safe optimization.",
    href: "#",
  },
  {
    title: "Google Ad Manager",
    desc: "Unlock incremental yield by optimizing your Google Ad Manager stack — from inventory structure and line item strategy to floor pricing and header bidding integration.",
    href: "#",
  },
  {
    title: "Ad Operations",
    desc: "You know your audience — we handle the operational complexity. From trafficking and reporting to troubleshooting and performance monitoring, we keep your monetization engine running smoothly.",
    href: "#",
  },
  {
    title: "Ad Revenue Optimization",
    desc: "Already monetizing? Increase total yield through data-driven testing, auction diagnostics, and performance analysis. We uncover inefficiencies and unlock incremental revenue across your stack.",
    href: "#",
  },
];

export default function Services() {
  return (
    <section className="" style={{ backgroundColor: "var(--tb-light)" }}>
      <div className="mx-auto max-w-[1200px] px-6 py-20">

        {/* Heading */}
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tight text-black">
            Ad Revenue Optimization Consultants
          </h2>

          <p className="mx-auto mt-5 max-w-[900px] text-base leading-relaxed text-neutral-700">
            We help publishers maximize revenue from existing traffic through advanced layout optimization,
            yield management, AdSense &amp; Google Ad Manager strategy, and exchange partnerships.
            Our data-driven approach improves monetization performance while maintaining user experience
            and long-term scalability.
          </p>
        </div>

        {/* Top Row (3 cards) */}
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {services.slice(0, 3).map((s) => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </div>

      {/* Bottom Row (2 centered cards) */}
<div className="mt-8 flex justify-center gap-8">
  <div className="w-full max-w-[380px]">
    <ServiceCard {...services[3]} />
  </div>
  <div className="w-full max-w-[380px]">
    <ServiceCard {...services[4]} />
  </div>
</div>

      </div>
    </section>
  );
}

function ServiceCard({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm transition hover:shadow-md">
      <h3 className="text-2xl font-black leading-tight text-black">
        {title}
      </h3>

      <p className="mt-4 text-sm leading-relaxed text-neutral-700">
        {desc}
      </p>

      <div className="mt-8">
        <Link
          href={href}
          className="inline-flex w-full items-center justify-center rounded-md bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Start Now
        </Link>
      </div>
    </div>
  );
}