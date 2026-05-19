import InquiryLauncher from "@/components/InquiryLauncher";
import type { PortalData, ProjectKey } from "../_lib/portal-data";

// Static metadata for the 3 plans. Same for every client.
const PLANS = [
  {
    name: "Support",
    blurb: "Someone handling marketing tasks when needed.",
    includes: [
      "2 active marketing projects",
      "Standard attention",
      "Biweekly to monthly milestones",
      "1 monthly meeting",
      "Unlimited email marketing advice",
    ],
  },
  {
    name: "Partner",
    blurb: "Reliable, part-time marketing support.",
    includes: [
      "4 active marketing projects",
      "Accelerated attention",
      "Weekly to biweekly milestones",
      "2 monthly meetings",
      "Unlimited email marketing advice",
    ],
  },
  {
    name: "Team",
    blurb: "A marketing team actively driving my business.",
    includes: [
      "8 active marketing projects",
      "Priority attention",
      "Few days to weekly milestones",
      "4 monthly meetings",
      "Unlimited email marketing advice",
    ],
  },
] as const;

// All 6 project categories shown as pills, active ones highlighted.
const PROJECT_LABELS: ProjectKey[] = [
  "Digital Profile Management",
  "SEO",
  "Paid Ads",
  "Website Updates",
  "Email Marketing",
  "Marketing Operations",
];

// Maps each project to the canonical service checkbox name(s) in the
// InquiryModal so the right checkbox pre-checks when a client clicks an
// inactive pill to inquire.
const PROJECT_TO_INQUIRY_SERVICES: Record<ProjectKey, string[]> = {
  "Digital Profile Management": ["Digital Profile Management"],
  "SEO":                        ["SEO Services"],
  "Paid Ads":                   ["Digital Ads"],
  "Website Updates":            ["Website Builds & Updates"],
  "Email Marketing":            ["Consulting"],
  "Marketing Operations":       ["Consulting"],
};

const PLAN_INQUIRY_SERVICES = ["On-Demand Marketing Plans"];

export default function ClientPortalDashboard({ data }: { data: PortalData }) {
  const activeProjects = new Set(data.activeProjects);

  return (
    <div className="space-y-16">
      {/* ─── YOUR PLAN ─────────────────────────────────────────────── */}
      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
            Your Plan
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Plan Type & What It Includes
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            Your current plan is highlighted. Click any other plan to send a quick note about
            adjusting your engagement.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isActive = plan.name === data.activePlan;
            const cardBase = "rounded-[2rem] p-6 shadow-sm transition";
            if (isActive) {
              return (
                <div
                  key={plan.name}
                  className={`${cardBase} border-2 border-orange-500 bg-[#fff7ed]`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-semibold leading-none">{plan.name}</h3>
                    <span className="text-[10px] font-medium uppercase tracking-wide bg-orange-500 text-white px-2 py-0.5 rounded-full">
                      Your Plan
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-neutral-700 leading-relaxed">{plan.blurb}</p>
                  <ul className="mt-6 space-y-3 text-sm text-neutral-800">
                    {plan.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            }
            return (
              <InquiryLauncher
                key={plan.name}
                defaultServices={PLAN_INQUIRY_SERVICES}
                sourceLabel={`client_portal_plan_inquiry_${plan.name.toLowerCase()}`}
                ariaLabel={`Inquire about the ${plan.name} plan`}
                className={`${cardBase} border border-orange-200 bg-white text-left hover:bg-orange-50 hover:border-orange-400 w-full`}
                label={
                  <>
                    <h3 className="text-2xl font-semibold leading-none text-neutral-900">
                      {plan.name}
                    </h3>
                    <p className="mt-3 text-sm text-neutral-700 leading-relaxed">{plan.blurb}</p>
                    <ul className="mt-6 space-y-3 text-sm text-neutral-800">
                      {plan.includes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-orange-500">
                      Inquire →
                    </p>
                  </>
                }
              />
            );
          })}
        </div>
      </section>

      {/* ─── CURRENT PROJECTS ─────────────────────────────────────── */}
      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
            Current Projects
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            What We&apos;re Working On
          </h2>
          <p className="mt-3 text-sm text-neutral-700">
            Active categories are highlighted. Click an inactive category to inquire about adding it.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3 text-sm">
          {PROJECT_LABELS.map((label) => {
            const isActive = activeProjects.has(label);
            if (isActive) {
              return (
                <div
                  key={label}
                  className="flex items-center justify-center rounded-2xl border-2 border-orange-500 bg-[#fff7ed] p-5 text-center font-semibold text-orange-900 shadow-sm"
                >
                  {label}
                </div>
              );
            }
            return (
              <InquiryLauncher
                key={label}
                defaultServices={PROJECT_TO_INQUIRY_SERVICES[label]}
                sourceLabel={`client_portal_project_inquiry_${label.replace(/\s+/g, "_").toLowerCase()}`}
                ariaLabel={`Inquire about adding ${label}`}
                className="flex items-center justify-center rounded-2xl border border-orange-200 bg-white p-5 text-center font-medium text-neutral-500 shadow-sm transition hover:bg-orange-50 hover:text-neutral-900"
                label={label}
              />
            );
          })}
        </div>

        <div className="mt-6 space-y-4">
          {data.activeProjects.map((proj) => {
            const summary = data.projectSummaries[proj];
            if (!summary) return null;
            return (
              <div
                key={proj}
                className="rounded-[2rem] border border-orange-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {proj} — Summary &amp; Status
                  </h3>
                  <span className="text-xs text-neutral-500 whitespace-nowrap">
                    Updated {summary.updated_at}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-neutral-900">{summary.headline}</p>
                <p className="mt-2 text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{summary.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── REPORTING & STATUS TILES ─────────────────────────────── */}
      {data.reportingTiles.length > 0 && (
        <section>
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-orange-500">
              Reporting & Status
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Quick Reports</h2>
            <p className="mt-3 text-sm text-neutral-700">
              Live links to data, planning docs, and status by active project.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {data.reportingTiles.map((tile) => (
              <div
                key={tile.title}
                className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm"
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-orange-500">
                  {tile.project}
                </p>
                <h3 className="mt-2 text-base font-semibold text-neutral-900">{tile.title}</h3>
                <p className="mt-2 text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{tile.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
