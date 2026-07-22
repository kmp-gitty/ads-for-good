"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  replyToInquiry,
  getInquiryAttachmentUrl,
  type InquiryMessage,
  type InquiryStatus,
  type InquiryThread,
} from "@/app/lib/inquiries/actions";
import { useChapter } from "../../_components/ChapterContext";
import { SubmitInquiryDrawer } from "../../_components/SubmitInquiryDrawer";

const STATUS_LABEL: Record<InquiryStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

const STATUS_COLOR: Record<InquiryStatus, string> = {
  open: "bg-orange-100 text-orange-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

const CATEGORY_LABEL: Record<string, string> = {
  data_question: "Data question",
  bug_report: "Bug report",
  feature_request: "Feature request",
  billing: "Billing",
  other: "Other",
};

type Detail = { thread: InquiryThread; messages: InquiryMessage[] };

type Props = {
  threads: InquiryThread[];
  threadsError: string | null;
  activeThreadId: string | null;
  detail: Detail | null;
  detailError: string | null;
};

export default function ClientInboxBoard(props: Props) {
  const { client, user } = useChapter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [inquiryOpen, setInquiryOpen] = useState(false);

  // agency_operator is read-only in v1; client_employee can reply on their own threads.
  const canReply = user?.role === "client_employee" || user?.role === "chapter_staff";

  function selectThread(threadId: string) {
    const u = new URL(window.location.href);
    u.searchParams.set("thread", threadId);
    router.push(u.pathname + u.search);
  }

  return (
    <div className="chapter-app">
      <div className="grid grid-cols-12 gap-6 p-6">
        <aside className="col-span-12 md:col-span-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Inquiries</h2>
            <button
              type="button"
              onClick={() => setInquiryOpen(true)}
              className="shrink-0 rounded-md bg-[color:var(--accent)] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:brightness-95"
            >
              Submit inquiry
            </button>
          </div>
          <p className="mt-1 text-xs text-[color:var(--ink-3)]">
            Replies from the Chapter team land here.
          </p>
          {props.threadsError && (
            <div className="mt-3 text-sm text-red-600">{props.threadsError}</div>
          )}
          <ul className="mt-4 space-y-2">
            {props.threads.length === 0 ? (
              <li className="rounded-lg border border-dashed border-[color:var(--line)] px-4 py-6 text-center text-sm text-[color:var(--ink-3)]">
                No inquiries yet. Click <strong>Submit inquiry</strong> above to start one.
              </li>
            ) : (
              props.threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => selectThread(t.id)}
                    className={`block w-full rounded-lg border px-4 py-3 text-left shadow-sm transition hover:border-[color:var(--accent)] ${
                      t.id === props.activeThreadId
                        ? "border-[color:var(--accent)] bg-[color:var(--bg)]"
                        : "border-[color:var(--line)] bg-[color:var(--panel)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium uppercase tracking-wider text-[color:var(--ink-3)]">
                        {CATEGORY_LABEL[t.category] ?? t.category}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">{t.subject}</div>
                    <div className="mt-0.5 truncate text-xs text-[color:var(--ink-3)]">
                      {new Date(t.last_message_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="col-span-12 md:col-span-8">
          {props.detail ? (
            <ThreadDetail detail={props.detail} canReply={canReply} />
          ) : props.detailError ? (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-6 text-sm text-red-700">
              {props.detailError}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[color:var(--line)] px-4 py-12 text-center text-sm text-[color:var(--ink-3)]">
              Pick a thread on the left to view.
            </div>
          )}
        </section>
      </div>

      <SubmitInquiryDrawer
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        clientKey={client.id}
        pagePath={pathname}
      />
    </div>
  );
}

function ThreadDetail({ detail, canReply }: { detail: Detail; canReply: boolean }) {
  const { thread, messages } = detail;
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReply() {
    if (!reply.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await replyToInquiry({ thread_id: thread.id, body: reply.trim() });
      if (!res.ok) setError(res.message);
      else setReply("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wider text-[color:var(--ink-3)]">
          {CATEGORY_LABEL[thread.category] ?? thread.category}
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[thread.status]}`}>
            {STATUS_LABEL[thread.status]}
          </span>
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{thread.subject}</h2>
        <div className="mt-0.5 text-xs text-[color:var(--ink-3)]">
          opened {new Date(thread.created_at).toLocaleString()}
        </div>
        {thread.cc_emails.length > 0 && (
          <div className="mt-1 text-xs text-[color:var(--ink-3)]">CC: {thread.cc_emails.join(", ")}</div>
        )}
      </div>

      <ul className="space-y-3">
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </ul>

      {canReply ? (
        <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel)] p-4 shadow-sm">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            placeholder="Write your reply…"
            className="w-full resize-y rounded-md border border-[color:var(--line)] bg-[color:var(--bg)] px-3 py-2 text-sm shadow-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
            disabled={pending}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-sm">
              {error && <span className="text-red-600">{error}</span>}
            </div>
            <button
              type="button"
              onClick={handleReply}
              disabled={pending || !reply.trim()}
              className="rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Sending…" : "Reply"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[color:var(--line)] px-4 py-3 text-center text-xs text-[color:var(--ink-3)]">
          Read-only — only the client account can reply on their own threads.
        </div>
      )}
    </div>
  );
}

function MessageRow({ message }: { message: InquiryMessage }) {
  const isStaff = message.sender_role === "chapter_staff";
  return (
    <li
      className={`rounded-lg border bg-[color:var(--panel)] p-4 shadow-sm ${
        isStaff ? "border-[color:var(--accent)]/40 bg-[color:var(--bg)]" : "border-[color:var(--line)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-[color:var(--ink-3)]">
        <div>
          <span className="font-medium">{isStaff ? "Chapter team" : message.sender_email}</span>
        </div>
        <div>{new Date(message.created_at).toLocaleString()}</div>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm">{message.body}</div>
      {message.attachment_paths.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.attachment_paths.map((p) => (
            <AttachmentChip key={p} path={p} />
          ))}
        </div>
      )}
    </li>
  );
}

function AttachmentChip({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  async function open() {
    setLoading(true);
    const res = await getInquiryAttachmentUrl(path);
    setLoading(false);
    if (res.ok) window.open(res.data!, "_blank", "noopener,noreferrer");
  }
  const name = path.split("/").pop() ?? "attachment";
  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className="rounded-md border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-medium shadow-sm hover:bg-[color:var(--bg)] disabled:opacity-50"
    >
      📎 {name}
    </button>
  );
}
