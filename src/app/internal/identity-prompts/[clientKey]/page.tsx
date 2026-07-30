import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import PromptForm from "./PromptForm";
import RowActions from "./RowActions";

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

type PromptRow = {
  id: string;
  slug: string;
  preset_type: string;
  trigger_jsonb: { type?: string; selector?: string; delay_ms?: number; percent?: number };
  headline: string;
  body: string | null;
  input_mode: string;
  button_label: string;
  success_message: string | null;
  offer_code: string | null;
  offer_description: string | null;
  post_submit_action: string;
  post_submit_url: string | null;
  frequency: string;
  frequency_days: number | null;
  enabled: boolean;
  hit_count: number;
  submit_count: number;
  last_hit_at: string | null;
};

const PRESET_LABELS: Record<string, string> = {
  email_exchange: "Email Exchange",
  custom_form: "Custom Form",
  custom_notification: "Custom Notification",
  phone_call: "Phone Call",
  make_an_offer: "Make an Offer",
  remind_me: "Remind Me",
};

function describeTrigger(t: PromptRow["trigger_jsonb"]): string {
  switch (t.type) {
    case "click_element":
      return `On click · ${t.selector ?? "?"}`;
    case "exit_intent":
      return "On exit intent";
    case "time_on_page":
      return `After ${Math.round((t.delay_ms ?? 15000) / 1000)}s on page`;
    case "scroll_depth":
      return `At ${t.percent ?? 50}% scroll`;
    default:
      return JSON.stringify(t);
  }
}

const chip: React.CSSProperties = {
  fontSize: 10.5,
  color: ORANGE,
  background: SUBTLE,
  border: `1px solid ${ORANGE}33`,
  borderRadius: 999,
  padding: "2px 8px",
  textTransform: "uppercase",
  letterSpacing: ".06em",
};

const subChip: React.CSSProperties = {
  fontSize: 11,
  color: MUTED,
  background: PANEL,
  border: `1px solid ${LINE}`,
  borderRadius: 999,
  padding: "2px 8px",
};

const subNavLink: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: "6px 12px",
  textDecoration: "none",
};

export default async function ClientPromptsPage({
  params,
}: {
  params: Promise<{ clientKey: string }>;
}) {
  const { clientKey } = await params;
  const [{ data: prompts }, { data: client }] = await Promise.all([
    supabase
      .schema("chapter_config")
      .from("identity_prompts")
      .select(
        "id, slug, preset_type, trigger_jsonb, headline, body, input_mode, button_label, success_message, offer_code, offer_description, post_submit_action, post_submit_url, frequency, frequency_days, enabled, hit_count, submit_count, last_hit_at",
      )
      .eq("client_key", clientKey)
      .order("created_at", { ascending: false }),
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("storefront_domain")
      .eq("client_key", clientKey)
      .maybeSingle(),
  ]);

  const promptList = (prompts as PromptRow[] | null) ?? [];
  const storefrontDomain = (client as { storefront_domain: string | null } | null)?.storefront_domain ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Top nav — back link + sub-route chips */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/internal/identity-prompts"
          style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}
        >
          ← All clients
        </Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/internal/identity-prompts/${clientKey}/templates`} style={subNavLink}>
            Email templates →
          </Link>
          <Link href={`/internal/identity-prompts/${clientKey}/leads`} style={subNavLink}>
            Leads →
          </Link>
          <Link href={`/internal/identity-prompts/${clientKey}/responses`} style={subNavLink}>
            Responses →
          </Link>
          <Link href={`/internal/identity-prompts/${clientKey}/offers`} style={subNavLink}>
            Offers →
          </Link>
          <Link href={`/internal/identity-prompts/${clientKey}/offer-thresholds`} style={subNavLink}>
            Offer thresholds →
          </Link>
        </div>
      </div>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 4px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {clientKey}
        </h2>
        <p style={{ fontSize: 13.5, color: MUTED, margin: 0, lineHeight: 1.5 }}>
          Each prompt fires when its trigger condition matches. Submit captures identity via{" "}
          <code style={{ background: PANEL, padding: "1px 4px", borderRadius: 4, border: `1px solid ${LINE}` }}>/api/identify</code>.
        </p>
      </div>

      {/* Create new prompt */}
      <section>
        <div style={{ fontSize: 12, fontWeight: 700, color: FAINT, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>
          Create a new prompt
        </div>
        <div style={{ background: "white", border: `1px solid ${LINE}`, borderRadius: 14, padding: "24px 26px" }}>
          <PromptForm client_key={clientKey} storefrontDomain={storefrontDomain} />
        </div>
      </section>

      {/* Existing prompts */}
      <section>
        <div style={{ fontSize: 12, fontWeight: 700, color: FAINT, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>
          Existing prompts ({promptList.length})
        </div>
        {promptList.length === 0 ? (
          <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "40px 24px", textAlign: "center", background: PANEL }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>No prompts yet for this client</div>
            <p style={{ fontSize: 13.5, color: MUTED, margin: "0 auto", maxWidth: 360, lineHeight: 1.5 }}>
              Use the form above to author your first prompt. Once saved, install the pixel on the client&apos;s storefront so it can fire.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {promptList.map((p) => {
              const rate = p.hit_count > 0 ? Math.round((p.submit_count / p.hit_count) * 100) : null;
              return (
                <div key={p.id} style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: 16, background: "white" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{p.slug}</span>
                        <span style={chip}>{PRESET_LABELS[p.preset_type] ?? p.preset_type}</span>
                        <span style={{ fontSize: 11, color: p.enabled ? GREEN : FAINT, fontWeight: 600 }}>
                          {p.enabled ? "● Live" : "○ Off"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={subChip}>{describeTrigger(p.trigger_jsonb)}</span>
                        <span style={subChip}>collect: {p.input_mode}</span>
                        <span style={subChip}>post-submit: {p.post_submit_action}</span>
                        <span style={subChip}>freq: {p.frequency}</span>
                      </div>
                      {p.headline && (
                        <p style={{ margin: "6px 0 0", fontSize: 13.5, fontWeight: 600, color: INK }}>{p.headline}</p>
                      )}
                      {p.body && (
                        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>{p.body}</p>
                      )}
                      {p.offer_code && (
                        <p style={{ margin: "8px 0 0", fontSize: 12, color: MUTED }}>
                          Offer: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700, color: INK }}>{p.offer_code}</span>
                          {p.offer_description && <span style={{ color: FAINT }}> — {p.offer_description}</span>}
                        </p>
                      )}
                      <p style={{ margin: "10px 0 0", fontSize: 11.5, color: FAINT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                        Shown {p.hit_count}× · Submitted {p.submit_count}×
                        {rate !== null && <span style={{ marginLeft: 8 }}>({rate}% conversion)</span>}
                      </p>
                    </div>
                    <RowActions id={p.id} client_key={clientKey} enabled={p.enabled} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
