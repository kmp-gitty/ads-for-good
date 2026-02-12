import GoogleDocEmbed from "@/components/GoogleDocEmbed";

type Status = "green" | "yellow" | "red";

function StatusChip({ status, label }: { status: Status; label: string }) {
  const styles: Record<Status, { wrapper: string; dot: string }> = {
    green: { wrapper: "border-green-300 bg-green-50", dot: "bg-green-500" },
    yellow: { wrapper: "border-yellow-300 bg-yellow-50", dot: "bg-yellow-500" },
    red: { wrapper: "border-red-300 bg-red-50", dot: "bg-red-500" },
  };

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-neutral-900",
        styles[status].wrapper,
      ].join(" ")}
    >
      <span className={["h-2 w-2 rounded-full", styles[status].dot].join(" ")} />
      <span>{label}</span>
    </div>
  );
}

export default function ProjectsStatusPage() {
  const status: Status = "yellow";
  const statusLabel = "To Begin • Week of 1/19/26";

  return (
    
    <div className="space-y-6">

      {/* ✅ NEW: Heading under tabs */}
      <div className="pt-1">
        <h1 className="text-2xl font-semibold text-neutral-900">Current Projects</h1>
        <div className="h-[3px] w-full rounded-full bg-green-700" />
        <p className="mt-1 text-sm text-neutral-600">
          Active & upcoming projects.
        </p>
      </div>

      {/* ✅ CURRENT PROJECTS RECTANGLES */}
      

      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              SEO Analysis & Planning
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          <StatusChip status="yellow" label="Waiting for Feedback" />
        </div>

        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
          <li>
          <span className="line-through">
            • Katoa to look connect Tigerbyte Digital site to Google Search Console / get access
            </span>
            <ul className="mt-1 list-disc pl-5 space-y-1">
            <li>GSC connected and report updated on Reporting tab</li>
            <li>Take the rest of February to set our baseline before improving SEO items</li>
            </ul>
          </li>
          <li>
          <span className="line-through">
            • Katoa to look begin SEO research & analysis using SE Ranking
            </span>
            <ul className="mt-1 list-disc pl-5 space-y-1">
            <li>Information looked into and direction plan sent over to Thomas on 2/12/26</li>
            <li>Once feedback is provided, spcific SEO action plan to be created</li>
            </ul>
          </li>
        </ul>
      </section>



      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Projects On Deck
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Post-Completing The Above</p>
          </div>

          <StatusChip status="yellow" label="Waiting for Feedback" />
        </div>

        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
          <li>• 12 month SEO plan shell creation</li>
          <li>• Select primary, secondary, and tertiary KWs</li>
          <li>• Content drafting & creation</li>
          <li>• Website updates & new content postings</li>
          <li>• Ongoing measurement cadence</li>
        </ul>
      </section>

      {/* ✅ Completed Projects Line Break */}
      <div className="pt-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-neutral-900 whitespace-nowrap">
            Completed Projects
          </h2>

          {/* Dark orange line across remaining width */}
          <div className="h-[3px] w-full rounded-full bg-orange-700" />
        </div>

        <p className="mt-2 text-sm text-neutral-600">
          When something is finished, we'll keep a record below.
        </p>
      </div>

      {/* ✅ COMPLETED PROJECTS (Unhide when ready to use) 
      <div className="space-y-6">
      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Analysis &amp; Planning
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          <StatusChip status="green" label="Completed 1/29/26" />
        </div>

        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
          <li>
            • Data analysis &amp; planning to be done for all elements above, after
            Access &amp; Data Pulls
          </li>
          <li>
            • Completed 1/29/26
          </li>
        </ul>
      </section>
        
        <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Access &amp; Data Pulls
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          <StatusChip status="green" label="Completed 1/21/26" />
        </div>

        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
          <li>
            • Google Analytics: "Analyst" (may also be called "Read & Analyze"
            depending on your version of GA) access to my email
          </li>
          <li>• Mailchimp: "Viewer" access</li>
          <li>
            • Google Ads: "Read-Only" access (we may not be doing this, but this
            data may help inform other things we do)
          </li>
          <li>
            • Reddit: "Analyst" access added to your team roles (if run anything
            before)
          </li>
          <li>
            • SEO: any documentation, reporting, or plans from previous agency
          </li>
        </ul>
      </section>
      </div>
      */}
    </div>
  );
}


  