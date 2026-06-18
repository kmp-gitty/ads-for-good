"use server";

// Inquiry threads + messages — server actions.
//
// Used by:
//   - SubmitInquiryDrawer (global submit from any dashboard page)
//   - /internal/inbox (chapter_staff reply + status management)
//   - /chapter/<client_key>/inbox (client_employee + agency_operator read-only v1)
//
// Visibility enforced HERE (not via RLS policies) because multi-role tenant
// visibility gets tangled in RLS faster than it does in app code. Every
// mutation + lookup calls getCurrentChapterUser() first and refuses without
// a valid user. Service-role bypasses RLS for the underlying DB writes.

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  getCurrentChapterUserOrLegacy,
  listAccessibleClientKeys,
  type ChapterUser,
} from "@/app/lib/auth/chapter-user";
import { postToGChatUrl } from "@/app/lib/monitoring/gchat";

// Dedicated webhook for client inquiries — keeps them out of the operational
// stuck-runs / daily-digest channel so they're easy to triage. Falls back to
// the default webhook if the inquiries-specific one isn't set (so behavior
// degrades gracefully on first deploy before the env var is added).
const INQUIRIES_WEBHOOK_URL =
  process.env.CHAPTER_INQUIRIES_GCHAT_WEBHOOK_URL ||
  process.env.CHAPTER_GCHAT_WEBHOOK_URL ||
  null;

function isInquiryGChatConfigured(): boolean {
  return Boolean(INQUIRIES_WEBHOOK_URL);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

export type InquiryCategory =
  | "data_question"
  | "bug_report"
  | "feature_request"
  | "billing"
  | "other";

export type InquiryStatus = "open" | "in_progress" | "resolved";

export type InquiryThread = {
  id: string;
  client_key: string;
  subject: string;
  category: InquiryCategory;
  status: InquiryStatus;
  created_by_email: string;
  created_by_role: "chapter_staff" | "agency_operator" | "client_employee";
  cc_emails: string[];
  page_url: string | null;
  created_at: string;
  last_message_at: string;
  resolved_at: string | null;
  message_count?: number;
};

export type InquiryMessage = {
  id: string;
  thread_id: string;
  sender_email: string;
  sender_role: "chapter_staff" | "agency_operator" | "client_employee";
  body: string;
  attachment_paths: string[];
  created_at: string;
};

// ─── Visibility predicates ──────────────────────────────────────────────────

async function clientKeysVisibleTo(user: ChapterUser): Promise<string[] | "ALL"> {
  if (user.role === "chapter_staff") return "ALL";
  return await listAccessibleClientKeys(user);
}

function canReplyTo(user: ChapterUser, thread: InquiryThread): boolean {
  if (user.revoked_at) return false;
  if (user.role === "chapter_staff") return true;
  if (user.role === "client_employee") return thread.client_key === user.client_key;
  // agency_operator is read-only in v1
  return false;
}

// ─── Submit a new inquiry ───────────────────────────────────────────────────

export async function submitInquiry(input: {
  client_key: string;
  subject: string;
  category: InquiryCategory;
  body: string;
  cc_emails?: string[];
  page_url?: string | null;
  attachment_paths?: string[];
}): Promise<ActionResult<{ thread_id: string }>> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, message: "Not signed in" };

  const visible = await clientKeysVisibleTo(user);
  if (visible !== "ALL" && !visible.includes(input.client_key)) {
    return { ok: false, message: "You can't submit an inquiry for that client" };
  }

  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject) return { ok: false, message: "Subject required" };
  if (!body) return { ok: false, message: "Body required" };

  const ccEmails = (input.cc_emails ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  // Insert thread + first message in 2 statements. We don't wrap in a tx
  // because the trigger on messages bumps thread.last_message_at, and if the
  // tx rolls back the thread row never existed anyway.
  const { data: thread, error: threadErr } = await supabase
    .schema("chapter_inquiries")
    .from("threads")
    .insert({
      client_key: input.client_key,
      subject,
      category: input.category,
      created_by_email: user.email,
      created_by_role: user.role,
      cc_emails: ccEmails,
      page_url: input.page_url ?? null,
    })
    .select("id")
    .single();
  if (threadErr) return { ok: false, message: threadErr.message };
  const threadId = thread!.id as string;

  const { error: msgErr } = await supabase
    .schema("chapter_inquiries")
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_email: user.email,
      sender_role: user.role,
      body,
      attachment_paths: input.attachment_paths ?? [],
    });
  if (msgErr) return { ok: false, message: msgErr.message };

  // Gchat notify on new threads (not on chapter_staff-opened ones, since those
  // are typically test/dogfood and notifying yourself is noise).
  if (user.role !== "chapter_staff" && isInquiryGChatConfigured()) {
    void notifyGchatNewInquiry({
      thread_id: threadId,
      client_key: input.client_key,
      category: input.category,
      subject,
      body,
      sender_email: user.email,
      sender_role: user.role,
    });
  }

  revalidatePath("/internal/inbox");
  revalidatePath(`/chapter/${input.client_key}/inbox`);
  return { ok: true, data: { thread_id: threadId } };
}

// ─── Reply to an existing thread ────────────────────────────────────────────

export async function replyToInquiry(input: {
  thread_id: string;
  body: string;
  attachment_paths?: string[];
}): Promise<ActionResult> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, message: "Not signed in" };

  const thread = await fetchThreadInternal(input.thread_id);
  if (!thread) return { ok: false, message: "Thread not found" };
  if (!canReplyTo(user, thread)) {
    return { ok: false, message: "You can't reply to this thread" };
  }

  const body = input.body.trim();
  if (!body) return { ok: false, message: "Body required" };

  const { error } = await supabase
    .schema("chapter_inquiries")
    .from("messages")
    .insert({
      thread_id: input.thread_id,
      sender_email: user.email,
      sender_role: user.role,
      body,
      attachment_paths: input.attachment_paths ?? [],
    });
  if (error) return { ok: false, message: error.message };

  // Gchat notify on CLIENT replies (chapter_staff replies are the "we're
  // handling it" signal — no notification to ourselves).
  if (user.role === "client_employee" && isInquiryGChatConfigured()) {
    void notifyGchatClientReply({
      thread_id: input.thread_id,
      client_key: thread.client_key,
      subject: thread.subject,
      body,
      sender_email: user.email,
    });
  }

  revalidatePath("/internal/inbox");
  revalidatePath(`/chapter/${thread.client_key}/inbox`);
  return { ok: true };
}

// ─── Status changes (chapter_staff only) ────────────────────────────────────

export async function setInquiryStatus(
  thread_id: string,
  status: InquiryStatus,
): Promise<ActionResult> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, message: "Not signed in" };
  if (user.role !== "chapter_staff") {
    return { ok: false, message: "Only Chapter staff can change inquiry status" };
  }

  const update: Record<string, unknown> = { status };
  if (status === "resolved") update.resolved_at = new Date().toISOString();
  else update.resolved_at = null;

  const { data, error } = await supabase
    .schema("chapter_inquiries")
    .from("threads")
    .update(update)
    .eq("id", thread_id)
    .select("client_key")
    .single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/internal/inbox");
  if (data?.client_key) revalidatePath(`/chapter/${data.client_key}/inbox`);
  return { ok: true };
}

// ─── Listing + detail (visibility-scoped) ───────────────────────────────────

export async function listInboxThreads(filter?: {
  status?: InquiryStatus | "all";
  client_key?: string;
  limit?: number;
}): Promise<ActionResult<InquiryThread[]>> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, message: "Not signed in" };

  const visible = await clientKeysVisibleTo(user);
  const limit = Math.min(filter?.limit ?? 100, 500);

  let query = supabase
    .schema("chapter_inquiries")
    .from("threads")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (visible !== "ALL") {
    if (visible.length === 0) return { ok: true, data: [] };
    query = query.in("client_key", visible);
  }
  if (filter?.client_key) query = query.eq("client_key", filter.client_key);
  if (filter?.status && filter.status !== "all") query = query.eq("status", filter.status);

  const { data, error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data ?? []) as InquiryThread[] };
}

export async function getInquiryThread(thread_id: string): Promise<
  ActionResult<{ thread: InquiryThread; messages: InquiryMessage[] }>
> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, message: "Not signed in" };

  const thread = await fetchThreadInternal(thread_id);
  if (!thread) return { ok: false, message: "Thread not found" };

  const visible = await clientKeysVisibleTo(user);
  if (visible !== "ALL" && !visible.includes(thread.client_key)) {
    // Same response shape as not-found so we don't leak existence.
    return { ok: false, message: "Thread not found" };
  }

  const { data: messages, error } = await supabase
    .schema("chapter_inquiries")
    .from("messages")
    .select("*")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    data: { thread, messages: (messages ?? []) as InquiryMessage[] },
  };
}

async function fetchThreadInternal(thread_id: string): Promise<InquiryThread | null> {
  const { data, error } = await supabase
    .schema("chapter_inquiries")
    .from("threads")
    .select("*")
    .eq("id", thread_id)
    .maybeSingle();
  if (error) {
    console.warn("[inquiries] fetchThread failed:", error.message);
    return null;
  }
  return (data as InquiryThread) ?? null;
}

// ─── Attachments ────────────────────────────────────────────────────────────

const ATTACHMENT_BUCKET = "inquiry-attachments";

export async function uploadInquiryAttachment(
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, message: "Not signed in" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "No file provided" };
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, message: "File too large (max 10 MB)" };
  }
  if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
    return { ok: false, message: "Only PNG/JPEG/GIF/WEBP images allowed" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  // Path: <year>/<month>/<sender_role>/<uuid>.<ext>. Year/month folders keep
  // listing reasonable in the Storage dashboard; uuid prevents collisions.
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const path = `${yyyy}/${mm}/${user.role}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });
  if (error) return { ok: false, message: error.message };

  return { ok: true, data: { path } };
}

const SIGNED_URL_TTL_SECONDS = 3600;

export async function getInquiryAttachmentUrl(path: string): Promise<ActionResult<string>> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, message: "Not signed in" };

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data!.signedUrl };
}

// ─── Gchat notification helpers (fire-and-forget) ───────────────────────────

async function notifyGchatNewInquiry(args: {
  thread_id: string;
  client_key: string;
  category: InquiryCategory;
  subject: string;
  body: string;
  sender_email: string;
  sender_role: string;
}): Promise<void> {
  if (!INQUIRIES_WEBHOOK_URL) return;
  try {
    const preview = args.body.length > 200 ? args.body.slice(0, 200) + "…" : args.body;
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://ads4good.com";
    const link = `${base}/internal/inbox?thread=${args.thread_id}`;
    await postToGChatUrl(INQUIRIES_WEBHOOK_URL, {
      text:
        `*New inquiry — ${args.client_key}* [${args.category}]\n` +
        `*${args.subject}*\n` +
        `${preview}\n` +
        `_from ${args.sender_email} (${args.sender_role})_\n` +
        `${link}`,
    });
  } catch (err) {
    console.warn("[inquiries] notifyGchat (new) failed:", err);
  }
}

async function notifyGchatClientReply(args: {
  thread_id: string;
  client_key: string;
  subject: string;
  body: string;
  sender_email: string;
}): Promise<void> {
  if (!INQUIRIES_WEBHOOK_URL) return;
  try {
    const preview = args.body.length > 200 ? args.body.slice(0, 200) + "…" : args.body;
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://ads4good.com";
    const link = `${base}/internal/inbox?thread=${args.thread_id}`;
    await postToGChatUrl(INQUIRIES_WEBHOOK_URL, {
      text:
        `*Client reply — ${args.client_key}*\n` +
        `Re: *${args.subject}*\n` +
        `${preview}\n` +
        `_from ${args.sender_email}_\n` +
        `${link}`,
    });
  } catch (err) {
    console.warn("[inquiries] notifyGchat (reply) failed:", err);
  }
}
