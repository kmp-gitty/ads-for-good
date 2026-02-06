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
            href="https://docs.google.com/document/d/111J7f1TJA2wItwNkRY1zbXu48S45bSnSzhILukDqSuM/edit?usp=sharing"
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
            • SOW, Pricing, & Data+Confidentiality Agreements can be{" "}
            <a
            href="https://drive.google.com/drive/folders/1cHw_g2-nfb1ys4NrY5LPhvjt7IHlc-li?usp=sharing"
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
            • Your Tigerbyte Digital Client Portal Notepad can be{" "}
            <a
            href="https://docs.google.com/document/d/10AZChXtrbVydznyUxrIS7acfYw7rByCSLkMwRc0QdUs/edit?usp=sharing"
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
  