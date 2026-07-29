import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PromptForm, { type ExistingPrompt } from "../../PromptForm";

const INK = "#1F2D43";
const MUTED = "#5C6B82";

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
      "id, slug, preset_type, trigger_jsonb, targeting_jsonb, headline, body, input_mode, email_placeholder, phone_placeholder, button_label, success_message, offer_code, offer_description, post_submit_action, post_submit_url, post_submit_button_label, email_subject, email_body, frequency, frequency_days, enabled, content_blocks_jsonb, form_fields_jsonb, pages_jsonb, recovery_jsonb, container_jsonb, submit_actions_jsonb, consent_jsonb",
    )
    .eq("id", promptId)
    .eq("client_key", clientKey)
    .maybeSingle();

  if (!prompt) notFound();

  const typed = prompt as ExistingPrompt;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link
        href={`/internal/identity-prompts/${clientKey}`}
        style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}
      >
        ← Back to {clientKey}
      </Link>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>
          Edit prompt:{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: MUTED, fontSize: 18 }}>
            {typed.slug}
          </span>
        </h1>
        <p style={{ fontSize: 13.5, color: MUTED, margin: 0 }}>
          Changes take effect within ~30 seconds (CDN cache TTL).
        </p>
      </div>

      <PromptForm client_key={clientKey} prompt={typed} />
    </div>
  );
}
