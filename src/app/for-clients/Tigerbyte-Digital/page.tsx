export default function SummaryPage() {
    return (
      <div className="space-y-6">
        <section className="rounded-lg border border-neutral-200 p-5">
          <h2 className="text-base font-semibold text-neutral-900">Summary</h2>
          <p className="mt-2 text-sm text-neutral-700">
            High-level status, priorities, and recent updates.
          </p>
  
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            {/* Current Services */}
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="text-sm text-neutral-700">Services Overview</div>
              <ul className="mt-1 text-sm font-medium text-neutral-900">
          <li>• Analysis & Planning</li>
          <li>• SEO Growth</li>
          <li>• Content Creation & Uploading</li>
          <li>• Channel focus: SEO</li>
              </ul>
              <div className="mt-1 text-xs text-neutral-600">
                Overall goal: Increase organic KWs, rankings, to grow organic traffic
              </div>
            </div>
  
            {/* Payment Status */}
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="text-sm text-neutral-700">Pricing & Payment</div>
              <ul className="mt-1 text-sm font-medium text-neutral-900">
          <li>• $250 one-time fee</li>
          <li>• $150 monthly management fee</li>
              </ul>
              <div className="mt-1 text-xs text-neutral-600">
                Invoice sent 2/06/26 - Analysis & Planning <br></br><br></br>
                Invoice to be sent 3/01/26 - 1st Month Service
              </div>
            </div>
  
            {/* Active Projects */}
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="text-sm text-neutral-700">Active Projects</div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                afG to perform analysis & planning phase for SEO
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                Starting week of 2/09/26
              </div>
            </div>
  
            {/* Next Milestone */}
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="text-sm text-neutral-700">Next Steps</div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                afG & Tigerbyte to have kick-off meeting Monday 2/09
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                Katoa to dive into data and analyze afterwards
              </div>
            </div>
          </div>
        </section>

{/* Next steps section */}
        <section className="rounded-lg border border-neutral-200 p-5">
  <h2 className="text-base font-semibold text-neutral-900">
    Current To Dos
  </h2>
  <p className="mt-2 text-sm text-neutral-700">
    Key tasks for both parties
  </p>

  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
    {/* LEFT CARD — orange fill, black outline */}
    <div className="rounded-lg border border-neutral-900 bg-orange-50 p-4">
      <div className="text-sm font-semibold text-neutral-900">
        ads for Good Tasks
      </div>

      <div className="mt-2 text-sm text-neutral-900 space-y-1">
        <p>• Analysis & planning phase after kick-off meeting</p>
      </div>
    </div>

    {/* RIGHT CARD — white fill, orange outline */}
    <div className="rounded-lg border border-orange-300 bg-white p-4">
      <div className="text-sm font-semibold text-neutral-900">
        Tigerbyte Digital Tasks
      </div>

      <div className="mt-2 text-sm text-neutral-800 space-y-1">
        <p>• Answer this question: if you could snap your fingers and Tigerbyte Digital would instantly show at the top of results when someone searched ________ , what words or searches would fill the blank?</p>
        <p>• Sign SOW & Data Agreements</p>
        <p>• Pay initial Analysis & Planning invoice</p>
      </div>
    </div>
  </div>
</section>


{/* Completed to dos section */}
<section className="rounded-lg border border-neutral-200 p-5">
  <h2 className="text-base font-semibold text-neutral-900">
    Completed To Dos
  </h2>
  <p className="mt-2 text-sm text-neutral-700">
    Task record-keeping for both parties
  </p>

  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
    {/* LEFT CARD — orange fill, black outline */}
    <div className="rounded-lg border border-neutral-900 bg-orange-50 p-4">
      <div className="text-sm font-semibold text-neutral-900">
        ads for Good Completions
      </div>

      <div className="mt-2 text-sm text-neutral-900 space-y-1">
        <p>• Nothing completed yet (nothing started either)</p>
      </div>
    </div>

    {/* RIGHT CARD — white fill, orange outline */}
    <div className="rounded-lg border border-orange-300 bg-white p-4">
      <div className="text-sm font-semibold text-neutral-900">
        Tigerbyte Digital Completions
      </div>

      <div className="mt-2 text-sm text-neutral-800 space-y-1">
        <p>• Nothing completed yet (nothing started either)</p>
      </div>
    </div>
  </div>
</section>


      </div>
    );
  }  
  