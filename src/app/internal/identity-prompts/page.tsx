import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type ClientRow = { client_key: string };
type PromptCountRow = { client_key: string; enabled: boolean };

export default async function IdentityPromptsIndex() {
  const [{ data: clients }, { data: prompts }] = await Promise.all([
    supabase.schema("chapter_config").from("clients").select("client_key").order("client_key"),
    supabase
      .schema("chapter_config")
      .from("identity_prompts")
      .select("client_key, enabled"),
  ]);

  const clientList = (clients as ClientRow[] | null) ?? [];
  const promptList = (prompts as PromptCountRow[] | null) ?? [];

  const counts = new Map<string, { total: number; enabled: number }>();
  for (const p of promptList) {
    const c = counts.get(p.client_key) ?? { total: 0, enabled: 0 };
    c.total += 1;
    if (p.enabled) c.enabled += 1;
    counts.set(p.client_key, c);
  }

  if (clientList.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No clients configured. Provision a client first via SQL or the onboarding flow.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 text-left">Client</th>
            <th className="px-4 py-3 text-right">Prompts</th>
            <th className="px-4 py-3 text-right">Enabled</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {clientList.map(c => {
            const k = counts.get(c.client_key) ?? { total: 0, enabled: 0 };
            return (
              <tr key={c.client_key} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-mono">{c.client_key}</td>
                <td className="px-4 py-3 text-right font-mono">{k.total}</td>
                <td className="px-4 py-3 text-right font-mono">{k.enabled}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/internal/identity-prompts/${c.client_key}`}
                    className="text-orange-700 hover:underline text-xs"
                  >
                    View / configure →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
