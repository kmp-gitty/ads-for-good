"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Summary Tab", path: "" },
  {
    label: "Services & Payments",
    path: "/services-payments"
  },
  {
    label: "Projects & Status",
    path: "/projects-status"
  },
  {
    label: "Reporting & Links",
    path: "/reporting-links"
  },
];

export default function ClientPortalTabs() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  const clientSlug = segments[1];

  if (!clientSlug) return null;

  const basePath = `/for-clients/${clientSlug}`;

  return (
    <nav className="mt-4">
      <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
          const href = `${basePath}${tab.path}`;

          const isActive =
            tab.path === ""
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <Link
              key={tab.label}
              href={href}
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
