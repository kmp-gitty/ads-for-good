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
          <ul className="mt-4 text-sm text-neutral-700 space-y-1">
          <li>
            • SEO Analysis & Planning data + thoughts can be{" "}
            <a
            href="https://docs.google.com/spreadsheets/d/1Xlbekbe71_aS0C_q3LF46crZ1fFk7C4iN6OoM_WiXsI/edit?usp=sharing"
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
  