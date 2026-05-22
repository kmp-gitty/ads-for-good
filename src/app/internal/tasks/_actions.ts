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
