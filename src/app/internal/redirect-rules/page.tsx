import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type RuleCount = {
  client_key: string;
  enabled_count: number;
  total_count: number;
};

export default async function RedirectRulesIndex() {
  // Get all active clients + per-client rule counts.
  const [{ data: clients }, { data: rules }] = await Promise.all([
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("client_key, storefront_domain")
      .order("client_key", { ascending: true }),
    supabase
      .schema("chapter_config")
      .from("redirect_rules")
      .select("client_key, enabled"),
  ]);

  const countsByClient = new Map<string, RuleCount>();
  for (const r of (rules ?? []) as Array<{ client_key: string; enabled: boolean }>) {
    const ck = r.client_key;
    const cur = countsByClient.get(ck) ?? { client_key: ck, enabled_count: 0, total_count: 0 };
    cur.total_count += 1;
    if (r.enabled) cur.enabled_count += 1;
    countsByClient.set(ck, cur);
  }

  const rows = ((clients ?? []) as Array<{ client_key: string; storefront_domain: string | null }>).map((c) => ({
    client_key: c.client_key,
    storefront_domain: c.storefront_domain,
    counts: countsByClient.get(c.client_key) ?? { client_key: c.client_key, enabled_count: 0, total_count: 0 },
  }));

  return (
    <>
      <p className="text-sm text-neutral-700">
        Click a client to manage their redirect rules.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
            <tr>
              <th className="px-4 py-3">client_key</th>
              <th className="px-4 py-3">Storefront</th>
              <th className="px-4 py-3 text-right">Rules (enabled / total)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.client_key} className="border-t border-neutral-100 hover:bg-orange-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/internal/redirect-rules/${r.client_key}`}
                    className="font-mono text-orange-700 hover:underline"
                  >
                    {r.client_key}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {r.storefront_domain ?? <span className="text-neutral-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono text-neutral-700">
                  {r.counts.enabled_count} / {r.counts.total_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        Need a new client?{" "}
        <Link href="/internal/client-portal-config/new" className="text-orange-700 hover:underline">
          Add via Client Portal Config →
        </Link>
      </p>
    </>
  );
}
