"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addManualTask,
  deleteTask,
  renameTopic,
  setProjectDescription,
  setProjectOrder,
  setTaskTodoFlag,
  toggleTaskStatus,
  updateClientServices,
  updateTaskNote,
  updateTaskText,
} from "./_actions";
import type { ClientColumn, ClientServices, TopicGroup, TaskRow as TaskRowT } from "./page";

type AllClient = { id: string; business_name: string };
type ActionResult = { ok: true } | { ok: false; message: string };

const HIT_LIST_STORAGE_KEY = "afg.internal.tasks.hitList.v1";

type FlatTask = { id: string; text: string; status: string; clientTitle: string };

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
        if (Array.isArray(parsed)) setHitList(parsed.filter((x): x is string => typeof x === "string"));
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
          m.set(t.id, { id: t.id, text: t.task_text, status: t.status, clientTitle: col.title });
        }
      }
    }
    return m;
  }, [columns]);

  const hitSet = useMemo(() => new Set(hitList), [hitList]);
  const visibleHitList = hitList.filter((id) => flatTasks.has(id));

  const togglePin = (id: string) =>
    setHitList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const removeFromHitList = (id: string) => setHitList((prev) => prev.filter((x) => x !== id));

  return (
    <div>
      {visibleHitList.length > 0 && (
        <HitListSection ids={visibleHitList} tasks={flatTasks} onRemove={removeFromHitList} />
      )}
      <div className="grid auto-cols-[minmax(360px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
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
          existingClientIds={new Set(columns.map((c) => c.key).filter((k) => k !== "unassigned"))}
        />
      </div>
    </div>
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
  const isReal = column.key !== "unassigned";
  const [showDone, setShowDone] = useState(false);
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <header className="border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold text-neutral-900">{column.title}</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
            {column.openCount}
          </span>
        </div>
        {column.unmatched && (
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-amber-600">
            Unmatched batch
          </p>
        )}
      </header>

      {isReal && column.services && (
        <ServicesBlock clientId={column.key} services={column.services} />
      )}

      <div className="flex-1 space-y-4 px-4 py-3">
        {column.topics.map((project) => (
          <ProjectBlock
            key={project.topic}
            clientId={column.key}
            isReal={isReal}
            project={project}
            hitSet={hitSet}
            onTogglePin={onTogglePin}
            onRemoveFromHitList={onRemoveFromHitList}
          />
        ))}
        {isReal && <AddTopicInline clientId={column.key} />}
      </div>

      {column.completed.length > 0 && (
        <div className="border-t border-neutral-100 px-4 py-2">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 transition hover:text-orange-600"
          >
            {showDone ? "▾" : "▸"} Completed ({column.completed.length})
          </button>
          {showDone && (
            <ul className="mt-1.5 space-y-1">
              {column.completed.map((task) => (
                <CompletedRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ServicesBlock({ clientId, services }: { clientId: string; services: ClientServices }) {
  const [plan, setPlan] = useState(services.planLevel ?? "");
  const [pay, setPay] = useState(services.monthlyPayment != null ? String(services.monthlyPayment) : "");
  const [items, setItems] = useState<string[]>(services.inclusions);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setPlan(services.planLevel ?? ""), [services.planLevel]);
  useEffect(
    () => setPay(services.monthlyPayment != null ? String(services.monthlyPayment) : ""),
    [services.monthlyPayment],
  );
  useEffect(() => setItems(services.inclusions), [services.inclusions]);

  const save = (patch: Parameters<typeof updateClientServices>[1]) =>
    startTransition(async () => {
      const res = await updateClientServices(clientId, patch);
      setErr(res.ok ? null : res.message);
    });

  const savePlan = () => {
    const v = plan.trim();
    if (v !== (services.planLevel ?? "")) save({ plan_level: v || null });
  };
  const savePay = () => {
    const raw = pay.trim().replace(/[^0-9.]/g, "");
    const num = raw === "" ? null : Number(raw);
    const clean = num != null && Number.isFinite(num) ? num : null;
    if (clean !== services.monthlyPayment) save({ monthly_payment: clean });
  };
  const persistItems = (next: string[]) => save({ service_inclusions: next.map((s) => s.trim()).filter(Boolean) });

  const inputCls =
    "w-full rounded border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200";

  return (
    <div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-3">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-800">
        Services &amp; Payments
      </h3>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Plan level</label>
          <input
            type="text"
            value={plan}
            placeholder="e.g. Growth Plan"
            onChange={(e) => setPlan(e.target.value)}
            onBlur={savePlan}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Monthly payment</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-neutral-500">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={pay}
              placeholder="0"
              onChange={(e) => setPay(e.target.value)}
              onBlur={savePay}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Inclusions</label>
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-1">
                <input
                  type="text"
                  value={it}
                  placeholder="Inclusion…"
                  onChange={(e) => {
                    const next = items.slice();
                    next[i] = e.target.value;
                    setItems(next);
                  }}
                  onBlur={() => persistItems(items)}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = items.filter((_, j) => j !== i);
                    setItems(next);
                    persistItems(next);
                  }}
                  title="Remove inclusion"
                  aria-label="Remove inclusion"
                  className="shrink-0 text-neutral-300 transition hover:text-red-500"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setItems([...items, ""])}
            className="mt-1 text-[11px] text-neutral-400 transition hover:text-orange-600"
          >
            + Add inclusion
          </button>
        </div>
        {err && <p className="text-xs text-red-600">Failed: {err}</p>}
      </div>
    </div>
  );
}

function ProjectOrderInput({
  clientId,
  topic,
  value,
}: {
  clientId: string;
  topic: string;
  value: number | null;
}) {
  const [v, setV] = useState(value != null ? String(value) : "");
  const [, startTransition] = useTransition();
  useEffect(() => setV(value != null ? String(value) : ""), [value]);
  const save = () => {
    const raw = v.trim();
    const num = raw === "" ? null : parseInt(raw, 10);
    const clean = num != null && Number.isFinite(num) && num > 0 ? num : null;
    if (clean !== value) startTransition(() => void setProjectOrder(clientId, topic, clean));
  };
  return (
    <input
      type="number"
      min={1}
      value={v}
      title="Project order (1 = top)"
      onChange={(e) => setV(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-11 shrink-0 rounded border border-neutral-200 bg-white px-1 py-0.5 text-center text-xs text-neutral-600 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
    />
  );
}

function ProjectBlock({
  clientId,
  isReal,
  project,
  hitSet,
  onTogglePin,
  onRemoveFromHitList,
}: {
  clientId: string;
  isReal: boolean;
  project: TopicGroup;
  hitSet: Set<string>;
  onTogglePin: (id: string) => void;
  onRemoveFromHitList: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <EditableTopicHeader clientId={clientId} topic={project.topic} editable={isReal} />
        </div>
        {isReal && <ProjectOrderInput clientId={clientId} topic={project.topic} value={project.sortOrder} />}
      </div>
      {isReal && (
        <EditableField
          value={project.description ?? ""}
          onSave={(v) => setProjectDescription(clientId, project.topic, v)}
          multiline
          placeholder="Project description…"
          className="mb-1 block whitespace-pre-wrap text-xs leading-snug text-neutral-500"
        />
      )}
      <ul className="mt-1 space-y-1">
        {project.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            pinned={hitSet.has(task.id)}
            onTogglePin={() => onTogglePin(task.id)}
            onRemoveFromHitList={() => onRemoveFromHitList(task.id)}
          />
        ))}
      </ul>
      {isReal && <AddTaskInline clientId={clientId} topic={project.topic} />}
    </div>
  );
}

function EditableTopicHeader({
  clientId,
  topic,
  editable,
}: {
  clientId: string;
  topic: string;
  editable: boolean;
}) {
  if (!editable) {
    return (
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {topic}
      </h4>
    );
  }
  return (
    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
      <EditableField
        value={topic}
        onSave={(v) => renameTopic(clientId, topic, v)}
        multiline={false}
        title="Rename this project (updates every item under it)"
      />
    </h4>
  );
}

function ToggleChip({
  label,
  active,
  activeClass,
  onToggle,
}: {
  label: string;
  active: boolean;
  activeClass: string;
  onToggle: (next: boolean) => Promise<ActionResult>;
}) {
  const [on, setOn] = useState(active);
  const [, startTransition] = useTransition();
  useEffect(() => setOn(active), [active]);
  const click = () => {
    const prev = on;
    setOn(!prev);
    startTransition(async () => {
      const res = await onToggle(!prev);
      if (!res.ok) setOn(prev);
    });
  };
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={on}
      title={on ? `Remove from ${label} to-dos` : `Mark as a ${label} to-do`}
      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition ${
        on ? activeClass : "border border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300"
      }`}
    >
      {label}
    </button>
  );
}

function TaskRow({
  task,
  pinned,
  onTogglePin,
  onRemoveFromHitList,
}: {
  task: TaskRowT;
  pinned: boolean;
  onTogglePin: () => void;
  onRemoveFromHitList: () => void;
}) {
  const { id, status, task_text: text, note } = task;
  const [optimisticDone, setOptimisticDone] = useState(status === "done");
  const [gone, setGone] = useState(false);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => setOptimisticDone(status === "done"), [status]);

  const handleToggle = () => {
    const prev = optimisticDone;
    setOptimisticDone(!prev);
    setErr(null);
    if (!prev && pinned) onRemoveFromHitList();
    startTransition(async () => {
      const res = await toggleTaskStatus(id, prev ? "done" : "open");
      if (!res.ok) {
        setOptimisticDone(prev);
        setErr(res.message);
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this item? This can't be undone.")) return;
    setGone(true);
    startTransition(async () => {
      const res = await deleteTask(id);
      if (!res.ok) {
        setGone(false);
        setErr(res.message);
      }
    });
  };

  if (gone) return null;
  const hasNote = note != null && note.trim() !== "";

  return (
    <li
      className={`group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-neutral-50 ${
        pinned && !optimisticDone ? "opacity-60" : ""
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
            placeholder="Add a note… (markdown ok)"
            autoFocusOnMount={!hasNote && addingNote}
            className="mt-0.5 block whitespace-pre-wrap text-xs italic leading-snug text-neutral-500"
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

      {/* Right controls: spotlight bubble on top, then the two to-do toggles. */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDelete}
            title="Delete item"
            aria-label="Delete item"
            className="text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onTogglePin}
            title={pinned ? "Remove spotlight" : "Spotlight (my priority)"}
            aria-label={pinned ? "Remove spotlight" : "Spotlight"}
            aria-pressed={pinned}
            className={`h-3.5 w-3.5 rounded-full border transition ${
              pinned
                ? "border-orange-500 bg-orange-500 hover:bg-orange-600"
                : "border-neutral-300 bg-white hover:border-orange-400 hover:bg-orange-100"
            }`}
          />
        </div>
        <ToggleChip
          label="Client"
          active={task.is_client_todo}
          activeClass="bg-teal-600 text-white"
          onToggle={(next) => setTaskTodoFlag(id, "client", next)}
        />
        <ToggleChip
          label="afG"
          active={task.is_afg_todo}
          activeClass="bg-orange-500 text-white"
          onToggle={(next) => setTaskTodoFlag(id, "afg", next)}
        />
      </div>
    </li>
  );
}

function CompletedRow({ task }: { task: TaskRowT }) {
  const { id, task_text: text, topic, note } = task;
  const [, startTransition] = useTransition();
  const [gone, setGone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reopen = () => {
    setGone(true);
    startTransition(async () => {
      const res = await toggleTaskStatus(id, "done"); // done → open
      if (!res.ok) {
        setGone(false);
        setErr(res.message);
      }
    });
  };
  const handleDelete = () => {
    if (!window.confirm("Delete this completed item?")) return;
    setGone(true);
    startTransition(async () => {
      const res = await deleteTask(id);
      if (!res.ok) {
        setGone(false);
        setErr(res.message);
      }
    });
  };

  if (gone) return null;
  return (
    <li className="group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-neutral-50">
      <input
        type="checkbox"
        checked
        onChange={reopen}
        title="Reopen"
        className="mt-1 h-4 w-4 cursor-pointer rounded border-neutral-300 text-orange-500 focus:ring-orange-400"
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs leading-snug text-neutral-400 line-through">{text}</div>
        <div className="text-[10px] text-neutral-400">
          {topic ?? "—"}
          {note && note.trim() ? ` · ${note.trim()}` : ""}
        </div>
        {err && <p className="mt-1 text-xs text-red-600">Failed: {err}</p>}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        title="Delete"
        aria-label="Delete"
        className="mt-1 text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6" />
        </svg>
      </button>
    </li>
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
        + Add item
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
        placeholder="Item… (Enter to add, Esc to close)"
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
      const res = await addManualTask({ existingClientId: clientId }, topic, taskText);
      if (res.ok) reset();
      else setErr(res.message);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400 transition hover:text-orange-600"
      >
        + New Project
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-1.5 rounded-md border border-orange-200 bg-orange-50/40 p-2">
      <input
        ref={topicRef}
        type="text"
        value={topic}
        disabled={pending}
        placeholder="Project name (e.g. Email, SEO)"
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
        placeholder="First item in this project"
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
        <button type="button" onClick={reset} disabled={pending} className="text-xs text-neutral-500 hover:text-neutral-700">
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
    const matched = allClients.find((c) => c.business_name.toLowerCase() === name.toLowerCase());
    const clientRef = matched ? { existingClientId: matched.id } : { newClientName: name };
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
        <h2 className="text-sm font-semibold text-orange-700">New client board</h2>
        <p className="mt-0.5 text-[11px] text-neutral-500">Pick existing, or type a new name.</p>
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
          placeholder="Project name"
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
          placeholder="First item"
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
            disabled={pending || !clientName.trim() || !topic.trim() || !taskText.trim()}
            className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={reset} disabled={pending} className="text-xs text-neutral-500 hover:text-neutral-700">
            Cancel
          </button>
        </div>
        {err && <p className="text-xs text-red-600">Failed: {err}</p>}
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
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">Spotlight</h2>
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

  useEffect(() => setOptimisticDone(status === "done"), [status]);

  const handleToggle = () => {
    const prev = optimisticDone;
    setOptimisticDone(!prev);
    setErr(null);
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
        <div className={`text-sm leading-snug ${optimisticDone ? "text-neutral-400 line-through" : "text-neutral-800"}`}>
          {text}
        </div>
        <div className="text-[11px] text-neutral-500">{clientTitle}</div>
        {err && <p className="mt-1 text-xs text-red-600">Failed: {err}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove spotlight"
        aria-label="Remove spotlight"
        className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full bg-orange-500 transition hover:bg-orange-600"
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

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

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
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
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
      title={title ?? "Click to edit · Shift+Enter for a new line"}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className={`-mx-1 cursor-text rounded px-1 hover:bg-orange-50 ${className ?? ""}`}
    >
      {isEmpty ? <span className="text-neutral-300">{placeholder ?? "—"}</span> : value}
    </span>
  );
}
