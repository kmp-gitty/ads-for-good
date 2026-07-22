"use client";

// Live preview of a prompt as it's being built (Phase 3 editor upgrade).
// A rough browser mock that renders the current form state the way a visitor
// would roughly see it. Not pixel-identical to the runtime pixel — a directional
// preview so the operator sees their prompt take shape as they type.

import type { ContentBlock, FormField, SelfServePresetType } from "./types";
import type { NotificationConfig } from "@/app/internal/identity-prompts/[clientKey]/NotificationBuilder";
import type { PhoneCallConfig } from "@/app/internal/identity-prompts/[clientKey]/PhoneCallBuilder";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#9AA4B2";
const ORANGE = "#E36410";
const LINE = "#E5E0D4";

export type PreviewData = {
  presetType: SelfServePresetType;
  headline: string;
  body: string;
  inputMode: "email" | "phone" | "either";
  emailPlaceholder: string;
  phonePlaceholder: string;
  buttonLabel: string;
  offerCode: string;
  cfContent: ContentBlock[];
  cfFields: FormField[];
  notif: NotificationConfig;
  phone: PhoneCallConfig;
};

export default function PromptPreview({ data }: { data: PreviewData }) {
  return (
    <div style={{ position: "sticky", top: 20, maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>
        Live preview
      </div>
      <Frame>{renderPrompt(data)}</Frame>
      <div style={{ fontSize: 11.5, color: FAINT, marginTop: 8, lineHeight: 1.4 }}>
        A rough preview — the real prompt inherits your site&rsquo;s look.
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", background: "white", boxShadow: "0 1px 3px rgba(31,45,67,.06)" }}>
      <div style={{ height: 30, background: "#F1EDE3", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 8, height: 8, borderRadius: 999, background: "#CFC7B4" }} />)}
      </div>
      <div style={{ position: "relative", height: 400, background: "#ECE7DC", overflow: "hidden" }}>{children}</div>
    </div>
  );
}

function renderPrompt(data: PreviewData): React.ReactNode {
  if (data.presetType === "custom_notification") {
    return <Bubble position={data.notif.container.position}>{notificationContent(data)}</Bubble>;
  }
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,26,38,.35)", display: "grid", placeItems: "center", padding: 16 }}>
      <Card>
        {data.presetType === "email_exchange" && emailContent(data)}
        {data.presetType === "custom_form" && formContent(data)}
        {data.presetType === "phone_call" && phoneContent(data)}
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 12, padding: 16, width: "86%", maxWidth: 290, boxShadow: "0 12px 34px rgba(0,0,0,.22)", position: "relative", maxHeight: 360, overflowY: "auto" }}>
      <span style={{ position: "absolute", top: 8, right: 10, color: FAINT, fontSize: 16, lineHeight: 1 }}>×</span>
      {children}
    </div>
  );
}

function Bubble({ position, children }: { position: string; children: React.ReactNode }) {
  const [v, h] = position.split("-"); // e.g. bottom-right
  const pos: React.CSSProperties = {
    position: "absolute",
    [v]: 14,
    [h]: 14,
    width: 210,
    background: "white",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.2)",
  };
  return (
    <div style={pos}>
      <span style={{ position: "absolute", top: 7, right: 9, color: FAINT, fontSize: 15, lineHeight: 1 }}>×</span>
      {children}
    </div>
  );
}

// ---- per-preset content ----

function Headline({ text }: { text: string }) {
  return <div style={{ fontSize: 15, fontWeight: 700, color: text ? INK : FAINT, marginBottom: 6, paddingRight: 12 }}>{text || "Your headline"}</div>;
}
function Body({ text }: { text: string }) {
  if (!text) return null;
  return <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.45 }}>{text}</div>;
}
function MockInput({ placeholder }: { placeholder: string }) {
  return <div style={{ border: `1px solid ${LINE}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: FAINT, marginBottom: 8 }}>{placeholder || "…"}</div>;
}
function SubmitBtn({ label }: { label: string }) {
  return <div style={{ background: ORANGE, color: "white", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>{label || "Submit"}</div>;
}

function emailContent(d: PreviewData) {
  return (
    <>
      <Headline text={d.headline} />
      <Body text={d.body} />
      {d.inputMode !== "phone" && <MockInput placeholder={d.emailPlaceholder} />}
      {d.inputMode !== "email" && <MockInput placeholder={d.phonePlaceholder} />}
      <SubmitBtn label={d.buttonLabel} />
      {d.offerCode.trim() && (
        <div style={{ fontSize: 10.5, color: FAINT, marginTop: 8, textAlign: "center" }}>🎁 Code “{d.offerCode.trim()}” shown after submit</div>
      )}
    </>
  );
}

function fieldMock(f: FormField) {
  const label = <div style={{ fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>{f.label || "Field"}{f.required ? " *" : ""}</div>;
  if (f.type === "textarea") return <div style={{ marginBottom: 10 }}>{label}<div style={{ border: `1px solid ${LINE}`, borderRadius: 7, padding: "8px 10px", height: 40, fontSize: 12, color: FAINT }}>{f.placeholder || "…"}</div></div>;
  if (f.type === "single_choice" || f.type === "multi_choice") {
    return (
      <div style={{ marginBottom: 10 }}>{label}
        {(f.options && f.options.length ? f.options : ["Option"]).slice(0, 4).map((o, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, marginBottom: 3 }}>
            <span style={{ width: 12, height: 12, border: `1px solid ${FAINT}`, borderRadius: f.type === "multi_choice" ? 3 : 999 }} />{o}
          </div>
        ))}
      </div>
    );
  }
  return <div style={{ marginBottom: 10 }}>{label}<MockInput placeholder={f.placeholder || (f.type === "email" ? "you@email.com" : f.type === "phone" ? "(555) 555-5555" : "…")} /></div>;
}

function formContent(d: PreviewData) {
  const blocks = d.cfContent.length ? d.cfContent : [{ type: "headline", text: "" }];
  return (
    <>
      {blocks.map((b, i) => (b.type === "headline" ? <Headline key={i} text={b.text} /> : <Body key={i} text={b.text} />))}
      {d.cfFields.length === 0 ? (
        <div style={{ fontSize: 11.5, color: FAINT, marginBottom: 10 }}>Add fields to your form…</div>
      ) : (
        d.cfFields.map((f, i) => <div key={i}>{fieldMock(f)}</div>)
      )}
      <SubmitBtn label="Submit" />
    </>
  );
}

function phoneContent(d: PreviewData) {
  const blocks = d.phone.content_blocks;
  const hasCta = blocks.some((b) => b.type === "phone_cta");
  return (
    <>
      {blocks.length === 0 && <Headline text="" />}
      {blocks.map((b, i) => {
        if (b.type === "phone_cta") {
          const cta = b as { label: string; phone_number: string };
          return (
            <div key={i} style={{ border: `1px solid ${ORANGE}`, color: ORANGE, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
              📞 {cta.label || "Call"}{cta.phone_number ? ` · ${cta.phone_number}` : ""}
            </div>
          );
        }
        const cb = b as ContentBlock;
        return cb.type === "headline" ? <Headline key={i} text={cb.text} /> : <Body key={i} text={cb.text} />;
      })}
      {!hasCta && <div style={{ fontSize: 11.5, color: FAINT }}>Add a phone number to call…</div>}
    </>
  );
}

function notificationContent(d: PreviewData) {
  const blocks = d.notif.content_blocks;
  const a = d.notif.submit_actions;
  return (
    <>
      {(blocks.length ? blocks : [{ type: "headline", text: "" }]).map((b, i) =>
        b.type === "headline"
          ? <div key={i} style={{ fontSize: 13.5, fontWeight: 700, color: b.text ? INK : FAINT, marginBottom: 5, paddingRight: 10 }}>{b.text || "Your headline"}</div>
          : <div key={i} style={{ fontSize: 11.5, color: MUTED, marginBottom: 8, lineHeight: 1.4 }}>{b.text}</div>,
      )}
      {a.cta_type === "button" && (
        <div style={{ background: ORANGE, color: "white", borderRadius: 7, padding: "7px 10px", fontSize: 12, fontWeight: 600, textAlign: "center" }}>{a.cta_label || "Learn more"}</div>
      )}
      {a.cta_type === "yes_no" && (
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1, background: ORANGE, color: "white", borderRadius: 7, padding: "7px 8px", fontSize: 11.5, fontWeight: 600, textAlign: "center" }}>{a.yes_label || "Yes"}</div>
          <div style={{ flex: 1, border: `1px solid ${LINE}`, color: MUTED, borderRadius: 7, padding: "7px 8px", fontSize: 11.5, fontWeight: 600, textAlign: "center" }}>{a.no_label || "No"}</div>
        </div>
      )}
    </>
  );
}
