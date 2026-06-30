// MI v2 Phase 3 — single-template edit page.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import TemplateForm, { type ExistingTemplate } from "../TemplateForm";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ clientKey: string; templateType: string }>;
}) {
  const { clientKey, templateType } = await params;

  const { data: template } = await supabase
    .schema("chapter_config")
    .from("email_templates")
    .select("template_type, subject, body, updated_at, updated_by")
    .eq("client_key", clientKey)
    .eq("template_type", templateType)
    .maybeSingle();

  if (!template) notFound();

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-500">
        <Link href={`/internal/identity-prompts/${clientKey}/templates`} className="hover:text-orange-700">
          ← Back to templates
        </Link>
      </p>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          Edit template: <code className="font-mono">{(template as ExistingTemplate).template_type}</code>
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Changes take effect on the next auto-send for this template type.
        </p>
      </section>

      <TemplateForm client_key={clientKey} template={template as ExistingTemplate} />
    </div>
  );
}
