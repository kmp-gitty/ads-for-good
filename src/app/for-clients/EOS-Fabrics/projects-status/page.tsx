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
              Website Plan
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          <StatusChip status="yellow" label="Data Re-Assessment Needed" />
        </div>

        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
          <li>
            • Google Analytics reconnected in Shopify - will continue to monitor
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              SEO Plan
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          <StatusChip status="green" label="In Progress" />
        </div>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">

  <li>
    afG's To Dos:

    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
      <li>Assess & improve Google Business Profile & local links / mentions - Local Ranking</li>
      <li>Update best practice technical items on EOS Fabrics site - National & Local Ranking</li>
      <li>Improve Deadstock page for ranking on that term - National Ranking</li>
      <li>Improve both Sewing Tutorials & Care Guides + Expert Tips pages for ranking - National Ranking</li>
      <li>Curate partner outreach list & emails for backlinks - National & Local Ranking</li>
    </ul>
  </li>
  <li>
    Completed Steps:

    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
      <li>Keywords provided by EOS Fabrics to research</li>
      <li>SEO measurement setup in Google Search Console & SE Ranking</li>
    </ul>
  </li>
</ul>
      </section>

      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Reddit Plan
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          <StatusChip status="green" label="Campaign Live" />
        </div>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">

  <li>
    afG's To Dos:

    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
      <li>Measure & optimize as campaign progresses</li>
      <li>Update creative 1-2 weeks into flight</li>
    </ul>
  </li>
  <li>
    Completed Steps:

    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
      <li>EOS Fabrics provided all necessary approvals, access, and creative</li>
      <li>Ads launched 2/10! Tracking and optimizations up next</li>
    </ul>
  </li>
</ul>
      </section>

      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Email Plan
            </h2>
            <p className="mt-1 text-sm text-neutral-700">Steps / Needs:</p>
          </div>

          <StatusChip status="green" label="In Progress" />
        </div>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
  <li>
    EOS Fabrics' To Dos:

    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
      <li>Provide feedback or approval on segment ideas to be created:</li>
      <li>Highly engaged / High value purchasers, Low engaged / Low value purchasers, Never / Lapsed purchasers</li>
    </ul>
  </li>

  <li>
    afG's To Dos:

    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
      <li>Get answers into the questions you asked today:</li>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
      <li>Who is unsubscribing? How long are people subscribed for?</li>
      <li>Confirm subscriber count dropped during transition (Nov 2024)?</li>
      <li>Does Shopify messaging matter by subscriber list size?</li>
      <li>Any sales insight for sends by day on sales?      </li>
      <li>How have never purchased, but still subscribed, interacted with emails?      </li>
      </ul>
      <li>Organize steps & needs to test a Shopify messaging send in lieu of Mailchimp</li>
      <li>Update & send "resubscribe" emails to EOS Fabrics "non-subscribe" contacts</li>
    </ul>
  </li>
  <li>
    Completed Steps:

    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
      <li>EOS Fabrics provided all necessary access & feedback</li>
      <li>All historical data pulled & stored</li>
      <li>New segments created & pulled</li>
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
            <p className="mt-1 text-sm text-neutral-700">Post-Beginning The Above</p>
          </div>

          <StatusChip status="yellow" label="To Fit Into Schedule" />
        </div>

        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
          <li>• Sked Social hand-off &amp; active management</li>
          <li>• Digital Profile Updates recommendations &amp; implementation</li>
          <li>• Frunes: Rewards/referrals app structure or less costly workaround option?</li>
          <li>• Bloggle app - how best to use?</li>
          <li>• How to fix "banana bunch pricing" problem - Google, Shop App, etc?</li>
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

      {/* ✅ COMPLETED PROJECTS (drop finished rectangles below) */}
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
    </div>
  );
}


  