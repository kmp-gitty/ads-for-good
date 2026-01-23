export default function ReportingLinksPage() {
    return (
      <div className="space-y-6">
        <section className="rounded-lg border border-neutral-200 p-5">
          <h2 className="text-base font-semibold text-neutral-900">
            Important Links
          </h2>
          <ul className="mt-4 text-sm text-neutral-700 space-y-1">
          <li>
            • Meeting notes Google Doc can be{" "}
            <a
            href="https://docs.google.com/document/d/1tFvKaIK4RHAnvdC_Tk2VIB6UtwC-8Ec4KzGkkfO2F-M/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 undelrine hover:text-orange-700"
            >
            accessed here.
            </a>
          </li>
          </ul>
          <ul className="mt-4 text-sm text-neutral-700 space-y-1">
          <li>
            • Data & Confidentiality agreement can be{" "}
            <a
            href="https://drive.google.com/file/d/11Q2tYvOSC5rolgJKL71o2nrIwgFvFVaE/view?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 undelrine hover:text-orange-700"
            >
            accessed here.
            </a>
          </li>
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
  