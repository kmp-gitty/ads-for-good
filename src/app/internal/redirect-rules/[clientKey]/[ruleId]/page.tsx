import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import RuleForm from "../RuleForm";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export default async function EditRulePage({
  params,
}: {
  params: Promise<{ clientKey: string; ruleId: string }>;
}) {
  const { clientKey, ruleId } = await params;

  const { data: rule, error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .select("id, slug, rule_priority, condition_jsonb, destination_template, description, enabled")
    .eq("id", ruleId)
    .eq("client_key", clientKey)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        Failed to load rule: {error.message}
      </div>
    );
  }
  if (!rule) notFound();

  return (
    <>
      <p className="text-sm text-neutral-500">
        <Link href={`/internal/redirect-rules/${clientKey}`} className="hover:text-orange-700">
          ← {clientKey} rules
        </Link>
      </p>
      <h2 className="mt-1 text-lg font-semibold">
        Edit rule <span className="font-mono text-sm text-neutral-500">{ruleId.slice(0, 8)}…</span>
      </h2>
      <div className="mt-6">
        <RuleForm
          client_key={clientKey}
          initial={{
            id: rule.id,
            slug: rule.slug,
            rule_priority: rule.rule_priority,
            condition_jsonb: rule.condition_jsonb,
            destination_template: rule.destination_template,
            description: rule.description,
            enabled: rule.enabled,
          }}
        />
      </div>
    </>
  );
}
