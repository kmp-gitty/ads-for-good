"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addManualTask,
  toggleTaskStatus,
  updateTaskNote,
  updateTaskText,
  updateTaskTopic,
} from "./_actions";
import type { ClientColumn } from "./page";

type AllClient = { id: string; business_name: string };

type ActionResult = { ok: true } | { ok: false; message: string };

const HIT_LIST_STORAGE_KEY = "afg.internal.tasks.hitList.v1";

type FlatTask = {
  id: string;
  text: string;
  status: string;
  clientTitle: string;
};

export function TasksBoard({
  columns,
  allClients,
}: {
  columns: ClientColumn[];
  allClients: AllClient[];
}) {
  const [hitList, setHitList] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIT_LIST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHitList(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
    } catch {
      // ignore corrupt state
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(HIT_LIST_STORAGE_KEY, JSON.stringify(hitList));
    } catch {
      // ignore quota errors
    }
  }, [hitList, hydrated]);

  const flatTasks = useMemo(() => {
    const m = new Map<string, FlatTask>();
    for (const col of columns) {
      for (const topic of col.topics) {
        for (const t of topic.tasks) {
          m.set(t.id, {
            id: t.id,
            text: t.task_text,
            status: t.status,
            clientTitle: col.title,
          });
        }
      }
    }
    return m;
  }, [columns]);

  const hitSet = useMemo(() => new Set(hitList), [hitList]);
  const visibleHitList = hitList.filter((id) => flatTasks.has(id));

  const togglePin = (id: string) => {
    setHitList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const removeFromHitList = (id: string) => {
    setHitList((prev) => prev.filter((x) => x !== id));
  };

  return (
    <div>
      {visibleHitList.length > 0 && (
        <HitListSection
          ids={visibleHitList}
          tasks={flatTasks}
          onRemove={removeFromHitList}
        />
      )}
      <div className="grid auto-cols-[minmax(340px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <ClientColumnCard
            key={col.key}
            column={col}
            hitSet={hitSet}
            onTogglePin={togglePin}
            onRemoveFromHitList={removeFromHitList}
          />
        ))}
        <AddClientCard
          allClients={allClients}
          existingClientIds={
            new Set(columns.map((c) => c.key).filter((k) => k !== "unassigned"))
          }
        />
      </div>
    </div>
  );
}

function HitListSection({
  ids,
  tasks,
  onRemove,
}: {
  ids: string[];
  tasks: Map<string, FlatTask>;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
          Hit list
        </h2>
        <span className="rounded-full bg-orange-200/70 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
          {ids.length}
        </span>
      </div>
      <ul className="space-y-1">
        {ids.map((id) => {
          const t = tasks.get(id)!;
          return (
            <HitListRow
              key={id}
              id={id}
              text={t.text}
              status={t.status}
              clientTitle={t.clientTitle}
              onRemove={() => onRemove(id)}
            />
          );
        })}
      </ul>
    </div>
  );
}

function HitListRow({
  id,
  text,
  status,
  clientTitle,
  onRemove,
}: {
  id: string;
  text: string;
  status: string;
  clientTitle: string;
  onRemove: () => void;
}) {
  const [optimisticDone, setOptimisticDone] = useState(status === "done");
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticDone(status === "done");
  }, [status]);

  const handleToggle = () => {
    const prev = optimisticDone;
    setOptimisticDone(!prev);
    setErr(null);
    // Closing from the hit list also removes the task from the hit list.
    if (!prev) onRemove();
    startTransition(async () => {
      const res = await toggleTaskStatus(id, prev ? "done" : "open");
      if (!res.ok) {
        setOptimisticDone(prev);
        setErr(res.message);
      }
    });
  };

  return (
    <li className="flex items-start gap-2 rounded-md bg-white/70 px-2 py-1.5">
      <input
        type="checkbox"
        checked={optimisticDone}
        onChange={handleToggle}
        className="mt-1 h-4 w-4 cursor-pointer rounded border-neutral-300 text-orange-500 focus:ring-orange-400"
      />
      <div className="min-w-0 flex-1">
        <div
          className={`text-sm leading-snug ${
            optimisticDone ? "text-neutral-400 line-through" : "text-neutral-800"
          }`}
        >
          {text}
        </div>
        <div className="text-[11px] text-neutral-500">{clientTitle}</div>
        {err && <p className="mt-1 text-xs text-red-600">Failed: {err}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove from hit list"
        aria-label="Remove from hit list"
        className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full bg-orange-500 transition hover:bg-orange-600"
      />
    </li>
  );
}

function ClientColumnCard({
  column,
  hitSet,
  onTogglePin,
  onRemoveFromHitList,
}: {
  column: ClientColumn;
  hitSet: Set<string>;
  onTogglePin: (id: string) => void;
  onRemoveFromHitList: (id: string) => void;
}) {
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
                  pinned={hitSet.has(task.id)}
                  onTogglePin={() => onTogglePin(task.id)}
                  onRemoveFromHitList={() => onRemoveFromHitList(task.id)}
                />
              ))}
            </ul>
            {column.key !== "unassigned" && (
              <AddTaskInline clientId={column.key} topic={topic.topic} />
            )}
          </section>
        ))}
        {column.key !== "unassigned" && <AddTopicInline clientId={column.key} />}
      </div>
    </div>
  );
}

function AddTaskInline({ clientId, topic }: { clientId: string; topic: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = () => {
    const text = draft.trim();
    if (!text) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await addManualTask({ existingClientId: clientId }, topic, text);
      if (res.ok) {
        setDraft("");
        setErr(null);
        // Stay open for rapid entry of multiple tasks; user closes with Escape or empty Enter.
        inputRef.current?.focus();
      } else {
        setErr(res.message);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 ml-1.5 text-[11px] text-neutral-400 transition hover:text-orange-600"
      >
        + Add task
      </button>
    );
  }

  return (
    <div className="mt-1 ml-1.5">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        disabled={pending}
        placeholder="Task text… (Enter to add, Esc to close)"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft("");
            setErr(null);
            setOpen(false);
          }
        }}
        onBlur={() => {
          if (!draft.trim() && !pending) {
            setErr(null);
            setOpen(false);
          }
        }}
        className="w-full rounded border border-orange-300 bg-white px-1.5 py-0.5 text-sm leading-snug outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 disabled:opacity-60"
      />
      {err && <p className="mt-1 text-xs text-red-600">Failed: {err}</p>}
    </div>
  );
}

function AddTopicInline({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [taskText, setTaskText] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const topicRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) topicRef.current?.focus();
  }, [open]);

  const reset = () => {
    setTopic("");
    setTaskText("");
    setErr(null);
    setOpen(false);
  };

  const submit = () => {
    if (!topic.trim() || !taskText.trim()) return;
    startTransition(async () => {
      const res = await addManualTask(
        { existingClientId: clientId },
        topic,
        taskText,
      );
      if (res.ok) reset();
      else setErr(res.message);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400 transition hover:text-orange-600"
      >
        + New topic
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-1.5 rounded-md border border-orange-200 bg-orange-50/40 p-2">
      <input
        ref={topicRef}
        type="text"
        value={topic}
        disabled={pending}
        placeholder="Topic name"
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            reset();
          }
        }}
        className="w-full rounded border border-orange-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 disabled:opacity-60"
      />
      <input
        type="text"
        value={taskText}
        disabled={pending}
        placeholder="First task in this topic"
        onChange={(e) => setTaskText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            reset();
          }
        }}
        className="w-full rounded border border-orange-300 bg-white px-1.5 py-0.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !topic.trim() || !taskText.trim()}
          className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          Cancel
        </button>
      </div>
      {err && <p className="text-xs text-red-600">Failed: {err}</p>}
    </div>
  );
}

function AddClientCard({
  allClients,
  existingClientIds,
}: {
  allClients: AllClient[];
  existingClientIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [topic, setTopic] = useState("");
  const [taskText, setTaskText] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  // Suggest only clients that don't yet have a column. Matches by exact (case-insensitive) name on submit.
  const pickable = useMemo(
    () => allClients.filter((c) => !existingClientIds.has(c.id)),
    [allClients, existingClientIds],
  );
  const datalistId = "afg-new-client-suggestions";

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  const reset = () => {
    setClientName("");
    setTopic("");
    setTaskText("");
    setErr(null);
    setOpen(false);
  };

  const submit = () => {
    const name = clientName.trim();
    if (!name || !topic.trim() || !taskText.trim()) return;
    const matched = allClients.find(
      (c) => c.business_name.toLowerCase() === name.toLowerCase(),
    );
    const clientRef = matched
      ? { existingClientId: matched.id }
      : { newClientName: name };
    startTransition(async () => {
      const res = await addManualTask(clientRef, topic, taskText);
      if (res.ok) reset();
      else setErr(res.message);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[120px] min-w-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white/40 px-4 py-6 text-sm font-medium text-neutral-500 transition hover:border-orange-400 hover:bg-orange-50/40 hover:text-orange-700"
      >
        + New client
      </button>
    );
  }

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-orange-300 bg-white shadow-sm">
      <header className="border-b border-orange-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-orange-700">New client</h2>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          Pick existing, or type a new name to create one.
        </p>
      </header>
      <div className="flex-1 space-y-2 px-4 py-3">
        <input
          ref={nameRef}
          type="text"
          list={datalistId}
          value={clientName}
          disabled={pending}
          placeholder="Client / business name"
          onChange={(e) => setClientName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              reset();
            }
          }}
          className="w-full rounded border border-orange-300 bg-white px-1.5 py-1 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 disabled:opacity-60"
        />
        <datalist id={datalistId}>
          {pickable.map((c) => (
            <option key={c.id} value={c.business_name} />
          ))}
        </datalist>
        <input
          type="text"
          value={topic}
          disabled={pending}
          placeholder="Topic name"
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              reset();
            }
          }}
          className="w-full rounded border border-orange-300 bg-white px-1.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 disabled:opacity-60"
        />
        <input
          type="text"
          value={taskText}
          disabled={pending}
          placeholder="First task"
          onChange={(e) => setTaskText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              reset();
            }
          }}
          className="w-full rounded border border-orange-300 bg-white px-1.5 py-1 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 disabled:opacity-60"
        />
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={submit}
            disabled={
              pending || !clientName.trim() || !topic.trim() || !taskText.trim()
            }
            className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add client + task"}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </div>
        {err && <p className="text-xs text-red-600">Failed: {err}</p>}
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
  pinned,
  onTogglePin,
  onRemoveFromHitList,
}: {
  id: string;
  status: string;
  text: string;
  note: string | null;
  pinned: boolean;
  onTogglePin: () => void;
  onRemoveFromHitList: () => void;
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
    // Marking a task done also clears it from the hit list.
    if (!prev && pinned) onRemoveFromHitList();
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
    <li
      className={`group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-neutral-50 ${
        pinned && !optimisticDone ? "opacity-50" : ""
      }`}
    >
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
      <button
        type="button"
        onClick={onTogglePin}
        title={pinned ? "Remove from hit list" : "Add to hit list"}
        aria-label={pinned ? "Remove from hit list" : "Add to hit list"}
        aria-pressed={pinned}
        className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border transition ${
          pinned
            ? "border-orange-500 bg-orange-500 hover:bg-orange-600"
            : "border-neutral-300 bg-white hover:border-orange-400 hover:bg-orange-100"
        }`}
      />
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
