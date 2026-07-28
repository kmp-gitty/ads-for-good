import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import PickerBookmarklet from "./PickerBookmarklet";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";
const SUBTLE = "#FFF4EC";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type ClientRow = { client_key: string };
type PromptCountRow = { client_key: string; enabled: boolean };

export default async function IdentityPromptsIndex() {
  const [{ data: clients }, { data: prompts }] = await Promise.all([
    supabase.schema("chapter_config").from("clients").select("client_key").order("client_key"),
    supabase
      .schema("chapter_config")
      .from("identity_prompts")
      .select("client_key, enabled"),
  ]);

  const clientList = (clients as ClientRow[] | null) ?? [];
  const promptList = (prompts as PromptCountRow[] | null) ?? [];

  const counts = new Map<string, { total: number; enabled: number }>();
  for (const p of promptList) {
    const c = counts.get(p.client_key) ?? { total: 0, enabled: 0 };
    c.total += 1;
    if (p.enabled) c.enabled += 1;
    counts.set(p.client_key, c);
  }

  if (clientList.length === 0) {
    return (
      <p style={{ fontSize: 14, color: MUTED }}>
        No clients configured. Provision a client first via SQL or the onboarding flow.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Picker bookmarklet section */}
      <section
        style={{
          border: `1px solid ${ORANGE}44`,
          background: SUBTLE,
          borderRadius: 12,
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: ORANGE,
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          Picker bookmarklet
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, color: INK, lineHeight: 1.5 }}>
          For <strong>Click-element</strong> triggers, drag this link to your bookmarks bar. Then
          visit any client storefront, click the bookmarklet, and hover/click any element to
          capture its CSS selector. Press Esc to exit.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <PickerBookmarklet />
          <span style={{ fontSize: 12, color: MUTED }}>↑ drag this to your bookmarks bar</span>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          Runs purely client-side. To make the resulting prompt actually fire, the storefront&apos;s
          origin needs to be on the Chapter CORS allowlist.
        </p>
      </section>

      {/* Client list */}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, background: "white", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 90px 140px",
            gap: 12,
            padding: "10px 18px",
            background: PANEL,
            borderBottom: `1px solid ${LINE}`,
            fontSize: 10.5,
            fontWeight: 700,
            color: FAINT,
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          <div>Client</div>
          <div style={{ textAlign: "right" }}>Prompts</div>
          <div style={{ textAlign: "right" }}>Enabled</div>
          <div />
        </div>
        {clientList.map((c, i) => {
          const k = counts.get(c.client_key) ?? { total: 0, enabled: 0 };
          return (
            <div
              key={c.client_key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 90px 90px 140px",
                gap: 12,
                padding: "12px 18px",
                borderTop: i === 0 ? "none" : `1px solid ${LINE}`,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: INK,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {c.client_key}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: INK,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  textAlign: "right",
                }}
              >
                {k.total}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: INK,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  textAlign: "right",
                }}
              >
                {k.enabled}
              </div>
              <div style={{ textAlign: "right" }}>
                <Link
                  href={`/internal/identity-prompts/${c.client_key}`}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: ORANGE,
                    textDecoration: "none",
                  }}
                >
                  View / configure →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
