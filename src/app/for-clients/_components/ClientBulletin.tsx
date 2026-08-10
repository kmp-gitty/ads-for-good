// Read-only client bulletin. Renders the same tasks the operator edits at
// /internal/tasks, grouped Section → Topic → item(+note), with a reverse-chron
// "Completed" feed per section. Server component; markdown text renders via the
// BulletinMarkdown client wrapper.

import { getClientBulletin, type BulletinSection } from "../_lib/bulletin-data";
import BulletinMarkdown from "./BulletinMarkdown";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionCard({ section }: { section: BulletinSection }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-neutral-900">
          {section.section}
        </h2>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <div className="mt-4 space-y-4">
        {section.topics.map((topic) => (
          <div key={topic.topic}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {topic.topic}
            </h3>
            {section.section === "Projects" && topic.description && topic.description.trim() && (
              <BulletinMarkdown className="mt-1 text-sm leading-snug text-neutral-600">
                {topic.description}
              </BulletinMarkdown>
            )}
            <ul className="mt-1.5 space-y-2">
              {topic.items.map((item) => (
                <li key={item.id} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                  <div className="min-w-0 flex-1">
                    <BulletinMarkdown className="text-sm leading-snug text-neutral-800">
                      {item.text}
                    </BulletinMarkdown>
                    {item.note && item.note.trim() && (
                      <BulletinMarkdown className="mt-0.5 border-l-2 border-neutral-200 pl-2.5 text-xs leading-snug text-neutral-500">
                        {item.note}
                      </BulletinMarkdown>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {section.topics.length === 0 && (
          <p className="text-sm text-neutral-400">Nothing active here right now.</p>
        )}
      </div>

      {section.completed.length > 0 && (
        <details className="mt-4 border-t border-neutral-100 pt-3">
          <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400 transition hover:text-neutral-600">
            Completed ({section.completed.length})
          </summary>
          <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
            {section.completed.map((c) => (
              <li key={c.id} className="flex gap-2">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <div className="min-w-0 flex-1">
                  <BulletinMarkdown className="text-xs leading-snug text-neutral-500 line-through">
                    {c.text}
                  </BulletinMarkdown>
                  <div className="text-[10px] text-neutral-400">
                    {c.topic ? c.topic : ""}
                    {c.completedAt ? `${c.topic ? " · " : ""}${fmtDate(c.completedAt)}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default async function ClientBulletin({ clientKey }: { clientKey: string }) {
  const data = await getClientBulletin(clientKey);

  if (!data || data.sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
        <p className="text-sm text-neutral-500">
          No updates posted yet — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-neutral-900">Bulletin</h1>
        <p className="text-xs text-neutral-500">
          {data.totalOpen} active item{data.totalOpen === 1 ? "" : "s"}
        </p>
      </div>
      {data.sections.map((section) => (
        <SectionCard key={section.section} section={section} />
      ))}
    </div>
  );
}
