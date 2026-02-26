import Link from "next/link";

const publisherServices = [
  "Website Monetization",
  "AdSense Optimization",
  "Google Ad Manager Consulting",
  "Ad Operations Support",
  "Ad Revenue Optimization",
];

const whoWeServe = [
  "Content Creators & Website Owners",
  "AdSense Publishers",
  "Publications",
  "Media Brands",
];

const company = ["Who We Are", "Contact Us"];

const privacy = ["Privacy & Terms", "Disclaimer"];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Left: brand blurb */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-black" />
              <div className="text-sm font-semibold text-black">
                Tigerbyte Digital
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-neutral-600">
              Independent, transparent monetization and ad operations support
              for publishers who want higher revenue without giving up control.
            </p>

            <div className="mt-6 text-xs text-neutral-500">
              © {new Date().getFullYear()} Tigerbyte Digital. All rights reserved.
            </div>
          </div>

          {/* Columns */}
          <div className="md:col-span-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <FooterCol title="Publisher Services" items={publisherServices} />
              <FooterCol title="Who We Serve" items={whoWeServe} />
              <FooterCol title="Company" items={company} />
              <FooterCol title="Privacy & Terms" items={privacy} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((label) => (
          <li key={label}>
            <Link
              href="#"
              className="text-sm text-neutral-700 hover:text-black transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}