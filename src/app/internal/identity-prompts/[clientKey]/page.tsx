import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import PromptForm from "./PromptForm";
import RowActions from "./RowActions";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type PromptRow = {
  id: string;
  slug: string;
  preset_type: string;
  trigger_jsonb: { type?: string; selector?: string; delay_ms?: number; percent?: number };
  headline: string;
  body: string | null;
  input_mode: string;
  button_label: string;
  success_message: string | null;
  offer_code: string | null;
  offer_description: string | null;
  post_submit_action: string;
  post_submit_url: string | null;
  frequency: string;
  frequency_days: number | null;
  enabled: boolean;
  hit_count: number;
  submit_count: number;
  last_hit_at: string | null;
};

function describeTrigger(t: PromptRow["trigger_jsonb"]): string {
  switch (t.type) {
    case "click_element":
      return `Click on ${t.selector}`;
    case "exit_intent":
      return "Exit intent";
    case "time_on_page":
      return `After ${(t.delay_ms ?? 15000) / 1000}s on page`;
    case "scroll_depth":
      return `After ${t.percent ?? 50}% scroll`;
    default:
      return JSON.stringify(t);
  }
}

export default async function ClientPromptsPage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;
  const { data: prompts } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .select(
      "id, slug, preset_type, trigger_jsonb, headline, body, input_mode, button_label, success_message, offer_code, offer_description, post_submit_action, post_submit_url, frequency, frequency_days, enabled, hit_count, submit_count, last_hit_at",
    )
    .eq("client_key", clientKey)
    .order("created_at", { ascending: false });

  const promptList = (prompts as PromptRow[] | null) ?? [];

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-500">
        <Link href="/internal/identity-prompts" className="hover:text-orange-700">← All clients</Link>
      </p>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          <span className="font-mono">{clientKey}</span>
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Each prompt fires when its trigger condition matches. Submit captures the email via <code>/api/identify</code>.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Create a new prompt</h3>
        <div className="mt-3">
          <PromptForm client_key={clientKey} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Existing prompts ({promptList.length})
        </h3>
        {promptList.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No prompts yet for this client.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {promptList.map(p => (
              <div key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold">{p.slug}</span>
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                        {p.preset_type ?? "email_exchange"}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {describeTrigger(p.trigger_jsonb)}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        collect: {p.input_mode}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        post-submit: {p.post_submit_action}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        freq: {p.frequency}
                      </span>
                      {!p.enabled && (
                        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                          disabled
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-neutral-800">{p.headline}</p>
                    {p.body && <p className="mt-1 text-xs text-neutral-500">{p.body}</p>}
                    {p.offer_code && (
                      <p className="mt-2 text-xs text-neutral-600">
                        Offer: <span className="font-mono font-semibold">{p.offer_code}</span>
                        {p.offer_description && <span className="ml-1 text-neutral-500">— {p.offer_description}</span>}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-neutral-400 font-mono">
                      Shown {p.hit_count}× · Submitted {p.submit_count}×
                      {p.submit_count > 0 && p.hit_count > 0 && (
                        <span className="ml-2">
                          ({Math.round((p.submit_count / p.hit_count) * 100)}% conversion)
                        </span>
                      )}
                    </p>
                  </div>
                  <RowActions id={p.id} client_key={clientKey} enabled={p.enabled} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
