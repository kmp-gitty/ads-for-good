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

  // Bookmarklet: drops a <script> tag pointing at /api/internal/picker.js
  // into the current page. Cache-buster query string forces re-fetch so
  // operators always get the latest picker code without re-dragging.
  const bookmarklet =
    "javascript:(function(){var s=document.createElement('script');s.src='https://ads4good.com/api/internal/picker.js?t='+Date.now();document.body.appendChild(s);})();";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-800">
          Picker bookmarklet
        </h3>
        <p className="mt-1 text-sm text-neutral-700">
          For <strong>Click-element</strong> triggers, drag this link to your bookmarks bar.
          Then visit any client storefront, click the bookmarklet, and hover/click any element
          to capture its CSS selector. Press Esc to exit.
        </p>
        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href={bookmarklet}
            className="inline-block rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            onClick={e => e.preventDefault()}
            draggable
          >
            ⌖ Chapter picker
          </a>
          <span className="text-xs text-neutral-500">
            ↑ drag this to your bookmarks bar
          </span>
        </div>
        <p className="mt-3 text-xs text-neutral-600">
          Works on any page where the Chapter pixel is installed (or really, any page at all —
          the picker runs purely client-side). Requires running on a storefront whose origin is
          on the Chapter CORS allowlist if you want the resulting prompt to actually fire there.
        </p>
      </section>

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
    </div>
  );
}
