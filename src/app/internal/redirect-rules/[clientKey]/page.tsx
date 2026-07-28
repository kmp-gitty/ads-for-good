import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { listConditionTypes } from "@/app/lib/redirect/conditions";
import RuleRowActions from "./RuleRowActions";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";
const SUBTLE = "#FFF4EC";
const GREEN = "#2E7D5B";

type Rule = {
  id: string;
  client_key: string;
  slug: string;
  rule_priority: number;
  condition_jsonb: Record<string, unknown>;
  destination_template: string;
  description: string | null;
  enabled: boolean;
  hit_count: number;
  last_hit_at: string | null;
};

const subChip: React.CSSProperties = {
  fontSize: 11,
  color: MUTED,
  background: PANEL,
  border: `1px solid ${LINE}`,
  borderRadius: 999,
  padding: "2px 8px",
};

export default async function ClientRedirectRulesPage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;

  const { data: rules, error } = await supabase
    .schema("chapter_config")
    .from("redirect_rules")
    .select("*")
    .eq("client_key", clientKey)
    .order("slug", { ascending: true })
    .order("rule_priority", { ascending: true });

  if (error) {
    return (
      <div style={{ border: "1px solid #E7C9C6", background: "#FDECEA", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
        Failed to load rules: {error.message}
      </div>
    );
  }

  const bySlug = new Map<string, Rule[]>();
  for (const r of (rules ?? []) as Rule[]) {
    const list = bySlug.get(r.slug) ?? [];
    list.push(r);
    bySlug.set(r.slug, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <Link
            href="/internal/redirect-rules"
            style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}
          >
            ← All clients
          </Link>
          <h2 style={{ margin: "8px 0 4px", fontSize: 20, fontWeight: 700, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {clientKey}
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>
            {rules?.length ?? 0} rules across {bySlug.size} slug{bySlug.size === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href={`/internal/redirect-rules/${clientKey}/new`}
          style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 18px", borderRadius: 10, whiteSpace: "nowrap" }}
        >
          + New rule
        </Link>
      </div>

      {bySlug.size === 0 ? (
        <div style={{ border: `1px dashed ${LINE}`, background: PANEL, borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No rules yet</div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto 18px", maxWidth: 380, lineHeight: 1.5 }}>
            Add a rule to start routing clicks for this client. Rules match on identity, cart, geo, device, A/B, time, or query params — the first match wins.
          </p>
          <Link
            href={`/internal/redirect-rules/${clientKey}/new`}
            style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 20px", borderRadius: 10, display: "inline-block" }}
          >
            Create your first rule
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Array.from(bySlug.entries()).map(([slug, slugRules]) => (
            <div key={slug} style={{ border: `1px solid ${LINE}`, borderRadius: 12, background: "white", overflow: "hidden" }}>
              {/* Slug header */}
              <div style={{ background: PANEL, borderBottom: `1px solid ${LINE}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: ".12em" }}>slug</div>
                  <div style={{ marginTop: 2, fontSize: 14, fontWeight: 700, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{slug}</div>
                </div>
                <div style={{ fontSize: 12, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  /r/{clientKey}/{slug}
                </div>
              </div>

              {/* Rule rows */}
              <div>
                {slugRules.map((r, i) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "14px 16px",
                      borderTop: i === 0 ? "none" : `1px solid ${LINE}`,
                      background: r.enabled ? "white" : PANEL,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: FAINT }}>Priority</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{r.rule_priority}</span>
                          {Object.keys(r.condition_jsonb).length === 0 ? (
                            <span style={{ fontSize: 10.5, color: ORANGE, background: SUBTLE, border: `1px solid ${ORANGE}33`, borderRadius: 999, padding: "2px 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
                              Default · matches all
                            </span>
                          ) : (
                            <span style={subChip}>{Object.keys(r.condition_jsonb).length} condition{Object.keys(r.condition_jsonb).length === 1 ? "" : "s"}</span>
                          )}
                          <span style={{ fontSize: 11, color: r.enabled ? GREEN : FAINT, fontWeight: 600 }}>
                            {r.enabled ? "● Enabled" : "○ Disabled"}
                          </span>
                        </div>

                        {Object.keys(r.condition_jsonb).length > 0 && (
                          <pre style={{ margin: "0 0 6px", fontSize: 11.5, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: PANEL, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 8px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {JSON.stringify(r.condition_jsonb, null, 0)}
                          </pre>
                        )}

                        <div style={{ fontSize: 11.5, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, marginBottom: 4 }}>
                          Destination
                        </div>
                        <div style={{ fontSize: 12, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all", lineHeight: 1.4 }}>
                          {r.destination_template}
                        </div>

                        {r.description && (
                          <div style={{ marginTop: 6, fontSize: 12, color: MUTED, fontStyle: "italic", lineHeight: 1.4 }}>
                            {r.description}
                          </div>
                        )}

                        <div style={{ marginTop: 8, fontSize: 11.5, color: FAINT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                          {r.hit_count} hit{r.hit_count === 1 ? "" : "s"}
                        </div>
                      </div>

                      <RuleRowActions
                        id={r.id}
                        client_key={clientKey}
                        slug={slug}
                        enabled={r.enabled}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available condition types reference */}
      <div style={{ border: `1px solid ${LINE}`, background: "white", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: ".12em" }}>Available condition types</div>
        <div style={{ marginTop: 8, fontSize: 12, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.6 }}>
          {listConditionTypes().join(" · ")}
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: FAINT, lineHeight: 1.4 }}>
          Conditions in a rule are AND-ed. Empty object <code style={{ background: PANEL, padding: "1px 4px", borderRadius: 4 }}>{"{}"}</code> = catch-all default.
        </div>
      </div>
    </div>
  );
}
