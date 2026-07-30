// MI v2 Phase 2D — Responses admin view.
//
// Read-only table of chapter_engagement.prompt_responses for the client.
// Filter by prompt slug; show submitted_at, truncated identity_key, all
// non-identity response fields rendered as a compact JSON summary, the
// browsing context (page_url + UA + country), and a "view raw" expander.
//
// Identity hashes shown truncated (8 char prefix) — same convention as the
// rest of the operator surfaces. No raw PII ever rendered.

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type ResponseRow = {
  id: string;
  prompt_slug: string;
  prompt_id: string;
  identity_key: string | null;
  anonymous_id: string | null;
  responses_jsonb: Record<string, unknown> | null;
  user_agent: string | null;
  ip_country: string | null;
  page_url: string | null;
  variant_id: string | null;
  created_at: string;
};

function truncateIdentity(key: string | null): string {
  if (!key) return "—";
  // Format: <prefix>:<hash>
  const colonIdx = key.indexOf(":");
  if (colonIdx === -1) return key.slice(0, 12) + "…";
  const prefix = key.slice(0, colonIdx);
  const hash = key.slice(colonIdx + 1);
  return `${prefix}:${hash.slice(0, 8)}…`;
}

function formatResponseSummary(responses: Record<string, unknown> | null): string {
  if (!responses) return "—";
  const entries = Object.entries(responses);
  if (entries.length === 0) return "—";
  return entries
    .map(([k, v]) => {
      const valStr = Array.isArray(v) ? v.join(", ") : (v == null ? "" : String(v));
      const trunc = valStr.length > 40 ? valStr.slice(0, 40) + "…" : valStr;
      return `${k}: ${trunc}`;
    })
    .join(" · ");
}

export default async function ResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientKey: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const { clientKey } = await params;
  const { slug } = await searchParams;

  // Fetch list of prompts for filter dropdown + engagement summary
  const [{ data: promptList }, { data: engagement }] = await Promise.all([
    supabase
      .schema("chapter_config")
      .from("identity_prompts")
      .select("id, slug, preset_type")
      .eq("client_key", clientKey)
      .order("created_at", { ascending: false }),
    supabase.schema("chapter_reporting").rpc("prompt_engagement", { p_client_key: clientKey }),
  ]);
  const engMap = new Map<string, { shown: number; submitted: number; dismissed: number }>(
    ((engagement as { slug: string; shown: number; submitted: number; dismissed: number }[] | null) ?? []).map((e) => [
      e.slug,
      { shown: Number(e.shown), submitted: Number(e.submitted), dismissed: Number(e.dismissed) },
    ]),
  );

  let query = supabase
    .schema("chapter_engagement")
    .from("prompt_responses")
    .select(
      "id, prompt_slug, prompt_id, identity_key, anonymous_id, responses_jsonb, user_agent, ip_country, page_url, variant_id, created_at",
    )
    .eq("client_key", clientKey)
    .order("created_at", { ascending: false })
    .limit(200);

  if (slug) query = query.eq("prompt_slug", slug);

  const { data: rows } = await query;
  const responses = (rows ?? []) as ResponseRow[];

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-500">
        <Link href={`/internal/identity-prompts/${clientKey}`} className="hover:text-orange-700">
          ← Back to {clientKey}
        </Link>
      </p>

      {/* Engagement — every prompt, from the live event stream. Covers presets
          that don't capture contact (e.g. Custom Notification), which never
          appear in the responses table below. */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">Engagement</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Shows, submits, and dismissals for every prompt — straight from the pixel event stream. Works for all preset
          types, including notifications that promote an offer without capturing contact info.
        </p>
        {(promptList ?? []).length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-xs text-neutral-500">
            No prompts for this client yet.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Prompt</th>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-right font-semibold">Shown</th>
                  <th className="px-3 py-2 text-right font-semibold">Submitted</th>
                  <th className="px-3 py-2 text-right font-semibold">Dismissed</th>
                  <th className="px-3 py-2 text-right font-semibold">Submit rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(promptList ?? []).map((p) => {
                  const e = engMap.get(p.slug) ?? { shown: 0, submitted: 0, dismissed: 0 };
                  const rate = e.shown > 0 ? Math.round((e.submitted / e.shown) * 100) : null;
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2"><code className="text-xs">{p.slug}</code></td>
                      <td className="px-3 py-2 text-xs text-neutral-500">{p.preset_type}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.shown.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-neutral-800">{e.submitted.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-500">{e.dismissed.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rate !== null ? `${rate}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Prompt responses</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Contact-capturing submissions (Custom Form / Email Exchange) stored to <code>chapter_engagement.prompt_responses</code>.
              Notification-style prompts that don&apos;t collect contact info won&apos;t appear here — see Engagement above.
            </p>
          </div>
          <form method="get" className="flex items-center gap-2">
            <select
              name="slug"
              defaultValue={slug ?? ""}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">All prompts</option>
              {(promptList ?? []).map(p => (
                <option key={p.id} value={p.slug}>
                  {p.slug} ({p.preset_type})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Filter
            </button>
            {slug && (
              <Link
                href={`/internal/identity-prompts/${clientKey}/responses`}
                className="text-xs text-neutral-500 hover:text-orange-700"
              >
                Clear
              </Link>
            )}
          </form>
        </div>
      </section>

      <section>
        {responses.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
            <p className="text-sm font-semibold text-neutral-700">No responses yet</p>
            <p className="mt-2 text-xs text-neutral-500">
              {slug
                ? `No submissions captured for the "${slug}" prompt yet.`
                : "Once a Custom Form prompt is fired and submitted, rows will land here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Submitted</th>
                  <th className="px-3 py-2 text-left font-semibold">Prompt</th>
                  <th className="px-3 py-2 text-left font-semibold">Identity</th>
                  <th className="px-3 py-2 text-left font-semibold">Responses</th>
                  <th className="px-3 py-2 text-left font-semibold">Country</th>
                  <th className="px-3 py-2 text-left font-semibold">Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {responses.map(r => (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-600">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs">{r.prompt_slug}</code>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-[11px] text-neutral-700">
                        {truncateIdentity(r.identity_key)}
                      </code>
                    </td>
                    <td className="max-w-[400px] px-3 py-2">
                      <span className="text-xs text-neutral-800">
                        {formatResponseSummary(r.responses_jsonb)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">
                      {r.ip_country ?? "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-xs text-neutral-500" title={r.page_url ?? ""}>
                      {r.page_url ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              Showing latest {responses.length} {responses.length === 200 ? "(capped at 200)" : ""}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
