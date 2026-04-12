import InquiryLauncher from "@/components/InquiryLauncher";
import StickyCTA from "@/components/StickyCTA";

export const metadata = {
    title: "Direct Mail Marketing | Ads for Good",
    description:
      "Professional and affordable direct mail marketing for your business. Reach local households with relevant messaging to get more business.",
  };
  
  export default function LocalMarketingDetailPage() {
    return (
      <main className="bg-[#f7f4ee] text-neutral-900 overflow-x-hidden">
        {/* HERO (centered) */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-16">
          <section className="w-full flex flex-col gap-10 md:flex-row md:items-start">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-orange-500">
                Marketing Operations Support
              </h1>

              <div className="mt-3 flex gap-2 text-xs font-medium">
  <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full">
    Service Types: Marketing Project
  </span>
</div>
  
              <p className="mt-6 text-base sm:text-lg text-neutral-800 leading-relaxed">
              Marketing operations covers the systems, processes, and structure behind your marketing. It’s the work that ensures everything runs smoothly—data is organized, tools are connected, and your efforts are measurable and scalable.
                <br />
                <br />
                This is often the missing layer that connects your marketing efforts and helps everything perform more effectively.
              </p>
            </div>
  
            {/* Right */}
            <div className="flex-1 min-w-0">
              <div className="rounded-3xl border border-orange-200 bg-white shadow-sm px-6 py-6">
                <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl bg-neutral-100">
                  <img
                    src="/images/LocalMail.png"
                    alt="Local Marketing Visual"
                    className="object-contain w-full h-full"
                  />
                </div>
  
                <h2 className="text-sm font-semibold text-neutral-900">
                  <a href="#ways-to-participate" className="text-orange-500 hover:underline">
                   What This Can Include:
                  </a>
                </h2>
  
                <p className="mt-3 text-xs sm:text-sm text-neutral-800 leading-relaxed">
                  <a>
                  Storage: CRM setup and organization, recommended tools, and proper privacy compliance.
                  </a>
                  <br />
                  <br />
                  Measurement Techniques: campaign tracking, marketing measurement, lifecycle measurement.
                  <br />
                  <br />
                  Technologies: Marketing stack ideation and integration
                  <br />
                  <br />
                  Processes: worflow setup, automation setup, and process documentation
                </p>
              </div>
            </div>
          </section>
        </div>
  
        {/* WAYS TO PARTICIPATE (full-width band, centered inside) */}
        <section id="ways-to-participate" className="w-full bg-orange-100 scroll-mt-32">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                How do we approach marketing ops?
              </h2>
  
              <p className="mt-4 text-sm sm:text-base text-neutral-800 leading-relaxed">
              Marketing operations work is about making things clearer, more connected, and easier to manage. Sometimes that means cleaning up what’s already in place. Other times it means building better systems from the ground up.
              <br />
              <br />
              The goal is to reduce friction—so your marketing efforts are easier to run, easier to understand, and easier to improve over time.
              </p>
            </div>

          </div>
        </section>
  
{/* Full-width Direct Mail CTA */}
<section className="mx-auto w-full max-w-6xl px-4 py-10">
  <div className="rounded-3xl border border-orange-200 bg-orange-50 px-6 py-8 sm:px-10 sm:py-10 flex justify-center">
  <div id="primary-cta">
    <InquiryLauncher
      label="Talk To Us About On-Demand Marketing Plans"
      defaultServices={["Marketing Ops"]}
      sourceLabel="Marketing Ops — Full Width CTA"
      className="w-full max-w-3xl text-center rounded-full bg-orange-500 px-8 py-4 text-base sm:text-lg font-semibold text-white hover:bg-orange-600"
    />
    </div>
  </div>
</section>


        {/* EVERYTHING BELOW (centered) */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-24">
          {/* Who this is for / not for */}
          <section className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Business owners looking for help cleaning up processes</li>
                <li>Entrepreneurs wanting to to know where leads are coming from</li>
                <li>Owners looking to automate relevant processes</li>
              </ul>
            </div>
  
            <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-5 sm:py-6">
              <h3 className="text-sm font-semibold text-neutral-900">Who this is not for</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm sm:text-base text-neutral-800">
                <li>Businesses looking for a digital campaign</li>
                <li>Teams looking for ads consulting on free tools</li>
                <li>Anyone just looking for instructions on direct mail campaigns</li>
              </ul>
            </div>
          </section>
  
  
          {/* FAQ */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">FAQ</h2>
            <p className="mt-2 text-sm sm:text-base text-neutral-800 max-w-3xl">
              Quick answers to the most common questions.
            </p>
  
            <div className="mt-6 space-y-3 max-w-4xl">
              {[
                {
                  q: "What is marketing operations, exactly?",
                  a: "Marketing operations focuses on the systems and structure behind your marketing—things like tracking, data organization, automation, and reporting. It ensures your campaigns are measurable, your tools are connected, and your efforts are easier to manage and improve over time.",
                },
                {
                  q: "Is this something I need if I’m already running marketing campaigns?",
                  a: "Yes—especially if things feel disorganized or hard to track. Marketing operations supports everything else you’re doing by making sure your campaigns are properly set up, your data is accurate, and your results are clear. It helps your existing efforts perform better.",
                },
                {
                  q: "What tools or platforms do you work with?",
                  a: "We can work within your existing tools, whether that’s a CRM like HubSpot or Salesforce, email platforms, analytics tools, or other parts of your marketing stack. The focus is on making your current setup more effective—not forcing new tools unless needed.",
                },
                {
                  q: "Is marketing operations a standalone service?",
                  a: "Marketing Operations is offered as a Marketing Project within our plans. That means it can be one of your active priorities and can run alongside other work like email marketing, SEO, paid ads, or website updates.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm"
                >
                  <summary className="cursor-pointer select-none font-medium text-neutral-900 text-sm sm:text-base">
                    {item.q}
                  </summary>
                  <div className="mt-2 text-sm sm:text-base text-neutral-800 leading-relaxed max-w-3xl">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
  
          {/* Other services */}
<section className="mt-14 sm:mt-16">
  <div className="rounded-3xl border border-orange-700 bg-orange-50/60 px-5 sm:px-6 py-8 sm:py-10">
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      
      {/* LEFT COLUMN */}
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900">
          Looking for more marketing help?
        </h2>

        <p className="mt-3 text-sm sm:text-base text-neutral-800">
          Find our on-demand marketing team plans here:
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://www.ads4good.com/for-businesses"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            View All Plans
          </a>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div>
        <h3 className="mt-4 md:mt-4 text-lg font-semibold text-neutral-900">
          Need help beyond a mailer campaign?
        </h3>

        <p className="mt-2 text-sm text-neutral-700">
          Other marketing services:
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
        <a
            href="https://www.ads4good.com/for-businesses/seo-services"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For SEO Services
          </a>

          <a
            href="https://www.ads4good.com/for-businesses/digital-ads"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For Digital Ads Assistance
          </a>

          <a
            href="https://www.ads4good.com/for-businesses/digital-profile-management"
            className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-100 hover:underline"
          >
            For Digital Profile Management
          </a>
        </div>
      </div>

    </div>
  </div>
</section>
        </div>
      </main>
    );
  }
  
  
  
  
  
  
  