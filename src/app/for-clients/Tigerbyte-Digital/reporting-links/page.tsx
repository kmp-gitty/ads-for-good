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
            Dashboards, analytics, and data resources below.
          </p>
        </section>

        <section className="rounded-lg border border-neutral-200 p-5">
  <h2 className="text-base font-semibold text-neutral-900">
    Performance Dashboard: Google Search Console
  </h2>

  <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border border-neutral-200">
    <iframe
      src="https://lookerstudio.google.com/embed/reporting/1254a8f3-c199-4764-a4ff-b1f9d5826eae/page/6zXD"
      className="h-full w-full"
      frameBorder="0"
      allowFullScreen
      sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  </div>
</section>

      </div>
    );
  }
  