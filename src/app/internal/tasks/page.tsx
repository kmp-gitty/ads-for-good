import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { TasksBoard } from "./TasksBoard";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type TaskRow = {
  id: string;
  batch_id: string;
  topic: string | null;
  task_text: string;
  note: string | null;
  status: string;
  sort_order: number;
};

type BatchRow = {
  id: string;
  client_id: string | null;
  subject_line: string | null;
  unmatched: boolean;
  created_at: string;
};

type ClientRow = { id: string; business_name: string };

export type TopicGroup = {
  topic: string;
  tasks: TaskRow[];
};

export type ClientColumn = {
  key: string; // client_id or "unassigned"
  title: string; // business_name or "Unassigned"
  unmatched: boolean;
  topics: TopicGroup[];
  taskCount: number;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const params = await searchParams;
  const showDone = params.done === "1";
  const statuses = showDone ? ["open", "done"] : ["open"];

  const { data: rawTasks, error: tasksErr } = await supabase
    .schema("tasks")
    .from("tasks")
    .select("id, batch_id, topic, task_text, note, status, sort_order")
    .in("status", statuses)
    .order("sort_order", { ascending: true });

  if (tasksErr) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        Failed to load tasks: {tasksErr.message}
        {tasksErr.message.includes("schema") && (
          <p className="mt-2 text-xs">
            Tip: add <code>tasks</code> to Supabase → Settings → API → Exposed schemas.
          </p>
        )}
      </div>
    );
  }

  const tasks = (rawTasks ?? []) as TaskRow[];
  const batchIds = Array.from(new Set(tasks.map((t) => t.batch_id)));

  const { data: rawBatches } = batchIds.length
    ? await supabase
        .schema("tasks")
        .from("task_batches")
        .select("id, client_id, subject_line, unmatched, created_at")
        .in("id", batchIds)
    : { data: [] };

  const batches = (rawBatches ?? []) as BatchRow[];
  const batchById = new Map(batches.map((b) => [b.id, b]));

  const clientIds = Array.from(
    new Set(batches.map((b) => b.client_id).filter((x): x is string => !!x)),
  );

  const { data: rawClients } = clientIds.length
    ? await supabase
        .schema("crm")
        .from("clients")
        .select("id, business_name")
        .in("id", clientIds)
    : { data: [] };

  const clientById = new Map(((rawClients ?? []) as ClientRow[]).map((c) => [c.id, c]));

  // Full CRM client list so the "Add client" picker can offer clients that don't yet have a column.
  const { data: rawAllClients } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, business_name")
    .order("business_name", { ascending: true });
  const allClients = (rawAllClients ?? []) as ClientRow[];

  // Group: clientId → topic → tasks. "unassigned" key for batches with no client_id.
  const columnsMap = new Map<
    string,
    { title: string; unmatched: boolean; topicMap: Map<string, TaskRow[]> }
  >();

  for (const task of tasks) {
    const batch = batchById.get(task.batch_id);
    if (!batch) continue; // dangling task; shouldn't happen due to FK cascade
    const colKey = batch.client_id ?? "unassigned";
    const colTitle = batch.client_id
      ? clientById.get(batch.client_id)?.business_name ?? "Unknown client"
      : "Unassigned";

    if (!columnsMap.has(colKey)) {
      columnsMap.set(colKey, {
        title: colTitle,
        unmatched: !batch.client_id || batch.unmatched,
        topicMap: new Map(),
      });
    }
    const col = columnsMap.get(colKey)!;
    const topicName = task.topic ?? "Untopiced";
    if (!col.topicMap.has(topicName)) col.topicMap.set(topicName, []);
    col.topicMap.get(topicName)!.push(task);
  }

  const columns: ClientColumn[] = Array.from(columnsMap.entries())
    .map(([key, col]) => ({
      key,
      title: col.title,
      unmatched: col.unmatched,
      topics: Array.from(col.topicMap.entries()).map(([topic, tasks]) => ({
        topic,
        tasks: tasks.sort((a, b) => a.sort_order - b.sort_order),
      })),
      taskCount: Array.from(col.topicMap.values()).reduce((s, ts) => s + ts.length, 0),
    }))
    // Unassigned column last; otherwise alphabetical by business name
    .sort((a, b) => {
      if (a.key === "unassigned") return 1;
      if (b.key === "unassigned") return -1;
      return a.title.localeCompare(b.title);
    });

  const totalTasks = tasks.length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-700">
          {totalTasks} {showDone ? "tasks" : "open tasks"} across {columns.length} client
          {columns.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={showDone ? "/internal/tasks" : "/internal/tasks?done=1"}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              showDone
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "border border-neutral-300 bg-white text-neutral-700 hover:border-orange-400 hover:text-orange-700"
            }`}
          >
            {showDone ? "Showing done · click to hide" : "Show done"}
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {columns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">
            No {showDone ? "tasks" : "open tasks"} right now.
          </div>
        ) : (
          <TasksBoard columns={columns} allClients={allClients} />
        )}
      </div>
    </>
  );
}
