import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { listConditionTypes } from "@/app/lib/redirect/conditions";
import RuleRowActions from "./RuleRowActions";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type Rule = {
  id: string;
  client_key: string;
  slug: string;
  rule_priority: number;
  condition_jsonb: Record<string, unknown>;
  destination_template: string;
  description: string | null;
  enabled: boolean;
  hit_count: number;
  last_hit_at: string | null;
};

export default async function ClientRedirectRulesPage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;

  const { data: rules, error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .select("*")
    .eq("client_key", clientKey)
    .order("slug", { ascending: true })
    .order("rule_priority", { ascending: true });

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        Failed to load rules: {error.message}
      </div>
    );
  }

  // Group rules by slug for display.
  const bySlug = new Map<string, Rule[]>();
  for (const r of (rules ?? []) as Rule[]) {
    const list = bySlug.get(r.slug) ?? [];
    list.push(r);
    bySlug.set(r.slug, list);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">
            <Link href="/internal/redirect-rules" className="hover:text-orange-700">
              ← All clients
            </Link>
          </p>
          <h2 className="mt-1 font-mono text-lg font-semibold">{clientKey}</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {rules?.length ?? 0} rules across {bySlug.size} slugs.
          </p>
        </div>
        <Link
          href={`/internal/redirect-rules/${clientKey}/new`}
          className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          + New Rule
        </Link>
      </div>

      {bySlug.size === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">
          No rules yet. Add one to start routing clicks for this client.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Array.from(bySlug.entries()).map(([slug, slugRules]) => (
            <div key={slug} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">slug</p>
                <p className="mt-0.5 font-mono text-sm font-semibold">{slug}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  URL: <code className="text-neutral-700">/r/{clientKey}/{slug}</code>
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-[0.10em] text-neutral-600">
                  <tr>
                    <th className="px-4 py-2 w-16">Pri</th>
                    <th className="px-4 py-2">Conditions</th>
                    <th className="px-4 py-2">Destination</th>
                    <th className="px-4 py-2 w-20 text-right">Hits</th>
                    <th className="px-4 py-2 w-32 text-right">Status</th>
                    <th className="px-4 py-2 w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slugRules.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-neutral-100 ${r.enabled ? "" : "bg-neutral-50/70"}`}
                    >
                      <td className="px-4 py-3 font-mono text-neutral-700">{r.rule_priority}</td>
                      <td className="px-4 py-3">
                        {Object.keys(r.condition_jsonb).length === 0 ? (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                            DEFAULT (matches all)
                          </span>
                        ) : (
                          <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-700">
                            {JSON.stringify(r.condition_jsonb, null, 0)}
                          </pre>
                        )}
                        {r.description && (
                          <p className="mt-1 text-xs italic text-neutral-500">{r.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-700 break-all">
                        {r.destination_template}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-700">
                        {r.hit_count}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {r.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RuleRowActions
                          id={r.id}
                          client_key={clientKey}
                          slug={slug}
                          enabled={r.enabled}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-5 text-sm">
        <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Available condition types</p>
        <p className="mt-2 font-mono text-xs text-neutral-700">{listConditionTypes().join(" · ")}</p>
        <p className="mt-3 text-xs text-neutral-500">
          Conditions in a rule are AND-ed. Empty object <code>{"{}"}</code> = catch-all default.
        </p>
      </div>
    </>
  );
}
