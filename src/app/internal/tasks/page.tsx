import { createClient } from "@supabase/supabase-js";
import { TasksBoard } from "./TasksBoard";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export type TaskRow = {
  id: string;
  batch_id: string;
  topic: string | null;
  task_text: string;
  note: string | null;
  status: string;
  sort_order: number;
  completed_at: string | null;
  is_client_todo: boolean;
  is_afg_todo: boolean;
};

type BatchRow = {
  id: string;
  client_id: string | null;
  subject_line: string | null;
  unmatched: boolean;
  created_at: string;
};

type ClientRow = {
  id: string;
  business_name: string;
  plan_level: string | null;
  monthly_payment: number | null;
  service_inclusions: string[] | null;
};
type AllClientRow = { id: string; business_name: string };

export type ClientServices = {
  planLevel: string | null;
  monthlyPayment: number | null;
  inclusions: string[];
};

export type TopicGroup = {
  topic: string;
  tasks: TaskRow[]; // open only
  description: string | null;
  sortOrder: number | null;
};

// Project ordering: numbered projects first (ascending), unnumbered after,
// alphabetical as the tiebreak. 1 = top.
function byProjectOrder(a: TopicGroup, b: TopicGroup): number {
  const ao = a.sortOrder;
  const bo = b.sortOrder;
  if (ao != null && bo != null) return ao - bo || a.topic.localeCompare(b.topic);
  if (ao != null) return -1;
  if (bo != null) return 1;
  return a.topic.localeCompare(b.topic);
}

export type ClientColumn = {
  key: string; // client_id or "unassigned"
  title: string;
  unmatched: boolean;
  services: ClientServices | null; // null for the legacy "unassigned" column
  topics: TopicGroup[]; // open items grouped by topic (the single "Projects" board)
  completed: TaskRow[]; // done, newest-first
  openCount: number;
  completedCount: number;
};

export default async function TasksPage() {
  const { data: rawTasks, error: tasksErr } = await supabase
    .schema("tasks")
    .from("tasks")
    .select("id, batch_id, topic, task_text, note, status, sort_order, completed_at, is_client_todo, is_afg_todo")
    .in("status", ["open", "done"])
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
        .select("id, business_name, plan_level, monthly_payment, service_inclusions")
        .in("id", clientIds)
    : { data: [] };

  const clientById = new Map(((rawClients ?? []) as ClientRow[]).map((c) => [c.id, c]));

  // Per-project descriptions + display order, keyed by `${client_id}::${topic}`.
  type MetaRow = { client_id: string; topic: string; description: string | null; sort_order: number | null };
  const { data: rawMeta } = clientIds.length
    ? await supabase
        .schema("tasks")
        .from("project_meta")
        .select("client_id, topic, description, sort_order")
        .in("client_id", clientIds)
    : { data: [] };
  const metaByKey = new Map(
    ((rawMeta ?? []) as MetaRow[]).map((m) => [`${m.client_id}::${m.topic}`, m]),
  );

  const { data: rawAllClients } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, business_name")
    .order("business_name", { ascending: true });
  const allClients = (rawAllClients ?? []) as AllClientRow[];

  // Group: clientId → { topicMap(open), completed(done) }.
  const columnsMap = new Map<
    string,
    { title: string; unmatched: boolean; topicMap: Map<string, TaskRow[]>; completed: TaskRow[] }
  >();

  for (const task of tasks) {
    const batch = batchById.get(task.batch_id);
    if (!batch) continue;
    const colKey = batch.client_id ?? "unassigned";
    const colTitle = batch.client_id
      ? clientById.get(batch.client_id)?.business_name ?? "Unknown client"
      : "Unassigned";

    if (!columnsMap.has(colKey)) {
      columnsMap.set(colKey, {
        title: colTitle,
        unmatched: !batch.client_id || batch.unmatched,
        topicMap: new Map(),
        completed: [],
      });
    }
    const col = columnsMap.get(colKey)!;
    if (task.status === "done") {
      col.completed.push(task);
    } else {
      const topicName = task.topic ?? "Untopiced";
      if (!col.topicMap.has(topicName)) col.topicMap.set(topicName, []);
      col.topicMap.get(topicName)!.push(task);
    }
  }

  const columns: ClientColumn[] = Array.from(columnsMap.entries())
    .map(([key, col]) => {
      const topics: TopicGroup[] = Array.from(col.topicMap.entries())
        .map(([topic, ts]) => {
          const meta = metaByKey.get(`${key}::${topic}`);
          return {
            topic,
            tasks: ts.sort((a, b) => a.sort_order - b.sort_order),
            description: meta?.description ?? null,
            sortOrder: meta?.sort_order ?? null,
          };
        })
        .sort(byProjectOrder);
      const completed = [...col.completed].sort(
        (a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""),
      );
      const openCount = topics.reduce((n, t) => n + t.tasks.length, 0);
      const client = key !== "unassigned" ? clientById.get(key) : undefined;
      const services: ClientServices | null = client
        ? {
            planLevel: client.plan_level,
            monthlyPayment: client.monthly_payment,
            inclusions: client.service_inclusions ?? [],
          }
        : null;
      return {
        key,
        title: col.title,
        unmatched: col.unmatched,
        services,
        topics,
        completed,
        openCount,
        completedCount: completed.length,
      };
    })
    .sort((a, b) => {
      if (a.key === "unassigned") return 1;
      if (b.key === "unassigned") return -1;
      return a.title.localeCompare(b.title);
    });

  const totalOpen = columns.reduce((s, c) => s + c.openCount, 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-700">
          {totalOpen} open item{totalOpen === 1 ? "" : "s"} across {columns.length} client
          {columns.length === 1 ? "" : "s"} · edits publish to the client bulletins
        </p>
      </div>

      <div className="mt-6">
        {columns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">
            No items yet. Use “New client” to start a board.
          </div>
        ) : (
          <TasksBoard columns={columns} allClients={allClients} />
        )}
      </div>
    </>
  );
}
