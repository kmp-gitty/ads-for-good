type Status = "green" | "yellow" | "red";

function StatusChip({ status, label }: { status: Status; label: string }) {
  const styles: Record<
    Status,
    { wrapper: string; dot: string }
  > = {
    green: {
      wrapper: "border-green-300 bg-green-50",
      dot: "bg-green-500",
    },
    yellow: {
      wrapper: "border-yellow-300 bg-yellow-50",
      dot: "bg-yellow-500",
    },
    red: {
      wrapper: "border-red-300 bg-red-50",
      dot: "bg-red-500",
    },
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
  // ✅ Change this one line to set the chip color
  const status: Status = "yellow";

  // ✅ Edit this label (and you can add a date if you want)
  const statusLabel = "To Begin • Week of 1/19/26";

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Access &amp; Data Pulls
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          {/* Status chip */}
          <StatusChip status={status} label={statusLabel} />
        </div>

        <ul className="mt-4 text-sm text-neutral-700 space-y-1">
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

      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Analysis & Planning
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          {/* Status chip */}
          <StatusChip status={status} label="To Begin After Access & Data Pulls" />
        </div>

        <ul className="mt-4 text-sm text-neutral-700 space-y-1">
          <li>
            • Data analysis & planning to be done for all elements above, after Access & Data Pulls
          </li>      
        </ul>
      </section>


      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Projects On Deck
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Post-Analysis</p>
          </div>

          {/* Status chip */}
          <StatusChip status="red" label="To Begin After Analysis & Planning" />
        </div>

        <ul className="mt-4 text-sm text-neutral-700 space-y-1">
          <li>
            • Email marketing segmentation implementation
          </li>
          <li>• Reddit Ads test</li>
          <li>
            • SEO Ranking Increase activity & implementation
          </li>
          <li>
            • Sked Social hand-off & active management
          </li>
          <li>
            • Digital Profile Updates recommendations & implementation
          </li>
          <li>
            • Website UX / UI updates
          </li>
        </ul>
      </section>

    </div>
  );
}

  