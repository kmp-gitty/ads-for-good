
import { phase1Sections } from "./phase1Sections";
import { phase2Sections } from "./phase2Sections";
import { phase3Sections } from "./phase3Sections";

const allSections = [...phase1Sections, ...phase2Sections, ...phase3Sections];

const currentSections = allSections.filter((s) => !s.completed);
const completedSections = allSections.filter((s) => s.completed);

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

function Bullets({
  items,
}: {
  items: { level: 0 | 1 | 2; text: string }[];
}) {
  return (
    <ul className="mt-4 space-y-1 text-sm text-neutral-700">
      {items.map((b, idx) => (
        <li
          key={`${idx}-${b.text}`}
          className={
            b.level === 0
              ? ""
              : b.level === 1
              ? "pl-6"
              : "pl-10"
          }
        >
          • {b.text}
        </li>
      ))}
    </ul>
  );
}


export default function ProjectsStatusPage() {
  return (
    <div className="space-y-6">
      {/* Heading under tabs */}
      <div className="pt-1">
        <h1 className="text-2xl font-semibold text-neutral-900">Current Projects</h1>
        <div className="h-[3px] w-full rounded-full bg-green-700" />
        <p className="mt-1 text-sm text-neutral-600">Active projects.</p>
      </div>

      {/* CURRENT PROJECTS (Phase 1) */}
      {currentSections.map((section) => (
        <section key={section.title} className="rounded-lg border border-neutral-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">{section.title}</h2>
              {section.subtitle ? (
                <p className="mt-1 text-sm text-neutral-700">{section.subtitle}</p>
              ) : null}
            </div>

            <StatusChip status={section.status} label={section.statusLabel} />
          </div>

          <Bullets items={section.bullets} />
        </section>
      ))}

{/* ✅ Upcoming Projects Line Break */}
<div className="pt-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-neutral-900 whitespace-nowrap">
            Upcoming Projects
          </h2>

          {/* Dark orange line across remaining width */}
          <div className="h-[3px] w-full rounded-full bg-orange-700" />
        </div>

        <p className="mt-2 text-sm text-neutral-600">
          Projects on deck will go below.
        </p>
        <section className="mt-4 rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mt-1 text-sm text-neutral-700">Post-Analysis & Planning Phase</p>
          </div>

          <StatusChip status="yellow" label="Start TBD - week of 2/23" />
        </div>

        <ul className="mt-4 space-y-1 text-sm text-neutral-700">
          <li>• 12 month SEO plan shell creation</li>
          <li>• Select primary, secondary, and tertiary KWs</li>
          <li>• Content drafting & creation</li>
          <li>• Website updates & new content postings</li>
          <li>• Ongoing measurement cadence</li>
        </ul>
      </section>
      </div>

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
{/* COMPLETED PROJECTS (Collapsible) */}
{completedSections.map((section) => (
  <details
    key={section.title}
    className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50"
  >
    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-5">
      <div>
        <h3 className="text-base font-semibold text-neutral-900">
          {section.title}
        </h3>
        {/* Optional: show subtitle even when collapsed; remove if you want title-only */}
        {section.subtitle ? (
          <p className="mt-1 text-sm text-neutral-700">{section.subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <StatusChip status={section.status} label={section.statusLabel} />

        {/* caret */}
        <span className="select-none text-neutral-400">
          ▼
        </span>
      </div>
    </summary>

    <div className="border-t border-neutral-200 p-5">
      <Bullets items={section.bullets} />
    </div>
  </details>
))}


    </div>
  );
}


  