import { listInboxThreads, getInquiryThread, type InquiryStatus } from "@/app/lib/inquiries/actions";
import InboxBoard from "./InboxBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    thread?: string;
    status?: string;
    client?: string;
  }>;
};

const VALID_STATUSES: InquiryStatus[] = ["open", "in_progress", "resolved"];

export default async function InboxPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter =
    params.status && (VALID_STATUSES as string[]).includes(params.status)
      ? (params.status as InquiryStatus)
      : "open";
  const clientFilter = params.client?.trim() || undefined;

  const [threadsRes, threadDetail] = await Promise.all([
    listInboxThreads({
      status: statusFilter === "open" ? undefined : statusFilter,
      client_key: clientFilter,
      limit: 200,
    }),
    params.thread ? getInquiryThread(params.thread) : Promise.resolve(null),
  ]);

  const threads = threadsRes.ok ? threadsRes.data ?? [] : [];
  const detail = threadDetail && threadDetail.ok ? threadDetail.data ?? null : null;
  const threadsError = threadsRes.ok ? null : threadsRes.message;
  const detailError = threadDetail && !threadDetail.ok ? threadDetail.message : null;

  return (
    <InboxBoard
      threads={threads}
      threadsError={threadsError}
      activeThreadId={params.thread ?? null}
      detail={detail}
      detailError={detailError}
      statusFilter={statusFilter}
      clientFilter={clientFilter ?? ""}
    />
  );
}
