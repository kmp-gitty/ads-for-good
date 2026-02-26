import Link from "next/link";

const pillars = [
  {
    title: "Independent Analysis",
    desc: "Objective audits and data-driven diagnostics uncover real revenue opportunity across your stack — without platform bias or hidden incentives.",
    href: "#",
  },
  {
    title: "No Revenue-Share Lock-In",
    desc: "We’re a consultancy, not a network. You keep ownership of your inventory, demand relationships and long-term monetization strategy.",
    href: "#",
  },
  {
    title: "Transparent Autonomy",
    desc: "Full visibility. Full control. We optimize within your infrastructure so nothing is hidden and nothing is taken out of your hands.",
    href: "#",
  },
];

export default function Pillars() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tight text-black">
            What Publishers Crave
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            More Revenue. Less Headache. Full Control.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {pillars.map((p) => (
            <div
            key={p.title}
            className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-10 text-center"
          >
              <h3 className="min-h-[64px] text-2xl font-black text-black">{p.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                {p.desc}
              </p>
              <div className="mt-auto pt-8">
                <Link
                  href={p.href}
                  className="inline-flex items-center justify-center rounded-md border border-black bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-neutral-50"
                >
                  Learn More
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}