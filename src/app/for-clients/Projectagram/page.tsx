import GoogleDocEmbed from "@/components/GoogleDocEmbed";

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

{/* ✅ Client Notepad Line Break */}
 <div className="pt-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-neutral-900 whitespace-nowrap">
            Notepad
          </h2>

          {/* Dark orange line across remaining width */}
          <div className="h-[3px] w-full rounded-full bg-teal-700" />
        </div>

        <p className="mt-2 text-sm text-neutral-600">
          Editable Google Doc - add notes, ideas, and anything else here.
        </p>
      </div>

      {/* ✅ Client Notepad embed below */}
      <section className="mt-6">
  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
  <GoogleDocEmbed
  src="https://docs.google.com/document/d/1eBaFIRbk0SA1FS8EpvG1_wnX_VTfD8Pr93w2J1CaV4g/edit?usp=sharing"
  height={650}
/>
  </div>
</section>


      </div>
    );
  }  
  