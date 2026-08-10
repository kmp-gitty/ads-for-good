"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { CLIENT_BULLETIN_TAG, CLIENT_SERVICES_TAG } from "./_constants";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type ActionResult = { ok: true } | { ok: false; message: string };

// Refresh both surfaces after any write: the editor, and the client-facing
// bulletin pages (registered under CLIENT_BULLETIN_TAG).
function refreshSurfaces() {
  revalidatePath("/internal/tasks");
  updateTag(CLIENT_BULLETIN_TAG); // server-action read-your-own-writes (Next 16)
}

export async function toggleTaskStatus(
  taskId: string,
  currentStatus: string,
): Promise<ActionResult> {
  const done = currentStatus !== "done"; // toggling: open → done, done → open
  const { error } = await supabase
    .schema("tasks")
    .from("tasks")
    .update({
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) return { ok: false, message: error.message };
  refreshSurfaces();
  return { ok: true };
}

export async function updateTaskText(taskId: string, text: string): Promise<ActionResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, message: "Task text cannot be empty" };
  const { error } = await supabase
    .schema("tasks")
    .from("tasks")
    .update({ task_text: trimmed })
    .eq("id", taskId);
  if (error) return { ok: false, message: error.message };
  refreshSurfaces();
  return { ok: true };
}

export async function updateTaskNote(taskId: string, note: string): Promise<ActionResult> {
  const trimmed = note.trim();
  const value = trimmed === "" ? null : trimmed;
  const { error } = await supabase
    .schema("tasks")
    .from("tasks")
    .update({ note: value })
    .eq("id", taskId);
  if (error) return { ok: false, message: error.message };
  refreshSurfaces();
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const { error } = await supabase
    .schema("tasks")
    .from("tasks")
    .delete()
    .eq("id", taskId);
  if (error) return { ok: false, message: error.message };
  refreshSurfaces();
  return { ok: true };
}

// Toggle whether an item surfaces as a client-facing to-do or an afG to-do.
// These are independent flags; an item can be both, or neither (a plain Project
// update). The client bulletin derives its To-Do sections from these.
export async function setTaskTodoFlag(
  taskId: string,
  which: "client" | "afg",
  value: boolean,
): Promise<ActionResult> {
  const patch = which === "client" ? { is_client_todo: value } : { is_afg_todo: value };
  const { error } = await supabase.schema("tasks").from("tasks").update(patch).eq("id", taskId);
  if (error) return { ok: false, message: error.message };
  refreshSurfaces();
  return { ok: true };
}

// Rename a topic across ALL of a client's tasks in EVERY section. Topics are
// shared — Projects owns the structure and the To-Do sections mirror it — so a
// rename cascades to every bullet under that topic name for the client.
export async function renameTopic(
  clientId: string,
  oldTopic: string,
  newTopic: string,
): Promise<ActionResult> {
  const trimmed = newTopic.trim();
  if (!trimmed) return { ok: false, message: "Topic cannot be empty" };
  if (trimmed === oldTopic) return { ok: true };

  const { data: batches, error: batchErr } = await supabase
    .schema("tasks")
    .from("task_batches")
    .select("id")
    .eq("client_id", clientId);
  if (batchErr) return { ok: false, message: batchErr.message };
  const batchIds = (batches ?? []).map((b) => b.id as string);
  if (batchIds.length === 0) return { ok: true };

  const { error } = await supabase
    .schema("tasks")
    .from("tasks")
    .update({ topic: trimmed })
    .in("batch_id", batchIds)
    .eq("topic", oldTopic);
  if (error) return { ok: false, message: error.message };

  // Carry the project description across the rename (best-effort).
  await supabase
    .schema("tasks")
    .from("project_meta")
    .update({ topic: trimmed })
    .eq("client_id", clientId)
    .eq("topic", oldTopic);

  refreshSurfaces();
  return { ok: true };
}

// Per-project description (client + topic). Shown permanently in the client
// portal's Projects section next to the project name.
export async function setProjectDescription(
  clientId: string,
  topic: string,
  description: string,
): Promise<ActionResult> {
  const desc = description.trim() === "" ? null : description.trim();
  const { error } = await supabase
    .schema("tasks")
    .from("project_meta")
    .upsert(
      { client_id: clientId, topic, description: desc, updated_at: new Date().toISOString() },
      { onConflict: "client_id,topic" },
    );
  if (error) return { ok: false, message: error.message };
  refreshSurfaces();
  return { ok: true };
}

// Project display order (1 = top). Upsert touches only sort_order so it never
// clobbers an existing description (and vice-versa).
export async function setProjectOrder(
  clientId: string,
  topic: string,
  sortOrder: number | null,
): Promise<ActionResult> {
  const { error } = await supabase
    .schema("tasks")
    .from("project_meta")
    .upsert({ client_id: clientId, topic, sort_order: sortOrder }, { onConflict: "client_id,topic" });
  if (error) return { ok: false, message: error.message };
  refreshSurfaces();
  return { ok: true };
}

const MANUAL_BATCH_SUBJECT = "Manual tasks";

async function findOrCreateManualBatch(
  clientId: string,
): Promise<{ batchId: string } | { error: string }> {
  const { data: existing, error: findErr } = await supabase
    .schema("tasks")
    .from("task_batches")
    .select("id")
    .eq("client_id", clientId)
    .eq("subject_line", MANUAL_BATCH_SUBJECT)
    .limit(1)
    .maybeSingle();
  if (findErr) return { error: findErr.message };
  if (existing?.id) return { batchId: existing.id as string };

  const { data: created, error: createErr } = await supabase
    .schema("tasks")
    .from("task_batches")
    .insert({ client_id: clientId, subject_line: MANUAL_BATCH_SUBJECT, unmatched: false })
    .select("id")
    .single();
  if (createErr) return { error: createErr.message };
  return { batchId: created!.id as string };
}

// Services & Payments for a client (plan level / monthly payment / inclusions),
// stored on crm.clients and rendered on the /for-clients Services & Payments tab.
export async function updateClientServices(
  clientId: string,
  patch: {
    plan_level?: string | null;
    monthly_payment?: number | null;
    service_inclusions?: string[];
  },
): Promise<ActionResult> {
  const { error } = await supabase.schema("crm").from("clients").update(patch).eq("id", clientId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/internal/tasks");
  updateTag(CLIENT_SERVICES_TAG);
  return { ok: true };
}

export type ManualTaskClientRef =
  | { existingClientId: string }
  | { newClientName: string };

export async function addManualTask(
  client: ManualTaskClientRef,
  topic: string,
  taskText: string,
): Promise<ActionResult> {
  const trimmedTopic = topic.trim();
  const trimmedText = taskText.trim();
  if (!trimmedTopic) return { ok: false, message: "Topic cannot be empty" };
  if (!trimmedText) return { ok: false, message: "Task cannot be empty" };

  let clientId: string;
  if ("existingClientId" in client) {
    clientId = client.existingClientId;
  } else {
    const name = client.newClientName.trim();
    if (!name) return { ok: false, message: "Client name cannot be empty" };
    const { data, error } = await supabase
      .schema("crm")
      .from("clients")
      .insert({ business_name: name })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    clientId = data!.id as string;
  }

  const batchResult = await findOrCreateManualBatch(clientId);
  if ("error" in batchResult) return { ok: false, message: batchResult.error };

  // Next sort_order within this (batch, topic) group.
  const { data: maxRow, error: maxErr } = await supabase
    .schema("tasks")
    .from("tasks")
    .select("sort_order")
    .eq("batch_id", batchResult.batchId)
    .eq("topic", trimmedTopic)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) return { ok: false, message: maxErr.message };
  const nextSortOrder = ((maxRow?.sort_order as number | undefined) ?? -1) + 1;

  const { error: insertErr } = await supabase
    .schema("tasks")
    .from("tasks")
    .insert({
      batch_id: batchResult.batchId,
      section: "Projects",
      topic: trimmedTopic,
      task_text: trimmedText,
      status: "open",
      sort_order: nextSortOrder,
    });
  if (insertErr) return { ok: false, message: insertErr.message };

  refreshSurfaces();
  return { ok: true };
}
