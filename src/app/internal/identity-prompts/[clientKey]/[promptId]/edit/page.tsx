import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PromptForm, { type ExistingPrompt } from "../../PromptForm";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export default async function EditPromptPage({
  params,
}: {
  params: Promise<{ clientKey: string; promptId: string }>;
}) {
  const { clientKey, promptId } = await params;

  const { data: prompt } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .select(
      "id, slug, trigger_jsonb, headline, body, input_placeholder, button_label, success_message, offer_code, offer_description, frequency, frequency_days, enabled",
    )
    .eq("id", promptId)
    .eq("client_key", clientKey)
    .maybeSingle();

  if (!prompt) notFound();

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-500">
        <Link href={`/internal/identity-prompts/${clientKey}`} className="hover:text-orange-700">
          ← Back to {clientKey}
        </Link>
      </p>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          Edit prompt: <span className="font-mono">{(prompt as ExistingPrompt).slug}</span>
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Changes take effect within ~30 seconds (CDN cache TTL).
        </p>
      </section>

      <PromptForm client_key={clientKey} prompt={prompt as ExistingPrompt} />
    </div>
  );
}
