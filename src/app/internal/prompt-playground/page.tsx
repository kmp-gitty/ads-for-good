import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import PlaygroundClient from "./PlaygroundClient";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

const PRACTICE_TENANT = "chapter_practice";

export type PromptRow = {
  id: string;
  slug: string;
  preset_type: string;
  trigger_jsonb: {
    type?: string;
    selector?: string;
    delay_ms?: number;
    percent?: number;
  };
  headline: string;
  frequency: string;
  enabled: boolean;
  hit_count: number;
  submit_count: number;
  last_hit_at: string | null;
};

export default async function PromptPlaygroundPage() {
  const { data: prompts, error } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .select(
      "id, slug, preset_type, trigger_jsonb, headline, frequency, enabled, hit_count, submit_count, last_hit_at",
    )
    .eq("client_key", PRACTICE_TENANT)
    .order("created_at", { ascending: false });

  const promptList = (prompts as PromptRow[] | null) ?? [];

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Failed to load prompts: {error.message}
      </div>
    );
  }

  if (promptList.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-orange-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900">
            No practice prompts configured yet
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Head to{" "}
            <Link
              href="/internal/identity-prompts/chapter_practice"
              className="font-semibold text-orange-700 hover:underline"
            >
              Configure prompts →
            </Link>{" "}
            to create your first prompt under the{" "}
            <span className="font-mono">chapter_practice</span> tenant. Then
            reload this page to iterate.
          </p>
          <p className="mt-3 text-xs text-neutral-500">
            The rich DOM below is always available for you to target with CSS
            selectors — nav (<span className="font-mono">.nav-*</span>), hero
            CTA (<span className="font-mono">.hero-cta</span>), product grid (
            <span className="font-mono">.product-add-to-cart</span> with
            per-product <span className="font-mono">data-product-id</span>),
            forms, book-now CTA, cart, footer.
          </p>
        </div>
        <PlaygroundClient promptList={[]} />
      </div>
    );
  }

  return <PlaygroundClient promptList={promptList} />;
}
