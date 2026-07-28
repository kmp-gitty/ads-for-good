import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type RuleCount = {
  client_key: string;
  enabled_count: number;
  total_count: number;
};

export default async function RedirectRulesIndex() {
  const [{ data: clients }, { data: rules }] = await Promise.all([
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("client_key, storefront_domain")
      .order("client_key", { ascending: true }),
    supabase
      .schema("chapter_config")
      .from("redirect_rules")
      .select("client_key, enabled"),
  ]);

  const countsByClient = new Map<string, RuleCount>();
  for (const r of (rules ?? []) as Array<{ client_key: string; enabled: boolean }>) {
    const ck = r.client_key;
    const cur = countsByClient.get(ck) ?? { client_key: ck, enabled_count: 0, total_count: 0 };
    cur.total_count += 1;
    if (r.enabled) cur.enabled_count += 1;
    countsByClient.set(ck, cur);
  }

  const rows = ((clients ?? []) as Array<{ client_key: string; storefront_domain: string | null }>).map((c) => ({
    client_key: c.client_key,
    storefront_domain: c.storefront_domain,
    counts: countsByClient.get(c.client_key) ?? { client_key: c.client_key, enabled_count: 0, total_count: 0 },
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>
        Click a client to manage their redirect rules.
      </p>

      {rows.length === 0 ? (
        <div style={{ border: `1px dashed ${LINE}`, background: PANEL, borderRadius: 12, padding: "32px 24px", textAlign: "center", fontSize: 13.5, color: MUTED }}>
          No clients configured yet.
        </div>
      ) : (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, background: "white", overflow: "hidden" }}>
          {rows.map((r, i) => (
            <Link
              key={r.client_key}
              href={`/internal/redirect-rules/${r.client_key}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 200px",
                gap: 12,
                padding: "14px 18px",
                borderTop: i === 0 ? "none" : `1px solid ${LINE}`,
                textDecoration: "none",
                background: "white",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: FAINT, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Client
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: ORANGE,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    marginTop: 2,
                  }}
                >
                  {r.client_key}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: FAINT, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Storefront
                </div>
                <div style={{ fontSize: 13, color: INK, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.storefront_domain ?? <span style={{ color: FAINT }}>—</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10.5, color: FAINT, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Rules
                </div>
                <div style={{ marginTop: 2, fontSize: 13, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {r.counts.enabled_count} enabled / {r.counts.total_count} total
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: FAINT }}>
        Need a new client?{" "}
        <Link href="/internal/client-portal-config/new" style={{ color: ORANGE, textDecoration: "underline" }}>
          Add via Client Portal Config →
        </Link>
      </div>
    </div>
  );
}
