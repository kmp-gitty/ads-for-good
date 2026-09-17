// Chapter Links workbench — the single per-client surface.
//
// Merges what used to be two separate tools:
//   /internal/redirect-rules/[clientKey]  (build the rule)
//   /internal/outreach-builder            (generate the URL)
//
// Both jobs now live here behind a URL-driven tab so generation always starts
// FROM a configured link — the destination is never re-entered by hand, which
// was the whole reason the two-tool split was confusing.
//
// Rule create/edit stay as sub-routes ([clientKey]/new and [clientKey]/[ruleId])
// because RuleForm is a large form with its own URL tester; it is a detail view
// of this page, not a separate tool.

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { listConditionTypes } from "@/app/lib/redirect/conditions";
import RuleRowActions from "./RuleRowActions";
import UrlBuilder, { type ClientOption } from "./UrlBuilder";

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

type Tab = "links" | "generate";

const subChip: React.CSSProperties = {
  fontSize: 11,
  color: MUTED,
  background: PANEL,
  border: `1px solid ${LINE}`,
  borderRadius: 999,
  padding: "2px 8px",
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 13.5,
    fontWeight: 600,
    color: active ? INK : MUTED,
    background: active ? "white" : "transparent",
    border: `1px solid ${active ? LINE : "transparent"}`,
    borderBottom: active ? "1px solid white" : `1px solid ${LINE}`,
    borderRadius: "10px 10px 0 0",
    padding: "9px 18px",
    textDecoration: "none",
    marginBottom: -1,
    whiteSpace: "nowrap",
  };
}

export default async function ChapterLinksClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clientKey } = await params;
  const sp = await searchParams;
  const tab: Tab = sp.tab === "generate" ? "generate" : "links";
  const preselectSlug = typeof sp.slug === "string" ? sp.slug : undefined;

  const [{ data: rules, error }, { data: clientRow }] = await Promise.all([
    supabase
      .schema("chapter_config")
      .from("redirect_rules")
      .select("*")
      .eq("client_key", clientKey)
      .order("slug", { ascending: true })
      .order("rule_priority", { ascending: true }),
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("client_key, storefront_domain, redirect_host, links_host")
      .eq("client_key", clientKey)
      .maybeSingle(),
  ]);

  if (error) {
    return (
      <div style={{ border: "1px solid #E7C9C6", background: "#FDECEA", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
        Failed to load rules: {error.message}
      </div>
    );
  }

  const allRules = (rules ?? []) as Rule[];

  const bySlug = new Map<string, Rule[]>();
  for (const r of allRules) {
    const list = bySlug.get(r.slug) ?? [];
    list.push(r);
    bySlug.set(r.slug, list);
  }

  // The generate tab only offers ENABLED slugs — a disabled rule won't resolve
  // at /r/, so offering it would build a link that 404s or falls through to ?to=.
  // A pass-through rule forwards to whatever ?to= carries, so the builder must
  // KEEP ?to= for that slug rather than suppressing it as "the rule supplies the
  // destination". Detected off the template token itself.
  const PASS_THROUGH_TOKEN = /\{q:\s*to\s*\}/;

  const enabledSlugs: { slug: string; description: string | null; needs_to: boolean }[] = [];
  for (const [slug, slugRules] of bySlug) {
    const enabled = slugRules.filter(r => r.enabled);
    if (enabled.length === 0) continue;
    enabledSlugs.push({
      slug,
      description: enabled[0].description,
      needs_to: enabled.some(r => PASS_THROUGH_TOKEN.test(r.destination_template)),
    });
  }

  const client: ClientOption = {
    client_key: clientKey,
    storefront_domain: (clientRow as { storefront_domain: string | null } | null)?.storefront_domain ?? null,
    redirect_host: (clientRow as { redirect_host: string | null } | null)?.redirect_host ?? null,
    links_host: (clientRow as { links_host: string | null } | null)?.links_host ?? null,
  };
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://ads4good.com";
  const effectiveHost = client.links_host || client.redirect_host || origin;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <Link href="/internal/chapter-links" style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
            ← All clients
          </Link>
          <h2 style={{ margin: "8px 0 4px", fontSize: 20, fontWeight: 700, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {clientKey}
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>
            {allRules.length} rule{allRules.length === 1 ? "" : "s"} across {bySlug.size} link{bySlug.size === 1 ? "" : "s"}
            {" · "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5 }}>
              {effectiveHost.replace(/^https?:\/\//, "")}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/internal/chapter-links/${clientKey}/analytics`}
            style={{ background: "white", color: INK, fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 18px", borderRadius: 10, whiteSpace: "nowrap", border: `1px solid ${LINE}` }}
          >
            📊 Analytics
          </Link>
          <Link
            href={`/internal/chapter-links/${clientKey}/new`}
            style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 18px", borderRadius: 10, whiteSpace: "nowrap" }}
          >
            + New link rule
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, borderBottom: `1px solid ${LINE}` }}>
        <Link href={`/internal/chapter-links/${clientKey}?tab=links`} style={tabStyle(tab === "links")}>
          Links &amp; rules
        </Link>
        <Link href={`/internal/chapter-links/${clientKey}?tab=generate`} style={tabStyle(tab === "generate")}>
          Generate URLs
        </Link>
      </div>

      {tab === "generate" ? (
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 13.5, color: MUTED, lineHeight: 1.5, maxWidth: 720 }}>
            Build trackable URLs for this client. Pick a configured link and the destination comes from its rule —
            you never re-enter it. Pick the generic ad-hoc option for a one-off wrapped URL with no rule.
          </p>
          <UrlBuilder
            clients={[client]}
            slugsByClient={{ [clientKey]: enabledSlugs }}
            defaultClientKey={clientKey}
            defaultSlug={preselectSlug}
            redirectOrigin={origin}
            lockClient
          />
        </div>
      ) : bySlug.size === 0 ? (
        <div style={{ border: `1px dashed ${LINE}`, background: PANEL, borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No links yet</div>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto 18px", maxWidth: 420, lineHeight: 1.5 }}>
            Add a rule to start routing clicks for this client. Rules match on identity, cart, geo, device, A/B, time, or query params — the first match wins.
            You can still generate one-off wrapped URLs from the Generate tab without any rule.
          </p>
          <Link
            href={`/internal/chapter-links/${clientKey}/new`}
            style={{ background: ORANGE, color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none", padding: "10px 20px", borderRadius: 10, display: "inline-block" }}
          >
            Create your first link
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Array.from(bySlug.entries()).map(([slug, slugRules]) => (
            <div key={slug} style={{ border: `1px solid ${LINE}`, borderRadius: 12, background: "white", overflow: "hidden" }}>
              {/* Slug header */}
              <div style={{ background: PANEL, borderBottom: `1px solid ${LINE}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: ".12em" }}>link</div>
                  <div style={{ marginTop: 2, fontSize: 14, fontWeight: 700, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{slug}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    /r/{clientKey}/{slug}
                  </span>
                  {/* Same page, generate tab, slug preselected — generation starts
                      FROM the link so the destination is never re-entered. */}
                  <Link
                    href={`/internal/chapter-links/${clientKey}?tab=generate&slug=${encodeURIComponent(slug)}`}
                    style={{ fontSize: 12, fontWeight: 600, color: ORANGE, textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Generate URLs →
                  </Link>
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

      {/* Available condition types reference — only useful alongside the rules list */}
      {tab === "links" && (
        <div style={{ border: `1px solid ${LINE}`, background: "white", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: ".12em" }}>Available condition types</div>
          <div style={{ marginTop: 8, fontSize: 12, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.6 }}>
            {listConditionTypes().join(" · ")}
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: FAINT, lineHeight: 1.4 }}>
            Conditions in a rule are AND-ed. Empty object <code style={{ background: PANEL, padding: "1px 4px", borderRadius: 4 }}>{"{}"}</code> = catch-all default.
          </div>
        </div>
      )}
    </div>
  );
}
