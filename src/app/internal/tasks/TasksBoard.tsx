"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toggleTaskStatus, updateTaskNote, updateTaskText, updateTaskTopic } from "./_actions";
import type { ClientColumn } from "./page";

type ActionResult = { ok: true } | { ok: false; message: string };

export function TasksBoard({ columns }: { columns: ClientColumn[] }) {
  return (
    <div className="grid auto-cols-[minmax(340px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <ClientColumnCard key={col.key} column={col} />
      ))}
    </div>
  );
}

function ClientColumnCard({ column }: { column: ClientColumn }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <header className="border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold text-neutral-900">{column.title}</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
            {column.taskCount}
          </span>
        </div>
        {column.unmatched && (
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-amber-600">
            Unmatched batch
          </p>
        )}
      </header>
      <div className="flex-1 space-y-4 px-4 py-3">
        {column.topics.map((topic) => (
          <section key={topic.topic}>
            <EditableTopicHeader topic={topic.topic} firstTaskId={topic.tasks[0]?.id ?? null} />
            <ul className="space-y-1">
              {topic.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  id={task.id}
                  status={task.status}
                  text={task.task_text}
                  note={task.note}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function EditableTopicHeader({
  topic,
  firstTaskId,
}: {
  topic: string;
  firstTaskId: string | null;
}) {
  // Editing the header re-topics the FIRST task of this group. Other tasks
  // stay where they are. Keeps the surprise low — to re-topic multiple, edit
  // each individually. Disabled when there's no task to anchor to.
  if (!firstTaskId) {
    return (
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {topic}
      </h3>
    );
  }
  return (
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
      <EditableField
        value={topic}
        onSave={(v) => updateTaskTopic(firstTaskId, v)}
        multiline={false}
        title="Click to re-topic the first task in this group"
      />
    </h3>
  );
}

function TaskRow({
  id,
  status,
  text,
  note,
}: {
  id: string;
  status: string;
  text: string;
  note: string | null;
}) {
  const [optimisticDone, setOptimisticDone] = useState(status === "done");
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);

  // Keep optimisticDone in sync if the server pushes a new status (e.g., after revalidation)
  useEffect(() => {
    setOptimisticDone(status === "done");
  }, [status]);

  const handleToggle = () => {
    const prev = optimisticDone;
    setOptimisticDone(!prev);
    setErr(null);
    startTransition(async () => {
      const res = await toggleTaskStatus(id, prev ? "done" : "open");
      if (!res.ok) {
        setOptimisticDone(prev);
        setErr(res.message);
      }
    });
  };

  const hasNote = note != null && note.trim() !== "";

  return (
    <li className="group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-neutral-50">
      <input
        type="checkbox"
        checked={optimisticDone}
        onChange={handleToggle}
        className="mt-1 h-4 w-4 cursor-pointer rounded border-neutral-300 text-orange-500 focus:ring-orange-400"
      />
      <div className="min-w-0 flex-1">
        <EditableField
          value={text}
          onSave={(v) => updateTaskText(id, v)}
          multiline
          className={`block text-sm leading-snug ${
            optimisticDone ? "text-neutral-400 line-through" : "text-neutral-800"
          }`}
        />
        {hasNote || addingNote ? (
          <EditableField
            value={note ?? ""}
            onSave={async (v) => {
              const res = await updateTaskNote(id, v);
              if (res.ok && v.trim() === "") setAddingNote(false);
              return res;
            }}
            multiline
            placeholder="Add a note…"
            autoFocusOnMount={!hasNote && addingNote}
            className="mt-0.5 block text-xs italic leading-snug text-neutral-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingNote(true)}
            className="mt-0.5 text-[11px] text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:text-orange-600"
          >
            + Add note
          </button>
        )}
        {err && <p className="mt-1 text-xs text-red-600">Failed: {err}</p>}
      </div>
    </li>
  );
}

function EditableField({
  value,
  onSave,
  multiline,
  className,
  placeholder,
  title,
  autoFocusOnMount = false,
}: {
  value: string;
  onSave: (next: string) => Promise<ActionResult>;
  multiline: boolean;
  className?: string;
  placeholder?: string;
  title?: string;
  autoFocusOnMount?: boolean;
}) {
  const [editing, setEditing] = useState(autoFocusOnMount);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // If revalidation pushes a new value while we're NOT editing, sync the draft.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Autosize the textarea to its content
  useEffect(() => {
    if (editing && multiline && taRef.current) {
      const el = taRef.current;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [editing, draft, multiline]);

  const save = () => {
    if (draft === value) {
      setEditing(false);
      setErr(null);
      return;
    }
    startTransition(async () => {
      const res = await onSave(draft);
      if (res.ok) {
        setEditing(false);
        setErr(null);
      } else {
        setErr(res.message);
      }
    });
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
    setErr(null);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    const sharedProps = {
      autoFocus: true,
      value: draft,
      disabled: pending,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: save,
      onKeyDown: handleKey,
      className: `w-full rounded border border-orange-300 bg-white px-1.5 py-0.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 disabled:opacity-60 ${className ?? ""}`,
    };
    return (
      <>
        {multiline ? (
          <textarea ref={taRef} rows={1} {...(sharedProps as object)} />
        ) : (
          <input ref={inputRef} type="text" {...(sharedProps as object)} />
        )}
        {err && <p className="mt-1 text-xs text-red-600">Failed: {err}</p>}
      </>
    );
  }

  const isEmpty = value.trim() === "";
  return (
    <span
      role="button"
      tabIndex={0}
      title={title ?? "Click to edit"}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className={`-mx-1 cursor-text rounded px-1 hover:bg-orange-50 ${className ?? ""}`}
    >
      {isEmpty ? (
        <span className="text-neutral-300">{placeholder ?? "—"}</span>
      ) : (
        value
      )}
    </span>
  );
}
