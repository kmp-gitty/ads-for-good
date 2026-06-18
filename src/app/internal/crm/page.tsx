import { createClient } from "@supabase/supabase-js";
import AddProspectForm from "./AddProspectForm";
import LogTouchpointForm from "./LogTouchpointForm";
import MeetingQueue from "./MeetingQueue";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type PendingMeeting = {
  id: string;
  subject: string | null;
  occurred_at: string;
  prospect_id: string;
  prospect_business: string | null;
  prospect_contact: string | null;
};

type FunnelStats = {
  pending: number;
  completed: number;
  no_show: number;
  no_show_rate: number | null;
  accepted: number | null;
  accepted_no_show_rate: number | null;
};

// Funnel window. Pending isn't windowed (operator wants to clear the whole
// backlog), but completed / no_show / accepted are scoped to the last 90 days
// so the rate is meaningful and doesn't include ancient history.
const FUNNEL_WINDOW_DAYS = 90;

async function fetchPendingMeetings(): Promise<PendingMeeting[]> {
  // PostgREST nested select: prospects:prospect_id(business_name, contact_name)
  // returns the joined row inline. Filter: past meetings still scheduled.
  type Row = {
    id: string;
    subject: string | null;
    occurred_at: string;
    prospect_id: string;
    prospects: { business_name: string | null; contact_name: string | null } | null;
  };
  const { data, error } = await supabase
    .schema("crm")
    .from("communications")
    .select(
      "id, subject, occurred_at, prospect_id, prospects:prospect_id(business_name, contact_name)",
    )
    .eq("channel", "meeting")
    .eq("status", "scheduled")
    .lt("occurred_at", new Date().toISOString())
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[crm-page] fetchPendingMeetings failed:", error);
    return [];
  }

  return (data as unknown as Row[] | null ?? []).map((r) => ({
    id: r.id,
    subject: r.subject,
    occurred_at: r.occurred_at,
    prospect_id: r.prospect_id,
    prospect_business: r.prospects?.business_name ?? null,
    prospect_contact: r.prospects?.contact_name ?? null,
  }));
}

async function fetchFunnelStats(): Promise<FunnelStats> {
  const since = new Date(
    Date.now() - FUNNEL_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();

  const pendingP = supabase
    .schema("crm")
    .from("communications")
    .select("*", { count: "exact", head: true })
    .eq("channel", "meeting")
    .eq("status", "scheduled")
    .lt("occurred_at", now);

  const completedP = supabase
    .schema("crm")
    .from("communications")
    .select("*", { count: "exact", head: true })
    .eq("channel", "meeting")
    .eq("status", "completed")
    .gte("occurred_at", since);

  const noShowP = supabase
    .schema("crm")
    .from("communications")
    .select("*", { count: "exact", head: true })
    .eq("channel", "meeting")
    .eq("status", "no_show")
    .gte("occurred_at", since);

  // Accepted column requires the n8n companion change (responseStatus on
  // metadata). Returns 0 today if metadata.response_status isn't yet being
  // written; that's the silent "wire isn't in place yet" signal.
  const acceptedP = supabase
    .schema("crm")
    .from("communications")
    .select("*", { count: "exact", head: true })
    .eq("channel", "meeting")
    .eq("metadata->>response_status", "accepted")
    .gte("occurred_at", since);

  const [pendingR, completedR, noShowR, acceptedR] = await Promise.all([
    pendingP,
    completedP,
    noShowP,
    acceptedP,
  ]);

  const pending = pendingR.count ?? 0;
  const completed = completedR.count ?? 0;
  const no_show = noShowR.count ?? 0;
  const accepted = acceptedR.count ?? 0;

  const totalConcluded = completed + no_show;
  const no_show_rate = totalConcluded > 0 ? no_show / totalConcluded : null;
  // Accepted→No-show rate: among meetings the prospect accepted, how many
  // they actually no-showed for. Hidden if accepted is 0 (no signal yet).
  const accepted_no_show_rate = accepted > 0 ? no_show / accepted : null;

  return {
    pending,
    completed,
    no_show,
    no_show_rate,
    accepted: acceptedR.error ? null : accepted,
    accepted_no_show_rate,
  };
}

export default async function CrmPage() {
  const [pendingMeetings, funnel] = await Promise.all([
    fetchPendingMeetings(),
    fetchFunnelStats(),
  ]);

  return (
    <div className="space-y-10">
      {/* Section 4 — Funnel Snapshot (at top so operator sees the state of the world first) */}
      <FunnelSnapshot funnel={funnel} />

      {/* Section 3 — Meeting Confirmation Queue */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
          Meeting Confirmation Queue
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Past meetings still marked <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs">scheduled</code>. Confirm or mark
          no-show to close them out.
        </p>
        <div className="mt-4">
          <MeetingQueue meetings={pendingMeetings} />
        </div>
      </section>

      {/* Section 1 — Add Prospect */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Add Prospect</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Anchor a new lead. Domain is derived from email; <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs">prospect_key</code> is auto-generated.
          Dedup on email is enforced.
        </p>
        <div className="mt-4">
          <AddProspectForm />
        </div>
      </section>

      {/* Section 2 — Log Touchpoint */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Log a Touchpoint</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Manual log for phone / text / LinkedIn / in-person — the things n8n can&rsquo;t auto-capture.
        </p>
        <div className="mt-4">
          <LogTouchpointForm />
        </div>
      </section>
    </div>
  );
}

function FunnelSnapshot({ funnel }: { funnel: FunnelStats }) {
  const fmtPct = (v: number | null) =>
    v === null ? "—" : `${(v * 100).toFixed(1)}%`;
  const showAccepted = funnel.accepted !== null && funnel.accepted > 0;

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Funnel Snapshot</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Last {FUNNEL_WINDOW_DAYS} days, except Pending (full backlog).
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Pending" value={funnel.pending} />
        <Stat label="Completed" value={funnel.completed} />
        <Stat label="No-show" value={funnel.no_show} />
        <Stat
          label="No-show rate"
          value={fmtPct(funnel.no_show_rate)}
          sub="of concluded"
        />
        {showAccepted ? (
          <>
            <Stat label="Accepted" value={funnel.accepted!} />
            <Stat
              label="Accepted→No-show"
              value={fmtPct(funnel.accepted_no_show_rate)}
              sub="of accepted"
            />
          </>
        ) : (
          <div className="col-span-2 flex items-center rounded-md border border-dashed border-neutral-300 bg-white/50 px-4 py-3 text-xs text-neutral-500">
            <span>
              Accepted column lights up after the n8n CRM Meeting Logger writes
              <code className="mx-1 rounded bg-neutral-100 px-1 py-0.5">metadata.response_status</code>
              on each meeting row.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-neutral-500">{sub}</div> : null}
    </div>
  );
}
