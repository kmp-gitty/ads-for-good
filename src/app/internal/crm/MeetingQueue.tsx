"use client";

import { useState, useTransition } from "react";
import { confirmMeeting } from "./_actions";

type Meeting = {
  id: string;
  subject: string | null;
  occurred_at: string;
  prospect_id: string;
  prospect_business: string | null;
  prospect_contact: string | null;
};

export default function MeetingQueue({ meetings }: { meetings: Meeting[] }) {
  // Optimistic removal — the server action revalidates the path, but we hide
  // the row immediately so the queue feels snappy. Error case restores it.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const visible = meetings.filter((m) => !hidden.has(m.id));

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white/50 px-5 py-8 text-center text-sm text-neutral-500">
        No pending meetings. Clear all the way.
      </div>
    );
  }

  const act = (meetingId: string, status: "completed" | "no_show" | "canceled") => {
    setActiveId(meetingId);
    setHidden((prev) => new Set([...prev, meetingId]));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[meetingId];
      return next;
    });
    startTransition(async () => {
      const res = await confirmMeeting(meetingId, status);
      if (!res.ok) {
        // Restore the row + show the error
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(meetingId);
          return next;
        });
        setErrors((prev) => ({ ...prev, [meetingId]: res.message }));
      }
      setActiveId(null);
    });
  };

  return (
    <ul className="space-y-2">
      {visible.map((m) => {
        const isPending = pending && activeId === m.id;
        const when = new Date(m.occurred_at);
        const whenLabel = when.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        return (
          <li
            key={m.id}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-neutral-900">
                {m.prospect_business ?? "(no business name)"}
                {m.prospect_contact ? (
                  <span className="text-neutral-500"> · {m.prospect_contact}</span>
                ) : null}
              </div>
              <div className="mt-0.5 truncate text-xs text-neutral-500">
                {m.subject ?? "(no subject)"} · {whenLabel}
              </div>
              {errors[m.id] ? (
                <div className="mt-1 text-xs text-red-600">{errors[m.id]}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ActionButton
                tone="emerald"
                disabled={isPending}
                onClick={() => act(m.id, "completed")}
              >
                {isPending ? "…" : "Completed"}
              </ActionButton>
              <ActionButton
                tone="amber"
                disabled={isPending}
                onClick={() => act(m.id, "no_show")}
              >
                No-show
              </ActionButton>
              <ActionButton
                tone="neutral"
                disabled={isPending}
                onClick={() => act(m.id, "canceled")}
              >
                Canceled
              </ActionButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ActionButton({
  tone,
  disabled,
  onClick,
  children,
}: {
  tone: "emerald" | "amber" | "neutral";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
      : tone === "amber"
        ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
        : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${toneCls}`}
    >
      {children}
    </button>
  );
}
