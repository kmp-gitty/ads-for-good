import { createClient } from "@supabase/supabase-js";
import UploadForm from "./UploadForm";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  client_key: string;
  event_slug: string;
  event_name: string | null;
  event_ts: string;
  location: string | null;
  attendee_count: number;
  created_at: string;
};

type ClientRow = { client_key: string };

export default async function OfflineEventsPage() {
  const [{ data: events }, { data: clients }] = await Promise.all([
    supabase
      .schema("chapter_ingest")
      .from("offline_events")
      .select("id, client_key, event_slug, event_name, event_ts, location, attendee_count, created_at")
      .order("event_ts", { ascending: false })
      .limit(50),
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("client_key")
      .order("client_key"),
  ]);

  const eventList = (events as EventRow[] | null) ?? [];
  const clientList = (clients as ClientRow[] | null) ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Upload a new event</h2>
        <p className="mt-1 text-sm text-neutral-500">
          CSV must include <code>email</code> or <code>phone</code> (or <code>phone_number</code>). Any other columns become questionnaire metadata. <code>name</code> is stored as first-initial only.
        </p>
        <div className="mt-4">
          <UploadForm clientKeys={clientList.map(c => c.client_key)} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Recent events</h2>
        {eventList.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No events uploaded yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-left">Event</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-right">Attendees</th>
                </tr>
              </thead>
              <tbody>
                {eventList.map(ev => (
                  <tr key={ev.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{ev.event_name || ev.event_slug}</div>
                      <div className="text-xs text-neutral-500 font-mono">{ev.event_slug}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600">{ev.client_key}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {new Date(ev.event_ts).toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{ev.location || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{ev.attendee_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
