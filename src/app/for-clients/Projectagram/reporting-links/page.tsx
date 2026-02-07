import { reportingLinks } from "./linksData";

export default function ReportingLinksPage() {
    return (
      <div className="space-y-6">
        <section className="rounded-lg border border-neutral-200 p-5">
          <h2 className="text-base font-semibold text-neutral-900">
            Important Links
          </h2>
          <ul className="mt-4 space-y-1 text-sm text-neutral-700">
  {reportingLinks.map((item) => (
    <li key={`${item.details}-${item.href}`}>
      • {item.details}{" "}
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-orange-600 underline hover:text-orange-700"
      >
        accessed here.
      </a>
    </li>
  ))}
</ul>

        </section>
  
        <section className="rounded-lg border border-neutral-200 p-5">
          <h2 className="text-base font-semibold text-neutral-900">
            Reporting & Data
          </h2>
          <p className="mt-2 text-sm text-neutral-700">
            Dashboards, analytics, and data resources coming soon.
          </p>
        </section>
      </div>
    );
  }
  