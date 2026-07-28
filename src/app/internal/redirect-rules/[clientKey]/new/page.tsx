import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import RuleForm, { type ExistingRuleSummary } from "../RuleForm";

const INK = "#1F2D43";
const MUTED = "#5C6B82";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

async function fetchExistingRules(clientKey: string): Promise<ExistingRuleSummary[]> {
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .select("id, slug, rule_priority, condition_jsonb, destination_template, enabled")
    .eq("client_key", clientKey)
    .order("slug")
    .order("rule_priority");
  if (error) {
    console.error("[redirect-rules/new] fetchExistingRules failed:", error);
    return [];
  }
  return (data ?? []) as ExistingRuleSummary[];
}

export default async function NewRulePage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;
  const existingRules = await fetchExistingRules(clientKey);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link
        href={`/internal/redirect-rules/${clientKey}`}
        style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}
      >
        ← {clientKey} rules
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: 0 }}>
        New rule for{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: MUTED, fontSize: 18 }}>
          {clientKey}
        </span>
      </h1>
      <RuleForm client_key={clientKey} existingRules={existingRules} />
    </div>
  );
}
