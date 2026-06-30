// MI v2 Phase 3 — templates index for a client.
// Lists existing chapter_config.email_templates rows + inline create form.

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import TemplateForm from "./TemplateForm";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type TemplateRow = {
  template_type: string;
  subject: string;
  body: string;
  updated_at: string;
  updated_by: string | null;
};

export default async function ClientTemplatesPage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;
  const { data: templates } = await supabase
    .schema("chapter_config")
    .from("email_templates")
    .select("template_type, subject, body, updated_at, updated_by")
    .eq("client_key", clientKey)
    .order("template_type", { ascending: true });

  const templateList = (templates as TemplateRow[] | null) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          <Link href={`/internal/identity-prompts/${clientKey}`} className="hover:text-orange-700">
            ← Back to {clientKey}
          </Link>
        </p>
        <Link
          href={`/internal/identity-prompts/${clientKey}/responses`}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          View responses →
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Email templates</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Authored subject + body per template type. Composed at send time with the operator-configurable
          shell + merge data. Direct sends use Resend; ESP-backed sends route through Klaviyo or Mailchimp
          when client is configured for those.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-600">
          Existing templates ({templateList.length})
        </h3>
        {templateList.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
            <p className="text-sm text-neutral-600">
              No templates yet. Create one below — it will be used the next time a preset of that
              template_type fires.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templateList.map(t => (
              <Link
                key={t.template_type}
                href={`/internal/identity-prompts/${clientKey}/templates/${t.template_type}`}
                className="block rounded border border-neutral-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50/30"
              >
                <div className="flex items-baseline justify-between">
                  <code className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                    {t.template_type}
                  </code>
                  <span className="text-xs text-neutral-400">
                    Updated {new Date(t.updated_at).toLocaleString()} {t.updated_by ? `by ${t.updated_by}` : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-neutral-800">{t.subject}</p>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{t.body}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-600">
          Create new template
        </h3>
        <div className="mt-3 rounded-md border border-neutral-200 bg-white p-6">
          <TemplateForm client_key={clientKey} />
        </div>
      </section>
    </div>
  );
}
