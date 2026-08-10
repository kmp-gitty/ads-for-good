// Client-facing bulletin loader. Reads a client's tasks (the same rows the
// operator edits at /internal/tasks) and derives the read-only board:
//   Projects      = items with neither to-do flag (informational work)
//   Client To-Dos = items flagged is_client_todo
//   afG To-Dos    = items flagged is_afg_todo
// Each section groups by topic, with a reverse-chron "Completed" feed.
//
// Registered under CLIENT_BULLETIN_TAG so the editor's server actions can
// updateTag() and the client sees edits within seconds.

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SECTIONS, CLIENT_BULLETIN_TAG } from "@/app/internal/tasks/_constants";

const supabaseUrl = process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const REVALIDATE_SEC = 60;

export type BulletinItem = { id: string; text: string; note: string | null };
export type BulletinTopic = {
  topic: string;
  description: string | null;
  items: BulletinItem[];
};
export type BulletinCompleted = {
  id: string;
  text: string;
  topic: string | null;
  note: string | null;
  completedAt: string | null;
};
export type BulletinSection = {
  section: string;
  topics: BulletinTopic[];
  completed: BulletinCompleted[];
};
export type ClientBulletinData = {
  businessName: string;
  sections: BulletinSection[];
  totalOpen: number;
  totalCompleted: number;
};

type TaskRow = {
  id: string;
  topic: string | null;
  task_text: string;
  note: string | null;
  status: string;
  sort_order: number;
  completed_at: string | null;
  is_client_todo: boolean;
  is_afg_todo: boolean;
};

// Which client-facing sections an item belongs to, from its flags. An item
// flagged as a to-do leaves the Projects item list and lives under its To-Do
// section(s). Unassigned items stay in Projects. (The project itself still
// persists in Projects via its description — handled in the section build.)
function sectionsFor(t: TaskRow): string[] {
  const out: string[] = [];
  if (!t.is_client_todo && !t.is_afg_todo) out.push("Projects");
  if (t.is_client_todo) out.push("Client To-Dos");
  if (t.is_afg_todo) out.push("afG To-Dos");
  return out;
}

async function loadBulletin(clientKey: string): Promise<ClientBulletinData | null> {
  const { data: client, error: clientErr } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, business_name")
    .eq("client_key", clientKey)
    .maybeSingle();
  if (clientErr || !client) return null;

  const { data: batches } = await supabase
    .schema("tasks")
    .from("task_batches")
    .select("id")
    .eq("client_id", client.id);
  const batchIds = (batches ?? []).map((b) => b.id as string);

  const businessName = (client.business_name as string) ?? clientKey;
  if (batchIds.length === 0) {
    return { businessName, sections: [], totalOpen: 0, totalCompleted: 0 };
  }

  const { data: rawTasks } = await supabase
    .schema("tasks")
    .from("tasks")
    .select("id, topic, task_text, note, status, sort_order, completed_at, is_client_todo, is_afg_todo")
    .in("batch_id", batchIds)
    .in("status", ["open", "done"])
    .order("sort_order", { ascending: true });
  const tasks = (rawTasks ?? []) as TaskRow[];

  // Per-project descriptions + display order.
  const { data: rawMeta } = await supabase
    .schema("tasks")
    .from("project_meta")
    .select("topic, description, sort_order")
    .eq("client_id", client.id);
  const metaByTopic = new Map(
    ((rawMeta ?? []) as { topic: string; description: string | null; sort_order: number | null }[]).map(
      (m) => [m.topic, m],
    ),
  );
  const orderCmp = (at: string, bt: string): number => {
    const ao = metaByTopic.get(at)?.sort_order ?? null;
    const bo = metaByTopic.get(bt)?.sort_order ?? null;
    if (ao != null && bo != null) return ao - bo || at.localeCompare(bt);
    if (ao != null) return -1;
    if (bo != null) return 1;
    return at.localeCompare(bt);
  };

  // section → { topicMap(open), completed(done) }
  const sectionMap = new Map<string, { topicMap: Map<string, BulletinItem[]>; completed: BulletinCompleted[] }>();
  const ensure = (section: string) => {
    if (!sectionMap.has(section)) sectionMap.set(section, { topicMap: new Map(), completed: [] });
    return sectionMap.get(section)!;
  };

  for (const t of tasks) {
    for (const section of sectionsFor(t)) {
      const bucket = ensure(section);
      if (t.status === "done") {
        bucket.completed.push({
          id: t.id,
          text: t.task_text,
          topic: t.topic,
          note: t.note,
          completedAt: t.completed_at,
        });
      } else {
        const topicName = t.topic ?? "Updates";
        if (!bucket.topicMap.has(topicName)) bucket.topicMap.set(topicName, []);
        bucket.topicMap.get(topicName)!.push({ id: t.id, text: t.task_text, note: t.note });
      }
    }
  }

  const sortCompleted = (c: BulletinCompleted[]) =>
    [...c].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  let totalOpen = 0;
  let totalCompleted = 0;
  const sections: BulletinSection[] = [];
  for (const section of SECTIONS) {
    const bucket = sectionMap.get(section);

    let topics: BulletinTopic[];
    if (section === "Projects") {
      // Projects = every project (a described project persists even with no
      // unassigned items) → description + its unassigned items only.
      const names = new Set<string>();
      if (bucket) for (const t of bucket.topicMap.keys()) names.add(t);
      for (const [topic, m] of metaByTopic) if (m.description && m.description.trim()) names.add(topic);
      topics = Array.from(names)
        .map((topic) => ({
          topic,
          description: metaByTopic.get(topic)?.description ?? null,
          items: bucket?.topicMap.get(topic) ?? [],
        }))
        .filter((t) => (t.description && t.description.trim()) || t.items.length > 0)
        .sort((a, b) => orderCmp(a.topic, b.topic));
    } else {
      if (!bucket) continue;
      topics = Array.from(bucket.topicMap.entries())
        .map(([topic, items]) => ({ topic, description: null, items }))
        .sort((a, b) => orderCmp(a.topic, b.topic));
    }

    const completed = bucket ? sortCompleted(bucket.completed) : [];
    if (topics.length === 0 && completed.length === 0) continue;
    totalOpen += topics.reduce((n, t) => n + t.items.length, 0);
    totalCompleted += completed.length;
    sections.push({ section, topics, completed });
  }

  return { businessName, sections, totalOpen, totalCompleted };
}

const cached = unstable_cache(loadBulletin, ["client-bulletin"], {
  revalidate: REVALIDATE_SEC,
  tags: [CLIENT_BULLETIN_TAG],
});

export function getClientBulletin(clientKey: string): Promise<ClientBulletinData | null> {
  return cached(clientKey);
}
