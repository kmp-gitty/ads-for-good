"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type ActionResult = { ok: true } | { ok: false; message: string };

export async function toggleTaskStatus(
  taskId: string,
  currentStatus: string,
): Promise<ActionResult> {
  const next = currentStatus === "done" ? "open" : "done";
  const { error } = await supabase
    .schema("tasks")
    .from("tasks")
    .update({ status: next })
    .eq("id", taskId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/internal/tasks");
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
  revalidatePath("/internal/tasks");
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
  revalidatePath("/internal/tasks");
  return { ok: true };
}

export async function updateTaskTopic(taskId: string, topic: string): Promise<ActionResult> {
  const trimmed = topic.trim();
  if (!trimmed) return { ok: false, message: "Topic cannot be empty" };
  const { error } = await supabase
    .schema("tasks")
    .from("tasks")
    .update({ topic: trimmed })
    .eq("id", taskId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/internal/tasks");
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

  const { data: maxRow, error: maxErr } = await supabase
    .schema("tasks")
    .from("tasks")
    .select("sort_order")
    .eq("batch_id", batchResult.batchId)
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
      topic: trimmedTopic,
      task_text: trimmedText,
      status: "open",
      sort_order: nextSortOrder,
    });
  if (insertErr) return { ok: false, message: insertErr.message };

  revalidatePath("/internal/tasks");
  return { ok: true };
}
