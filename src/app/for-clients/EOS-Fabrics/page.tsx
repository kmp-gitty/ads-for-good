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
          <li>• Operational Management</li>
          <li>• Digital Profile Management</li>
          <li>• Channel focuses: Email, Reddit, SEO, Sked Social</li>
              </ul>
              <div className="mt-1 text-xs text-neutral-600">
                Overall goal: Exposure & new customers by growing the EOS Fabrics Tribe
              </div>
            </div>
  
            {/* Payment Status */}
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="text-sm text-neutral-700">Pricing & Payment</div>
              <ul className="mt-1 text-sm font-medium text-neutral-900">
          <li>• $250 one-time fee</li>
          <li>• $500 monthly management fee</li>
              </ul>
              <div className="mt-1 text-xs text-neutral-600">
                Invoice sent 1/21/26
              </div>
            </div>
  
            {/* Active Projects */}
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="text-sm text-neutral-700">Active Projects</div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                afG to perform analysis & planning phase
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                Starting week of 1/21/26
              </div>
            </div>
  
            {/* Next Milestone */}
            <div className="rounded-md border border-neutral-200 p-3">
              <div className="text-sm text-neutral-700">Next Steps</div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                afG to reach out for feedback & plan approval once planning complete
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                Katoa to dive into data and create plan afterwards
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
        <p>• Website: look at GA issues</p>
        <p>• SEO: Action plan after approval & measurement setup</p>
        <p>• Reddit: Tracking, Creative, & Setup (once approved)</p>
        <p>• Email: Answer questions, Shopify messaging steps, Segment creation in Mailchimp</p>
      </div>
    </div>

    {/* RIGHT CARD — white fill, orange outline */}
    <div className="rounded-lg border border-orange-300 bg-white p-4">
      <div className="text-sm font-semibold text-neutral-900">
        EOS Fabrics Tasks
      </div>

      <div className="mt-2 text-sm text-neutral-800 space-y-1">
        <p>• SEO: Approval & provide ideal terms</p>
        <p>• Reddit: Approval, Targeting feedback, & Ad creative insight</p>
        <p>• Email: Approval or feedback of segments</p>
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
        <p>• Sent invoice for accepted scope: 1/21/26</p>
        <p>• Collaborated on access & data pulls: 1/21/26</p>
        <p>• Completed analysis & planning 1/29/26</p>
        <p>• Sent data & confidentiality agreement</p>
      </div>
    </div>

    {/* RIGHT CARD — white fill, orange outline */}
    <div className="rounded-lg border border-orange-300 bg-white p-4">
      <div className="text-sm font-semibold text-neutral-900">
        EOS Fabrics Completions
      </div>

      <div className="mt-2 text-sm text-neutral-800 space-y-1">
        <p>• Confirmed 2 month engagement proposal: 1/19/26</p>
        <p>• Provided access & data pulls: 1/21/26</p>
      </div>
    </div>
  </div>
</section>


      </div>
    );
  }  
  