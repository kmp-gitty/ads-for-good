"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  replyToInquiry,
  setInquiryStatus,
  getInquiryAttachmentUrl,
  type InquiryMessage,
  type InquiryStatus,
  type InquiryThread,
} from "@/app/lib/inquiries/actions";

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
  statusFilter: InquiryStatus;
  clientFilter: string;
};

export default function InboxBoard(props: Props) {
  const router = useRouter();

  const distinctClients = Array.from(new Set(props.threads.map((t) => t.client_key))).sort();

  function setFilter(updates: Record<string, string | null>) {
    const u = new URL(window.location.href);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    }
    // Clear the thread when changing filter (might not be visible anymore).
    if ("status" in updates || "client" in updates) u.searchParams.delete("thread");
    router.push(u.pathname + u.search);
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left: filters + thread list */}
      <aside className="col-span-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <FilterDropdown
              value={props.statusFilter}
              onChange={(v) => setFilter({ status: v })}
              options={[
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In progress" },
                { value: "resolved", label: "Resolved" },
              ]}
            />
            <FilterDropdown
              value={props.clientFilter || "all"}
              onChange={(v) => setFilter({ client: v === "all" ? null : v })}
              options={[
                { value: "all", label: "All clients" },
                ...distinctClients.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
          {props.threadsError && (
            <div className="mt-3 text-sm text-red-600">{props.threadsError}</div>
          )}
        </div>

        <ul className="mt-3 space-y-2">
          {props.threads.length === 0 ? (
            <li className="rounded-lg border border-dashed border-neutral-300 bg-white/50 px-4 py-6 text-center text-sm text-neutral-500">
              No threads match this filter.
            </li>
          ) : (
            props.threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setFilter({ thread: t.id })}
                  className={`block w-full rounded-lg border bg-white px-4 py-3 text-left shadow-sm transition hover:border-orange-300 ${
                    t.id === props.activeThreadId
                      ? "border-orange-400 ring-1 ring-orange-200"
                      : "border-neutral-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      {t.client_key}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-neutral-900">
                    {t.subject}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-neutral-500">
                    {CATEGORY_LABEL[t.category] ?? t.category} · {t.created_by_email}
                    {" · "}
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

      {/* Right: detail view */}
      <section className="col-span-8">
        {props.detail ? (
          <ThreadDetail detail={props.detail} />
        ) : props.detailError ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-6 text-sm text-red-700">
            {props.detailError}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white/50 px-4 py-12 text-center text-sm text-neutral-500">
            Pick a thread on the left to view + reply.
          </div>
        )}
      </section>
    </div>
  );
}

function FilterDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ThreadDetail({ detail }: { detail: Detail }) {
  const { thread, messages } = detail;
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReply() {
    if (!reply.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await replyToInquiry({
        thread_id: thread.id,
        body: reply.trim(),
      });
      if (!res.ok) {
        setError(res.message);
      } else {
        setReply("");
      }
    });
  }

  function handleStatusChange(s: InquiryStatus) {
    startTransition(async () => {
      const res = await setInquiryStatus(thread.id, s);
      if (!res.ok) setError(res.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {thread.client_key} · {CATEGORY_LABEL[thread.category] ?? thread.category}
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-neutral-900">
              {thread.subject}
            </h2>
            <div className="mt-0.5 text-xs text-neutral-500">
              from {thread.created_by_email} ({thread.created_by_role}) ·{" "}
              {new Date(thread.created_at).toLocaleString()}
              {thread.page_url && (
                <>
                  {" "}
                  · submitted from <code className="rounded bg-neutral-100 px-1 py-0.5">{thread.page_url}</code>
                </>
              )}
            </div>
            {thread.cc_emails.length > 0 && (
              <div className="mt-1 text-xs text-neutral-500">
                CC: {thread.cc_emails.join(", ")}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={thread.status}
              onChange={(e) => handleStatusChange(e.target.value as InquiryStatus)}
              disabled={pending}
              className={`rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500`}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </ul>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder="Write your reply…"
          className="w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Sending…" : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: InquiryMessage }) {
  const isStaff = message.sender_role === "chapter_staff";
  return (
    <li
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        isStaff ? "border-orange-200 bg-orange-50/40" : "border-neutral-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
        <div>
          <span className="font-medium text-neutral-700">{message.sender_email}</span>
          <span className="ml-1">
            ({message.sender_role === "chapter_staff" ? "Chapter staff" : message.sender_role.replace("_", " ")})
          </span>
        </div>
        <div>{new Date(message.created_at).toLocaleString()}</div>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">{message.body}</div>
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
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function openAttachment() {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setLoading(true);
    const res = await getInquiryAttachmentUrl(path);
    setLoading(false);
    if (res.ok) {
      setUrl(res.data!);
      window.open(res.data!, "_blank", "noopener,noreferrer");
    }
  }

  const name = path.split("/").pop() ?? "attachment";
  return (
    <button
      type="button"
      onClick={openAttachment}
      disabled={loading}
      className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-100 disabled:opacity-50"
    >
      📎 {name}
    </button>
  );
}
