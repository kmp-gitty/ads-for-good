import { listInboxThreads, getInquiryThread } from "@/app/lib/inquiries/actions";
import ClientInboxBoard from "./ClientInboxBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    thread?: string;
    client?: string;
  }>;
};

export default async function ChapterInboxPage({ searchParams }: PageProps) {
  const params = await searchParams;
  // ?client= is the canonical query param mediated by middleware on the
  // rewritten /chapter/<client_key>/inbox route. Server filters threads to
  // just that client; the visibility predicate in listInboxThreads also
  // ensures the user can actually see them (client_employee → their own
  // client; agency_operator → their agency's clients).
  const clientFilter = params.client?.trim() || undefined;

  const [threadsRes, threadDetail] = await Promise.all([
    listInboxThreads({ client_key: clientFilter, limit: 200 }),
    params.thread ? getInquiryThread(params.thread) : Promise.resolve(null),
  ]);

  const threads = threadsRes.ok ? threadsRes.data ?? [] : [];
  const detail = threadDetail && threadDetail.ok ? threadDetail.data : null;
  const threadsError = threadsRes.ok ? null : threadsRes.message;
  const detailError = threadDetail && !threadDetail.ok ? threadDetail.message : null;

  return (
    <ClientInboxBoard
      threads={threads}
      threadsError={threadsError}
      activeThreadId={params.thread ?? null}
      detail={detail}
      detailError={detailError}
    />
  );
}
