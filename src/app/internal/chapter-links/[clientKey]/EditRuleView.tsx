import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import RuleForm, { type ExistingRuleSummary } from "./RuleForm";

const INK = "#1F2D43";
const MUTED = "#5C6B82";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);


async function fetchLinksHost(clientKey: string): Promise<string | null> {
  const { data } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("links_host, redirect_host")
    .eq("client_key", clientKey)
    .maybeSingle();
  const row = data as { links_host: string | null; redirect_host: string | null } | null;
  return row?.links_host ?? row?.redirect_host ?? null;
}

// Edit-rule view, shared by the operator route ([clientKey]/[ruleId]) and the
// client dashboard (/chapter/<key>/links/rules/<id>). The rule is loaded
// scoped to clientKey, so an id from another client 404s.
export default async function EditRuleView({
  clientKey,
  ruleId,
  basePath,
  newRulePath,
}: {
  clientKey: string;
  ruleId: string;
  basePath: string;
  newRulePath: string;
}) {

  const [{ data: rule, error }, { data: allRules }, { data: client }] = await Promise.all([
    supabase
      .schema("chapter_config")
      .from("redirect_rules")
      .select("id, slug, rule_priority, condition_jsonb, destination_template, description, enabled")
      .eq("id", ruleId)
      .eq("client_key", clientKey)
      .maybeSingle(),
    supabase
      .schema("chapter_config")
      .from("redirect_rules")
      .select("id, slug, rule_priority, condition_jsonb, destination_template, enabled")
      .eq("client_key", clientKey)
      .order("slug")
      .order("rule_priority"),
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("default_redirect_destination, links_host, redirect_host")
      .eq("client_key", clientKey)
      .maybeSingle(),
  ]);
  const linksHost = await fetchLinksHost(clientKey);
  const existingRules = (allRules ?? []) as ExistingRuleSummary[];
  const clientDefault = (client as { default_redirect_destination: string | null } | null)?.default_redirect_destination ?? null;

  if (error) {
    return (
      <div style={{ border: "1px solid #E7C9C6", background: "#FDECEA", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
        Failed to load rule: {error.message}
      </div>
    );
  }
  if (!rule) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link
        href={basePath}
        style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}
      >
        ← {clientKey} rules
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: 0 }}>
        Edit rule{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: MUTED, fontSize: 16 }}>
          {ruleId.slice(0, 8)}…
        </span>
      </h1>
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
        existingRules={existingRules}
        clientDefaultDestination={clientDefault}
        linksHost={linksHost}
        basePath={basePath}
        newRulePath={newRulePath}
      />
    </div>
  );
}
