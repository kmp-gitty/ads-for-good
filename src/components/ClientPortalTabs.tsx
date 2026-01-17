"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Summary Tab", href: "/for-clients/EOS-Fabrics" },
  {
    label: "Services & Payments",
    href: "/for-clients/EOS-Fabrics/services-payments",
  },
  {
    label: "Projects & Status",
    href: "/for-clients/EOS-Fabrics/projects-status",
  },
  {
    label: "Reporting & Links",
    href: "/for-clients/EOS-Fabrics/reporting-links",
  },
];

export default function ClientPortalTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/for-clients/EOS-Fabrics"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "rounded-md px-3 py-2 text-sm font-medium border transition",
                isActive
                  ? "border-orange-300 bg-orange-50 text-neutral-900"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
