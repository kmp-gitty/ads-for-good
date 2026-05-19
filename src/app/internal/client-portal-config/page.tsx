import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export default async function ClientListPage() {
  const { data, error } = await supabase
    .schema("crm")
    .from("clients")
    .select(
      "client_key, business_name, status, active_plan, services_engaged, chapter_enabled, updated_at",
    )
    .order("business_name", { ascending: true });

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        Failed to load clients: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-700">
          {data?.length ?? 0} clients. Click any row to edit, or create a new one.
        </p>
        <Link
          href="/internal/client-portal-config/new"
          className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          + New Client
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">client_key</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Projects</th>
              <th className="px-4 py-3">Chapter</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.client_key} className="border-t border-neutral-100 hover:bg-orange-50">
                <td className="px-4 py-3 font-semibold text-neutral-900">
                  <Link
                    href={`/internal/client-portal-config/${c.client_key}`}
                    className="hover:text-orange-700"
                  >
                    {c.business_name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-600">{c.client_key}</td>
                <td className="px-4 py-3 text-neutral-700">{c.status ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-700">{c.active_plan ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-700">
                  {(c.services_engaged?.length ?? 0) === 0
                    ? "—"
                    : c.services_engaged!.map((s: string) => s.replace(/_/g, " ")).join(", ")}
                </td>
                <td className="px-4 py-3">
                  {c.chapter_enabled ? (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                      enabled
                    </span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
